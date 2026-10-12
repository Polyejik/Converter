/* Portfolio Pulse — единый язык для компонентов в Shadow DOM.
 *
 * Часть интерфейса (Персонал, Часы и результат, Секретарь) рисуется внутри
 * теневых корней со собственными стилями и своей палитрой: зелёный #075440,
 * золото #a48042 и системный шрифт. Обычная таблица стилей внутрь теневого
 * дерева не попадает, поэтому тот же язык — шрифт, палитра, штрих иконок —
 * добавляется каждому теневому корню отдельным элементом <style>.
 *
 * Скрипт идемпотентен, ставит стиль один раз на корень и следит за новыми
 * корнями через MutationObserver (React добавляет их по ходу работы).
 */
(function () {
  'use strict';

  var CSS = [
    ':host{',
    '  font-family:"InterPulse","Inter",-apple-system,"Segoe UI",Arial,sans-serif;',
    '  --green:#10231e;',   /* было #075440 — зелёный хром */
    '  --gold:#5f706a;',    /* было #a48042 — второй акцент */
    '  --ink:#10231e;',
    '  --line:#dde3de;',
    '  --muted:#5f706a;',
    '}',
    'button,input,textarea,select{font-family:inherit;}',
    'button{min-height:44px;}',
    'svg.ui-icon{stroke-width:1.6;}',
    '.icon-accent{opacity:1;}',
    /* остатки старой палитры в разметке компонентов: имена в реестре и хром диалогов */
    '.hr-name,.hr-name strong,.hr-name b{color:#10231e;}',
    '.primary,.dialog .primary,button.primary{background:#10231e !important;color:#ffffff !important;}',
    '.tabs .active,.steps .active,.step.active,[role=tab][aria-selected="true"]{background:#10231e;color:#ffffff;}',
    /* плавающая кнопка «Секретарь» — тоже чернила */
    '#launch,.launch,button#launch{background:#10231e !important;color:#ffffff !important;border-color:#10231e !important;}'
  ].join('');

  var done = typeof WeakSet === 'function' ? new WeakSet() : null;

  function applyTo(root) {
    if (!root) return;
    if (done) {
      if (done.has(root)) return;
      done.add(root);
    } else if (root.querySelector && root.querySelector('style[data-pulse-unified]')) {
      return;
    }
    if (root.querySelector && root.querySelector('style[data-pulse-unified]')) return;
    var style = document.createElement('style');
    style.setAttribute('data-pulse-unified', '1');
    style.textContent = CSS;
    root.appendChild(style);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.shadowRoot) {
      applyTo(node.shadowRoot);
      scanAll(node.shadowRoot);
    }
    if (node.children) {
      for (var i = 0; i < node.children.length; i += 1) scan(node.children[i]);
    }
  }

  function scanAll(root) {
    var all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i += 1) {
      var el = all[i];
      if (el.shadowRoot) {
        applyTo(el.shadowRoot);
        scanAll(el.shadowRoot);
      }
    }
  }

  function start() {
    scan(document.documentElement);
    if (typeof MutationObserver === 'function') {
      var pending = false;
      var observer = new MutationObserver(function (records) {
        if (pending) return;
        pending = true;
        /* собираем пакетом: React делает много вставок за кадр */
        (window.requestAnimationFrame || window.setTimeout)(function () {
          pending = false;
          for (var i = 0; i < records.length; i += 1) {
            var added = records[i].addedNodes;
            for (var j = 0; j < added.length; j += 1) scan(added[j]);
          }
        }, 16);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
