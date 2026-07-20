/* ============================================================
   GitHub Contents API wrapper
   사이트 자체에서 데이터 파일(JSON)을 직접 읽고 커밋하기 위한 모듈.
   개인 액세스 토큰(PAT)을 브라우저 localStorage에 저장해 사용합니다.
   ============================================================ */

const GH = (() => {
  const LS_KEY = "cj_admin_creds";

  function getCreds() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY));
    } catch {
      return null;
    }
  }

  function setCreds(creds) {
    localStorage.setItem(LS_KEY, JSON.stringify(creds));
  }

  function clearCreds() {
    localStorage.removeItem(LS_KEY);
  }

  function isLoggedIn() {
    const c = getCreds();
    return !!(c && c.owner && c.repo && c.token);
  }

  function b64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function b64DecodeUnicode(str) {
    return decodeURIComponent(escape(atob(str.replace(/\n/g, ""))));
  }

  async function apiFetch(path, opts = {}) {
    const c = getCreds();
    if (!c) throw new Error("로그인 정보가 없습니다.");
    const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`;
    return fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${c.token}`,
        Accept: "application/vnd.github+json",
        ...(opts.headers || {})
      }
    });
  }

  /** Fetch and parse a JSON data file. Returns { json, sha } (json/sha null if file doesn't exist) */
  async function getJson(path) {
    const res = await apiFetch(path);
    if (res.status === 404) return { json: null, sha: null };
    if (!res.ok) throw new Error(`불러오기 실패 (${res.status})`);
    const data = await res.json();
    const text = b64DecodeUnicode(data.content);
    return { json: JSON.parse(text), sha: data.sha };
  }

  /** Write a JSON object to a data file. sha=null creates a new file. */
  async function putJson(path, obj, sha, message) {
    const c = getCreds();
    const body = {
      message,
      content: b64EncodeUnicode(JSON.stringify(obj, null, 2) + "\n"),
      branch: c.branch || "main"
    };
    if (sha) body.sha = sha;
    const res = await apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `저장 실패 (${res.status})`);
    }
    return res.json();
  }

  /** Verify owner/repo/token are valid and writable. */
  async function testConnection() {
    const c = getCreds();
    const res = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}`, {
      headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json" }
    });
    if (!res.ok) throw new Error("저장소 접근에 실패했습니다. owner/repo/토큰을 확인하세요.");
    const info = await res.json();
    if (!info.permissions || !info.permissions.push) {
      throw new Error("이 토큰에는 쓰기 권한이 없습니다.");
    }
    return info;
  }

  return { getCreds, setCreds, clearCreds, isLoggedIn, getJson, putJson, testConnection };
})();
