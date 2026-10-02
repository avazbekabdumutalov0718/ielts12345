/* VIVID IELTS — Supabase wrapper.
   Include order in HTML:
   1) <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   2) <script src="supabase-config.js"></script>
   3) <script src="db.js"></script>
*/

const VividDB = (() => {
  let client = null;
  const isConfigured =
    typeof SUPABASE_URL !== 'undefined' &&
    SUPABASE_URL &&
    !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
    typeof SUPABASE_ANON_KEY !== 'undefined' &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('YOUR-ANON');

  if (isConfigured && typeof supabase !== 'undefined') {
    client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function removePersistentStatusBanner() {
    const banner = document.getElementById('vividStatusBanner');
    if (banner && banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
  }

  removePersistentStatusBanner();

  function lsGet(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; }
    catch { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function getStateKey(key) {
    return `vivid_state:${key}`;
  }

  async function saveUserState(key, value) {
    const user = await getUser();
    if (!client || !user) {
      try { localStorage.setItem(getStateKey(key), JSON.stringify(value)); } catch {}
      return { success: true };
    }
    const { error } = await client.from('user_state').upsert({
      user_id: user.id,
      key,
      value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,key' });
    if (error) throw error;
    return { success: true };
  }

  async function loadUserState(key, fallback = null) {
    const user = await getUser();
    if (!client || !user) {
      try {
        const raw = localStorage.getItem(getStateKey(key));
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    }
    const { data, error } = await client.from('user_state').select('value').eq('user_id', user.id).eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.value ?? fallback;
  }

  // ---------- AUTH ----------
  async function signUp(email, password, fullName) {
    if (!client) return { error: { message: 'Supabase is not configured yet (see supabase-config.js).' } };
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    return { data, error };
  }

  async function signIn(email, password) {
    if (!client) return { error: { message: 'Supabase is not configured yet (see supabase-config.js).' } };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signInWithGoogle() {
    if (!client) return { error: { message: 'Supabase is not configured yet (see supabase-config.js).' } };
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/index.html` },
    });
    return { data, error };
  }

  // Exchanges a verified Telegram Login Widget payload for a Supabase session.
  // Requires the `telegram-auth` Supabase Edge Function (see /supabase/functions/telegram-auth).
  async function signInWithTelegram(telegramUser) {
    if (!client) return { error: { message: 'Supabase is not configured yet (see supabase-config.js).' } };
    const { data, error } = await client.functions.invoke('telegram-auth', { body: telegramUser });
    if (error) return { error };
    if (data?.action_link) {
      window.location.href = data.action_link;
      return { data };
    }
    return { error: { message: 'Telegram sign-in did not return a session link.' } };
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function getUser() {
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data.user;
  }

  // ---------- PROFILE ----------
  async function getProfile() {
    const user = await getUser();
    if (!client || !user) return { full_name: lsGet('vivid_guest_name', 'Guest') };
    const { data } = await client.from('profiles').select('*').eq('user_id', user.id).single();
    return data;
  }

  async function updateProfile(fields) {
    const user = await getUser();
    if (!client || !user) return;
    await client.from('profiles').update(fields).eq('user_id', user.id);
  }

  // ---------- VOCAB PROGRESS ----------
  async function getLearnedWordIds() {
    const user = await getUser();
    if (!client || !user) return new Set(lsGet('vivid_learned_words', []));
    const { data } = await client.from('vocab_progress').select('word_id').eq('user_id', user.id);
    return new Set((data || []).map((r) => r.word_id));
  }

  async function markWordLearned(wordId) {
    const user = await getUser();
    if (!client || !user) {
      const s = new Set(lsGet('vivid_learned_words', []));
      s.add(wordId);
      lsSet('vivid_learned_words', [...s]);
      return;
    }
    await client.from('vocab_progress').upsert({ user_id: user.id, word_id: wordId });
  }

  async function unmarkWordLearned(wordId) {
    const user = await getUser();
    if (!client || !user) {
      const s = new Set(lsGet('vivid_learned_words', []));
      s.delete(wordId);
      lsSet('vivid_learned_words', [...s]);
      return;
    }
    await client.from('vocab_progress').delete().eq('user_id', user.id).eq('word_id', wordId);
  }

  async function getCollocationProgress() {
    return await loadUserState('collocation_progress', {});
  }

  async function markCollocationUnitCompleted(unitId, title) {
    const progress = await getCollocationProgress();
    progress[unitId] = { title, completed_at: new Date().toISOString() };
    await saveUserState('collocation_progress', progress);
    return progress;
  }

  // ---------- GRAMMAR PROGRESS ----------
  async function getGrammarProgress() {
    const user = await getUser();
    if (!client || !user) return lsGet('vivid_grammar_progress', {});
    const { data } = await client.from('grammar_progress').select('*').eq('user_id', user.id);
    const map = {};
    (data || []).forEach((r) => {
      map[r.tense_id] = { passed: r.passed, bestScore: r.best_score, updated_at: r.updated_at };
    });
    return map;
  }

  async function saveGrammarResult(tenseId, score, total) {
    const passed = score / total >= 0.7;
    const user = await getUser();
    if (!client || !user) {
      const progress = lsGet('vivid_grammar_progress', {});
      const prevBest = progress[tenseId]?.bestScore || 0;
      progress[tenseId] = { passed: passed || progress[tenseId]?.passed, bestScore: Math.max(prevBest, score) };
      lsSet('vivid_grammar_progress', progress);
      return { passed };
    }
    const { data: existing } = await client.from('grammar_progress').select('*').eq('user_id', user.id).eq('tense_id', tenseId).single();
    const bestScore = Math.max(existing?.best_score || 0, score);
    await client.from('grammar_progress').upsert({
      user_id: user.id, tense_id: tenseId, unlocked: true,
      best_score: bestScore, passed: passed || existing?.passed || false,
      updated_at: new Date().toISOString(),
    });
    return { passed };
  }

  // ---------- READING RESULTS ----------
  async function saveReadingResult(testId, score, total, band, vocabScore) {
    const result = { testId, score, total, band, vocabScore, completed_at: new Date().toISOString() };
    const user = await getUser();
    if (!client || !user) {
      const results = lsGet('vivid_reading_results', []);
      results.unshift(result);
      lsSet('vivid_reading_results', results.slice(0, 120));
      return;
    }
    const category = `_site_reading:${String(testId).slice(0, 70)}`;
    const { error } = await client.from('daily_logs').upsert({
      user_id: user.id,
      day_number: 1,
      category,
      completed: true,
      value: Number(score) || 0,
      priority: 'mid',
      note: JSON.stringify(result),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,day_number,category' });
    if (error) {
      const results = lsGet('vivid_reading_results', []);
      results.unshift(result);
      lsSet('vivid_reading_results', results.slice(0, 120));
    }
  }

  async function getReadingResults() {
    const user = await getUser();
    if (!client || !user) return lsGet('vivid_reading_results', []);
    const { data, error } = await client.from('daily_logs')
      .select('category,note,updated_at')
      .eq('user_id', user.id)
      .eq('day_number', 1)
      .like('category', '_site_reading:%')
      .order('updated_at', { ascending: false });
    if (error) return lsGet('vivid_reading_results', []);
    return (data || []).map(row => { try { return JSON.parse(row.note || '{}'); } catch { return {}; } }).filter(x => x.testId);
  }

  // ---------- COMMUNITY (real, shared across every user — no fake/local data) ----------
  async function getCommunityPosts() {
    if (!client) return [];
    const { data: posts, error } = await client
      .from('community_posts')
      .select('id, user_id, author_name, channel, body, created_at')
      .order('created_at', { ascending: false });
    if (error) { console.error('getCommunityPosts', error); return []; }

    const { data: likes } = await client.from('community_likes').select('post_id, user_id');
    const { data: comments } = await client
      .from('community_comments')
      .select('id, post_id, user_id, author_name, body, created_at')
      .order('created_at', { ascending: true });

    const user = await getUser();
    return (posts || []).map((p) => {
      const postLikes = (likes || []).filter((l) => l.post_id === p.id);
      return {
        id: p.id,
        userId: p.user_id,
        author: p.author_name,
        channel: p.channel,
        text: p.body,
        ts: new Date(p.created_at).getTime(),
        likes: postLikes.length,
        likedByMe: !!user && postLikes.some((l) => l.user_id === user.id),
        comments: (comments || [])
          .filter((c) => c.post_id === p.id)
          .map((c) => ({ id: c.id, userId: c.user_id, author: c.author_name, text: c.body, ts: new Date(c.created_at).getTime() })),
      };
    });
  }

  async function createCommunityPost(text, channel) {
    const user = await getUser();
    if (!client || !user) return { error: { message: 'not-logged-in' } };
    const profile = await getProfile();
    const authorName = profile?.full_name || 'IELTS Student';
    const { data, error } = await client
      .from('community_posts')
      .insert({ user_id: user.id, author_name: authorName, channel, body: text })
      .select()
      .single();
    return { data, error };
  }

  async function deleteCommunityPost(postId) {
    const user = await getUser();
    if (!client || !user) return { error: { message: 'not-logged-in' } };
    const { error } = await client.from('community_posts').delete().eq('id', postId).eq('user_id', user.id);
    return { error };
  }

  async function toggleCommunityLike(postId, currentlyLiked) {
    const user = await getUser();
    if (!client || !user) return { error: { message: 'not-logged-in' } };
    if (currentlyLiked) {
      await client.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await client.from('community_likes').insert({ post_id: postId, user_id: user.id });
    }
    return { success: true };
  }

  async function addCommunityComment(postId, text) {
    const user = await getUser();
    if (!client || !user) return { error: { message: 'not-logged-in' } };
    const profile = await getProfile();
    const authorName = profile?.full_name || 'IELTS Student';
    const { data, error } = await client
      .from('community_comments')
      .insert({ post_id: postId, user_id: user.id, author_name: authorName, body: text })
      .select()
      .single();
    return { data, error };
  }

  // Real member count (no more made-up "128 learners online")
  async function getCommunityMemberCount() {
    if (!client) return 0;
    const { count, error } = await client.from('profiles').select('*', { count: 'exact', head: true });
    if (error) { console.error('getCommunityMemberCount', error); return 0; }
    return count || 0;
  }

  // Real top contributors, ranked by actual number of posts — no invented streaks
  async function getCommunityTopContributors(limit = 5) {
    if (!client) return [];
    const { data, error } = await client.from('community_posts').select('user_id, author_name');
    if (error || !data) return [];
    const counts = {};
    data.forEach((row) => {
      const key = row.user_id;
      if (!counts[key]) counts[key] = { name: row.author_name, count: 0 };
      counts[key].count += 1;
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // ---------- UI FEEDBACK ----------
  function showSavedToast(message) {
    removePersistentStatusBanner();
    let toast = document.getElementById('vividToast');
    if (!toast || !toast.isConnected) {
      toast = document.createElement('div');
      toast.id = 'vividToast';
      toast.setAttribute('aria-live', 'polite');
      toast.style.cssText = `
        position:fixed; bottom:20px; right:20px; z-index:9999;
        background:#171717; color:#fff; padding:10px 18px; border-radius:8px;
        font-family:'Inter',Arial,sans-serif; font-size:13px; font-weight:600;
        box-shadow:0 8px 24px rgba(0,0,0,0.25); opacity:0; transform:translateY(8px);
        transition:opacity .25s ease, transform .25s ease; pointer-events:none;`;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }, 2200);
  }

  async function getConnectionStatus() {
    if (!isConfigured) return { connected: false, label: 'Guest mode — saved in this browser only' };
    const user = await getUser();
    if (!user) return { connected: false, label: 'Not logged in' };
    return { connected: true, label: 'Connected' };
  }

  return {
    isConfigured, signUp, signIn, signInWithGoogle, signInWithTelegram, signOut, getSession, getUser,
    getProfile, updateProfile,
    getLearnedWordIds, markWordLearned, unmarkWordLearned,
    getCollocationProgress, markCollocationUnitCompleted,
    getGrammarProgress, saveGrammarResult,
    saveReadingResult, getReadingResults,
    saveUserState, loadUserState,
    showSavedToast, getConnectionStatus,
    getCommunityPosts, createCommunityPost, deleteCommunityPost,
    toggleCommunityLike, addCommunityComment,
    getCommunityMemberCount, getCommunityTopContributors,
    getClient: () => client,
  };
})();