/* Optional authenticated gateway. The local app never calls api.openai.com. */
(() => {
  'use strict';
  const KEY = 'pp-ai-base-url', MAX_AUDIO = 8 * 1024 * 1024;
  const en = () => window.PPSecretaryBridge?.lang === 'en';
  const messages = {
    offline: ['Подключите сервер в настройках секретаря.', 'Connect the server in secretary settings.'],
    network: ['Нет связи с сервером. Проверьте адрес и войдите в учётную запись.', 'Cannot reach the server. Check its address and sign in.'],
    sign_in_required: ['Войдите в серверную учётную запись.', 'Sign in to the server.'],
    invalid_session: ['Сессия истекла. Войдите снова.', 'Session expired. Sign in again.'],
    identity_mismatch: ['Серверная учётная запись не совпадает с выбранным профилем. Выберите свой профиль.', 'The server account differs from the selected profile. Choose your own profile.'],
    ai_not_configured: ['Администратор ещё не подключил OpenAI API.', 'OpenAI API is not configured by your administrator yet.'],
    auth_not_configured: ['На сервере ещё не настроен вход.', 'Server sign-in is not configured yet.'],
    daily_quota: ['Дневной лимит AI исчерпан. Можно продолжить вручную.', 'Daily AI limit reached. You can continue manually.'],
    ai_rate_limit: ['OpenAI временно ограничил запросы. Попробуйте позже.', 'OpenAI rate limit reached. Try again later.'],
    ai_timeout: ['Обработка заняла слишком долго. Текст сохранён; повторите запрос.', 'Processing timed out. Your text is retained; try again.'],
    ai_unavailable: ['OpenAI недоступен. Текст сохранён для повторной попытки.', 'OpenAI is unavailable. Your text is retained for retry.'],
    invalid_ai_output: ['Ответ AI не прошёл проверку. Ничего не сохранено.', 'AI output failed validation. Nothing was saved.'],
    stale_mail: ['Письмо уже изменено. Обновите входящие.', 'The email has changed. Refresh your inbox.'],
    access_denied: ['Недостаточно прав для этого действия.', 'You do not have access to this action.'],
    choose_project: ['Выберите доступный проект и проверьте письмо.', 'Choose an available project and review the email.'],
    invalid_audio: ['Выберите непустую запись MP3, M4A, WAV или WebM до 8 МБ.', 'Choose an MP3, M4A, WAV or WebM recording up to 8 MB.'],
    microphone: ['Микрофон недоступен. Загрузите аудио или введите текст.', 'Microphone unavailable. Upload audio or type instead.'],
    invalid_url: ['Нужен адрес сервера HTTPS без пути, пароля и параметров.', 'Use an HTTPS server address without a path, password or query.']
  };
  function error(code) { const e = new Error(code); e.code = code; return e; }
  function errorText(e) { return (messages[e.code || e.message] || [ 'Действие не выполнено. Данные сохранены; попробуйте снова.', 'Action failed. Your data is retained; try again.' ])[en() ? 1 : 0]; }
  function baseUrl() { try { return localStorage.getItem(KEY) || window.PP_API_CONFIG?.baseUrl || ''; } catch { return window.PP_API_CONFIG?.baseUrl || ''; } }
  function configure(value) {
    value = value.trim();
    if (value) {
      let url; try { url = new URL(value); } catch { throw error('invalid_url'); }
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw error('invalid_url');
      value = url.origin;
    }
    localStorage.setItem(KEY, value); return value;
  }
  async function request(path, { body, signal, method } = {}) {
    const base = baseUrl(); if (!base) throw error('offline');
    let response;
    try { response = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'), credentials: 'include',
      headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
      body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000) }); }
    catch (e) { if (signal?.aborted) throw e; throw error('network'); }
    let data; try { data = await response.json(); } catch { throw error('network'); }
    if (!response.ok) throw error(data.error || 'network'); return data;
  }
  async function ownSession(memberId, signal, requireAI = true) {
    const session = await request('/api/session', { signal });
    if (session.user.id !== memberId) throw error('identity_mismatch');
    if (requireAI && !session.aiConfigured) throw error('ai_not_configured'); return session;
  }
  async function transcribe(file, language, signal) {
    if (!file?.size || file.size > MAX_AUDIO) throw error('invalid_audio');
    const form = new FormData(); form.set('file', file, file.name || (file.type.includes('mp4') ? 'voice.mp4' : 'voice.webm')); form.set('language', language);
    return (await request('/api/audio/transcribe', { body: form, signal })).text;
  }
  function record({ language, onText, onStatus, onError }) {
    let cancelled = false, recorder, stream, timer, chunks = [], size = 0;
    const controller = new AbortController();
    const release = () => { clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
    const handle = {
      stop() { if (recorder?.state === 'recording') { onStatus('processing'); recorder.stop(); } },
      cancel() { cancelled = true; controller.abort(); if (recorder?.state === 'recording') recorder.stop(); release(); }
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw error('microphone');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { release(); return; }
        const mimeType = ['audio/webm;codecs=opus','audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
        if (!mimeType) throw error('microphone');
        recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = e => { if (e.data.size) { size += e.data.size; chunks.push(e.data); if (size > MAX_AUDIO) { handle.cancel(); onError(error('invalid_audio')); } } };
        recorder.onerror = () => { handle.cancel(); onError(error('microphone')); };
        recorder.onstop = async () => {
          release(); if (cancelled) return;
          try { onStatus('processing'); const transcript = await transcribe(new Blob(chunks, { type: mimeType }), language, controller.signal); if (!cancelled) onText(transcript); }
          catch (e) { if (!cancelled) onError(e); }
          finally { chunks = []; }
        };
        recorder.start(1000); onStatus('recording'); timer = setTimeout(() => handle.stop(), 60000);
      } catch (e) { release(); if (!cancelled) onError(e.code ? e : error('microphone')); }
    })();
    return handle;
  }
  window.PPAI = { baseUrl, configure, configured: () => !!baseUrl(), request, errorText, ownSession, transcribe, record };
})();
