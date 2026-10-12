/* Portfolio Pulse — локализация терминов на слое отображения.
 *
 * Часть подписей в приложении приходит из технических справочников (названия
 * вех и этапов) и выводится в разметку напрямую, минуя словарь интерфейса.
 * Поэтому в русском режиме такие подписи переводятся здесь — ровно по точному
 * совпадению текста, без подстрок и без вмешательства в данные.
 *
 * Что это НЕ делает: не меняет названия клиентов и проектов, не трогает
 * английский режим и не подменяет значения — только видимые подписи.
 */
(function () {
  'use strict';

  var DICT = {
    'Mobilisation': 'Мобилизация',
    'Technical delivery': 'Техническая работа',
    'Final delivery': 'Финальная сдача',
    'Client payment cycle': 'Цикл оплаты клиента',
    'Client clarification affects the forecast.': 'Уточнение клиента влияет на прогноз.',
    'Bank receipt': 'Поступление в банк',
    'First bank tranche': 'Первый банковский транш',
    'Second bank tranche': 'Второй банковский транш'
  };

  var LIGHT_ROOTS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'];

  function isRussian() {
    return (document.documentElement.getAttribute('lang') || 'ru').slice(0, 2) === 'ru';
  }

  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var trimmed = raw.trim();
    if (!trimmed) return;
    var hit = DICT[trimmed];
    if (!hit) return;
    var lead = raw.slice(0, raw.indexOf(trimmed));
    var tail = raw.slice(raw.indexOf(trimmed) + trimmed.length);
    node.nodeValue = lead + hit + tail;
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1) return;
    if (LIGHT_ROOTS.indexOf(root.tagName) >= 0) return;
    if (root.shadowRoot) walk(root.shadowRoot);
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i += 1) walk(kids[i]);
  }

  function run() {
    if (!isRussian()) return;
    walk(document.body);
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(function () {
      scheduled = false;
      run();
    }, 40);
  }

  function start() {
    run();
    if (typeof MutationObserver === 'function') {
      var observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ['lang']
      });
    }
    window.addEventListener('load', run);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
