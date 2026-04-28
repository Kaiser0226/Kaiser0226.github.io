// ============================
// アプリケーションロジック
// ============================

// ============================
// Firebase 設定
// ※ Firebaseコンソールで「ウェブアプリを追加」したときに
//   表示される firebaseConfig をここに貼り付けてください
// ============================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAs4jDn_PgoelBocM7jshlvUAWorKEiy5o",
  authDomain: "myh-ranking.firebaseapp.com",
  databaseURL: "https://myh-ranking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myh-ranking",
  storageBucket: "myh-ranking.firebasestorage.app",
  messagingSenderId: "275291237540",
  appId: "1:275291237540:web:f649433a5afb789ea14a31",
  measurementId: "G-4Z9LXPL5M0"
};

let db = null; // Firebase Database instance

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    // リアルタイムで投票数を監視
    db.ref("votes").on("value", snapshot => {
      const data = snapshot.val() || {};
      // votes オブジェクトを更新
      Object.keys(data).forEach(id => {
        votes[parseInt(id)] = data[id];
      });
      // ランキングページが表示中なら再描画
      if (currentTab === "ranking") renderRanking();
      // モーダルが開いていれば順位バッジを更新
      if (currentModal !== null) updateVoteArea(currentModal);
    });
  } catch (e) {
    console.warn("Firebase初期化エラー:", e);
  }
}

// ============================
// 投票データ (ローカルキャッシュ)
// ============================
let votes = {}; // { staffId(number): count(number) }

function getVotes(staffId) {
  return votes[staffId] || 0;
}

function vote(staffId, event) {
  votes[staffId] = (votes[staffId] || 0) + 1;

  // Firebase に書き込み
  if (db) {
    db.ref(`votes/${staffId}`).set(votes[staffId]);
  }

  // +1 エフェクト
  showVoteEffect(event);

  // 投票ボタンの表示を更新
  updateVoteArea(staffId);
}

function showVoteEffect(event) {
  const el = document.createElement("div");
  el.className = "vote-float";
  el.textContent = "+1";

  // クリック位置 (モバイル対応)
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  el.style.left = `${x - 20}px`;
  el.style.top = `${y - 20}px`;

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// 序数サフィックス (1st / 2nd / 3rd / 4th...)
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================
// タブ管理
// ============================
let currentTab = "list";

function switchTab(tab) {
  if (currentTab === tab) return;
  currentTab = tab;

  // ページコンテナの切り替え
  document.querySelectorAll(".page-container").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${tab}`).classList.add("active");

  // タブボタンのアクティブ切り替え
  document.querySelectorAll(".bottom-tab").forEach(b => b.classList.remove("active"));
  document.getElementById(`btab-${tab}`).classList.add("active");

  // ランキングタブを開いたら再描画
  if (tab === "ranking") renderRanking();
}

// ============================
// 状態変数
// ============================
let currentDay = "512";
let currentModal = null;
let currentStaffList = [];
let currentStaffIndex = -1;
let currentShiftLabel = "";

// ============================
// 写真ローディング
// ============================
const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

function tryNextPhoto(img, staffId, extIndex) {
  if (extIndex < PHOTO_EXTS.length) {
    img.src = `photos/${staffId}.${PHOTO_EXTS[extIndex]}`;
    img.onerror = function () { tryNextPhoto(this, staffId, extIndex + 1); };
  } else {
    img.remove();
  }
}

// ============================
// ページ初期化
// ============================
window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  renderSchedule(currentDay);
});

// ============================
// 日付切り替え
// ============================
function switchDay(day) {
  if (currentDay === day) return;
  currentDay = day;

  document.querySelectorAll(".date-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`tab-${day}`).classList.add("active");

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

// ============================
// シフト一覧レンダリング
// ============================
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
    if (staffIds.length === 0) return;

    html += `
      <section class="time-section" style="animation-delay:${idx * 0.06}s">
        <div class="time-label">
          <span class="time-badge">🕐 ${slot.label}</span>
          <div class="time-line"></div>
        </div>
        <div class="cards-scroll" id="scroll-${slot.id}">
    `;

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

    html += `</div></section>`;
  });

  if (html === "") {
    html = `<div class="empty-state">この日のシフトはありません</div>`;
  }

  html += `<div class="footer-deco">✦ 文化祭 メイド占い屋 ✦</div>`;
  main.innerHTML = html;
}

// ============================
// ランキングレンダリング
// ============================
function renderRanking() {
  const list = document.getElementById("ranking-list");
  if (!list) return;

  // スタッフを投票数順に並べる（全員表示）
  const sorted = [...STAFF]
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));

  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">まだ投票がありません</div>`;
    return;
  }

  const rankEmoji = ["🥇", "🥈", "🥉"];

  list.innerHTML = sorted.map((staff, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : "";
    const rankDisplay = rank <= 3 ? rankEmoji[i] : ordinal(rank);
    const voteCount = votes[staff.id] || 0;

    return `
      <div class="ranking-item${rankClass}" style="animation-delay:${i * 0.04}s" onclick="openModal(${staff.id})">
        <div class="ranking-rank">${rankDisplay}</div>
        <div class="ranking-avatar" style="--staff-color: ${staff.color};">
          <img class="ranking-avatar-photo"
            src="photos/${staff.id}.jpg"
            onload="this.classList.add('loaded');this.nextElementSibling.style.display='none'"
            onerror="tryNextPhoto(this,${staff.id},1)"
            alt="${staff.name}">
          <span>${staff.emoji}</span>
        </div>
        <div class="ranking-info">
          <div class="ranking-name">${staff.name}</div>
          <div class="ranking-role">${staff.role}</div>
        </div>
        <div class="ranking-votes">
          <div class="ranking-votes-num">${voteCount}</div>
          <div class="ranking-votes-label">票</div>
        </div>
      </div>
    `;
  }).join("");
}

// ============================
// 現在の順位を取得
// ============================
function getCurrentRank(staffId) {
  const sorted = [...STAFF]
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));
  const idx = sorted.findIndex(s => s.id === staffId);
  return idx >= 0 ? idx + 1 : null;
}

// ============================
// 投票エリア（モーダル内）の更新
// ============================
function updateVoteArea(staffId) {
  const area = document.getElementById("vote-area");
  if (!area) return;

  const rank = getCurrentRank(staffId);
  const count = getVotes(staffId);
  const rankText = rank ? ordinal(rank) : "-";

  area.querySelector(".modal-rank-num").textContent = rankText;
  area.querySelector(".vote-count-display").textContent = `${count} 票`;
}

// ============================
// モーダルを開く
// ============================
function openModal(staffId, shiftLabel, slotId) {
  const dayData = SCHEDULE[currentDay];
  if (slotId && dayData[slotId]) {
    currentStaffList = dayData[slotId];
    currentStaffIndex = currentStaffList.indexOf(staffId);
    currentShiftLabel = shiftLabel;
  } else {
    // ランキング等から単体で開く場合、または別の文脈がない場合
    currentStaffList = [staffId];
    currentStaffIndex = 0;
    currentShiftLabel = shiftLabel || "";
  }

  updateModalContent(staffId);

  const overlay = document.getElementById("modal-overlay");
  overlay.classList.add("open");
  currentModal = staffId;

  document.body.style.overflow = "hidden";
  setupSwipeEvents();
}

// ============================
// モーダルの内容を更新
// ============================
function updateModalContent(staffId) {
  const staff = getStaff(staffId);
  if (!staff) return;

  const inner = document.getElementById("modal-inner");
  const card = document.getElementById("modal-card");

  inner.style.opacity = "0";
  inner.style.transform = "translateX(10px)";

  setTimeout(() => {
    const detailsHTML = (staff.details || []).map(d => `
      <div class="modal-info-row">
        <span class="modal-info-icon">${d.icon}</span>
        <div>
          <div class="modal-info-label">${d.label}</div>
          <div class="modal-info-value">${d.value}</div>
        </div>
      </div>
    `).join("");

    const rank = getCurrentRank(staffId);
    const rankText = rank ? ordinal(rank) : "-";
    const voteCount = getVotes(staffId);

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
      <div class="modal-name-ruby">なまえ：${staff.ruby}</div>

      <div class="modal-tags">
        ${staff.tags.map(t => `<span class="modal-tag">${t}</span>`).join("")}
        ${currentShiftLabel ? `<span class="modal-shift-badge">🕐 ${currentShiftLabel}</span>` : ""}
      </div>

      <div class="modal-divider"></div>

      <div class="modal-info-row">
        <span class="modal-info-icon">✨</span>
        <div>
          <div class="modal-info-label">担当</div>
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

      <!-- 投票エリア -->
      <div class="modal-vote-area" id="vote-area">
        <div>
          <div class="modal-rank-badge">🏅 現在の順位</div>
          <div class="modal-rank-num">${rankText}</div>
        </div>
        <button class="vote-btn" id="vote-btn-${staff.id}" onclick="vote(${staff.id}, event)">
          💗 投票する
          <span class="vote-count-display">${voteCount} 票</span>
        </button>
      </div>

      <div class="swipe-hint">
        ${currentStaffList.map((_, i) => `<div class="swipe-dot ${i === currentStaffIndex ? 'active' : ''}"></div>`).join("")}
      </div>
    `;

    updateNavButtons(card);

    inner.style.opacity = "1";
    inner.style.transform = "translateX(0)";
  }, 150);
}

// ============================
// ナビゲーションボタン
// ============================
function updateNavButtons(card) {
  card.querySelectorAll(".modal-nav-btn").forEach(b => b.remove());

  if (currentStaffList.length <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.className = "modal-nav-btn prev";
  prevBtn.innerHTML = "‹";
  prevBtn.onclick = (e) => { e.stopPropagation(); prevStaff(); };
  card.appendChild(prevBtn);

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

// ============================
// スワイプイベント
// ============================
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

// ============================
// モーダルを閉じる
// ============================
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
