/* ============================================================
   company.html — 기업 상세 페이지 (읽기 + 관리자 편집)
   ============================================================ */

const state = {
  slug: null,
  path: null,
  data: null,
  sha: null // GitHub Contents API 로 불러왔을 때만 존재
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmtNum(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return "—";
  const s = Math.abs(num).toLocaleString("en-US");
  return num < 0 ? `(${s})` : s;
}

/* ---------------- data load / save ---------------- */

async function loadData() {
  const root = document.getElementById("company-root");
  if (GH.isLoggedIn()) {
    const { json, sha } = await GH.getJson(state.path);
    if (!json) throw new Error("not found");
    state.data = json;
    state.sha = sha;
  } else {
    const res = await fetch(state.path);
    if (!res.ok) throw new Error("not found");
    state.data = await res.json();
    state.sha = null;
  }
}

/** 관리자 모드에서 데이터 파일에 변경사항을 커밋하고 화면을 다시 그린다 */
async function saveData(message) {
  const resp = await GH.putJson(state.path, state.data, state.sha, message);
  state.sha = resp.content.sha;
  render();
}

/** companies.json 매니페스트의 요약 정보도 함께 갱신 */
async function syncManifest(patch) {
  const manifest = await GH.getJson("data/companies.json");
  const list = manifest.json || [];
  const idx = list.findIndex((c) => c.slug === state.slug);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    await GH.putJson("data/companies.json", list, manifest.sha, `Update listing: ${state.slug}`);
  }
}

/* ---------------- section: hero / 투자 이유 ---------------- */

function renderHero(admin) {
  const d = state.data;
  return `
    <div class="company-hero">
      <div class="ticker-line">${escapeHtml(d.ticker || "")}</div>
      <h1>${escapeHtml(d.name || "")}</h1>
      <p class="name-en">${escapeHtml(d.name_en || "")}</p>
      <p class="thesis">${escapeHtml(d.investment_thesis || "")}</p>
      ${admin ? `<button type="button" class="edit-link" id="edit-basic-btn">✎ 기본 정보 / 투자 이유 편집</button>` : ""}
    </div>`;
}

function openBasicModal() {
  const d = state.data;
  Modal.open({
    title: "기본 정보 / 투자 이유 편집",
    fields: [
      { name: "name", label: "기업명 (한글)", value: d.name },
      { name: "name_en", label: "기업명 (영문)", value: d.name_en },
      { name: "ticker", label: "티커", value: d.ticker },
      { name: "investment_thesis", label: "투자 이유", type: "textarea", rows: 4, value: d.investment_thesis }
    ],
    submitLabel: "저장",
    onSubmit: async (v) => {
      d.name = v.name.trim();
      d.name_en = v.name_en.trim();
      d.ticker = v.ticker.trim().toUpperCase();
      d.investment_thesis = v.investment_thesis.trim();
      await saveData(`Update basic info: ${state.slug}`);
      await syncManifest({ name: d.name, name_en: d.name_en, ticker: d.ticker, one_liner: d.investment_thesis });
    }
  });
}

/* ---------------- section: CEO ---------------- */

function renderCeo(admin) {
  const ceo = state.data.ceo || {};
  const eduList = (ceo.education || []).map((e) => `<li>${escapeHtml(e)}</li>`).join("");
  const careerList = (ceo.career || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
  const ownership =
    ceo.ownership_pct !== undefined && ceo.ownership_pct !== null
      ? (ceo.ownership_pct * 100).toFixed(3) + "%"
      : "—";

  return `
  <section class="block">
    <div class="section-head-row">
      <h2>경영진 (CEO)</h2>
      ${admin ? `<button type="button" class="edit-link" id="edit-ceo-btn">✎ 편집</button>` : ""}
    </div>
    <p class="ceo-name">${escapeHtml(ceo.name || "—")}</p>
    <div class="ceo-meta">
      <span class="stat">취임일 &nbsp;<b>${escapeHtml(ceo.appointed_date || "—")}</b></span>
      <span class="stat">지분율 &nbsp;<b>${ownership}</b></span>
    </div>
    <div class="ceo-cols">
      <div>
        <h3>학력</h3>
        <ul>${eduList || "<li>—</li>"}</ul>
      </div>
      <div>
        <h3>커리어</h3>
        <ul>${careerList || "<li>—</li>"}</ul>
      </div>
    </div>
    ${
      ceo.risk_factors
        ? `<div class="risk-box"><span class="risk-label">리스크 요소</span>${escapeHtml(ceo.risk_factors)}</div>`
        : ""
    }
  </section>`;
}

function openCeoModal() {
  const ceo = state.data.ceo || (state.data.ceo = {});
  Modal.open({
    title: "CEO 정보 편집",
    fields: [
      { name: "name", label: "CEO 이름", value: ceo.name },
      { name: "appointed_date", label: "취임일 (YYYY-MM-DD)", type: "date", value: ceo.appointed_date },
      {
        name: "education",
        label: "학력 (한 줄에 하나씩)",
        type: "textarea",
        rows: 3,
        value: (ceo.education || []).join("\n")
      },
      {
        name: "career",
        label: "커리어 (한 줄에 하나씩)",
        type: "textarea",
        rows: 4,
        value: (ceo.career || []).join("\n")
      },
      {
        name: "ownership_pct",
        label: "지분율 — 소수로 입력 (예: 2.4% → 0.024)",
        type: "number",
        step: "0.00001",
        value: ceo.ownership_pct
      },
      { name: "risk_factors", label: "리스크 요소", type: "textarea", rows: 3, value: ceo.risk_factors }
    ],
    submitLabel: "저장",
    onSubmit: async (v) => {
      ceo.name = v.name.trim();
      ceo.appointed_date = v.appointed_date.trim();
      ceo.education = v.education.split("\n").map((s) => s.trim()).filter(Boolean);
      ceo.career = v.career.split("\n").map((s) => s.trim()).filter(Boolean);
      ceo.ownership_pct = v.ownership_pct === "" ? null : Number(v.ownership_pct);
      ceo.risk_factors = v.risk_factors.trim();
      await saveData(`Update CEO info: ${state.slug}`);
    }
  });
}

/* ---------------- section: 가치투자 사이클 ---------------- */

function renderCycle(admin) {
  const cycle = state.data.value_cycle || [];
  const steps = cycle
    .map(
      (s) => `
    <div class="cycle-step" data-n="${s.stage}">
      <div class="st-title">${escapeHtml(s.title || "")}</div>
      <div class="st-desc">${escapeHtml(s.desc || "")}</div>
    </div>`
    )
    .join("");

  if (!cycle.length && !admin) return "";

  return `
  <section class="block">
    <div class="section-head-row">
      <h2>가치투자 사이클</h2>
      ${admin ? `<button type="button" class="edit-link" id="edit-cycle-btn">✎ 편집</button>` : ""}
    </div>
    ${cycle.length ? `<div class="cycle-row">${steps}</div>` : `<p class="qtable-note">아직 등록된 사이클이 없습니다.</p>`}
  </section>`;
}

function openCycleModal() {
  const cycle = state.data.value_cycle || [];
  const byStage = (n) => cycle.find((s) => s.stage === n) || {};
  const fields = [];
  for (let i = 1; i <= 5; i++) {
    const s = byStage(i);
    fields.push({ name: `t${i}`, label: `${i}단계 제목`, value: s.title });
    fields.push({ name: `d${i}`, label: `${i}단계 설명`, value: s.desc });
  }
  Modal.open({
    title: "가치투자 사이클 편집 (최대 5단계, 제목이 비어있으면 생략)",
    fields,
    submitLabel: "저장",
    onSubmit: async (v) => {
      const newCycle = [];
      for (let i = 1; i <= 5; i++) {
        const title = (v[`t${i}`] || "").trim();
        if (!title) continue;
        newCycle.push({ stage: newCycle.length + 1, title, desc: (v[`d${i}`] || "").trim() });
      }
      state.data.value_cycle = newCycle;
      await saveData(`Update value cycle: ${state.slug}`);
    }
  });
}

/* ---------------- section: 정량 펀더멘탈 ---------------- */

function renderQuantitative(admin) {
  const q = state.data.quantitative || { metrics: [], metric_labels: {}, quarters: [] };
  const metrics = q.metrics || [];
  const labels = q.metric_labels || {};

  if (!q.quarters?.length && !admin) return "";

  const headerCells = metrics.map((m) => `<th>${escapeHtml(labels[m] || m)}</th>`).join("");
  const rows = (q.quarters || [])
    .map((row) => {
      const cells = metrics
        .map((m) => {
          const v = row[m];
          const cls = v === null || v === undefined || v === "" ? "empty" : Number(v) < 0 ? "neg" : "";
          return `<td class="${cls}">${fmtNum(v)}</td>`;
        })
        .join("");
      return `<tr><td>${escapeHtml(row.period)}</td>${cells}</tr>`;
    })
    .join("");

  return `
  <section class="block">
    <div class="section-head-row">
      <h2>정량 펀더멘탈</h2>
      <span>
        ${admin ? `<button type="button" class="edit-link" id="edit-metrics-btn">✎ 지표 설정</button>` : ""}
        ${admin ? `<button type="button" class="edit-link" id="add-quarter-btn">＋ 분기 추가/수정</button>` : ""}
      </span>
    </div>
    ${
      metrics.length && q.quarters?.length
        ? `<div class="qtable-wrap">
             <table class="qtable">
               <thead><tr><th>분기</th>${headerCells}</tr></thead>
               <tbody>${rows}</tbody>
             </table>
           </div>
           <p class="qtable-note">단위: ${escapeHtml(q.unit || "")} · 괄호는 음수</p>`
        : `<p class="qtable-note">아직 등록된 정량 데이터가 없습니다.${admin ? " '지표 설정'으로 먼저 항목을 정의하세요." : ""}</p>`
    }
  </section>`;
}

function openMetricsModal() {
  const q = state.data.quantitative || (state.data.quantitative = { unit: "$M", metrics: [], metric_labels: {}, quarters: [] });
  const metricsText = (q.metrics || []).map((m) => `${m}=${q.metric_labels?.[m] || m}`).join("\n");
  Modal.open({
    title: "정량 지표 설정",
    fields: [
      { name: "unit", label: "단위", value: q.unit || "$M" },
      {
        name: "metrics",
        label: "지표 목록 — 한 줄에 하나, key=표시이름",
        type: "textarea",
        rows: 6,
        placeholder: "revenue=매출 (Total Revenues)\nfcf=잉여현금흐름 (FCF)",
        value: metricsText
      },
      { type: "note", text: "key는 영문 소문자/숫자만 사용하세요. 기존 분기 데이터의 값은 유지됩니다." }
    ],
    submitLabel: "저장",
    onSubmit: async (v) => {
      const metrics = [];
      const labels = {};
      v.metrics
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .forEach((line) => {
          const idx = line.indexOf("=");
          const key = (idx >= 0 ? line.slice(0, idx) : line).trim();
          const label = (idx >= 0 ? line.slice(idx + 1) : line).trim();
          if (/^[a-z0-9_]+$/.test(key)) {
            metrics.push(key);
            labels[key] = label;
          }
        });
      q.unit = v.unit.trim();
      q.metrics = metrics;
      q.metric_labels = labels;
      if (!q.quarters) q.quarters = [];
      await saveData(`Update metrics: ${state.slug}`);
    }
  });
}

function openQuarterModal() {
  const q = state.data.quantitative || { metrics: [], metric_labels: {}, quarters: [] };
  if (!q.metrics?.length) {
    Modal.open({
      title: "분기 데이터 추가",
      fields: [{ type: "note", text: "먼저 '지표 설정'에서 지표를 정의하세요." }],
      submitLabel: "확인",
      onSubmit: async () => {}
    });
    return;
  }
  const fields = [{ name: "period", label: "분기 (예: 26' Q2)", placeholder: "26' Q2" }];
  q.metrics.forEach((m) => {
    fields.push({ name: m, label: q.metric_labels?.[m] || m, type: "number", step: "any" });
  });
  Modal.open({
    title: "분기 데이터 추가 / 수정",
    fields,
    submitLabel: "저장",
    onSubmit: async (v) => {
      const period = v.period.trim();
      if (!period) throw new Error("분기를 입력하세요.");
      if (!q.quarters) q.quarters = [];
      const row = { period };
      q.metrics.forEach((m) => {
        row[m] = v[m] === "" ? null : Number(v[m]);
      });
      const existingIdx = q.quarters.findIndex((r) => r.period === period);
      if (existingIdx >= 0) q.quarters[existingIdx] = row;
      else q.quarters.push(row);
      await saveData(`Update quarter ${period}: ${state.slug}`);
    }
  });
}

/* ---------------- section: 펀더멘탈 업데이트 ---------------- */

function renderUpdates(admin) {
  const updates = state.data.updates || [];
  const withIdx = updates.map((u, i) => ({ ...u, _idx: i }));
  withIdx.sort((a, b) => (a.date < b.date ? 1 : -1));

  const entries = withIdx
    .map(
      (u) => `
    <div class="tl-entry">
      ${admin ? `<button type="button" class="tl-del" data-idx="${u._idx}" title="삭제">✕</button>` : ""}
      <div class="tl-date">${escapeHtml(u.date || "")}</div>
      <div>
        <div class="tl-content">${escapeHtml(u.content || "")}</div>
        ${
          u.comment
            ? `<div class="tl-comment"><span class="cm-label">코멘트</span>${escapeHtml(u.comment)}</div>`
            : ""
        }
      </div>
    </div>`
    )
    .join("");

  return `
  <section class="block">
    <div class="section-head-row">
      <h2>펀더멘탈 업데이트</h2>
      ${admin ? `<button type="button" class="edit-link" id="add-update-btn">＋ 새 업데이트</button>` : ""}
    </div>
    ${
      updates.length
        ? `<div class="timeline">${entries}</div>`
        : `<p class="qtable-note">아직 등록된 업데이트가 없습니다.</p>`
    }
  </section>`;
}

function openAddUpdateModal() {
  Modal.open({
    title: "새 업데이트 추가",
    fields: [
      { name: "date", label: "날짜", type: "date" },
      { name: "content", label: "내용", type: "textarea", rows: 5 },
      { name: "comment", label: "코멘트 (선택)", type: "textarea", rows: 3 }
    ],
    submitLabel: "추가",
    onSubmit: async (v) => {
      if (!v.date) throw new Error("날짜를 입력하세요.");
      if (!state.data.updates) state.data.updates = [];
      state.data.updates.push({
        date: v.date.trim(),
        content: v.content.trim(),
        comment: v.comment.trim()
      });
      await saveData(`Add update ${v.date}: ${state.slug}`);
    }
  });
}

function confirmDeleteUpdate(idx) {
  const u = state.data.updates[idx];
  Modal.confirmDialog({
    title: "업데이트 삭제",
    message: `"${(u.content || "").slice(0, 40)}" 항목을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
    confirmLabel: "삭제",
    onConfirm: async () => {
      state.data.updates.splice(idx, 1);
      await saveData(`Delete update: ${state.slug}`);
    }
  });
}

/* ---------------- render / wire-up ---------------- */

function render() {
  const root = document.getElementById("company-root");
  const admin = GH.isLoggedIn();
  const d = state.data;

  document.title = `${d.name} (${d.ticker}) · 기업분석 저널`;

  root.innerHTML = `
    ${renderHero(admin)}
    ${renderCeo(admin)}
    ${renderCycle(admin)}
    ${renderQuantitative(admin)}
    ${renderUpdates(admin)}
    <a class="back-link" href="index.html">← 전체 기업 목록으로</a>
  `;

  if (!admin) return;

  document.getElementById("edit-basic-btn")?.addEventListener("click", openBasicModal);
  document.getElementById("edit-ceo-btn")?.addEventListener("click", openCeoModal);
  document.getElementById("edit-cycle-btn")?.addEventListener("click", openCycleModal);
  document.getElementById("edit-metrics-btn")?.addEventListener("click", openMetricsModal);
  document.getElementById("add-quarter-btn")?.addEventListener("click", openQuarterModal);
  document.getElementById("add-update-btn")?.addEventListener("click", openAddUpdateModal);
  root.querySelectorAll(".tl-del").forEach((btn) => {
    btn.addEventListener("click", () => confirmDeleteUpdate(Number(btn.dataset.idx)));
  });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const root = document.getElementById("company-root");

  if (!slug) {
    root.innerHTML = '<div class="error-state">기업을 찾을 수 없습니다. URL에 ?slug=기업명 이 필요합니다.</div>';
    return;
  }

  state.slug = slug;
  state.path = `data/companies/${slug}.json`;

  const adminSlot = document.getElementById("admin-slot");
  if (adminSlot) {
    Admin.renderHeaderControl(adminSlot, async () => {
      try {
        await loadData();
        render();
      } catch (err) {
        console.error(err);
      }
    });
  }

  try {
    await loadData();
    render();
  } catch (err) {
    root.innerHTML = '<div class="error-state">해당 기업 데이터를 불러오지 못했습니다.</div>';
    console.error(err);
  }
}

init();
