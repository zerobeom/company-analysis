/* ============================================================
   Modal — 재사용 가능한 폼 다이얼로그
   ============================================================ */

const Modal = (() => {
  let overlayEl = null;

  function close() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fieldHtml(f, i) {
    const id = `mf_${i}`;
    const val = f.value !== undefined && f.value !== null ? f.value : "";
    if (f.type === "note") {
      return `<p class="mf-note">${f.text}</p>`;
    }
    if (f.type === "textarea") {
      return `<div class="mf-row">
        <label class="mf-label" for="${id}">${esc(f.label)}</label>
        <textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || "")}">${esc(val)}</textarea>
      </div>`;
    }
    return `<div class="mf-row">
      <label class="mf-label" for="${id}">${esc(f.label)}</label>
      <input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(val)}"
        placeholder="${esc(f.placeholder || "")}" ${f.step ? `step="${f.step}"` : ""}>
    </div>`;
  }

  function open({ title, fields, submitLabel = "저장", onSubmit, danger = false }) {
    close();
    overlayEl = document.createElement("div");
    overlayEl.className = "modal-overlay";
    overlayEl.innerHTML = `
      <div class="modal-box">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button type="button" class="modal-x" aria-label="닫기">×</button>
        </div>
        <form class="modal-form" novalidate>
          ${fields.map(fieldHtml).join("")}
          <p class="modal-error" hidden></p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost modal-cancel">취소</button>
            <button type="submit" class="btn-solid${danger ? " btn-danger" : ""}">${esc(submitLabel)}</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlayEl);

    const form = overlayEl.querySelector(".modal-form");
    const errEl = overlayEl.querySelector(".modal-error");
    overlayEl.querySelector(".modal-x").onclick = close;
    overlayEl.querySelector(".modal-cancel").onclick = close;
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) close();
    });
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", escHandler);
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const values = {};
      fields.forEach((f) => {
        if (f.type !== "note") values[f.name] = fd.get(f.name);
      });
      const submitBtn = form.querySelector('button[type="submit"]');
      const origLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "저장 중…";
      errEl.hidden = true;
      try {
        await onSubmit(values);
        close();
      } catch (err) {
        errEl.textContent = err.message || "오류가 발생했습니다.";
        errEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = origLabel;
      }
    });

    const firstInput = form.querySelector("input, textarea");
    if (firstInput) firstInput.focus();
  }

  function confirmDialog({ title, message, confirmLabel = "삭제", onConfirm }) {
    open({
      title,
      fields: [{ type: "note", text: message }],
      submitLabel: confirmLabel,
      danger: true,
      onSubmit: onConfirm
    });
  }

  return { open, close, confirmDialog };
})();
