async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function apiPost(action, data = {}) {
  const url = new URL(CONFIG.SCRIPT_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('data', JSON.stringify({ action, ...data }));
  const res = await fetch(url.toString());
  return res.json();
}

async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
