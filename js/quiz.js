/* ============================================================
   ChinaRoom — multi-step lead quiz. Self-contained.
   Renders into #quiz; no-ops if absent. No deps on main.js.
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('quiz');
  if (!root) return;

  var steps = [
    {
      key: 'category', title: 'Что хотите привезти?', type: 'choice',
      options: ['Кухню', 'Диван / мягкую мебель', 'Спальню / кровать', 'Шкаф / гардеробную', 'Сантехнику', 'Несколько категорий'],
    },
    {
      key: 'budget', title: 'Ориентировочный бюджет', type: 'choice',
      options: ['до 100 000 ₽', '100 000 – 300 000 ₽', '300 000 – 600 000 ₽', 'от 600 000 ₽'],
    },
    {
      key: 'city', title: 'Город доставки', type: 'text',
      placeholder: 'Например, Казань', hint: 'Доставляем в любой город России.',
    },
    {
      key: 'contact', title: 'Куда отправить расчёт?', type: 'contact',
    },
  ];

  var state = { step: 0, answers: {} };
  var TOTAL = steps.length;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var s = steps[state.step];
    var pct = Math.round((state.step) / TOTAL * 100);
    var html = '' +
      '<div class="quiz">' +
        '<div class="quiz__bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="quiz__head">' +
          '<span class="quiz__step">Шаг ' + (state.step + 1) + ' из ' + TOTAL + '</span>' +
          '<h3 class="quiz__title">' + esc(s.title) + '</h3>' +
        '</div>' +
        '<div class="quiz__body">' + bodyFor(s) + '</div>' +
        '<div class="quiz__nav">' +
          (state.step > 0 ? '<button type="button" class="quiz__back" data-back>← Назад</button>' : '<span></span>') +
          (s.type === 'choice' ? '' : '<button type="button" class="btn btn--gold quiz__next" data-next>' + (state.step === TOTAL - 1 ? 'Получить расчёт' : 'Далее →') + '</button>') +
        '</div>' +
      '</div>';
    root.innerHTML = html;
    bind(s);
  }

  function bodyFor(s) {
    if (s.type === 'choice') {
      return '<div class="quiz__options">' + s.options.map(function (o) {
        var sel = state.answers[s.key] === o ? ' is-selected' : '';
        return '<button type="button" class="quiz__opt' + sel + '" data-opt="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    }
    if (s.type === 'text') {
      return '<div class="form__group quiz__field">' +
        '<input type="text" id="quizCity" placeholder=" " value="' + esc(state.answers.city || '') + '">' +
        '<label for="quizCity">' + esc(s.placeholder || 'Город') + '</label>' +
        '</div>' + (s.hint ? '<p class="quiz__hint">' + esc(s.hint) + '</p>' : '');
    }
    // contact
    return '<div class="form__group quiz__field"><input type="text" id="quizName" placeholder=" " value="' + esc(state.answers.name || '') + '"><label for="quizName">Ваше имя</label></div>' +
      '<div class="form__group quiz__field"><input type="tel" id="quizPhone" placeholder=" " value="' + esc(state.answers.phone || '') + '"><label for="quizPhone">Телефон</label></div>' +
      '<p class="quiz__hint">Перезвоним в течение 15 минут в рабочее время. Никакого спама.</p>';
  }

  function bind(s) {
    var back = root.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { state.step--; render(); });

    if (s.type === 'choice') {
      root.querySelectorAll('[data-opt]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.answers[s.key] = b.getAttribute('data-opt');
          if (state.step < TOTAL - 1) { state.step++; render(); } else { finish(); }
        });
      });
    }

    var next = root.querySelector('[data-next]');
    if (next) next.addEventListener('click', function () {
      if (s.type === 'text') {
        var v = root.querySelector('#quizCity').value.trim();
        if (!v) { shake('#quizCity'); return; }
        state.answers.city = v;
        state.step++; render();
      } else if (s.type === 'contact') {
        var name = root.querySelector('#quizName');
        var phone = root.querySelector('#quizPhone');
        var ok = true;
        if (!name.value.trim()) { shake('#quizName'); ok = false; }
        if (phone.value.replace(/\D/g, '').length < 10) { shake('#quizPhone'); ok = false; }
        if (!ok) return;
        state.answers.name = name.value.trim();
        state.answers.phone = phone.value.trim();
        finish();
      }
    });
  }

  function shake(sel) {
    var el = root.querySelector(sel);
    if (!el) return;
    el.classList.add('is-error');
    el.focus();
  }

  function finish() {
    // TODO(backend): отправить state.answers на сервер / Telegram-бот / CRM.
    // fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(state.answers) });
    var a = state.answers;
    root.innerHTML = '<div class="quiz quiz--done">' +
      '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>' +
      '<h3>Спасибо, ' + esc(a.name || '') + '!</h3>' +
      '<p>Заявка принята. Подберём варианты' + (a.category ? ' (' + esc(a.category).toLowerCase() + ')' : '') +
        (a.city ? ' с доставкой в город ' + esc(a.city) : '') + ' и свяжемся с вами в течение 15 минут.</p>' +
      '<a href="catalog.html" class="btn btn--ghost" data-magnetic>Пока посмотреть каталог</a>' +
      '</div>';
  }

  // clear error on input
  root.addEventListener('input', function (e) {
    if (e.target.classList) e.target.classList.remove('is-error');
  });

  render();
})();
