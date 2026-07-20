/* ============================================================
   index.html — 기업 목록 페이지
   ============================================================ */

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function countryFlag(country) {
  if (country === "한국") return "🇰🇷";
  if (country === "미국") return "🇺🇸";
  return "🌐";
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
          ${c.country ? `<span class="country-tag">${countryFlag(c.country)} ${escapeHtml(c.country)}</span>` : ""}
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
      { name: "name", label: "기업명", placeholder: "엔비디아" },
      { name: "ticker", label: "티커", placeholder: "NVDA" },
      { name: "country", label: "국가", type: "select", options: ["한국", "미국", "기타"], value: "한국" },
      { name: "one_liner", label: "투자 이유 (한 줄)", type: "textarea", rows: 2, placeholder: "핵심 투자 이유" },
      { type: "note", text: "slug(내부 식별 코드)는 티커를 소문자로 변환해 자동으로 생성됩니다." }
    ],
    submitLabel: "추가하기",
    onSubmit: async (v) => {
      const ticker = v.ticker.trim().toUpperCase();
      const slug = ticker.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!slug) throw new Error("티커에서 유효한 slug를 만들 수 없습니다. 티커를 확인하세요.");

      const path = `data/companies/${slug}.json`;
      const existing = await GH.getJson(path);
      if (existing.json) throw new Error(`이미 존재하는 기업입니다. (slug: ${slug})`);

      const companyData = {
        slug,
        name: v.name.trim(),
        ticker,
        country: v.country,
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
        ticker,
        country: v.country,
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
