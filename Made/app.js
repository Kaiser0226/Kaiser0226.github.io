// ============================
// アプリケーションロジック
// ============================

let currentDay = "512";
let currentModal = null;

// ページ初期化
window.addEventListener("DOMContentLoaded", () => {
  renderSchedule(currentDay);
});

// 日付切り替え
function switchDay(day) {
  if (currentDay === day) return;
  currentDay = day;

  document.querySelectorAll(".date-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`tab-${day}`).classList.add("active");

  // フェードアウト → 再描画
  const main = document.getElementById("main-content");
  main.style.opacity = "0";
  main.style.transform = "translateY(12px)";
  main.style.transition = "opacity 0.2s, transform 0.2s";

  setTimeout(() => {
    renderSchedule(day);
    main.style.opacity = "1";
    main.style.transform = "translateY(0)";
  }, 200);
}

// シフト画面のレンダリング
function renderSchedule(day) {
  const main = document.getElementById("main-content");
  const dayData = SCHEDULE[day];

  if (!dayData) {
    main.innerHTML = `<div class="empty-state">シフト情報がありません</div>`;
    return;
  }

  let html = "";

  TIME_SLOTS.forEach((slot, idx) => {
    const staffIds = dayData[slot.id] || [];

    html += `
      <section class="time-section" style="animation-delay:${idx * 0.06}s">
        <div class="time-label">
          <span class="time-badge">🕐 ${slot.label}</span>
          <div class="time-line"></div>
        </div>
        <div class="cards-scroll" id="scroll-${slot.id}">
    `;

    if (staffIds.length === 0) {
      html += `<div class="empty-state" style="width:100%;font-size:12px;">担当なし</div>`;
    } else {
      staffIds.forEach(id => {
        const staff = getStaff(id);
        if (!staff) return;

        html += `
          <div class="profile-card" onclick="openModal(${staff.id}, '${slot.label}')" id="card-${slot.id}-${staff.id}" style="background: linear-gradient(145deg, ${staff.color}15, ${staff.color}08); border-color: ${staff.color}60;">
            <div class="card-avatar-emoji">${staff.emoji}</div>
            <div class="card-name">${staff.name}</div>
            <div class="card-role">${staff.role}</div>
            <div class="card-tag">${staff.tags[0]}</div>
          </div>
        `;
      });
    }

    html += `</div></section>`;
  });

  html += `<div class="footer-deco">✦ 文化祭 メイド占い屋 ✦</div>`;
  main.innerHTML = html;
}

// モーダルを開く
function openModal(staffId, shiftLabel) {
  const staff = getStaff(staffId);
  if (!staff) return;

  const inner = document.getElementById("modal-inner");

  // details配列から情報行を動的生成
  const detailsHTML = (staff.details || []).map(d => `
    <div class="modal-info-row">
      <span class="modal-info-icon">${d.icon}</span>
      <div>
        <div class="modal-info-label">${d.label}</div>
        <div class="modal-info-value">${d.value}</div>
      </div>
    </div>
  `).join("");

  inner.innerHTML = `
    <div class="modal-avatar" style="box-shadow: 0 0 0 4px ${staff.color}, 0 8px 24px rgba(0,0,0,0.15);">
      ${staff.emoji}
    </div>
    <div class="modal-name">${staff.name}</div>
    <div class="modal-name-ruby">よみがな：${staff.ruby}</div>

    <div class="modal-tags">
      ${staff.tags.map(t => `<span class="modal-tag">${t}</span>`).join("")}
      <span class="modal-shift-badge">🕐 ${shiftLabel}</span>
    </div>

    <div class="modal-divider"></div>

    <div class="modal-info-row">
      <span class="modal-info-icon">✨</span>
      <div>
        <div class="modal-info-label">担当占術</div>
        <div class="modal-info-value">${staff.role}</div>
      </div>
    </div>

    ${detailsHTML}

    <div class="modal-divider"></div>

    <div class="modal-info-row">
      <span class="modal-info-icon">💌</span>
      <div>
        <div class="modal-info-label">メッセージ</div>
        <div class="modal-info-value" style="font-style:italic;">"${staff.message}"</div>
      </div>
    </div>
  `;

  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("open");
  currentModal = staffId;

  // スクロール防止
  document.body.style.overflow = "hidden";
}

// モーダルを閉じる
function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  overlay.classList.remove("open");
  currentModal = null;
  document.body.style.overflow = "";
}

// ESCキーでモーダルを閉じる
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});
