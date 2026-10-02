/* =========================================================
   100 KUN — Operatsiya jurnali
   Ko'p-foydalanuvchili: har kim ro'yxatdan o'tib/kirib, faqat
   o'zining ma'lumotlarini ko'radi (schema.sql dagi RLS shuni
   ta'minlaydi). Bu yerda faqat "publishable"/anon kalit
   ishlatiladi — "secret" kalitni HECH QACHON shu faylga qo'ymang.
========================================================= */
const SUPABASE_URL = window.VOCAB_SUPABASE.url;
const SUPABASE_ANON_KEY = window.VOCAB_SUPABASE.key;
// DIQQAT: bu yerga hech qachon "sb_secret_..." kalitni qo'ymang — u butun
// bazaga RLS'siz kira oladi va faqat serverda ishlatiladi.

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
const IS_EMBEDDED = window.self !== window.top && new URLSearchParams(location.search).has('embed');
const FILES_BUCKET = "task-files";

/* ---------------- Kun turlari (hafta kuniga qarab) ----------------
   Dushanba/Chorshanba/Juma = "mwf"
   Seshanba/Payshanba/Shanba = "tts"
   Yakshanba = "sun" (to'liq MOCK kuni)
==================================================================== */
const IELTS_GROUP_ORDER = ["reading", "listening", "speaking", "writing", "review"];
const IELTS_GROUP_LABELS = {
  reading: "📖 Reading", listening: "🎧 Listening", speaking: "🗣 Speaking",
  writing: "✍️ Writing", review: "🔁 Umumiy tahlil",
};

const DAY_TYPES = {
  mwf: {
    label: "IELTS: Reading / Listening / Speaking / Writing kuni",
    ielts: [
      { id: "reading_book", name: "ELS kitobidan 4 ta matn (Reading)", unit: "", duration: 60, group: "reading" },
      { id: "reading_passage", name: "1 ta qo'shimcha passage", unit: "", duration: 20, group: "reading" },
      { id: "reading_words", name: "30 ta yangi so'z yodlash", unit: "so'z", duration: 15, group: "reading" },
      { id: "listening_parts", name: "2 qism to'liq tahlil + keyword jadval", unit: "", duration: 40, group: "listening" },
      { id: "listening_podcast", name: "2 ta podcast + ChatGPT tahlili", unit: "", duration: 30, group: "listening" },
      { id: "listening_strategy", name: "Listening strategiyasi", unit: "", group: "listening" },
      { id: "listening_serial", name: "1 qism serial (audio)", unit: "", group: "listening" },
      { id: "listening_dictation", name: "5 daqiqa dictation", unit: "", duration: 5, group: "listening" },
      { id: "speaking_topic", name: "1 mavzu — 15 ta so'z", unit: "", group: "speaking" },
      { id: "speaking_5min", name: "5 daqiqa gapirish", unit: "", duration: 5, group: "speaking" },
      { id: "speaking_structure", name: "1 struktura", unit: "", group: "speaking" },
      { id: "writing_essay", name: "1 struktura + 1 esse tahlili", unit: "", duration: 45, group: "writing" },
    ],
  },
  tts: {
    label: "IELTS: Speaking-intensiv / Mock tahlil kuni",
    ielts: [
      { id: "speaking_mock", name: "1 to'liq mock tahlili", unit: "", duration: 40, group: "speaking" },
      { id: "speaking_chunks", name: "10-15 chunk yodlash va ishlatish", unit: "", group: "speaking" },
      { id: "speaking_gbl", name: "GBL (Grammar-Band-Lexis) mashqi", unit: "", group: "speaking" },
      { id: "speaking_shadow", name: "Shadowing", unit: "", duration: 25, group: "speaking" },
      { id: "speaking_topics", name: "1-2 mavzu — faqat gapirish", unit: "", group: "speaking" },
      { id: "speaking_grammar", name: "1 struktura + grammatika mavzusi", unit: "", group: "speaking" },
      { id: "writing_article", name: "1 maqola yozish", unit: "", duration: 30, group: "writing" },
      { id: "listening_keyword", name: "2 qism keyword jadval", unit: "", group: "listening" },
      { id: "listening_podcast2", name: "1 podcast", unit: "", group: "listening" },
      { id: "listening_dict2", name: "2 daqiqa dictation", unit: "", duration: 2, group: "listening" },
    ],
  },
  sun: {
    label: "Yakshanba — TO'LIQ MOCK KUNI",
    ielts: [
      { id: "mock_reading", name: "To'liq Mock: Reading", unit: "ball", duration: 60, group: "reading" },
      { id: "mock_listening", name: "To'liq Mock: Listening", unit: "ball", duration: 30, group: "listening" },
      { id: "mock_speaking", name: "To'liq Mock: Speaking", unit: "ball", duration: 15, group: "speaking" },
      { id: "mock_writing", name: "To'liq Mock: Writing (Task 1+2)", unit: "ball", duration: 60, group: "writing" },
      { id: "weekly_review", name: "Haftalik natijalarni tahlil qilish", unit: "", group: "review" },
    ],
  },
};

const TIMELINES = {
  mwf: [
    { t: "05:00", l: "Bomdod namozi" },
    { t: "07:00", l: "Uyg'onish + reja" },
    { t: "08:00", l: "IELTS: Reading + Listening" },
    { t: "10:00", l: "SAT: Math / English" },
    { t: "13:00", l: "Kitob o'qish" },
    { t: "15:00", l: "Tushdan keyin: so'zlar + Speaking" },
    { t: "16:00", l: "Til: Shadowing / mashg'ulot" },
    { t: "18:00", l: "Gym (25 daq)" },
    { t: "20:00", l: "SMM: Reels / YouTube" },
    { t: "21:00", l: "Kechqurun: Speaking + Writing" },
    { t: "21:30", l: "Kunni tekshirish + meditatsiya" },
  ],
  tts: [
    { t: "05:00", l: "Bomdod namozi" },
    { t: "07:00", l: "Uyg'onish + reja" },
    { t: "08:00", l: "IELTS: Mock tahlili" },
    { t: "10:00", l: "SAT: Math / English" },
    { t: "13:00", l: "Kitob o'qish" },
    { t: "15:00", l: "Speaking: chunks + GBL" },
    { t: "16:00", l: "Shadowing (25 daq)" },
    { t: "18:00", l: "Gym (25 daq)" },
    { t: "20:00", l: "SMM: Reels / YouTube" },
    { t: "21:00", l: "Writing: maqola" },
    { t: "21:30", l: "Kunni tekshirish + meditatsiya" },
  ],
  sun: [
    { t: "05:00", l: "Bomdod namozi" },
    { t: "09:00", l: "To'liq IELTS Mock — Reading" },
    { t: "10:00", l: "To'liq IELTS Mock — Listening" },
    { t: "11:00", l: "To'liq IELTS Mock — Writing" },
    { t: "12:00", l: "To'liq IELTS Mock — Speaking" },
    { t: "16:00", l: "Til: mashg'ulot" },
    { t: "18:00", l: "Gym (25 daq)" },
    { t: "20:00", l: "Haftalik reja tuzish" },
    { t: "21:30", l: "Kunni tekshirish + meditatsiya" },
  ],
};

const COMMON_CATEGORIES = [
  { id: "sat", name: "SAT", icon: "📘", tasks: [
      { id: "math", name: "Math mashqlari (haftada 3 kun)", unit: "ball" },
      { id: "english", name: "English mashqlari (haftada 3 kun)", unit: "ball" },
      { id: "review", name: "Umumiy review (haftada 1 kun)", unit: "ball" },
  ]},
  { id: "smm", name: "SMM / Ijtimoiy tarmoq", icon: "📱", tasks: [
      { id: "reel", name: "Reels tayyorlash (100 kunda 70+)", unit: "dona" },
      { id: "yt", name: "YouTube video (100 kunda 40+)", unit: "dona" },
      { id: "mobilografiya", name: "Mobilografiya mashqi", unit: "daq", duration: 75 },
  ]},
  { id: "gym", name: "Gym", icon: "🏋", tasks: [
      { id: "session", name: "Mashg'ulot (18:00)", unit: "", duration: 25 },
  ]},
  { id: "til", name: "Turk/Rus tili", icon: "🗣", tasks: [
      { id: "study", name: "Til mashg'uloti (haftada 15 soat)", unit: "daq", duration: 120 },
      { id: "shadow", name: "Shadowing", unit: "daq", duration: 25 },
      { id: "vocab", name: "Yangi so'zlar", unit: "ta" },
  ]},
  { id: "books", name: "Kitob o'qish", icon: "📖", tasks: [
      { id: "pages", name: "Sahifalar (25-30 bet)", unit: "bet" },
  ]},
  { id: "ibodat", name: "Ibodat", icon: "🕌", tasks: [
      { id: "bomdod", name: "Bomdod namozi", unit: "" },
      { id: "peshin", name: "Peshin namozi", unit: "" },
      { id: "asr", name: "Asr namozi", unit: "" },
      { id: "shom", name: "Shom namozi", unit: "" },
      { id: "xufton", name: "Xufton namozi", unit: "" },
  ]},
  { id: "intizom", name: "Intizom", icon: "✅", tasks: [
      { id: "wake", name: "Erta uyg'onish", unit: "" },
      { id: "afternoon_wordlist", name: "[Tushdan keyin] So'zlar ro'yxatini o'qish", unit: "" },
      { id: "afternoon_speak", name: "[Tushdan keyin] Speaking — 1 mavzu", unit: "" },
      { id: "afternoon_structure", name: "[Tushdan keyin] Speaking strukturalari", unit: "" },
      { id: "night_speak", name: "[Kechqurun] Speaking — 1 mavzu", unit: "" },
      { id: "night_writing", name: "[Kechqurun] Writing mavzulari", unit: "" },
      { id: "night_structure", name: "[Kechqurun] Writing strukturalari", unit: "" },
      { id: "meditation", name: "Kunni tekshirish + meditatsiya (21:30)", unit: "", duration: 10 },
      { id: "plan", name: "Ertangi reja tuzildi", unit: "" },
  ]},
];

const NOTE_KEY = "_note";
const VOCAB_STATE_KEY = '_vocab_atlas_state_v1';
const PREFS_KEY = '_tracker_preferences_v1';
const START_100 = () => new Date().toISOString().slice(0,10);

/* ---------------- Holat ---------------- */
let session = null;
let settings = { user_name: "", start_date: null, main_goal: "", custom_categories: [] };
let dayData = {};        // { [dayNumber]: { tasks: { "cat:task": {completed,value,priority} }, note } }
let taskFiles = {};      // { [dayNumber]: { "cat:task": [ {id,file_name,file_path,file_type} ] } }
let currentViewDay = 1;
let todayDayNumber = 1;
let activeCatFilter = "all";
let timerSeconds = 300, timerRunning = false, timerInterval = null;
let isSignupMode = false;
let currentUploadKey = null;
let trackerPrefs = { timer_minutes: Number(localStorage.getItem('kun100_timer_min') || 0), reminders_enabled: localStorage.getItem('kun100_reminders') === '1' };
let trackerPrefsCloud = false;

/* ---------------- Yordamchi funksiyalar ---------------- */
function el(id){ return document.getElementById(id); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function getDayType(dayNumber){
  const dow = dayFromStart(dayNumber).getDay(); // 0=Yak,1=Dush...6=Shanba
  if (dow === 0) return "sun";
  if (dow === 1 || dow === 3 || dow === 5) return "mwf";
  return "tts";
}
function ieltsAllTasksMerged(){
  const seen = new Map();
  ["mwf","tts","sun"].forEach(k => DAY_TYPES[k].ielts.forEach(t => { if (!seen.has(t.id)) seen.set(t.id, t); }));
  return [...seen.values()];
}
function customGroup(){
  return settings.custom_categories.length
    ? [{ id: "custom", name: "Shaxsiy maqsadlar", icon: "⭐", tasks: settings.custom_categories.map(g => ({ id: g.slug, name: g.name, unit: g.unit || "" })) }]
    : [];
}
/* Kun-agnostik: tab ro'yxati, statistik agregatsiya, CSV export uchun */
function categoriesWithCustom(){
  const ielts = { id: "ielts", name: "IELTS", icon: "🎧", tasks: ieltsAllTasksMerged() };
  return [ielts, ...COMMON_CATEGORIES, ...customGroup()];
}
/* Muayyan kun uchun — o'sha kunning haqiqiy IELTS vazifalari bilan */
function categoriesForDay(dayNumber){
  const dt = getDayType(dayNumber);
  const ielts = { id: "ielts", name: "IELTS", icon: "🎧", tasks: DAY_TYPES[dt].ielts };
  return [ielts, ...COMMON_CATEGORIES, ...customGroup()];
}
function allTasks(){
  const list = [];
  categoriesWithCustom().forEach(c => c.tasks.forEach(t => list.push({ cat: c.id, catName: c.name, icon: c.icon, ...t, key: `${c.id}:${t.id}` })));
  return list;
}
function allTasksForDay(dayNumber){
  const list = [];
  categoriesForDay(dayNumber).forEach(c => c.tasks.forEach(t => list.push({ cat: c.id, catName: c.name, icon: c.icon, ...t, key: `${c.id}:${t.id}` })));
  return list;
}
function dayFromStart(dayNumber){
  const d = new Date(settings.start_date + "T00:00:00");
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}
function fmtDate(d){
  const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  return `${d.getDate()}-${months[d.getMonth()]}, ${d.getFullYear()}`;
}
function computeTodayDayNumber(){
  if (!settings.start_date) return 1;
  const start = new Date(settings.start_date + "T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.floor((now - start) / 86400000) + 1;
  return Math.min(100, Math.max(1, diff));
}
function toast(msg){
  const t = el("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove("show"), 2200);
}
function dayCompletionPct(dayNumber){
  const d = dayData[dayNumber];
  const tasks = allTasksForDay(dayNumber);
  if (!d || !tasks.length) return null;
  const has = Object.keys(d.tasks || {}).length;
  if (!has) return null;
  const done = tasks.filter(t => d.tasks[t.key] && d.tasks[t.key].completed).length;
  return Math.round((done / tasks.length) * 100);
}

/* ---------------- AUTH ---------------- */
el("tab-login").addEventListener("click", () => setAuthMode(false));
el("tab-signup").addEventListener("click", () => setAuthMode(true));
function setAuthMode(signup){
  isSignupMode = signup;
  el("tab-login").classList.toggle("active", !signup);
  el("tab-signup").classList.toggle("active", signup);
  el("btn-auth-submit").textContent = signup ? "Ro'yxatdan o'tish" : "Kirish";
  el("auth-heading").textContent = signup ? "Hisob yaratish" : "Xush kelibsiz";
  el("auth-sub").textContent = signup ? "Email va parol bilan yangi hisob oching." : "Davom etish uchun hisobingizga kiring.";
  el("in-password").autocomplete = signup ? "new-password" : "current-password";
  hideAuthMsg();
}
function showAuthMsg(msg, ok){
  const box = el("auth-msg");
  box.textContent = msg;
  box.className = "auth-msg show " + (ok ? "ok" : "err");
}
function hideAuthMsg(){ el("auth-msg").className = "auth-msg"; }

el("form-auth").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = el("in-email").value.trim();
  const password = el("in-password").value;
  const btn = el("btn-auth-submit");
  btn.disabled = true; hideAuthMsg();

  try {
    if (isSignupMode) {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      showAuthMsg("Hisob yaratildi. Agar email tasdiqlash yoqilgan bo'lsa, pochtangizni tekshiring, so'ng kiring.", true);
      setAuthMode(false);
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      session = data.session;
      await afterLogin();
    }
  } catch (err) {
    showAuthMsg(err.message || "Xatolik yuz berdi.", false);
  } finally {
    btn.disabled = false;
  }
});

async function checkExistingSession(){
  // The journal uses the exact same Supabase browser session as VIVID IELTS.
  // Give the parent app a short moment to finish restoring its persisted session.
  for (let attempt = 0; attempt < 24; attempt++) {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (data?.session?.user) {
      session = data.session;
      await afterLogin();
      return;
    }
    if (!IS_EMBEDDED) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  if (IS_EMBEDDED) {
    // Never show a second login form inside 100 Day Upgrade.
    window.parent.postMessage({ type: 'vivid-journal-auth-required' }, location.origin);
    throw Error('VIVID IELTS sessiyasi topilmadi. Asosiy sahifani bir marta qayta yuklang.');
  }

  // A direct /100day visit belongs inside the main VIVID IELTS shell.
  location.replace(new URL('/#journal', location.origin).href);
}

async function afterLogin(){
  await loadSettings();
  if(!await loadAllLogs())throw Error('Kunlik yozuvlar yuklanmadi. Internetni tekshirib qayta kiring.');
  await loadAllTaskFiles();
  await loadTrackerPrefs();
  if (trackerPrefs.reminders_enabled) startReminderLoop();
  if (!settings.user_name) {
    el("step-auth").classList.add("hidden");
    el("step-setup").classList.remove("hidden");
    document.querySelector('.auth-tabs')?.classList.add('hidden');
    if (el('auth-heading')) el('auth-heading').textContent = '100 Day Upgrade';
    if (el('auth-sub')) el('auth-sub').textContent = 'Faqat bir marta ismingiz va boshlanish sanasini belgilang.';
    el("in-date").value = START_100();
    el('intro').style.display = 'flex';
  } else {
    startApp();
  }
}

el("btn-start").addEventListener("click", async () => {
  const name = el("in-name").value.trim();
  const date = el("in-date").value;
  if (!name || !date) { toast("Ism va sanani kiriting"); return; }
  settings.user_name = name;
  settings.start_date = date;
  if(!await saveSettings())return;
  startApp();
});

el("btn-main-site")?.addEventListener("click", () => {
  if (window.self !== window.top) window.top.location.hash = 'readingbooster';
  else location.href = '../#readingbooster';
});

/* ---------------- Supabase o'qish/yozish (har user o'zinikini) ---------------- */
function uid(){ return session.user.id; }

async function loadSettings(){
  const { data, error } = await sb.from("settings").select("*").eq("user_id", uid()).maybeSingle();
  if(error)throw error;
  if (!error && data) {
    settings.user_name = data.user_name || "";
    settings.start_date = data.start_date || START_100();
    settings.main_goal = data.main_goal || "";
    settings.custom_categories = data.custom_categories || [];
  } else {
    settings.start_date = START_100();
  }
}
async function saveSettings(){
  const { error } = await sb.from("settings").upsert({
    user_id: uid(),
    user_name: settings.user_name,
    start_date: settings.start_date,
    main_goal: settings.main_goal,
    custom_categories: settings.custom_categories,
  }, { onConflict: "user_id" });
  if (error) { toast('Sozlamalar saqlanmadi: ' + error.message); return false; }
  return true;
}
async function loadRows(table){
  const all=[];
  for(let start=0;start<100000;start+=1000){
    let query=sb.from(table).select('*').eq('user_id',uid());
    query=table==='daily_logs'?query.order('day_number',{ascending:true}).order('category',{ascending:true}):query.order('id',{ascending:true});
    const { data, error } = await query.range(start,start+999);
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<1000)return all;
  }
  throw Error('Yozuvlar juda ko‘p. Ma’lumotlarni yuklab bo‘lmadi.');
}
async function loadTrackerPrefs(){
  const { data, error } = await sb.from('tracker_preferences').select('*').eq('user_id',uid()).maybeSingle();
  if(error){
    const saved = await sb.from('daily_logs').select('note').eq('user_id',uid()).eq('day_number',1).eq('category',PREFS_KEY).maybeSingle();
    if(saved.error){toast('Taymer va eslatmalar yuklanmadi.');return}
    trackerPrefsCloud='daily_logs';
    if(saved.data?.note){try{const value=JSON.parse(saved.data.note);trackerPrefs.timer_minutes=Number(value.timer_minutes)||0;trackerPrefs.reminders_enabled=!!value.reminders_enabled}catch{toast('Taymer sozlamalarini o‘qib bo‘lmadi.')}}
    else await saveTrackerPrefs();
    return;
  }
  trackerPrefsCloud='tracker_preferences';
  if(data){trackerPrefs.timer_minutes=Number(data.timer_minutes)||0;trackerPrefs.reminders_enabled=!!data.reminders_enabled}
  else await saveTrackerPrefs();
}
async function saveTrackerPrefs(){
  localStorage.setItem('kun100_timer_min',String(trackerPrefs.timer_minutes));
  localStorage.setItem('kun100_reminders',trackerPrefs.reminders_enabled?'1':'0');
  if(!trackerPrefsCloud)return;
  const { error } = trackerPrefsCloud==='daily_logs'
    ? await sb.from('daily_logs').upsert({user_id:uid(),day_number:1,category:PREFS_KEY,note:JSON.stringify(trackerPrefs),completed:false,value:null,priority:'mid',updated_at:new Date().toISOString()},{onConflict:'user_id,day_number,category'})
    : await sb.from('tracker_preferences').upsert({user_id:uid(),...trackerPrefs,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  if(error)toast('Taymer va eslatmalar saqlanmadi: '+error.message);
}
async function loadAllLogs(){
  dayData = {};
  let data;
  try{data=await loadRows('daily_logs')}catch(error){toast('Kunlik yozuvlar yuklanmadi: '+error.message);return false}
  data.forEach(row => {
    if(row.category===VOCAB_STATE_KEY||row.category===PREFS_KEY)return;
    if (!dayData[row.day_number]) dayData[row.day_number] = { tasks: {}, note: "" };
    if (row.category === NOTE_KEY) {
      dayData[row.day_number].note = row.note || "";
    } else {
      dayData[row.day_number].tasks[row.category] = {
        completed: !!row.completed, value: row.value, priority: row.priority || "mid"
      };
    }
  });
  return true;
}
async function saveDay(dayNumber){
  const d = dayData[dayNumber] || { tasks: {}, note: "" };
  const rows = Object.keys(d.tasks).map(key => ({
    user_id: uid(), day_number: dayNumber, category: key,
    completed: !!d.tasks[key].completed,
    value: d.tasks[key].value === "" || d.tasks[key].value == null ? null : Number(d.tasks[key].value),
    priority: d.tasks[key].priority || "mid",
    updated_at: new Date().toISOString(),
  }));
  rows.push({ user_id: uid(), day_number: dayNumber, category: NOTE_KEY, completed: false, value: null, priority: "mid", note: d.note || "", updated_at: new Date().toISOString() });
  const { error } = await sb.from("daily_logs").upsert(rows, { onConflict: "user_id,day_number,category" });
  if (error) { toast("Saqlashda xatolik: " + error.message); return false; }
  return true;
}
async function clearDay(dayNumber){
  const { error } = await sb.from("daily_logs").delete().eq("user_id", uid()).eq("day_number", dayNumber).neq('category',VOCAB_STATE_KEY).neq('category',PREFS_KEY);
  if(error){toast('Kunni o‘chirishda xatolik: '+error.message);return false}
  delete dayData[dayNumber];
  return true;
}

/* ---------------- FAYLLAR (PDF / HTML / rasm) ---------------- */
async function loadAllTaskFiles(){
  taskFiles = {};
  let data;
  try{data=await loadRows('task_files')}catch(error){toast('Biriktirilgan fayllar yuklanmadi: '+error.message);return}
  data.forEach(row => {
    taskFiles[row.day_number] = taskFiles[row.day_number] || {};
    taskFiles[row.day_number][row.category] = taskFiles[row.day_number][row.category] || [];
    taskFiles[row.day_number][row.category].push(row);
  });
}
async function signedUrlFor(path){
  const { data, error } = await sb.storage.from(FILES_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
function fileIcon(type, name){
  if ((type||"").includes("pdf") || /\.pdf$/i.test(name||"")) return "📕";
  if ((type||"").includes("html") || /\.html?$/i.test(name||"")) return "🌐";
  if ((type||"").startsWith("video") || /\.(mp4|mov|webm)$/i.test(name||"")) return "🎬";
  if ((type||"").startsWith("audio") || /\.(mp3|wav|m4a|ogg)$/i.test(name||"")) return "🎙";
  return "🖼";
}
function guessMime(name){
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "html" || ext === "htm") return "text/html; charset=utf-8";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "ogg") return "audio/ogg";
  return "application/octet-stream";
}
async function uploadFileForTask(day, key, file){
  const safeName = file.name.replace(/\s+/g, "_");
  const path = `${uid()}/${day}/${key}/${Date.now()}_${safeName}`;
  // MUHIM: contentType'ni aniq belgilaymiz — aks holda Supabase faylni
  // "text/plain" yoki "application/octet-stream" deb saqlab, HTML kodi
  // ochilganda render bo'lmay, xom kod sifatida ko'rinib qolishi mumkin.
  const fileType = file.type || guessMime(file.name);
  toast("Yuklanmoqda...");
  const { error } = await sb.storage.from(FILES_BUCKET).upload(path, file, { upsert: false, contentType: fileType });
  if (error) { toast("Yuklashda xatolik: " + error.message); return; }
  const { data: inserted, error: dbErr } = await sb.from("task_files").insert({
    user_id: uid(), day_number: day, category: key, file_name: file.name, file_path: path, file_type: fileType
  }).select().maybeSingle();
  if (dbErr) { toast("Bazaga yozishda xatolik: " + dbErr.message); return; }
  taskFiles[day] = taskFiles[day] || {};
  taskFiles[day][key] = taskFiles[day][key] || [];
  taskFiles[day][key].push(inserted || { id: Date.now(), day_number: day, category: key, file_name: file.name, file_path: path, file_type: fileType });
  renderTaskFiles(key);
  toast("Fayl biriktirildi ✓");
}
el("file-input-hidden").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !currentUploadKey) return;
  await uploadFileForTask(currentViewDay, currentUploadKey, file);
});

/* ---------------- MIKROFON — ovoz yozish ---------------- */
let micRecorder = null, micChunks = [], micKey = null, micStream = null, micBtnEl = null;

async function toggleMicRecording(key, btn){
  if (micRecorder && micRecorder.state === "recording") {
    if (micKey === key) { micRecorder.stop(); }
    else { toast("Avval boshqa vazifadagi yozuvni to'xtating"); }
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast("Bu brauzer/manzil mikrofonni qo'llab-quvvatlamaydi (HTTPS yoki localhost kerak)");
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    toast("Mikrofonga ruxsat berilmadi");
    return;
  }
  micChunks = [];
  micKey = key;
  micBtnEl = btn;
  micRecorder = new MediaRecorder(micStream);
  micRecorder.ondataavailable = (e) => { if (e.data.size > 0) micChunks.push(e.data); };
  micRecorder.onstop = async () => {
    micStream.getTracks().forEach(t => t.stop());
    if (micBtnEl) { micBtnEl.classList.remove("recording"); micBtnEl.textContent = "🎤"; }
    const blob = new Blob(micChunks, { type: "audio/webm" });
    if (blob.size > 500) {
      const file = new File([blob], `ovoz_${Date.now()}.webm`, { type: "audio/webm" });
      await uploadFileForTask(currentViewDay, micKey, file);
    }
    micRecorder = null; micKey = null; micBtnEl = null;
  };
  micRecorder.start();
  btn.classList.add("recording");
  btn.textContent = "⏺";
  toast("Yozib olinmoqda... to'xtatish uchun yana bosing");
}
function renderTaskFiles(key){
  const wrap = document.querySelector(`.task-wrap[data-key="${cssEscape(key)}"] [data-role="files"]`);
  if (!wrap) return;
  const files = (taskFiles[currentViewDay] && taskFiles[currentViewDay][key]) || [];
  wrap.innerHTML = files.map(f => `
    <span class="filechip" data-id="${f.id}" data-path="${escapeHtml(f.file_path)}" data-type="${escapeHtml(f.file_type||"")}">
      <span class="fic">${fileIcon(f.file_type, f.file_name)}</span>
      <span class="fname">${escapeHtml(f.file_name)}</span>
      <button class="fdel" data-role="delfile" type="button">✕</button>
    </span>
  `).join("");
  wrap.querySelectorAll(".filechip").forEach(chip => {
    chip.addEventListener("click", (e) => {
      if (e.target.dataset.role === "delfile") return;
      openFileViewer({
        id: chip.dataset.id, file_path: chip.dataset.path,
        file_type: chip.dataset.type, file_name: chip.querySelector(".fname").textContent
      });
    });
    chip.querySelector(".fdel").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Faylni o'chirasizmi?")) return;
      const id = chip.dataset.id;
      await sb.storage.from(FILES_BUCKET).remove([chip.dataset.path]);
      await sb.from("task_files").delete().eq("id", id);
      taskFiles[currentViewDay][key] = (taskFiles[currentViewDay][key] || []).filter(f => String(f.id) !== String(id));
      renderTaskFiles(key);
      toast("Fayl o'chirildi");
    });
  });
}
function cssEscape(s){ return String(s).replace(/[:."'\[\]]/g, c => "\\" + c); }

async function openFileViewer(file){
  let url;
  try { url = await signedUrlFor(file.file_path); }
  catch (error) { toast('Faylni ochib bo‘lmadi: ' + (error.message || 'ruxsat xatosi')); return; }
  el("fm-title").textContent = file.file_name;
  const body = el("fm-body");
  const fallback = el("fm-fallback");
  const isPdf = (file.file_type||"").includes("pdf") || /\.pdf$/i.test(file.file_name);
  const isHtml = (file.file_type||"").includes("html") || /\.html?$/i.test(file.file_name);
  const isImg = (file.file_type||"").startsWith("image") || /\.(png|jpe?g|gif|webp)$/i.test(file.file_name);
  const isVideo = (file.file_type||"").startsWith("video") || /\.(mp4|mov|webm)$/i.test(file.file_name);
  const isAudio = (file.file_type||"").startsWith("audio") || /\.(mp3|wav|m4a|ogg)$/i.test(file.file_name);
  const toggleBtn = el("fm-translate-toggle");
  const modalBox = document.querySelector("#file-modal .modal-box");
  modalBox.classList.remove("fullscreen");
  el("fm-fullscreen").style.display = (isPdf || isHtml || isVideo) ? "inline-flex" : "none";
  el("fm-fullscreen").textContent = "⛶ Katta ekran";

  fallback.innerHTML = `<a href="${url}" target="_blank" rel="noopener">Fayl ochilmasa — shu yerda yangi oynada oching</a>`;
  el("file-modal").classList.remove("hidden");

  if (isPdf) {
    toggleBtn.style.display = "inline-flex";
    toggleBtn.dataset.orig = url;
    toggleBtn.dataset.translated = "https://translate.google.com/translate?sl=auto&tl=uz&u=" + encodeURIComponent(url);
    toggleBtn.dataset.mode = "orig";
    toggleBtn.textContent = "🌐 Google Translate bilan ko'rish";
    body.innerHTML = `<iframe id="fm-frame" class="fm-frame" src="${url}"></iframe>`;
  } else if (isHtml) {
    // MUHIM: serverda saqlangan content-type noto'g'ri bo'lsa ham (eski
    // fayllarda shunday bo'lishi mumkin), fayl matnini o'zimiz o'qib,
    // "text/html" turi bilan Blob yasab, o'sha Blob'ni iframe'ga beramiz —
    // shunda ko'rsatish serverning content-type sozlamasiga bog'liq bo'lmaydi.
    toggleBtn.style.display = "none";
    body.innerHTML = `<div style="padding:16px;color:var(--muted);font-size:13px;">Yuklanmoqda…</div>`;
    try {
      const resp = await fetch(url, { cache: "no-store" });
      const text = await resp.text();
      const blobUrl = URL.createObjectURL(new Blob([text], { type: "text/html" }));
      body.innerHTML = `<iframe id="fm-frame" class="fm-frame" src="${blobUrl}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`;
    } catch (e) {
      body.innerHTML = `<iframe id="fm-frame" class="fm-frame" src="${url}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`;
    }
  } else if (isImg) {
    toggleBtn.style.display = "none";
    body.innerHTML = `<img src="${url}" class="fm-img">`;
  } else if (isVideo) {
    toggleBtn.style.display = "none";
    body.innerHTML = `<video src="${url}" class="fm-video" controls autoplay></video>`;
  } else if (isAudio) {
    toggleBtn.style.display = "none";
    body.innerHTML = `<div class="fm-audio-wrap"><audio src="${url}" controls autoplay style="width:100%;"></audio></div>`;
  } else {
    toggleBtn.style.display = "none";
    body.innerHTML = `<p style="padding:20px;">Bu fayl turini sayt ichida ko'rsatib bo'lmaydi.</p>`;
  }
}
el("fm-fullscreen").addEventListener("click", () => {
  const modalBox = document.querySelector("#file-modal .modal-box");
  const on = modalBox.classList.toggle("fullscreen");
  el("fm-fullscreen").textContent = on ? "⤢ Kichiklashtirish" : "⛶ Katta ekran";
});
el("fm-translate-toggle").addEventListener("click", () => {
  const btn = el("fm-translate-toggle");
  const frame = el("fm-frame");
  if (!frame) return;
  if (btn.dataset.mode === "orig") {
    frame.src = btn.dataset.translated;
    btn.dataset.mode = "translated";
    btn.textContent = "📄 Original nusxani ko'rish";
  } else {
    frame.src = btn.dataset.orig;
    btn.dataset.mode = "orig";
    btn.textContent = "🌐 Google Translate bilan ko'rish";
  }
});
function closeFileModal(){
  el("file-modal").classList.add("hidden");
  document.querySelector("#file-modal .modal-box").classList.remove("fullscreen");
  const frame = el("fm-frame");
  if (frame) frame.src = "about:blank";
}
el("fm-close").addEventListener("click", closeFileModal);
el("file-modal").addEventListener("click", (e) => { if (e.target.id === "file-modal") closeFileModal(); });

/* ---------------- App boshlash ---------------- */
function startApp(){
  el("intro").style.display = "none";
  el("app").classList.add("ready");
  el("brand-user").textContent = settings.user_name;
  el("rail-user").innerHTML = `<b>${escapeHtml(settings.user_name)}</b>${session ? escapeHtml(session.user.email) : ""}`;
  el("set-email-show").textContent = session ? session.user.email : "—";
  todayDayNumber = computeTodayDayNumber();
  currentViewDay = todayDayNumber;
  renderCatTabs();
  renderDashboard();
  renderDailyView();
  renderStats();
  renderSettings();
}

/* ---------------- Navigatsiya ---------------- */
function switchView(view){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  el("view-" + view).classList.add("active");
  document.querySelectorAll("button.navbtn, .tabbar button").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  if (view === "stats") renderStats();
  if (view === "dashboard") renderTodaySummary();
  document.querySelectorAll("button.navbtn, .tabbar button").forEach(b => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  window.scrollTo({top:0, behavior:"instant"});
}
document.querySelectorAll("button.navbtn, .tabbar button").forEach(b => {
  b.addEventListener("click", () => switchView(b.dataset.view));
});

/* ---------------- Bugungi qisqa holat ---------------- */
function renderTodaySummary(){
  const summaryDay = computeTodayDayNumber();
  const name = settings.user_name.trim();
  el("dashboard-greeting").textContent = name ? "Salom, " + name + "." : "Har kun — bir qadam.";
  el("dashboard-date").textContent = fmtDate(new Date());
  const tasks = allTasksForDay(summaryDay);
  const done = tasks.filter(task => dayData[summaryDay]?.tasks?.[task.key]?.completed).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  el("today-card-title").textContent = summaryDay + "-kun. Davom etamiz.";
  el("today-done").textContent = done;
  el("today-total").textContent = "/ " + tasks.length + " vazifa";
  el("today-progress-fill").style.width = pct + "%";
  el("today-progress").setAttribute("aria-valuenow", pct);
  el("today-card-note").textContent = done === tasks.length && tasks.length ? "Bugungi barcha vazifalar bajarildi!" : done ? "Yana " + (tasks.length - done) + " ta kichik qadam qoldi." : "Birinchi vazifadan boshlang. Qolgani izidan keladi.";
}
function openTodayJournal(){
  todayDayNumber = computeTodayDayNumber();
  currentViewDay = todayDayNumber;
  activeCatFilter = "all";
  renderCatTabs();
  renderDailyView();
  switchView("daily");
}
el("btn-open-today").addEventListener("click", openTodayJournal);
el("btn-today-card").addEventListener("click", openTodayJournal);

/* ---------------- DASHBOARD ---------------- */
function renderDashboard(){
  renderTodaySummary();
  el("ring-day").textContent = todayDayNumber;
  const startedDays = Object.keys(dayData).map(Number).filter(n => dayCompletionPct(n) !== null);
  const overallPct = startedDays.length
    ? Math.round(startedDays.reduce((s,n) => s + dayCompletionPct(n), 0) / startedDays.length)
    : 0;
  el("stat-pct").textContent = overallPct + "%";
  el("stat-left").textContent = 100 - todayDayNumber;

  let streak = 0;
  for (let n = todayDayNumber; n >= 1; n--) {
    const pct = dayCompletionPct(n);
    if (pct !== null && pct >= 50) streak++; else break;
  }
  el("stat-streak").textContent = streak;

  const circumference = 2 * Math.PI * 56;
  el("ring-fg").setAttribute("stroke-dasharray", circumference);
  el("ring-fg").setAttribute("stroke-dashoffset", circumference - (circumference * Math.min(todayDayNumber,100) / 100));

  const badgeDefs = [
    { id: "d7", label: "7 kunlik streak", test: () => streak >= 7 },
    { id: "d30", label: "30 kun", test: () => todayDayNumber >= 30 },
    { id: "half", label: "Yarim yo'l", test: () => todayDayNumber >= 50 },
    { id: "pct50", label: "50%+ bajarilish", test: () => overallPct >= 50 },
    { id: "d100", label: "100 kun!", test: () => todayDayNumber >= 100 },
  ];
  el("badges-row").innerHTML = badgeDefs.map(b =>
    `<span class="badge ${b.test() ? "earned" : ""}">${b.test() ? "★" : "☆"} ${b.label}</span>`
  ).join("");

  if (settings.main_goal) {
    el("goal-banner").classList.remove("hidden");
    el("goal-banner-text").innerHTML = `Asosiy maqsad: <b>${escapeHtml(settings.main_goal)}</b>`;
  } else {
    el("goal-banner").classList.add("hidden");
  }

  const grid = el("dotgrid");
  grid.innerHTML = "";
  for (let n = 1; n <= 100; n++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.textContent = n;
    const pct = dayCompletionPct(n);
    dot.className = "dot" + (n > todayDayNumber ? " future" : "") + (n === todayDayNumber ? " today" : "");
    dot.title = `Kun ${n}` + (pct !== null ? ` — ${pct}%` : "");
    dot.setAttribute("aria-label", dot.title + (n === todayDayNumber ? " — bugun" : ""));
    if (n === todayDayNumber) dot.setAttribute("aria-current", "date");
    if (pct !== null) {
      dot.style.background = pct >= 50
        ? "var(--forest)"
        : "#ead6cd";
      dot.style.color = pct >= 50 ? "#fff" : "var(--ink)";
    }
    dot.addEventListener("click", () => { currentViewDay = n; switchView("daily"); renderDailyView(); });
    grid.appendChild(dot);
  }

  renderCatList("catlist-dash");
}

function renderCatList(targetId){
  const box = el(targetId);
  const rows = categoriesWithCustom().map(c => {
    let done = 0, total = 0;
    Object.keys(dayData).forEach(dn => {
      c.tasks.forEach(t => {
        const key = `${c.id}:${t.id}`;
        if (dayData[dn].tasks[key]) { total++; if (dayData[dn].tasks[key].completed) done++; }
      });
    });
    const pct = total ? Math.round((done/total)*100) : 0;
    return { c, pct };
  }).sort((a,b) => b.pct - a.pct);

  box.innerHTML = rows.map(({c, pct}) => `
    <div class="catrow">
      <div class="ic">${c.icon}</div>
      <div class="name"><b>${c.name}</b><small>${c.tasks.length} ta vazifa turi</small></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="pct">${pct}%</div>
    </div>
  `).join("") || `<p style="color:var(--muted);font-size:13px;">Hali ma'lumot yo'q — kunlik jurnalni to'ldiring.</p>`;
}

/* ---------------- DAILY ---------------- */
function renderCatTabs(){
  const tabs = [{id:"all", name:"Barchasi", icon:"◎"}, ...categoriesWithCustom()];
  el("cat-tabs").innerHTML = tabs.map(c =>
    `<button class="cat-tab ${activeCatFilter === c.id ? "active" : ""}" data-cat="${c.id}">${c.icon || ""} ${c.name}</button>`
  ).join("");
  el("cat-tabs").querySelectorAll(".cat-tab").forEach(b => {
    b.addEventListener("click", () => { activeCatFilter = b.dataset.cat; renderCatTabs(); applyCatFilter(); });
  });
}
function applyCatFilter(){
  document.querySelectorAll("#task-groups > .task-group").forEach(group => {
    group.classList.toggle("hidden", activeCatFilter !== "all" && group.dataset.group !== activeCatFilter);
  });
  document.querySelectorAll(".task-wrap").forEach(w => {
    const cat = w.querySelector(".task").dataset.cat;
    w.classList.toggle("day-hidden", activeCatFilter !== "all" && cat !== activeCatFilter);
  });
}
function renderTimeline(dayNumber){
  const dt = getDayType(dayNumber);
  el("timeline").innerHTML = TIMELINES[dt].map(i => `<div class="tl-item"><div class="t">${i.t}</div><div class="l">${i.l}</div></div>`).join("");
}
function startTimerFor(seconds, label){
  timerSeconds = seconds;
  timerRunning = true;
  el("timer-toggle").textContent = "To'xtatish";
  renderTimer();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerRunning = false;
      el("timer-toggle").textContent = "Boshlash";
      toast("Timer tugadi ⏰ " + (label || ""));
      trackerPrefs.timer_minutes += Math.round(seconds/60);saveTrackerPrefs();
    }
    renderTimer();
  }, 1000);
  document.querySelector(".timer-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  toast("Taymer boshlandi: " + (label || ""));
}
function renderDailyView(){
  if (!dayData[currentViewDay]) dayData[currentViewDay] = { tasks: {}, note: "" };
  const d = dayFromStart(currentViewDay);
  const dt = getDayType(currentViewDay);
  el("day-title").textContent = "Kun " + currentViewDay;
  el("day-date").textContent = fmtDate(d);
  el("day-today-badge").classList.toggle("hidden", currentViewDay !== todayDayNumber);
  el("day-type").textContent = DAY_TYPES[dt].label;
  el("day-note").value = dayData[currentViewDay].note || "";
  renderTimeline(currentViewDay);

  function taskRowHtml(c, t){
    const key = `${c.id}:${t.id}`;
    const st = dayData[currentViewDay].tasks[key] || { completed: false, value: "", priority: "mid" };
    return `
    <div class="task-wrap" data-key="${key}">
      <div class="task" data-cat="${c.id}" data-key="${key}">
        <button type="button" class="chk ${st.completed ? "on" : ""}" data-role="chk" aria-label="${escapeHtml(t.name)} — bajarildi" aria-pressed="${st.completed}">${st.completed ? "✓" : ""}</button>
        <span class="task-ic">${c.icon}</span>
        <span class="tname">${t.name}</span>
        ${t.unit ? `<input class="val" data-role="val" aria-label="${escapeHtml(t.name)} (${escapeHtml(t.unit || "natija")})" type="number" placeholder="0" value="${st.value ?? ""}"><span class="unit">${t.unit}</span>` : ""}
        ${t.duration ? `<button type="button" class="tbtn timer" data-role="tasktimer" data-sec="${t.duration*60}" data-label="${escapeHtml(t.name)}" title="Taymer: ${t.duration} daq">⏱</button>` : ""}
        <button type="button" class="tbtn mic" data-role="mic" title="Ovoz yozish (mikrofon)">🎤</button>
        <button type="button" class="tbtn attach" data-role="attach" title="Fayl biriktirish (PDF/HTML/rasm/video)">📎</button>
        <div class="prio" data-role="prio" data-p="${st.priority}"><i></i><i></i><i></i></div>
      </div>
      <div class="task-files" data-role="files"></div>
    </div>`;
  }

  const groups = categoriesForDay(currentViewDay);
  el("task-groups").innerHTML = groups.map(c => {
    if (c.id === "ielts") {
      // IELTS vazifalarini Reading / Listening / Speaking / Writing bo'yicha guruhlab chiqaramiz
      const byGroup = new Map();
      c.tasks.forEach(t => {
        const g = t.group || "review";
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g).push(t);
      });
      const sectionsHtml = IELTS_GROUP_ORDER.filter(g => byGroup.has(g)).map(g => `
        <div class="ielts-sub">
          <h5>${IELTS_GROUP_LABELS[g] || g}</h5>
          ${byGroup.get(g).map(t => taskRowHtml(c, t)).join("")}
        </div>
      `).join("");
      return `<div class="task-group" data-group="${c.id}"><h4>${c.icon} ${c.name.toUpperCase()}</h4>${sectionsHtml}</div>`;
    }
    return `
      <div class="task-group" data-group="${c.id}">
        <h4>${c.icon} ${c.name.toUpperCase()}</h4>
        ${c.tasks.map(t => taskRowHtml(c, t)).join("")}
      </div>
    `;
  }).join("");

  document.querySelectorAll(".task-wrap").forEach(wrap => {
    const key = wrap.dataset.key;
    const taskEl = wrap.querySelector(".task");
    if (!dayData[currentViewDay].tasks[key]) dayData[currentViewDay].tasks[key] = { completed: false, value: "", priority: "mid" };
    const state = dayData[currentViewDay].tasks[key];

    const chk = taskEl.querySelector('[data-role="chk"]');
    chk.addEventListener("click", () => {
      state.completed = !state.completed;
      chk.classList.toggle("on", state.completed);
      chk.textContent = state.completed ? "✓" : "";
      chk.setAttribute("aria-pressed", String(state.completed));
      taskEl.classList.toggle("done", state.completed);
    });
    taskEl.classList.toggle("done", state.completed);

    const val = taskEl.querySelector('[data-role="val"]');
    if (val) val.addEventListener("input", () => { state.value = val.value; });

    const prio = taskEl.querySelector('[data-role="prio"]');
    prio.addEventListener("click", () => {
      const order = ["low","mid","high"];
      const next = order[(order.indexOf(state.priority) + 1) % order.length];
      state.priority = next;
      prio.dataset.p = next;
    });

    const timerBtn = taskEl.querySelector('[data-role="tasktimer"]');
    if (timerBtn) timerBtn.addEventListener("click", () => startTimerFor(Number(timerBtn.dataset.sec), timerBtn.dataset.label));

    const attachBtn = taskEl.querySelector('[data-role="attach"]');
    attachBtn.addEventListener("click", () => { currentUploadKey = key; el("file-input-hidden").click(); });

    const micBtn = taskEl.querySelector('[data-role="mic"]');
    if (micBtn) micBtn.addEventListener("click", () => toggleMicRecording(key, micBtn));

    renderTaskFiles(key);
  });

  applyCatFilter();
}

el("day-prev").addEventListener("click", () => { if (currentViewDay > 1) { currentViewDay--; renderDailyView(); } });
el("day-next").addEventListener("click", () => { if (currentViewDay < 100) { currentViewDay++; renderDailyView(); } });
el("btn-today").addEventListener("click", () => { currentViewDay = todayDayNumber; renderDailyView(); });

el("day-note").addEventListener("input", (e) => {
  if (!dayData[currentViewDay]) dayData[currentViewDay] = { tasks: {}, note: "" };
  dayData[currentViewDay].note = e.target.value;
});

el("btn-save-day").addEventListener("click", async () => {
  const ok = await saveDay(currentViewDay);
  if (ok) {
    el("save-status").classList.add("show");
    setTimeout(() => el("save-status").classList.remove("show"), 1800);
    toast("Kun saqlandi");
    renderDashboard();
  }
});
el("btn-reset-day").addEventListener("click", async () => {
  if (!confirm("Bu kunning barcha belgilari o'chiriladi. Davom etasizmi?")) return;
  if(!await clearDay(currentViewDay))return;
  renderDailyView();
  renderDashboard();
  toast("Kun tozalandi");
});

/* ---------------- TIMER ---------------- */
function renderTimer(){
  const m = Math.floor(timerSeconds/60).toString().padStart(2,"0");
  const s = (timerSeconds%60).toString().padStart(2,"0");
  el("timer-display").textContent = `${m}:${s}`;
}
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    timerSeconds = Number(chip.dataset.sec);
    clearInterval(timerInterval); timerRunning = false;
    el("timer-toggle").textContent = "Boshlash";
    renderTimer();
  });
});
el("timer-toggle").addEventListener("click", () => {
  timerRunning = !timerRunning;
  el("timer-toggle").textContent = timerRunning ? "To'xtatish" : "Davom ettirish";
  if (timerRunning) {
    timerInterval = setInterval(() => {
      timerSeconds--;
      if (timerSeconds <= 0) {
        clearInterval(timerInterval); timerRunning = false;
        el("timer-toggle").textContent = "Boshlash";
        toast("Timer tugadi ⏰");
        trackerPrefs.timer_minutes += Math.round((Number(document.querySelector(".chip.active")?.dataset.sec) || 300) / 60);saveTrackerPrefs();
      }
      renderTimer();
    }, 1000);
  } else {
    clearInterval(timerInterval);
  }
});
renderTimer();

/* ---------------- STATS ---------------- */
function renderStats(){
  const days = Object.keys(dayData).map(Number).filter(n => dayCompletionPct(n) !== null).sort((a,b)=>a-b);
  if (!days.length) {
    el("ms-best").textContent = "—"; el("ms-worst").textContent = "—";
    el("ms-avg").textContent = "0%"; el("ms-total").textContent = "0";
  } else {
    let best = days[0], worst = days[0];
    days.forEach(n => {
      if (dayCompletionPct(n) > dayCompletionPct(best)) best = n;
      if (dayCompletionPct(n) < dayCompletionPct(worst)) worst = n;
    });
    const avg = Math.round(days.reduce((s,n)=>s+dayCompletionPct(n),0)/days.length);
    let totalDone = 0;
    days.forEach(n => Object.values(dayData[n].tasks).forEach(t => { if (t.completed) totalDone++; }));
    el("ms-best").textContent = `Kun ${best} (${dayCompletionPct(best)}%)`;
    el("ms-worst").textContent = `Kun ${worst} (${dayCompletionPct(worst)}%)`;
    el("ms-avg").textContent = avg + "%";
    el("ms-total").textContent = totalDone;
  }
  el("ms-time").textContent = trackerPrefs.timer_minutes + " daq";

  drawWeekChart();
  renderCatList("catlist-stats");
}

function drawWeekChart(){
  const canvas = el("chart-week");
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  canvas.width = w; canvas.height = 160;
  ctx.clearRect(0,0,w,160);

  const endDay = Math.min(todayDayNumber, 100);
  const startDay = Math.max(1, endDay - 13);
  const points = [];
  for (let n = startDay; n <= endDay; n++) points.push({ n, pct: dayCompletionPct(n) ?? 0 });

  const barW = (w - 20) / points.length;
  const inkMuted = getComputedStyle(document.body).getPropertyValue("--muted").trim() || "#6E7561";
  const forest = getComputedStyle(document.body).getPropertyValue("--forest").trim() || "#3F6B3B";

  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.beginPath(); ctx.moveTo(10,130); ctx.lineTo(w-10,130); ctx.stroke();

  points.forEach((p, i) => {
    const x = 10 + i * barW + barW*0.18;
    const bw = barW*0.64;
    const h = (p.pct/100) * 110;
    ctx.fillStyle = forest;
    ctx.globalAlpha = 0.25 + (p.pct/100)*0.65;
    roundRect(ctx, x, 130-h, bw, h, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = inkMuted;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.n, x+bw/2, 146);
  });
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

el("btn-print-report").addEventListener("click", () => window.print());

/* ---------------- SETTINGS ---------------- */
function renderSettings(){
  el("set-name-show").textContent = settings.user_name || "—";
  el("set-date-show").textContent = settings.start_date ? fmtDate(new Date(settings.start_date+"T00:00:00")) : "—";
  el("set-goal-show").textContent = settings.main_goal || "Belgilanmagan";
  el("goal-list").innerHTML = settings.custom_categories.map((g,i) => `
    <div class="goal-item"><span>${g.name}${g.unit ? " ("+g.unit+")" : ""}</span><button data-i="${i}">✕</button></div>
  `).join("") || `<p style="color:var(--muted);font-size:12.5px;">Shaxsiy maqsad qo'shilmagan.</p>`;
  el("goal-list").querySelectorAll("button").forEach(b => {
    b.addEventListener("click", async () => {
      settings.custom_categories.splice(Number(b.dataset.i), 1);
      await saveSettings();
      renderSettings(); renderCatTabs(); renderDailyView();
    });
  });
  el("reminders-toggle").checked = trackerPrefs.reminders_enabled;
}

el("btn-edit-name").addEventListener("click", async () => {
  const v = prompt("Ismingiz:", settings.user_name || "");
  if (v === null || !v.trim()) return;
  settings.user_name = v.trim(); await saveSettings(); startApp();
});
el("btn-edit-date").addEventListener("click", async () => {
  const v = prompt("Boshlanish sanasi (YYYY-MM-DD):", settings.start_date || "");
  if (v === null || !v.trim()) return;
  settings.start_date = v.trim(); await saveSettings(); startApp();
});
el("btn-edit-goal").addEventListener("click", async () => {
  const v = prompt("Asosiy maqsad:", settings.main_goal || "");
  if (v === null) return;
  settings.main_goal = v.trim(); await saveSettings(); renderSettings(); renderDashboard();
});
el("btn-add-goal").addEventListener("click", async () => {
  const name = el("new-goal-name").value.trim();
  const unit = el("new-goal-unit").value.trim();
  if (!name) { toast("Maqsad nomini kiriting"); return; }
  const slug = name.toLowerCase().replace(/[^a-z0-9а-яёЁ]+/gi, "-").replace(/(^-|-$)/g,"") || ("goal" + Date.now());
  settings.custom_categories.push({ slug, name, unit });
  await saveSettings();
  el("new-goal-name").value = ""; el("new-goal-unit").value = "";
  renderSettings(); renderCatTabs(); renderDailyView();
  toast("Maqsad qo'shildi");
});

el("reminders-toggle").addEventListener("change", async (e) => {
  if (e.target.checked) {
    if (typeof Notification === 'undefined') { e.target.checked=false;toast('Bu brauzer bildirishnomani qo‘llamaydi.');return; }
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { e.target.checked = false; toast("Bildirishnoma ruxsati berilmadi"); return; }
    }
    trackerPrefs.reminders_enabled=true;saveTrackerPrefs();
    startReminderLoop();
  } else {
    trackerPrefs.reminders_enabled=false;saveTrackerPrefs();
  }
});
function startReminderLoop(){
  if (startReminderLoop._started) return;
  startReminderLoop._started = true;
  setInterval(() => {
    if (!trackerPrefs.reminders_enabled) return;
    const now = new Date();
    const hm = now.toTimeString().slice(0,5);
    if (hm === "18:00" || hm === "21:30") {
      try { new Notification("100 KUN", { body: hm === "18:00" ? "Gym vaqti!" : "Kunni tekshirish vaqti." }); } catch(e){}
    }
  }, 30000);
}

el("btn-export-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ settings, dayData }, null, 2)], { type: "application/json" });
  downloadBlob(blob, "100kun-export.json");
});
el("btn-export-csv").addEventListener("click", () => {
  const rows = [["Kun","Sana","Kategoriya","Vazifa","Bajarildi","Qiymat","Muhimlik"]];
  Object.keys(dayData).map(Number).sort((a,b)=>a-b).forEach(n => {
    const d = dayFromStart(n);
    allTasksForDay(n).forEach(t => {
      const st = dayData[n].tasks[t.key];
      if (!st) return;
      rows.push([n, d.toISOString().slice(0,10), t.catName, t.name, st.completed ? "Ha" : "Yo'q", st.value ?? "", st.priority]);
    });
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), "100kun-export.csv");
});
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Ishga tushirish ---------------- */
if (window.self !== window.top && new URLSearchParams(location.search).has('embed')) {
  const reportHeight = () => {
    const height = Math.ceil(el('app').classList.contains('ready') ? el('app').scrollHeight : document.documentElement.scrollHeight);
    window.parent.postMessage({ type: 'vocab-atlas-journal-height', height }, location.origin);
  };
  new ResizeObserver(reportHeight).observe(document.querySelector('.main'));
  window.addEventListener('load', reportHeight);
  document.querySelectorAll('.journal-tabs button').forEach(button => button.addEventListener('click', () => requestAnimationFrame(reportHeight)));
}
setAuthMode(false);
checkExistingSession().catch(error=>{
  if(window.self!==window.top){
    el('intro').innerHTML='<div class="journal-session-note"><strong>Jurnal ochilmadi</strong><p id="journalError"></p><button type="button" class="intro-btn" onclick="location.reload()">Qayta urinish</button></div>';
    el('journalError').textContent=error.message||'Hisobdagi ma’lumotlar yuklanmadi.';
    el('intro').style.display='flex';
  }else showAuthMsg(error.message||'Hisobdagi ma’lumotlar yuklanmadi.',false);
});
