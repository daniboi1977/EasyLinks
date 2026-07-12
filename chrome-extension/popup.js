const APP_URL = 'https://bookmarks-daniclark.vercel.app';
const SUPABASE_URL = 'https://htvjyecdydcdkzzmflpk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0hJs3zPsZ_Jqe9v5pNiGNw_GC4vCBMz';

const loginView = document.getElementById('loginView');
const mainView = document.getElementById('mainView');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');
const accountEmail = document.getElementById('accountEmail');
const logoutLink = document.getElementById('logoutLink');

const urlInput = document.getElementById('url');
const analyzeBtn = document.getElementById('analyzeBtn');
const addBtn = document.getElementById('addBtn');
const fields = document.getElementById('fields');
const msgEl = document.getElementById('msg');
const titleInput = document.getElementById('title');
const summaryInput = document.getElementById('summary');
const topicsInput = document.getElementById('topics');
const pasteField = document.getElementById('pasteField');
const pasteText = document.getElementById('pasteText');

function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className = `msg ${type}`;
}

function clearMsg() {
  msgEl.textContent = '';
  msgEl.className = '';
}

// --- Auth: session stored in chrome.storage.local, refreshed against
// Supabase's Auth REST API directly (no SDK bundling needed) ---

async function getStoredSession() {
  const { session } = await chrome.storage.local.get('session');
  return session ?? null;
}

async function saveSession(tokenResponse) {
  const session = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: Date.now() + tokenResponse.expires_in * 1000,
    email: tokenResponse.user?.email ?? '',
  };
  await chrome.storage.local.set({ session });
  return session;
}

async function clearSession() {
  await chrome.storage.local.remove('session');
}

async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return saveSession(data);
}

// Returns a valid access token, refreshing first if it's expired or about to.
async function getValidAccessToken() {
  let session = await getStoredSession();
  if (!session) return null;

  if (session.expires_at - Date.now() < 60_000) {
    session = await refreshSession(session.refresh_token);
    if (!session) {
      await clearSession();
      return null;
    }
  }

  return session.access_token;
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error_description || data.msg || 'Login failed' };
  }
  const session = await saveSession(data);
  return { ok: true, session };
}

async function signOut() {
  const session = await getStoredSession();
  if (session?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      // Best-effort — still clear the local session even if this fails.
    }
  }
  await clearSession();
}

function showLoginView() {
  loginView.classList.add('visible');
  mainView.classList.remove('visible');
}

async function showMainView(session) {
  loginView.classList.remove('visible');
  mainView.classList.add('visible');
  accountEmail.textContent = session.email;

  // Pre-fill the current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url) urlInput.value = tab.url;
  });
}

async function init() {
  const session = await getStoredSession();
  if (session) {
    await showMainView(session);
  } else {
    showLoginView();
  }
}

loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) return;

  loginBtn.textContent = 'Logging in…';
  loginBtn.disabled = true;
  loginMsg.textContent = '';
  loginMsg.className = '';

  const result = await signIn(email, password);

  loginBtn.textContent = 'Log in';
  loginBtn.disabled = false;

  if (!result.ok) {
    loginMsg.textContent = result.error;
    loginMsg.className = 'msg error';
    return;
  }

  await showMainView(result.session);
});

logoutLink.addEventListener('click', async () => {
  await signOut();
  showLoginView();
});

analyzeBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return;

  const token = await getValidAccessToken();
  if (!token) {
    showLoginView();
    return;
  }

  analyzeBtn.textContent = 'Analyzing…';
  analyzeBtn.disabled = true;
  clearMsg();

  try {
    const body = pasteField.style.display !== 'none' && pasteText.value.trim()
      ? { pastedText: pasteText.value.trim() }
      : { url };

    const res = await fetch(`${APP_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.status === 401) {
      await clearSession();
      showLoginView();
      return;
    }

    if (data.error === 'blocked') {
      pasteField.style.display = 'flex';
      pasteText.focus();
      showMsg('This site blocks automated fetches. Paste the post text above and click Analyze again.', 'error');
      return;
    }

    if (!res.ok) {
      showMsg(data.message ?? 'Analysis failed', 'error');
      return;
    }

    titleInput.value = data.title ?? '';
    summaryInput.value = data.summary ?? '';
    topicsInput.value = (data.topics ?? []).join(', ');

    fields.classList.add('visible');
    clearMsg();
  } catch {
    showMsg('Could not reach the app. Is it running?', 'error');
  } finally {
    analyzeBtn.textContent = 'Analyze';
    analyzeBtn.disabled = false;
  }
});

addBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  const title = titleInput.value.trim();
  if (!url || !title) {
    showMsg('URL and title are required', 'error');
    return;
  }

  const token = await getValidAccessToken();
  if (!token) {
    showLoginView();
    return;
  }

  addBtn.textContent = 'Saving…';
  addBtn.disabled = true;
  clearMsg();

  const topics = topicsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    const res = await fetch(`${APP_URL}/api/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        url,
        title,
        summary: summaryInput.value.trim(),
        topics,
      }),
    });

    if (res.status === 401) {
      await clearSession();
      showLoginView();
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      showMsg(data.error ?? 'Save failed', 'error');
      return;
    }

    showMsg('Bookmark saved!', 'success');
    addBtn.textContent = 'Add bookmark';
    addBtn.disabled = false;

    // Close the popup after a short delay
    setTimeout(() => window.close(), 1200);
  } catch {
    showMsg('Could not reach the app. Is it running?', 'error');
    addBtn.textContent = 'Add bookmark';
    addBtn.disabled = false;
  }
});

init();
