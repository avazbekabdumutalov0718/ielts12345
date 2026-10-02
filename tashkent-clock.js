/* Toshkent (O‘zbekiston, UTC+5) vaqti — sayt tepasida, barcha bo‘limlarda, soniyagacha. */
(function () {
  'use strict';
  var TZ = 'Asia/Tashkent';
  var bar, timeEl, dateEl;
  if (window.self !== window.top) return; // iframe ichida (jurnal) ikkinchi soat kerak emas

  var timeFmt, dateFmt;
  try {
    timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'short' });
  } catch (e) { timeFmt = dateFmt = null; }

  var WEEKDAYS = { Mon: 'Dushanba', Tue: 'Seshanba', Wed: 'Chorshanba', Thu: 'Payshanba', Fri: 'Juma', Sat: 'Shanba', Sun: 'Yakshanba' };

  function pad(n) { return String(n).padStart(2, '0'); }

  function tashkentNow() {
    var now = new Date();
    if (timeFmt) {
      var t = timeFmt.format(now);                       // "14:32:07"
      var parts = {};
      dateFmt.formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
      return { time: t, date: parts.day + '.' + parts.month + '.' + parts.year, weekday: WEEKDAYS[parts.weekday] || parts.weekday };
    }
    // Zaxira: UTC + 5 soat (O‘zbekistonda yozgi/qishki vaqt yo‘q)
    var u = new Date(now.getTime() + 5 * 3600 * 1000);
    var days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    return {
      time: pad(u.getUTCHours()) + ':' + pad(u.getUTCMinutes()) + ':' + pad(u.getUTCSeconds()),
      date: pad(u.getUTCDate()) + '.' + pad(u.getUTCMonth() + 1) + '.' + u.getUTCFullYear(),
      weekday: days[u.getUTCDay()]
    };
  }

  function paint() {
    var n = tashkentNow();
    if (timeEl.textContent !== n.time) timeEl.textContent = n.time;
    var d = n.weekday + ' · ' + n.date;
    if (dateEl.textContent !== d) dateEl.textContent = d;
    bar.setAttribute('aria-label', 'Toshkent vaqti ' + n.time);
  }

  function schedule() {
    paint();
    // Keyingi soniya boshlanishiga aniq tushish uchun (sekinlashib qolmaydi)
    setTimeout(schedule, 1000 - (Date.now() % 1000) + 5);
  }

  function build() {
    if (document.getElementById('tzClock')) return;
    bar = document.createElement('div');
    bar.id = 'tzClock';
    bar.setAttribute('role', 'timer');
    bar.innerHTML =
      '<span class="tz-label"><span class="tz-flag" aria-hidden="true">🇺🇿</span> Toshkent vaqti <small>UTC+5</small></span>' +
      '<strong class="tz-time" id="tzTime">--:--:--</strong>' +
      '<span class="tz-date" id="tzDate"></span>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-tz-clock');
    timeEl = bar.querySelector('#tzTime');
    dateEl = bar.querySelector('#tzDate');
    schedule();
    // Fon tabga o‘tib qaytilganda darhol yangilash
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
