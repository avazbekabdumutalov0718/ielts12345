/* Expects these globals to already exist from the test's own inline <script>:
   TOTAL, Q_START, Q_END, KEY, answers, isCorrect(n,val), getBand(score), showResults()
   Optionally: groupCorrectness() (used by tests with paired/group-scored questions)
   Expects these globals to be defined BEFORE this script in the HTML file:
   TEST_ID (string), TEST_DURATION_MIN (number), C1_WORDS ([{word, def}, ...]) */

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===================== START SCREEN + FULLSCREEN ===================== */
let timerInterval = null;
let remainingSeconds = (typeof TEST_DURATION_MIN !== 'undefined' ? TEST_DURATION_MIN : 20) * 60;

(function initStartScreen() {
  const testName = document.title.replace(/^IELTS Reading\s*[–-]\s*/, '');
  const overlay = document.createElement('div');
  overlay.id = 'startOverlay';
  overlay.innerHTML = `
    <div class="start-card">
      <div class="start-logo">IELTS READING PRACTICE</div>
      <h2>${testName}</h2>
      <p>You are about to start a timed reading test (${Math.floor(remainingSeconds / 60)} minutes).</p>
      <ul class="start-rules">
        <li>The test opens in full-screen mode.</li>
        <li>Select text to <strong>highlight</strong> it.</li>
        <li>Double-click a question number at the bottom to <strong>flag</strong> it for review.</li>
        <li>Use the 📝 notes button to jot down thoughts during the test.</li>
        <li>When time runs out, your test is submitted automatically.</li>
      </ul>
      <button class="start-btn" id="startTestBtn">Start Test (Full Screen)</button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('startTestBtn').addEventListener('click', () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) { try { req.call(el); } catch (e) {} }
    overlay.remove();
    startTimer();
  });
})();

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function startTimer() {
  const topControls = document.querySelector('.top-controls');
  const timerEl = document.createElement('div');
  timerEl.className = 'test-timer';
  timerEl.id = 'testTimer';
  timerEl.textContent = formatTime(remainingSeconds);
  topControls.parentNode.insertBefore(timerEl, topControls);

  timerInterval = setInterval(() => {
    remainingSeconds--;
    timerEl.textContent = formatTime(remainingSeconds);
    if (remainingSeconds <= 300) timerEl.classList.add('low');
    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      if (typeof showResults === 'function') showResults();
    }
  }, 1000);
}

/* ===================== FLAG QUESTIONS ===================== */
(function initFlags() {
  document.querySelectorAll('.qbtn').forEach((btn) => {
    btn.title = 'Double-click to flag for review';
    btn.addEventListener('dblclick', (e) => {
      e.preventDefault();
      btn.classList.toggle('flagged');
    });
  });
})();

/* ===================== NOTES PANEL ===================== */
(function initNotes() {
  const notesBtn = document.createElement('button');
  notesBtn.className = 'icon-btn';
  notesBtn.id = 'btn-notes';
  notesBtn.title = 'Notes';
  notesBtn.textContent = '📝';
  const divider = document.querySelector('.top-controls .divider');
  divider.parentNode.insertBefore(notesBtn, divider);

  const panel = document.createElement('div');
  panel.id = 'notesPanel';
  panel.innerHTML = `
    <div class="notes-panel-head">
      <span>My Notes</span>
      <button id="notesClose">&times;</button>
    </div>
    <textarea id="notesArea" placeholder="Jot down anything useful during the test..."></textarea>`;
  document.body.appendChild(panel);

  const storageKey = 'notes_' + (typeof TEST_ID !== 'undefined' ? TEST_ID : 'default');
  const area = panel.querySelector('#notesArea');
  try { area.value = localStorage.getItem(storageKey) || ''; } catch (e) {}
  area.addEventListener('input', () => {
    try { localStorage.setItem(storageKey, area.value); } catch (e) {}
  });

  notesBtn.addEventListener('click', () => panel.classList.toggle('open'));
  panel.querySelector('#notesClose').addEventListener('click', () => panel.classList.remove('open'));
})();

/* ===================== INTERCEPT SUBMIT / RESULTS ===================== */
if (typeof showResults === 'function') {
  const originalShowResults = showResults;
  showResults = function () {
    originalShowResults();
    onTestSubmitted();
  };
}

function computeScore() {
  let score = 0;
  for (let n = Q_START; n <= Q_END; n++) {
    let ok;
    if (typeof groupCorrectness === 'function' && (n === 21 || n === 22)) {
      ok = groupCorrectness()[n];
    } else {
      ok = isCorrect(n, answers[n]);
    }
    if (ok) score++;
  }
  return score;
}

function onTestSubmitted() {
  if (timerInterval) clearInterval(timerInterval);
  document.querySelectorAll('.question').forEach((el) => { el.disabled = true; });

  const score = computeScore();
  const band = getBand(score);
  window.__READING_RESULT = { score, total: TOTAL, band };

  if (typeof VividDB !== 'undefined') {
    VividDB.saveReadingResult(typeof TEST_ID !== 'undefined' ? TEST_ID : 'unknown', score, TOTAL, band, null);
    VividDB.showSavedToast('✓ Result saved');
  }

  const actions = document.querySelector('#modal .actions');
  if (actions && !document.getElementById('goVocabBtn')) {
    const reviewBtn = actions.querySelector('.secondary');
    if (reviewBtn) reviewBtn.addEventListener('click', reviewAnswers);

    const vocabBtn = document.createElement('button');
    vocabBtn.id = 'goVocabBtn';
    vocabBtn.textContent = 'Continue to Vocabulary Test →';
    vocabBtn.addEventListener('click', () => {
      document.getElementById('overlay').classList.remove('visible');
      reviewAnswers();
      startVocabTest();
    });
    actions.appendChild(vocabBtn);
  }
}

function reviewAnswers() {
  document.querySelectorAll('.question').forEach((el) => {
    const n = +el.dataset.q;
    let ok, correctVal;
    if (typeof groupCorrectness === 'function' && (n === 21 || n === 22)) {
      const gc = groupCorrectness();
      ok = gc[n];
      correctVal = gc['correct' + n];
    } else {
      ok = isCorrect(n, answers[n]);
      correctVal = KEY[n] ? KEY[n][0] : '';
    }
    el.classList.remove('q-correct', 'q-incorrect');
    el.classList.add(ok ? 'q-correct' : 'q-incorrect');
    const existingBadge = el.parentNode.querySelector('.q-correct-badge[data-for="' + n + '"]');
    if (existingBadge) existingBadge.remove();
    if (!ok) {
      const badge = document.createElement('span');
      badge.className = 'q-correct-badge';
      badge.dataset.for = n;
      badge.textContent = 'Answer: ' + correctVal;
      el.insertAdjacentElement('afterend', badge);
    }
  });
}

/* ===================== VOCABULARY TEST (C1 words from the passage) ===================== */
function startVocabTest() {
  const source = (typeof C1_WORDS !== 'undefined' && C1_WORDS.length) ? C1_WORDS : [];
  const words = shuffleArr(source).slice(0, 20);
  let vIndex = 0, vScore = 0;

  const overlay = document.createElement('div');
  overlay.id = 'vocabOverlay';
  document.body.appendChild(overlay);

  renderVocabQuestion();

  function renderVocabQuestion() {
    if (vIndex >= words.length) {
      overlay.remove();
      showCertificate(vScore, words.length);
      return;
    }
    const w = words[vIndex];
    const distractors = shuffleArr(words.filter((x) => x.word !== w.word)).slice(0, 3).map((x) => x.def);
    const options = shuffleArr([w.def, ...distractors]);
    overlay.innerHTML = `
      <div class="vocab-card">
        <p class="vocab-progress">WORD ${vIndex + 1} / ${words.length}</p>
        <h2>${w.word}</h2>
        <p class="vocab-sub">Choose the correct meaning:</p>
        <div class="vocab-options">
          ${options.map((o) => `<button class="vocab-option">${o}</button>`).join('')}
        </div>
      </div>`;
    overlay.querySelectorAll('.vocab-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.vocab-option').forEach((b) => (b.disabled = true));
        const correct = btn.textContent === w.def;
        btn.classList.add(correct ? 'correct' : 'incorrect');
        if (!correct) {
          [...overlay.querySelectorAll('.vocab-option')].find((b) => b.textContent === w.def)?.classList.add('correct');
        } else {
          vScore++;
        }
        setTimeout(() => { vIndex++; renderVocabQuestion(); }, 700);
      });
    });
  }
}

/* ===================== CERTIFICATE ===================== */
function showCertificate(vocabScore, vocabTotal) {
  const r = window.__READING_RESULT || { score: 0, total: TOTAL, band: '-' };
  const name = document.querySelector('.test-taker')?.textContent?.trim() || 'Student';
  const testName = document.title.replace(/^IELTS Reading\s*[–-]\s*/, '');
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const overlay = document.createElement('div');
  overlay.id = 'certOverlay';
  overlay.innerHTML = `
    <div class="cert-card" id="certCard">
      <div class="cert-border">
        <p class="cert-brand">VIVID IELTS</p>
        <h1 class="cert-title">Certificate of Completion</h1>
        <p class="cert-sub">This certifies that</p>
        <h2 class="cert-name">${name}</h2>
        <p class="cert-sub">has successfully completed</p>
        <h3 class="cert-test">${testName}</h3>
        <div class="cert-stats">
          <div><span>${r.score}/${r.total}</span><label>Reading score</label></div>
          <div><span>Band ${r.band}</span><label>Estimated band</label></div>
          <div><span>${vocabScore}/${vocabTotal}</span><label>Vocabulary score</label></div>
        </div>
        <p class="cert-date">${date}</p>
      </div>
      <div class="cert-actions">
        <button id="certPrint">🖨 Print / Save PDF</button>
        <button id="certClose" class="secondary">Close</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('certPrint').addEventListener('click', () => window.print());
  document.getElementById('certClose').addEventListener('click', () => overlay.remove());
}