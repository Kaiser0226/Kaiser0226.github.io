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
      if (currentTab === "ranking") renderRanking(true);
      // モーダルが開いていれば順位バッジを更新
      if (currentModal !== null) updateVoteArea(currentModal);
    });

    // 店内状況の監視を初期化
    initStoreStatus();
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
  // 投票終了のアラートを表示
  alert("投票を終了しました");
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
  // 相性診断タブを開いたら初期化
  if (tab === "aisho") aishoInit();

  // スクロール処理
  if (tab === "list") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    const header = document.querySelector(".site-header-image");
    if (header) {
      window.scrollTo({ top: header.offsetHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

// ============================
// 状態変数
// ============================
let currentDay = "513";
let currentModal = null;
let currentStaffList = [];
let currentStaffIndex = -1;
let currentShiftLabel = "";
let previousRankingOrder = []; // 前回のランキング順序（IDの配列）
let previousVotes = {};        // 前回の投票数

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
  // ちらつきを抑えるためアニメーションを短く、またはシンプルに
  main.style.opacity = "0.6";
  
  setTimeout(() => {
    renderSchedule(day);
    main.style.opacity = "1";
  }, 50);
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

      // カラーコードが8桁（#RRGGBBAA）の場合を考慮して、最初の7文字（#RRGGBB）のみを使用
      const baseColor = staff.color.slice(0, 7);

      html += `
        <div class="profile-card" 
             onclick="openModal(${staff.id}, '${slot.label}', '${slot.id}')" 
             id="card-${slot.id}-${staff.id}" 
             data-staff-id="${staff.id}"
             style="background: linear-gradient(145deg, ${baseColor}0a, ${baseColor}05); border-color: ${baseColor}25; --staff-color: ${baseColor};">
          <div class="card-avatar-emoji">
            <img class="card-avatar-photo"
              src="photos/${staff.id}.jpg"
              onload="this.classList.add('loaded');this.nextElementSibling.style.display='none'"
              onerror="tryNextPhoto(this,${staff.id},1)"
              alt="${staff.name}">
            <span>${staff.emoji}</span>
          </div>
          <div class="card-name">${staff.name}</div>
          <div class="card-tag">${staff.tags[0]}</div>
        </div>
      `;
    });

    html += `</div></section>`;
  });

  if (html === "") {
    html = `<div class="empty-state">この日のシフトはありません</div>`;
  }

  html += `<div class="footer-deco">✦ Made You Happy 製作委員会 ✦</div>`;
  main.innerHTML = html;
}

// ============================
// ランキングレンダリング
// ============================
function renderRanking(isUpdate = false) {
  const list = document.getElementById("ranking-list");
  if (!list) return;

  // スタッフを投票数順に並べる
  const sorted = [...STAFF]
    .sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0));

  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">まだ投票がありません</div>`;
    return;
  }

  const currentRankingOrder = sorted.map(s => s.id);
  const rankEmoji = ["🥇", "🥈", "🥉"];

  // 既存のDOM要素を再利用して画像のちらつきを抑える
  const existingItems = Array.from(list.querySelectorAll('.ranking-item'));
  const itemMap = {};
  existingItems.forEach(item => {
    if (item.dataset.staffId) itemMap[item.dataset.staffId] = item;
  });

  // 初回描画または要素がない場合は innerHTML で作成
  if (existingItems.length === 0) {
    list.innerHTML = sorted.map((staff, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? ` rank-${rank}` : "";
      const rankDisplay = rank <= 3 ? rankEmoji[i] : ordinal(rank);
      const voteCount = votes[staff.id] || 0;

      return `
        <div class="ranking-item${rankClass}" 
             data-staff-id="${staff.id}"
             style="animation-delay:${i * 0.04}s" 
             onclick="openModal(${staff.id})">
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
            <div class="ranking-role">${staff.tags[0]}</div>
          </div>
          <div class="ranking-votes">
            <div class="ranking-votes-num">${voteCount}</div>
            <div class="ranking-votes-label">票</div>
          </div>
        </div>
      `;
    }).join("");
  } else {
    // 更新時はDOMを直接操作
    sorted.forEach((staff, i) => {
      const item = itemMap[staff.id];
      if (item) {
        const rank = i + 1;
        const rankClass = rank <= 3 ? ` rank-${rank}` : "";
        const rankDisplay = rank <= 3 ? rankEmoji[i] : ordinal(rank);
        const voteCount = votes[staff.id] || 0;

        // 順位表示の更新
        const rankEl = item.querySelector('.ranking-rank');
        if (rankEl.textContent !== String(rankDisplay)) rankEl.textContent = rankDisplay;
        
        // 票数の更新
        const voteEl = item.querySelector('.ranking-votes-num');
        const prevVoteCount = previousVotes[staff.id] || 0;
        if (voteEl.textContent !== String(voteCount)) voteEl.textContent = voteCount;

        // クラスの更新
        item.className = `ranking-item${rankClass}`;

        // アニメーション：順位が入れ替わったか、票数が増えた場合にバウンド
        const hasMoved = previousRankingOrder.length > 0 && previousRankingOrder[i] !== staff.id;
        const hasIncreased = isUpdate && voteCount > prevVoteCount;

        if (isUpdate && (hasMoved || hasIncreased)) {
          item.style.animation = 'none';
          item.offsetHeight; // reflow
          item.style.animation = 'bounceIn 0.5s ease';
        } else if (isUpdate) {
          item.style.animation = 'none';
        }

        // DOMの並び替え（既存のノードを appendChild すると移動になる）
        list.appendChild(item);
      }
    });
  }

  // 状態を保存
  previousRankingOrder = currentRankingOrder;
  previousVotes = { ...votes };
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

    const baseColor = staff.color.slice(0, 7);

    inner.innerHTML = `
      <div class="modal-avatar" style="--staff-color: ${baseColor}; box-shadow: 0 0 0 4px ${baseColor}, 0 8px 24px rgba(0,0,0,0.15);">
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
          <div class="modal-info-value">${staff.tags[0]}</div>
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
          💗 投票は終了しました
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
  // 左右の矢印を削除
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

// ============================
// 店内状況 - Firebase連携
// ============================
let storeStatusOpen = true; // 対応中かどうか
let staffStatusMap = {}; // { staffId: boolean }

function initStoreStatus() {
  if (!db) return;

  // Firebaseから店舗のオン/オフ状態を監視
  db.ref("storeStatus").on("value", snapshot => {
    const data = snapshot.val();
    if (data !== null) {
      storeStatusOpen = data.open !== false;
      if (data.staff && typeof data.staff === "object") {
        staffStatusMap = {};
        Object.keys(data.staff).forEach(key => {
          const id = parseInt(key, 10);
          if (!Number.isNaN(id)) {
            staffStatusMap[id] = data.staff[key] !== false;
          }
        });
      }
    }
    // 店内状況ページが現在表示中なら更新
    if (currentTab === "status") {
      renderStoreStatus();
    }
  });
}

function toggleStoreStatus() {
  storeStatusOpen = !storeStatusOpen;

  // Firebaseに状態を保存
  if (db) {
    db.ref("storeStatus").set({
      open: storeStatusOpen,
      staff: staffStatusMap,
      updatedAt: new Date().toISOString()
    });
  }

  renderStoreStatus();
}

function ensureStaffStatusForStaffIds(staffIds) {
  let changed = false;
  staffIds.forEach(id => {
    if (staffStatusMap[id] === undefined) {
      staffStatusMap[id] = true;
      changed = true;
    }
  });
  if (changed && db) {
    db.ref("storeStatus/staff").set(staffStatusMap);
  }
}

function toggleStaffStatus(staffId) {
  staffStatusMap[staffId] = staffStatusMap[staffId] !== false ? false : true;
  if (db) {
    db.ref("storeStatus/staff").set(staffStatusMap);
  }
  renderStoreStatus();
}

function getTimeIcon(hour) {
  if (hour < 9) return "😴";
  if (hour < 10) return "🌅";
  if (hour < 12) return "👀";
  if (hour < 14) return "😋";
  if (hour < 16) return "💪";
  if (hour < 17) return "😳";
  return "🌙";
}

function getCurrentTimeSlot() {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 9) return { time: "営業前", emoji: "😴", status: "休業" };
  if (hour < 10) return { time: "9時～", emoji: "🌅", status: "営業開始" };
  if (hour < 11) return { time: "10時～", emoji: "👀", status: "営業中" };
  if (hour < 12) return { time: "11時～", emoji: "👀", status: "営業中" };
  if (hour < 13) return { time: "12時～", emoji: "😋", status: "ランチタイム" };
  if (hour < 14) return { time: "13時～", emoji: "😋", status: "営業中" };
  if (hour < 15) return { time: "14時～", emoji: "💪", status: "営業中" };
  if (hour < 16) return { time: "15時～", emoji: "💪", status: "営業中" };
  if (hour < 17) return { time: "16時～", emoji: "😳", status: "営業終了が近い" };
  return { time: "営業終了", emoji: "🌙", status: "本日は営業終了しました" };
}

function renderStoreStatus() {
  // 対応状況表示の更新
  const statusDisplay = document.getElementById("toggle-status-display");
  const toggleBtn = document.getElementById("status-toggle-btn");
  const currentTimeSlot = getCurrentTimeSlot();

  if (storeStatusOpen) {
    statusDisplay.innerHTML = '<span class="status-icon">🟢</span><span class="status-text">営業中</span>';
    toggleBtn.textContent = "オフにする";
  } else {
    statusDisplay.innerHTML = '<span class="status-icon inactive">🔴</span><span class="status-text inactive">営業終了</span>';
    toggleBtn.textContent = "オンにする";
  }

  // スタッフ在籍情報の表示
  renderStaffStatusGrid();

  // 現在時刻の表示
  const currentTime = document.getElementById("current-time");
  if (currentTime) {
    const now = new Date();
    const hour = now.getHours();
    const min = String(now.getMinutes()).padStart(2, "0");
    currentTime.textContent = `${hour}:${min}`;
  }
}

function getCurrentScheduleDay() {
  const today = new Date();
  const key = `${today.getMonth() + 1}${today.getDate()}`;
  return SCHEDULE[key] ? key : currentDay;
}

function renderStaffStatusGrid() {
  const grid = document.getElementById("staff-status-grid");
  if (!grid) return;

  // 現在の時間帯に対応しているスタッフを取得
  const dayKey = getCurrentScheduleDay();
  const dayData = SCHEDULE[dayKey];
  if (!dayData) {
    grid.innerHTML = '<div class="empty-state">シフト情報がありません</div>';
    return;
  }

  // 現在時刻のタイムスロットを特定
  const now = new Date();
  const hour = now.getHours();

  let currentSlot = null;
  for (const slot of TIME_SLOTS) {
    const startHour = slot.startHour;
    if (hour >= startHour && (currentSlot === null || startHour > currentSlot.startHour)) {
      currentSlot = slot;
    }
  }

  let staffIds = [];
  if (currentSlot && dayData[currentSlot.id]) {
    staffIds = dayData[currentSlot.id];
  }

  if (staffIds.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">現在対応スタッフはいません</div>';
    return;
  }

  ensureStaffStatusForStaffIds(staffIds);

  grid.innerHTML = staffIds.map(id => {
    const staff = getStaff(id);
    if (!staff) return "";

    const baseColor = staff.color.slice(0, 7);
    const timeIcon = getTimeIcon(hour);
    const active = staffStatusMap[id] !== false;
    const statusLabel = active ? "対応中" : "休憩中";
    const statusClass = active ? "active" : "inactive";

    return `
      <div class="staff-status-card ${statusClass}" onclick="toggleStaffStatus(${staff.id})">
        <div class="staff-status-avatar" style="--staff-color: ${baseColor};">
          <img class="staff-status-avatar-photo"
            src="photos/${staff.id}.jpg"
            onload="this.classList.add('loaded')"
            onerror="tryNextPhoto(this,${staff.id},1)"
            alt="${staff.name}">
          <span>${staff.emoji}</span>
          <div class="staff-status-icon">${timeIcon}</div>
        </div>
        <div class="staff-status-name">${staff.name}</div>
        <div class="staff-status-time">${staff.tags[0]}</div>
        <div class="staff-status-badge ${statusClass}">${statusLabel}</div>
      </div>
    `;
  }).join("");
}

// ============================
// タブ切り替え時の店内状況の初期化
// ============================
const originalSwitchTab = switchTab;
switchTab = function(tab) {
  originalSwitchTab.call(this, tab);

  if (tab === "status") {
    renderStoreStatus();
    // 毎秒更新（時刻表示を最新に保つため）
    if (!window.statusUpdateInterval) {
      window.statusUpdateInterval = setInterval(() => {
        if (currentTab === "status") {
          renderStoreStatus();
        }
      }, 1000);
    }
  } else {
    // 他のタブに切り替わったらリセット
    if (window.statusUpdateInterval) {
      clearInterval(window.statusUpdateInterval);
      window.statusUpdateInterval = null;
    }
  }
};
