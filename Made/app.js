// ============================
// アプリケーションロジック
// ============================

let currentDay = "512";
let currentModal = null; // 現在表示中のスタッフID
let currentStaffList = []; // 現在のタイムスロットのスタッフIDリスト
let currentStaffIndex = -1; // リスト内でのインデックス
let currentShiftLabel = ""; // 現在のシフト名

// ============================
// 写真ローディング
// ============================
const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// 拡張子を順番に試す。全て失敗したら絵文字を表示
function tryNextPhoto(img, staffId, extIndex) {
  if (extIndex < PHOTO_EXTS.length) {
    img.src = `photos/${staffId}.${PHOTO_EXTS[extIndex]}`;
    img.onerror = function() { tryNextPhoto(this, staffId, extIndex + 1); };
  } else {
    // 全拡張子で失敗 → 絵文字スパンを表示に戻す
    img.remove();
  }
}

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
          <div class="profile-card" onclick="openModal(${staff.id}, '${slot.label}', '${slot.id}')" id="card-${slot.id}-${staff.id}" style="background: linear-gradient(145deg, ${staff.color}15, ${staff.color}08); border-color: ${staff.color}60; --staff-color: ${staff.color};">
            <div class="card-avatar-emoji">
              <img class="card-avatar-photo"
                src="photos/${staff.id}.jpg"
                onload="this.classList.add('loaded');this.nextElementSibling.style.display='none'"
                onerror="tryNextPhoto(this,${staff.id},1)"
                alt="${staff.name}">
              <span>${staff.emoji}</span>
            </div>
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
function openModal(staffId, shiftLabel, slotId) {
  const dayData = SCHEDULE[currentDay];
  if (slotId && dayData[slotId]) {
    currentStaffList = dayData[slotId];
    currentStaffIndex = currentStaffList.indexOf(staffId);
    currentShiftLabel = shiftLabel;
  } else if (!currentStaffList.includes(staffId)) {
    // 予期せぬ呼び出しの場合のフォールバック
    currentStaffList = [staffId];
    currentStaffIndex = 0;
    currentShiftLabel = shiftLabel || "";
  }

  updateModalContent(staffId);

  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("open");
  currentModal = staffId;

  // スクロール防止
  document.body.style.overflow = "hidden";

  // タッチイベントの設定（一度だけ）
  setupSwipeEvents();
}

// モーダルの内容を更新
function updateModalContent(staffId) {
  const staff = getStaff(staffId);
  if (!staff) return;

  const inner = document.getElementById("modal-inner");
  const card = document.getElementById("modal-card");

  // フェードアウト
  inner.style.opacity = "0";
  inner.style.transform = "translateX(10px)";

  setTimeout(() => {
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
      <div class="modal-avatar" style="--staff-color: ${staff.color}; box-shadow: 0 0 0 4px ${staff.color}, 0 8px 24px rgba(0,0,0,0.15);">
        <img class="modal-avatar-photo"
          src="photos/${staff.id}.jpg"
          onload="this.classList.add('loaded');this.nextElementSibling.style.display='none'"
          onerror="tryNextPhoto(this,${staff.id},1)"
          alt="${staff.name}">
        <span>${staff.emoji}</span>
      </div>
      <div class="modal-name">${staff.name}</div>
      <div class="modal-name-ruby">よみがな：${staff.ruby}</div>

      <div class="modal-tags">
        ${staff.tags.map(t => `<span class="modal-tag">${t}</span>`).join("")}
        <span class="modal-shift-badge">🕐 ${currentShiftLabel}</span>
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

      <div class="swipe-hint">
        ${currentStaffList.map((_, i) => `<div class="swipe-dot ${i === currentStaffIndex ? 'active' : ''}"></div>`).join("")}
      </div>
    `;

    // ナビゲーションボタンの追加/更新
    updateNavButtons(card);

    // フェードイン
    inner.style.opacity = "1";
    inner.style.transform = "translateX(0)";
  }, 150);
}

function updateNavButtons(card) {
  // 既存のボタンを削除
  card.querySelectorAll(".modal-nav-btn").forEach(b => b.remove());

  if (currentStaffList.length <= 1) return;

  // 前へボタン
  const prevBtn = document.createElement("button");
  prevBtn.className = "modal-nav-btn prev";
  prevBtn.innerHTML = "‹";
  prevBtn.onclick = (e) => { e.stopPropagation(); prevStaff(); };
  card.appendChild(prevBtn);

  // 次へボタン
  const nextBtn = document.createElement("button");
  nextBtn.className = "modal-nav-btn next";
  nextBtn.innerHTML = "›";
  nextBtn.onclick = (e) => { e.stopPropagation(); nextStaff(); };
  card.appendChild(nextBtn);
}

function nextStaff() {
  if (currentStaffList.length <= 1) return;
  currentStaffIndex = (currentStaffIndex + 1) % currentStaffList.length;
  const staffId = currentStaffList[currentStaffIndex];
  currentModal = staffId;
  updateModalContent(staffId);
}

function prevStaff() {
  if (currentStaffList.length <= 1) return;
  currentStaffIndex = (currentStaffIndex - 1 + currentStaffList.length) % currentStaffList.length;
  const staffId = currentStaffList[currentStaffIndex];
  currentModal = staffId;
  updateModalContent(staffId);
}

// スワイプイベント
let touchStartX = 0;
let touchEndX = 0;

function setupSwipeEvents() {
  const card = document.getElementById("modal-card");
  if (card.dataset.swipeSet === "true") return;

  card.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  card.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  card.dataset.swipeSet = "true";
}

function handleSwipe() {
  const swipeThreshold = 50;
  if (touchEndX < touchStartX - swipeThreshold) {
    nextStaff();
  } else if (touchEndX > touchStartX + swipeThreshold) {
    prevStaff();
  }
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
