const APP_URL = 'https://bookmarks-daniclark.vercel.app';
const PROTECTION_BYPASS_SECRET = '6VxcuTKoNCmWRO2B6q6A0FgmB33rHA5S';
const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'x-vercel-protection-bypass': PROTECTION_BYPASS_SECRET,
};

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

// Pre-fill the current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url) urlInput.value = tab.url;
});

analyzeBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return;

  analyzeBtn.textContent = 'Analyzing…';
  analyzeBtn.disabled = true;
  clearMsg();

  try {
    const body = pasteField.style.display !== 'none' && pasteText.value.trim()
      ? { pastedText: pasteText.value.trim() }
      : { url };

    const res = await fetch(`${APP_URL}/api/analyze`, {
      method: 'POST',
      headers: FETCH_HEADERS,
      body: JSON.stringify(body),
    });

    const data = await res.json();

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
      headers: FETCH_HEADERS,
      body: JSON.stringify({
        url,
        title,
        summary: summaryInput.value.trim(),
        topics,
      }),
    });

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
