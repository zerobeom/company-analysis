/* ============================================================
   index.html — 기업 목록 페이지
   ============================================================ */

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function loadCompanyList() {
  const listEl = document.getElementById("company-list");
  listEl.innerHTML = '<li class="empty-note">불러오는 중…</li>';
  try {
    let companies;
    if (GH.isLoggedIn()) {
      const { json } = await GH.getJson("data/companies.json");
      companies = json || [];
    } else {
      const res = await fetch("data/companies.json");
      if (!res.ok) throw new Error("companies.json fetch failed");
      companies = await res.json();
    }
    renderList(companies);
  } catch (err) {
    listEl.innerHTML = '<li class="empty-note">기업 목록을 불러오지 못했습니다.</li>';
    console.error(err);
  }
}

function renderList(companies) {
  const listEl = document.getElementById("company-list");
  if (!companies.length) {
    listEl.innerHTML = '<li class="empty-note">아직 등록된 기업이 없습니다.</li>';
    return;
  }
  listEl.innerHTML = companies
    .map(
      (c) => `
      <li>
        <a class="company-card" href="company.html?slug=${encodeURIComponent(c.slug)}">
          <span class="ticker">${escapeHtml(c.ticker || "")}</span>
          <span class="cname">${escapeHtml(c.name || "")}</span>
          <span class="cthesis">${escapeHtml(c.one_liner || "")}</span>
        </a>
      </li>
    `
    )
    .join("");
}

function renderAddButton() {
  const slot = document.getElementById("add-company-slot");
  if (!slot) return;
  if (!GH.isLoggedIn()) {
    slot.innerHTML = "";
    return;
  }
  slot.innerHTML = `<button type="button" class="btn-add" id="add-company-btn">+ 새 기업 추가</button>`;
  document.getElementById("add-company-btn").onclick = openAddCompanyModal;
}

function openAddCompanyModal() {
  Modal.open({
    title: "새 기업 추가",
    fields: [
      { name: "slug", label: "slug (영문 소문자, 예: nvda)", placeholder: "nvda" },
      { name: "name", label: "기업명 (한글)", placeholder: "엔비디아" },
      { name: "name_en", label: "기업명 (영문)", placeholder: "NVIDIA Corporation" },
      { name: "ticker", label: "티커", placeholder: "NVDA" },
      { name: "one_liner", label: "투자 이유 (한 줄)", type: "textarea", rows: 2, placeholder: "핵심 투자 이유" }
    ],
    submitLabel: "추가하기",
    onSubmit: async (v) => {
      const slug = v.slug.trim().toLowerCase();
      if (!/^[a-z0-9_-]+$/.test(slug)) {
        throw new Error("slug는 영문 소문자, 숫자, -, _ 만 사용할 수 있습니다.");
      }
      const path = `data/companies/${slug}.json`;
      const existing = await GH.getJson(path);
      if (existing.json) throw new Error("이미 존재하는 slug입니다.");

      const companyData = {
        slug,
        name: v.name.trim(),
        name_en: v.name_en.trim(),
        ticker: v.ticker.trim().toUpperCase(),
        investment_thesis: v.one_liner.trim(),
        ceo: {
          name: "",
          appointed_date: "",
          education: [],
          career: [],
          ownership_pct: null,
          risk_factors: ""
        },
        value_cycle: [],
        updates: [],
        quantitative: { unit: "$M", metrics: [], metric_labels: {}, quarters: [] }
      };
      await GH.putJson(path, companyData, null, `Add company: ${v.name}`);

      const manifest = await GH.getJson("data/companies.json");
      const list = manifest.json || [];
      list.push({
        slug,
        name: v.name.trim(),
        name_en: v.name_en.trim(),
        ticker: v.ticker.trim().toUpperCase(),
        one_liner: v.one_liner.trim()
      });
      await GH.putJson("data/companies.json", list, manifest.sha, `List company: ${v.name}`);

      await loadCompanyList();
    }
  });
}

function initAdmin() {
  const slot = document.getElementById("admin-slot");
  if (slot) {
    Admin.renderHeaderControl(slot, () => {
      loadCompanyList();
      renderAddButton();
    });
  }
}

initAdmin();
renderAddButton();
loadCompanyList();
