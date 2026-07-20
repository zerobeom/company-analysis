/* ============================================================
   Admin — 헤더의 관리자 로그인/로그아웃 컨트롤
   ============================================================ */

const Admin = (() => {
  function renderHeaderControl(container, onChange) {
    function draw() {
      const loggedIn = GH.isLoggedIn();
      container.innerHTML = loggedIn
        ? `<button type="button" class="admin-btn admin-on">● 관리자 모드</button>`
        : `<button type="button" class="admin-btn">관리자 로그인</button>`;
      container.querySelector("button").onclick = () => {
        if (loggedIn) openAccountModal(); else openLoginModal();
      };
    }

    function openLoginModal() {
      Modal.open({
        title: "관리자 로그인",
        fields: [
          { name: "owner", label: "GitHub 사용자명 (owner)", placeholder: "예: yourname" },
          { name: "repo", label: "저장소 이름 (repo)", placeholder: "예: company-journal" },
          { name: "branch", label: "브랜치", value: "main" },
          { name: "token", label: "Personal Access Token", type: "password", placeholder: "fine-grained token" },
          {
            type: "note",
            text: "이 저장소 하나에만 Contents 읽기/쓰기 권한을 부여한 fine-grained 토큰을 사용하세요. 토큰은 이 브라우저에만 저장되고 GitHub API 외에는 전송되지 않습니다."
          }
        ],
        submitLabel: "연결하기",
        onSubmit: async (v) => {
          GH.setCreds({
            owner: v.owner.trim(),
            repo: v.repo.trim(),
            branch: (v.branch || "main").trim(),
            token: v.token.trim()
          });
          try {
            await GH.testConnection();
          } catch (err) {
            GH.clearCreds();
            throw err;
          }
          draw();
          if (onChange) onChange();
        }
      });
    }

    function openAccountModal() {
      const c = GH.getCreds();
      Modal.open({
        title: "관리자 계정",
        fields: [{ type: "note", text: `${c.owner}/${c.repo} (${c.branch || "main"}) 에 연결되어 있습니다.` }],
        submitLabel: "로그아웃",
        danger: true,
        onSubmit: async () => {
          GH.clearCreds();
          draw();
          if (onChange) onChange();
        }
      });
    }

    draw();
  }

  return { renderHeaderControl };
})();
