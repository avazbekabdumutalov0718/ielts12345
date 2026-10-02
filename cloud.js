// VIVID IELTS cloud auth + Supabase sync.
// Uses only the public/publishable Supabase key; never a service-role key.
(() => {
  'use strict';
  const config = window.VOCAB_SUPABASE;
  const gate = document.getElementById('cloudGate');
  const status = document.getElementById('cloudStatus');
  const logout = document.getElementById('cloudLogout');
  const bucket = 'vocab-atlas-audio';
  const stateCategory = '_vocab_atlas_state_v1';
  const entryKey = 'vivid:entry-seen-v14';
  const client = window.supabase && config && window.supabase.createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  let userId = null, userEmail = '', mode = 'locked', stateTable = 'user_state', provider = null, queued = false, sending = false, timer = null;

  function statusText(text, error = false) {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('error', error);
    status.title = text;
  }
  function message(value, ok = false) {
    const el = document.getElementById('cloudMessage');
    if (el) { el.textContent = value || ''; el.classList.toggle('ok', ok); }
  }
  function oauthRedirect() { return `${location.origin}${location.pathname}`; }
  function isOAuthReturn() { return /(?:\?|&)code=/.test(location.search) || /(?:^|[#&])access_token=/.test(location.hash); }
  function pendingKey() { return `va:${userId}:pending-cloud-v1`; }
  function pendingData() { try { return JSON.parse(localStorage.getItem(pendingKey())); } catch { return null; } }

  const googleIcon = `<svg width="19" height="19" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`;

  function entryMarkup() {
    return `<div class="vivid-entry-shell vivid-entry-v19">
      <header class="vivid-entry-header">
        <div class="vivid-entry-brand"><span class="vivid-auth-logo">V</span><strong>VIVID <em>IELTS</em></strong></div>
        <nav class="vivid-entry-nav"><a href="#entrySkills">Skills</a><a href="#entryExam">Real Exam</a><a href="#entryFlow">Study flow</a><a href="#entryPremium">Premium</a><button type="button" data-entry-login>Log in</button></nav>
      </header>
      <main class="vivid-entry-main vivid-entry-hero">
        <section class="vivid-entry-copy">
          <span class="vivid-entry-eyebrow">YOUR IELTS STUDY SPACE</span>
          <h1>Learn deeper.<br><span>Practice smarter.</span><br>Keep everything together.</h1>
          <p>Reading, Listening, Writing, Speaking, Grammar va Vocabulary uchun bitta tartibli workspace. Real Reading passage testlari, Listening testlari, Booster mashqlari, mocklar va shaxsiy progress bir hisobda davom etadi.</p>
          <div class="vivid-entry-trust"><span>📘 Reading tests</span><span>🎧 Listening tests</span><span>✍️ Writing lab</span><span>🗣 Speaking practice</span><span>🧩 Grammar</span><span>☁️ Cloud progress</span></div>
          <div class="vivid-entry-actions"><button type="button" class="vivid-entry-start" data-entry-start>VIVID IELTS'ni boshlash <b>→</b></button><button type="button" class="vivid-entry-login" data-entry-login>Hisobga kirish</button></div>
        </section>
        <section class="vivid-entry-media">
          <div class="vivid-entry-video-frame">
            <div class="vivid-entry-windowbar"><i></i><i></i><i></i><span>VIVID IELTS · study workspace</span></div>
            <video id="vividEntryVideo" autoplay muted loop playsinline preload="metadata" poster="vivid-ielts-promo-v19-poster.jpg"><source src="vivid-ielts-promo-v19.mp4" type="video/mp4"></video>
          </div>
          <div class="vivid-entry-floating vivid-entry-float-a"><b>Real Exam</b><span>Passage + questions together</span></div>
          <div class="vivid-entry-floating vivid-entry-float-b"><b>One account</b><span>Your study history follows you</span></div>
        </section>
      </main>
      <section id="entrySkills" class="vivid-entry-showcase">
        <div class="vivid-section-kicker">ALL SKILLS · ONE WORKSPACE</div>
        <h2>Har bir skill uchun <span>alohida chuqur practice.</span></h2>
        <div class="vivid-skill-grid">
          <article class="vivid-skill-card reading"><div class="vivid-puffy-icon">R</div><div><small>READING</small><h3>Passage test + Booster</h3><p>Single-passage IELTS testlarini passage va savollar bilan birga ishlang. Booster’da esa passage’ni tushunish, vocabulary, translation, summary va comprehension mashqlari bilan chuqur o‘rganing.</p></div></article>
          <article class="vivid-skill-card listening"><div class="vivid-puffy-icon">L</div><div><small>LISTENING</small><h3>Real test + Audio Focus</h3><p>Real Listening testlarini audio va savollar bilan bajaring. Listening Boost’da transcript yopiq holatda MCQ, gap fill, paraphrase va dictation orqali eshitishni mustahkamlang.</p></div></article>
          <article class="vivid-skill-card writing"><div class="vivid-puffy-icon">W</div><div><small>WRITING</small><h3>Writing Mastery</h3><p>Idea, outline, paragraph, sample-answer analysis, collocation, grammar va mock mashqlarini bitta Writing Lab ichida ketma-ket bajaring.</p></div></article>
          <article class="vivid-skill-card speaking"><div class="vivid-puffy-icon">S</div><div><small>SPEAKING</small><h3>Upgrade your answers</h3><p>Part 1–3 savollari, topic collocationlar, topic barabani, Daily Speaking va Speaking Mock orqali javoblaringizni rejalashtiring va yozib boring.</p></div></article>
          <article class="vivid-skill-card grammar"><div class="vivid-puffy-icon">G</div><div><small>GRAMMAR</small><h3>Grammar that you actually use</h3><p>Tenses, IELTS grammar structures va mixed drills orqali grammar’ni faqat o‘qib emas, mashq qilib mustahkamlang.</p></div></article>
          <article class="vivid-skill-card vocab"><div class="vivid-puffy-icon">V</div><div><small>VOCABULARY</small><h3>Words that stay with you</h3><p>Flashcards, spaced review, mistakes, favorites, search va games orqali Speaking va Reading vocabulary’ni faol ishlating.</p></div></article>
        </div>
      </section>
      <section id="entryExam" class="vivid-entry-exam">
        <div class="vivid-entry-exam-copy"><div class="vivid-section-kicker">REAL EXAM PRACTICE</div><h2>Testni faqat ko‘rmang — <span>haqiqiy formatda ishlang.</span></h2><p>Reading Passages bo‘limida passage va savollar yonma-yon ishlaydi. Listening Tests bo‘limida audio player, savollar va submit jarayoni bitta toza VIVID IELTS test interfeysida qoladi. Test tugagach history va javoblar hisobingizga saqlanadi.</p></div>
        <div class="vivid-entry-exam-cards"><article><span>📘</span><h3>Reading Passages</h3><p>Highlight, answer checking va test history bilan single-passage practice.</p></article><article><span>🎧</span><h3>Listening Tests</h3><p>Audio bilan real-exam savollarini tartibli test sahifasida bajaring.</p></article><article><span>🗂️</span><h3>Mocks & History</h3><p>Reading, Listening va Speaking mock faoliyatingizni keyin Natijalar bo‘limida ko‘ring.</p></article></div>
      </section>
      <section id="entryFlow" class="vivid-entry-flow">
        <div class="vivid-flow-art"><div class="vivid-puffy-word">Study<br>flow</div><div class="vivid-puffy-play">▶</div></div>
        <div class="vivid-flow-copy"><div class="vivid-section-kicker">ACTIVE LEARNING</div><h2>O‘rganish → mashq → test → review.</h2><p>Har bir bo‘lim boshqa bo‘limdan uzilib qolmaydi. Xato qilgan so‘zlaringiz Xato daftarga tushadi, review qaytib keladi, mock va Booster natijalari history’da saqlanadi.</p><div class="vivid-flow-steps"><span><b>✦</b> Learn</span><span><b>→</b> Practice</span><span><b>→</b> Test</span><span><b>↻</b> Review</span></div></div>
      </section>
      <section class="vivid-entry-tools">
        <div class="vivid-section-kicker">TOOLS THAT STAY USEFUL</div><h2>Bir sayt ichida kerakli study tools.</h2>
        <div class="vivid-tools-grid"><article><span>🔎</span><h3>Search</h3><p>So‘z va iboralarni tez toping, favorite yoki review’ga yuboring.</p></article><article><span>🎮</span><h3>Games</h3><p>Flashcard, matching, gap fill, typing va sentence-builder orqali takrorlang.</p></article><article><span>🏆</span><h3>Results</h3><p>Testlar, vocabulary, grammar, Booster va mock tarixini bir joyda kuzating.</p></article><article><span>☁️</span><h3>Cloud Sync</h3><p>Account bilan kirganingizda progress qurilmalar orasida davom etadi.</p></article></div>
      </section>
      <section id="entryPremium" class="vivid-entry-premium-teaser"><div><div class="vivid-section-kicker">VIVID PREMIUM</div><h2>Qo‘shimcha imkoniyatlarni bot orqali oling.</h2><p>Premium tariflarni ko‘rish, kerakli rejani tanlash va xaridni VIVID IELTS bot orqali davom ettirish mumkin.</p></div><button type="button" data-entry-premium>Premium rejalar →</button></section>
      <section class="vivid-entry-final"><div><div class="vivid-section-kicker">READY WHEN YOU ARE</div><h2>Bugungi practice’ni <span>bitta workspace</span>dan boshlang.</h2><p>Hisobga kiring va qayerda to‘xtagan bo‘lsangiz, o‘sha yerdan davom eting.</p></div><button type="button" data-entry-start>VIVID IELTS'ni ochish →</button></section>
    </div>`;
  }

  function authMarkup() {
    return `<div class="vivid-auth-wrap">
      <aside class="vivid-auth-visual">
        <div class="vivid-auth-bg"><video id="cloudAuthVideo" autoplay muted loop playsinline><source src="academy/assets/auth-bg.mp4" type="video/mp4"></video></div>
        <div class="vivid-auth-brand"><span class="vivid-auth-logo">V</span><strong>VIVID <em>IELTS</em></strong></div>
        <div class="vivid-auth-copy"><h1>Every login is one step closer to <span>Band 7+</span>.</h1><p>Track vocabulary, grammar, boosters and mock scores in one place — continue exactly where you left off.</p></div>
        <div class="vivid-score-card"><small>YOUR JOURNEY</small><div class="vivid-spectrum"><i style="left:22%"><b>5.5</b></i><i class="target" style="left:78%"><b>7.0</b></i></div><div class="vivid-scale"><span>5.0</span><span>6.0</span><span>7.0</span><span>8.0</span><span>9.0</span></div><div class="vivid-rings"><div><span style="--p:72">72</span><b>Listening</b></div><div><span style="--p:58">58</span><b>Reading</b></div><div><span style="--p:45">45</span><b>Writing</b></div><div><span style="--p:63">63</span><b>Speaking</b></div></div></div>
        <p class="vivid-auth-quote">Your VIVID IELTS progress stays with your account.</p>
      </aside>
      <main class="vivid-auth-panel"><div class="vivid-auth-panel-inner">
        <button type="button" id="cloudBackToEntry" class="vivid-auth-back">← VIVID IELTS</button>
        <button type="button" id="cloudThemeToggle" class="vivid-theme-toggle" aria-label="Theme">☾</button>
        <div class="cloud-auth-tabs" role="tablist"><button type="button" class="cloud-auth-tab active" data-auth-tab="login" aria-selected="true">Log in</button><button type="button" class="cloud-auth-tab" data-auth-tab="signup" aria-selected="false">Sign up</button></div>
        <form id="cloudLoginForm" class="cloud-auth-form vivid-auth-form">
          <h1>Welcome back</h1><p>Log in to continue your IELTS plan.</p>
          <label class="vivid-field"><span>Email</span><input id="cloudEmail" type="email" autocomplete="email" placeholder="you@example.com" required></label>
          <label class="vivid-field"><span>Password</span><span class="cloud-pass-wrap"><input id="cloudPassword" type="password" minlength="6" autocomplete="current-password" placeholder="••••••••" required><button type="button" class="cloud-pass-toggle" data-pass="cloudPassword">Show</button></span></label>
          <div class="vivid-auth-row"><label class="cloud-remember"><input id="cloudRemember" type="checkbox" checked><span>Remember me</span></label><button class="vivid-forgot" id="cloudForgot" type="button">Forgot password?</button></div>
          <button type="submit" class="vivid-login-button cloud-submit">Log in</button>
          <div class="cloud-divider"><span>or continue with</span></div><button type="button" class="vivid-google" data-cloud-oauth="google">${googleIcon}Google</button>
          <p class="cloud-switch-copy">Don't have an account? <button type="button" data-auth-switch="signup">Sign up</button></p>
        </form>
        <form id="cloudSignupForm" class="cloud-auth-form vivid-auth-form" hidden>
          <h1>Create your account</h1><p>Start your VIVID IELTS plan and sync progress across devices.</p>
          <label class="vivid-field"><span>Full name</span><input id="cloudName" type="text" autocomplete="name" placeholder="Your name" required></label>
          <label class="vivid-field"><span>Email</span><input id="cloudSignupEmail" type="email" autocomplete="email" placeholder="you@example.com" required></label>
          <label class="vivid-field"><span>Password</span><span class="cloud-pass-wrap"><input id="cloudSignupPassword" type="password" minlength="6" autocomplete="new-password" placeholder="At least 6 characters" required><button type="button" class="cloud-pass-toggle" data-pass="cloudSignupPassword">Show</button></span></label>
          <button type="submit" class="vivid-login-button cloud-submit">Create account</button>
          <div class="cloud-divider"><span>or continue with</span></div><button type="button" class="vivid-google" data-cloud-oauth="google">${googleIcon}Google</button>
          <p class="cloud-switch-copy">Already have an account? <button type="button" data-auth-switch="login">Log in</button></p>
        </form>
        <div class="cloud-msg" id="cloudMessage" role="alert"></div>
      </div></main></div>`;
  }

  function renderEntry(onReady) {
    mode = 'locked';
    document.body.classList.add('cloud-locked', 'vivid-entry-active');
    document.body.classList.remove('prep-active', 'vivid-auth-active');
    gate.classList.remove('cloud-auth-dark');
    gate.setAttribute('aria-label', 'VIVID IELTS kirish sahifasi');
    gate.innerHTML = entryMarkup();
    const openAuth = async () => {
      try { sessionStorage.setItem(entryKey, '1'); } catch {}
      renderAuthOnly();
      wireAuth(onReady);
      try {
        const { data } = await client?.auth.getSession?.() || { data: null };
        const email = data?.session?.user?.email || '';
        const input = document.getElementById('cloudEmail');
        if (input && email) input.value = email;
      } catch {}
      document.getElementById('cloudEmail')?.focus({ preventScroll: true });
    };
    document.querySelectorAll('[data-entry-start],[data-entry-login]').forEach(btn => btn.onclick = openAuth);
    document.querySelectorAll('[data-entry-premium]').forEach(btn => btn.onclick = () => { try { sessionStorage.setItem('vivid:open-after-login','premium'); } catch {} openAuth(); });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.getElementById('vividEntryVideo')?.pause();
  }

  function renderAuthOnly() {
    mode = 'locked';
    document.body.classList.add('cloud-locked', 'vivid-auth-active');
    document.body.classList.remove('prep-active', 'vivid-entry-active');
    gate.classList.remove('cloud-auth-dark');
    gate.setAttribute('aria-label', 'Hisobga kirish');
    gate.innerHTML = authMarkup();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.getElementById('cloudAuthVideo')?.pause();
  }

  async function signInWithGoogle(button) {
    if (!client) return;
    if (button) button.disabled = true;
    message('');
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: oauthRedirect() } });
    if (error) {
      if (button) button.disabled = false;
      message(error.message || 'Google orqali kirishda xatolik.');
    }
  }

  function renderRememberedSession(user, onReady) {
    const box = document.getElementById('cloudSavedSession');
    if (!box || !user) return;
    const email = user.email || user.user_metadata?.email || 'VIVID IELTS account';
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
    box.hidden = false;
    box.innerHTML = `<div class="cloud-saved-avatar">${String(name || 'V').trim().charAt(0).toUpperCase()}</div><div class="cloud-saved-copy"><small>ACCOUNT REMEMBERED</small><strong>${escapeHtml(name)}</strong><span>${escapeHtml(email)}</span></div><div class="cloud-saved-actions"><button type="button" id="cloudContinueSession">Continue</button><button type="button" id="cloudOtherAccount">Other account</button></div>`;
    const emailInput = document.getElementById('cloudEmail');
    if (emailInput && !emailInput.value) emailInput.value = email;
    document.getElementById('cloudContinueSession').onclick = async event => {
      const button = event.currentTarget; button.disabled = true; button.textContent = 'Opening…';
      try { await openSession(onReady); } catch { button.disabled = false; button.textContent = 'Continue'; }
    };
    document.getElementById('cloudOtherAccount').onclick = async () => {
      await client.auth.signOut();
      userId = null; userEmail = ''; mode = 'locked';
      box.hidden = true; box.innerHTML = '';
      if (emailInput) emailInput.value = '';
      document.getElementById('cloudPassword')?.focus();
    };
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }

  function wireAuth(onReady) {
    const tabs = [...document.querySelectorAll('[data-auth-tab]')];
    const login = document.getElementById('cloudLoginForm');
    const signup = document.getElementById('cloudSignupForm');
    if (!login || !signup) return;
    const showTab = name => {
      tabs.forEach(t => { const on = t.dataset.authTab === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
      login.hidden = name !== 'login'; signup.hidden = name !== 'signup'; message('');
    };
    tabs.forEach(t => t.onclick = () => showTab(t.dataset.authTab));
    document.querySelectorAll('[data-auth-switch]').forEach(b => b.onclick = () => showTab(b.dataset.authSwitch));
    document.querySelectorAll('.cloud-pass-toggle').forEach(b => b.onclick = () => { const input = document.getElementById(b.dataset.pass), hidden = input.type === 'password'; input.type = hidden ? 'text' : 'password'; b.textContent = hidden ? 'Hide' : 'Show'; });
    document.querySelectorAll('[data-cloud-oauth="google"]').forEach(b => b.onclick = () => signInWithGoogle(b));
    document.getElementById('cloudThemeToggle').onclick = () => gate.classList.toggle('cloud-auth-dark');
    document.getElementById('cloudBackToEntry').onclick = () => { try { sessionStorage.removeItem(entryKey); } catch {} renderEntry(onReady); };
    document.getElementById('cloudForgot').onclick = async () => {
      const email = document.getElementById('cloudEmail').value.trim();
      if (!email) { message('Avval email manzilingizni kiriting.'); return; }
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: oauthRedirect() });
      message(error ? (error.message || 'Yuborib bo‘lmadi.') : 'Emailingizga parolni tiklash havolasi yuborildi.', !error);
    };
    login.onsubmit = async event => {
      event.preventDefault();
      const submit = login.querySelector('.cloud-submit'); const old = submit.textContent;
      submit.disabled = true; submit.textContent = 'Opening…'; message('');
      try {
        const email = document.getElementById('cloudEmail').value.trim(), password = document.getElementById('cloudPassword').value;
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await openSession(onReady);
      } catch (error) { const raw=String(error?.message||''); const friendly=/invalid login credentials/i.test(raw)?'Email yoki parol mos kelmadi. Google bilan kiring yoki “Forgot password?” orqali parolni tiklang.':(raw||'Kirishda xatolik.'); message(friendly); submit.disabled = false; submit.textContent = old; }
    };
    signup.onsubmit = async event => {
      event.preventDefault();
      const submit = signup.querySelector('.cloud-submit'); const old = submit.textContent;
      submit.disabled = true; submit.textContent = 'Creating…'; message('');
      try {
        const fullName = document.getElementById('cloudName').value.trim(), email = document.getElementById('cloudSignupEmail').value.trim(), password = document.getElementById('cloudSignupPassword').value;
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName, name: fullName } } });
        if (error) throw error;
        if (data.session) await openSession(onReady);
        else { message('Hisob yaratildi. Email tasdiqlash talab qilinsa, tasdiqlab keyin Log in qiling.', true); showTab('login'); submit.disabled = false; submit.textContent = old; }
      } catch (error) { message(error.message || 'Hisob yaratishda xatolik.'); submit.disabled = false; submit.textContent = old; }
    };
  }

  async function showAuth(onReady) {
    if (client && isOAuthReturn()) { await openSession(onReady); return; }
    let entered = false;
    try { entered = sessionStorage.getItem(entryKey) === '1'; } catch {}
    let session = null;
    if (client) {
      try { const result = await client.auth.getSession(); session = result?.data?.session || null; } catch {}
    }
    // In the same tab, a signed-in learner can refresh without seeing auth again.
    if (entered && session?.user) { await openSession(onReady); return; }
    if (!entered) { renderEntry(onReady); return; }
    renderAuthOnly();
    wireAuth(onReady);
    const email = session?.user?.email || '';
    const input = document.getElementById('cloudEmail');
    if (input && email) input.value = email;
  }

  function choice(title, description, yes, no) {
    return new Promise(resolve => {
      gate.innerHTML = `<div class="cloud-card cloud-choice-card"><span class="vivid-auth-logo">V</span><strong>VIVID IELTS</strong><h1>${title}</h1><p>${description}</p><div class="cloud-actions"><button type="button" class="cloud-primary" id="cloudYes">${yes}</button><button type="button" id="cloudNo">${no}</button></div></div>`;
      document.getElementById('cloudYes').onclick = () => resolve(true);
      document.getElementById('cloudNo').onclick = () => resolve(false);
    });
  }

  async function showPreparation(owner) {
    document.getElementById('cloudAuthVideo')?.pause();
    document.body.classList.remove('cloud-locked', 'vivid-entry-active', 'vivid-auth-active');
    document.body.classList.add('prep-active');
    try { await window.VocabPreparation.start(owner || 'local'); }
    finally {
      document.body.classList.remove('prep-active');
      gate.innerHTML = '';
    }
  }

  function showUnavailable(onReady, reason) {
    mode = 'locked';
    document.body.classList.add('cloud-locked', 'vivid-auth-active');
    document.body.classList.remove('prep-active', 'vivid-entry-active');
    gate.innerHTML = `<div class="cloud-card cloud-choice-card"><span class="vivid-auth-logo">V</span><strong>VIVID IELTS</strong><h1>Hisobdagi ma’lumotlar ochilmadi</h1><p id="cloudReason"></p><div class="cloud-actions"><button id="cloudRetry" type="button" class="cloud-primary">Qayta urinish</button><button id="cloudLocal" type="button">Qurilmada davom etish</button></div></div>`;
    document.getElementById('cloudReason').textContent = reason;
    document.getElementById('cloudRetry').onclick = () => openSession(onReady);
    document.getElementById('cloudLocal').onclick = async () => {
      mode = 'local';
      try { await onReady({ mode: 'local' }); statusText('Faqat shu qurilmada', true); await showPreparation(userId || 'local'); }
      catch (error) { showUnavailable(onReady, error.message || 'Saytni ochib bo‘lmadi.'); }
    };
  }

  function missingTable(error) { return ['PGRST205', '42P01'].includes(error?.code) || /could not find the table|relation .* does not exist/i.test(error?.message || ''); }
  const unifiedStateKey = 'vivid_ielts_unified_state_v14';
  async function readState() {
    const result = await client.from('user_state').select('value').eq('user_id', userId).eq('key', unifiedStateKey).maybeSingle();
    if (result.error) throw result.error;
    stateTable = 'user_state';
    if (!result.data) return { data: null, exists: false };
    return { data: result.data.value ?? null, exists: true };
  }

  async function openSession(onReady) {
    // Important: keep the login design on screen while account data loads silently.
    // The app becomes visible only when its local + cloud state is fully ready.
    try {
      const { data: auth, error: authError } = await client.auth.getUser();
      if (!auth.user) {
        if (authError && authError.name !== 'AuthSessionMissingError') throw authError;
        await showAuth(onReady); return;
      }
      userId = auth.user.id;
      try { localStorage.setItem('vivid-ielts-current-user', userId); } catch {}
      userEmail = auth.user.email || auth.user.user_metadata?.email || '';
      try { sessionStorage.setItem(entryKey, '1'); } catch {}
      const saved = await readState();
      mode = 'cloud';
      let data = saved.data;
      const pending = pendingData();
      if (pending && saved.exists) {
        const restore = await choice('Saqlanmagan natijalar bor', 'Bu qurilmada bulutga yetib bormagan o‘zgarishlar topildi. Ularni hisobingizga tiklaysizmi?', 'Tiklash', 'Bulutdagini ochish');
        if (restore) data = pending; else localStorage.removeItem(pendingKey());
      }
      await onReady({ mode: 'cloud', data, remoteExists: saved.exists, recoverPending: !!(pending && data === pending) });
      document.body.classList.remove('vivid-entry-active', 'vivid-auth-active');
      if (saved.migrate && !pending && !await saveNow(data)) throw Error('Avvalgi lug‘at natijalarini ko‘chirib bo‘lmadi. Qayta urinib ko‘ring.');
      statusText('');
      await showPreparation(userId);
    } catch (error) { showUnavailable(onReady, error.message || 'Hisob bilan ulanishni tekshiring.'); }
  }

  async function saveNow(data) {
    if (!userId || mode !== 'cloud') return false;
    const now = new Date().toISOString();
    const { error } = await client.from('user_state').upsert({ user_id: userId, key: unifiedStateKey, value: data, updated_at: now }, { onConflict: 'user_id,key' });
    if (error) { statusText('Saqlanmadi — qayta urinib ko‘ring', true); return false; }
    if (!queued) localStorage.removeItem(pendingKey());
    statusText('');
    return true;
  }

  async function flush() {
    if (sending || !queued || !provider || mode !== 'cloud') return;
    sending = true;
    while (queued) { queued = false; const data = provider(); const saved = await saveNow(data); if (!saved) { queued = true; break; } }
    sending = false;
  }
  function queue() {
    if (mode !== 'cloud' || !provider) return;
    queued = true;
    try { localStorage.setItem(pendingKey(), JSON.stringify(provider())); } catch { /* Remote save still runs. */ }
    statusText('');
    clearTimeout(timer); timer = setTimeout(flush, 800);
  }
  async function uploadAudio(blob) {
    if (mode !== 'cloud' || !userId) throw Error('Audio uchun hisobga kirib, bulutli saqlashni yoqing.');
    if (!blob || blob.size > 12_000_000) throw Error('Audio 12 MB dan kichik bo‘lishi kerak.');
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from(bucket).upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });
    if (error) throw error;
    return path;
  }
  async function downloadAudio(path) {
    if (!userId || !path?.startsWith(`${userId}/`)) throw Error('Bu audio hisobingizga tegishli emas.');
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  }

  logout.onclick = async () => {
    clearTimeout(timer); await flush();
    if (pendingData() && !window.confirm('Ba’zi natijalar bulutga saqlanmadi. Baribir hisobdan chiqasizmi?')) return;
    window.VocabPreparation.clear(userId || 'local');
    try { sessionStorage.removeItem(entryKey); } catch {}
    try { localStorage.removeItem('vivid-ielts-current-user'); } catch {}
    await client?.auth.signOut(); location.reload();
  };
  window.addEventListener('online', () => { if (queued) flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && queued) flush(); });

  // V18: do not paint the entry screen pre-emptively. VocabCloud.start() decides
  // whether this tab needs the landing page, auth, or can open the workspace directly.
  // This prevents the entry page flashing again after a successful login/session restore.

  window.VocabCloud = {
    get userId() { return userId; }, get enabled() { return mode === 'cloud'; }, get email() { return userEmail; },
    key: key => mode === 'cloud' && userId ? `va:${userId}:${key}` : key,
    setProvider: fn => { provider = fn; },
    start: async onReady => {
      if (!client) { showUnavailable(onReady, 'Cloud kutubxonasini yuklab bo‘lmadi. Internetni tekshiring.'); return; }
      await showAuth(onReady);
    },
    chooseImport: () => choice('Eski natijalaringiz bor', 'Ushbu qurilmada oldin saqlangan lug‘at va Speaking natijalarini hisobingizga ko‘chirasizmi?', 'Ha, ko‘chirish', 'Yangi boshlash'),
    saveNow, queue, flush, uploadAudio, downloadAudio,
  };
})();
