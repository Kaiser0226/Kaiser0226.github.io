/**
 * プレゼンテーション画面ロジック (presentation.js)
 * 白基調・見切れ防止設計・5位から1位への順位発表アニメーション
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5];
let currentQuestions = DEFAULT_QUESTIONS;
let currentState = null;
let currentAnswers = {};
let allTeams = {};
let timerInterval = null;

// DOM要素
const waterContainer = document.getElementById('waterContainer');
const answeredCountEl = document.getElementById('answeredCount');
const targetCountEl = document.getElementById('targetCount');
const answeredPercentEl = document.getElementById('answeredPercent');
const answerBadge = document.getElementById('answerBadge');

const qNumberBadge = document.getElementById('qNumberBadge');
const sceneStatusBadge = document.getElementById('sceneStatusBadge');

const presMain = document.getElementById('presMain');
const presImageWrapper = document.getElementById('presImageWrapper');
const presQuestionImage = document.getElementById('presQuestionImage');
const presQuestionText = document.getElementById('presQuestionText');
const presTimerContainer = document.getElementById('presTimerContainer');
const presTimerFill = document.getElementById('presTimerFill');
const presTimerSeconds = document.getElementById('presTimerSeconds');
const presOptionsGrid = document.getElementById('presOptionsGrid');
const presExplanationBox = document.getElementById('presExplanationBox');
const presExplanationText = document.getElementById('presExplanationText');

// 特殊全画面
const specialView = document.getElementById('specialView');
const specialTitle = document.getElementById('specialTitle');
const specialSubtitle = document.getElementById('specialSubtitle');

// 最終結果アニメーション関連
const rankingRevealContainer = document.getElementById('rankingRevealContainer');
const btnRevealNextRank = document.getElementById('btnRevealNextRank');
const btnAutoRevealRanks = document.getElementById('btnAutoRevealRanks');
const btnToggleFullRanking = document.getElementById('btnToggleFullRanking');
const btnResetReveal = document.getElementById('btnResetReveal');
const rankingCardsStack = document.getElementById('rankingCardsStack');
const fullRankingView = document.getElementById('fullRankingView');

// 順位発表管理用状態
let sortedTeams = [];
let revealOrder = []; // 発表する順序 [5, 4, 3, 2, 1]
let currentRevealIndex = 0; // 現在どこまで発表したか
let autoRevealTimer = null;
let isShowingFullRanking = false;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 問題データ購読
  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    renderCurrentQuestion();
  });

  // 出題順購読
  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    renderCurrentQuestion();
  });

  // チーム情報購読
  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    updateWaterLevel();
    if (currentState && currentState.currentScene === 'final') {
      setupFinalRankings();
    }
  });

  // 状態購読
  quizStore.subscribeState(state => {
    currentState = state;
    applyState();
  });

  // 最終結果発表コントロールのイベント
  if (btnRevealNextRank) {
    btnRevealNextRank.addEventListener('click', revealNextRank);
  }
  if (btnAutoRevealRanks) {
    btnAutoRevealRanks.addEventListener('click', toggleAutoReveal);
  }
  if (btnToggleFullRanking) {
    btnToggleFullRanking.addEventListener('click', toggleFullRanking);
  }
  if (btnResetReveal) {
    btnResetReveal.addEventListener('click', resetRevealSequence);
  }

  // キーボードショートカット (Space, Enter, ArrowRight で次の順位発表)
  window.addEventListener('keydown', e => {
    if (currentState && currentState.currentScene === 'final') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        revealNextRank();
      }
    }
  });
});

function applyState() {
  if (!currentState) return;

  const { status, currentScene, currentQuestionIndex, targetTeamCount } = currentState;
  const currentQ = currentQuestions[currentQuestionIndex] || currentQuestions[0];

  targetCountEl.textContent = targetTeamCount || 100;

  // 現在の問題に対する回答の購読
  if (currentQ) {
    quizStore.subscribeAnswers(currentQ.id, answers => {
      currentAnswers = answers || {};
      updateWaterLevel();
    });
  }

  // ステータスバッジ
  qNumberBadge.textContent = `Q ${currentQuestionIndex + 1}`;

  // シーンごとの表示制御
  if (status === 'stopped' || currentScene === 'waiting') {
    stopLocalTimer();
    showSpecialView("まもなく開始します", "各チームのスマートフォンを準備してお待ちください。");
    sceneStatusBadge.textContent = "待機中";
    waterContainer.style.height = "0%";
    answerBadge.style.display = "none";
    return;
  }

  if (currentScene === 'final') {
    stopLocalTimer();
    sceneStatusBadge.textContent = "最終結果発表";
    answerBadge.style.display = "none";
    showSpecialView("🎉 最終結果発表 🎉", "クイズ大会の成績上位チームを発表します！");
    setupFinalRankings();
    return;
  }

  // 出題・回答・正解表示シーン
  specialView.style.display = 'none';
  presMain.style.display = 'flex';
  answerBadge.style.display = 'flex';

  renderCurrentQuestion();

  if (currentScene === 'question') {
    sceneStatusBadge.textContent = "回答受付中";
    presExplanationBox.style.display = 'none';
    removeAnswerHighlights();
    setupTimer();
  } else if (currentScene === 'closed') {
    stopLocalTimer();
    sceneStatusBadge.textContent = "回答受付終了";
    presExplanationBox.style.display = 'none';
    removeAnswerHighlights();
  } else if (currentScene === 'result') {
    stopLocalTimer();
    sceneStatusBadge.textContent = "正解発表";
    // 正解発表時はタイマーを非表示にして解説の表示スペースを最大確保
    presTimerContainer.style.display = 'none';
    highlightCorrectAnswer(currentQ);
  }
}

function showSpecialView(title, subtitle) {
  presMain.style.display = 'none';
  specialView.style.display = 'flex';
  specialTitle.textContent = title;
  specialSubtitle.textContent = subtitle;
  rankingRevealContainer.style.display = 'none';
  document.body.classList.remove('timer-warning-active');
}

function renderCurrentQuestion() {
  const qIndex = (currentState && currentState.currentQuestionIndex !== undefined) ? currentState.currentQuestionIndex : 0;
  const q = currentQuestions[qIndex] || currentQuestions[0];
  if (!q) return;

  // 1. 問題画像 (あれば表示)
  if (q.image && q.image.trim() !== '') {
    presQuestionImage.src = q.image;
    presImageWrapper.style.display = 'flex';
  } else {
    presImageWrapper.style.display = 'none';
  }

  // 2. 問題文
  presQuestionText.textContent = q.question;

  // 3. 選択肢 (2列グリッド: ◯◯ ◯◯ ◯◯)
  presOptionsGrid.innerHTML = '';
  (q.options || []).forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'pres-option-card';
    card.setAttribute('data-index', idx);

    let imgHtml = '';
    if (opt.image && opt.image.trim() !== '') {
      imgHtml = `<img src="${escapeHtml(opt.image)}" class="opt-thumb-image" alt="選択肢画像">`;
    }

    card.innerHTML = `
      <div class="opt-num-badge">${idx + 1}</div>
      ${imgHtml}
      <div class="opt-text-label">${escapeHtml(opt.text)}</div>
    `;
    presOptionsGrid.appendChild(card);
  });

  // 4. 解説文
  presExplanationText.textContent = q.explanation || "解説はありません。";
}

function setupTimer() {
  stopLocalTimer();
  const qIndex = currentState.currentQuestionIndex || 0;
  const q = currentQuestions[qIndex];
  if (!q) return;

  const hasLimit = (q.hasTimeLimit !== false) && (currentState.isTimerRunning !== false);

  if (!hasLimit) {
    presTimerContainer.style.display = 'none';
    document.body.classList.remove('timer-warning-active');
    return;
  }

  presTimerContainer.style.display = 'flex';
  const totalDuration = q.timeLimitSeconds || 15;
  let startTime = currentState.questionStartTime;
  if (!startTime) {
    startTime = Date.now();
    quizStore.updateState({ questionStartTime: startTime });
  }

  async function tick() {
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, totalDuration - elapsed);
    const percent = Math.max(0, (remaining / totalDuration) * 100);

    presTimerFill.style.width = `${percent}%`;
    presTimerSeconds.textContent = `${Math.ceil(remaining)}s`;

    if (remaining <= 5 && remaining > 0) {
      presTimerContainer.classList.add('warning');
      document.body.classList.add('timer-warning-active');
    } else {
      presTimerContainer.classList.remove('warning');
      document.body.classList.remove('timer-warning-active');
    }

    if (remaining <= 0) {
      stopLocalTimer();
      presTimerSeconds.textContent = "0s";
      presTimerFill.style.width = "0%";
      document.body.classList.remove('timer-warning-active');
      await quizStore.updateState({ currentScene: 'result' });
    }
  }

  tick();
  timerInterval = setInterval(tick, 100);
}

function stopLocalTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.body.classList.remove('timer-warning-active');
  if (presTimerContainer) {
    presTimerContainer.classList.remove('warning');
  }
}

// 水位上昇アニメーションの更新
function updateWaterLevel() {
  const answeredTotal = Object.keys(currentAnswers).length;
  const target = (currentState && currentState.targetTeamCount) ? currentState.targetTeamCount : 100;
  
  answeredCountEl.textContent = answeredTotal;
  targetCountEl.textContent = target;

  const percent = Math.min(100, Math.round((answeredTotal / Math.max(1, target)) * 100));
  answeredPercentEl.textContent = percent;

  if (waterContainer) {
    waterContainer.style.height = `${percent}%`;
  }
}

// 正解のハイライト表示
function highlightCorrectAnswer(q) {
  const cards = presOptionsGrid.querySelectorAll('.pres-option-card');
  const correctIdx = Number(q.answer);

  cards.forEach(card => {
    const idx = Number(card.getAttribute('data-index'));
    if (idx === correctIdx) {
      card.classList.add('is-correct');
      card.classList.remove('is-incorrect');
    } else {
      card.classList.add('is-incorrect');
      card.classList.remove('is-correct');
    }
  });

  presExplanationBox.style.display = 'block';
}

function removeAnswerHighlights() {
  const cards = presOptionsGrid.querySelectorAll('.pres-option-card');
  cards.forEach(card => {
    card.classList.remove('is-correct');
    card.classList.remove('is-incorrect');
  });
}

// =========================================================
// 最終結果ランキング発表 (5位から1位への順位発表アニメーション)
// =========================================================

function setupFinalRankings() {
  rankingRevealContainer.style.display = 'flex';
  const teamList = Object.values(allTeams);

  // 得点降順ソート
  teamList.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  sortedTeams = teamList;

  // 上位5チーム（あるいは参加チーム数分）を準備
  const topCount = Math.min(5, sortedTeams.length);
  // 5位から1位の順序配列を作成（例: 5, 4, 3, 2, 1）
  revealOrder = [];
  for (let r = topCount; r >= 1; r--) {
    revealOrder.push(r);
  }

  currentRevealIndex = 0;
  isShowingFullRanking = false;
  fullRankingView.style.display = 'none';
  rankingCardsStack.style.display = 'flex';
  btnToggleFullRanking.textContent = "📋 全体ランキング表";

  // カードスタックの初期DOM構築 (すべて非表示状態で配置)
  rankingCardsStack.innerHTML = '';

  // 1位〜5位のカード枠を生成
  for (let rank = 1; rank <= topCount; rank++) {
    const t = sortedTeams[rank - 1];
    const card = document.createElement('div');
    card.className = `rank-card rank-${rank}`;
    card.id = `rankCard-${rank}`;

    let badgeIcon = `${rank}位`;
    if (rank === 1) badgeIcon = `🥇 1位`;
    else if (rank === 2) badgeIcon = `🥈 2位`;
    else if (rank === 3) badgeIcon = `🥉 3位`;

    card.innerHTML = `
      <div class="rank-badge-text">${badgeIcon}</div>
      <div class="rank-team-text">${escapeHtml(t ? t.teamName : `チーム ${rank}`)}</div>
      <div class="rank-score-text">${t ? t.totalScore || 0 : 0} 点</div>
    `;

    rankingCardsStack.appendChild(card);
  }

  // 全体ランキングHTMLも裏で生成
  buildFullRankingTable();

  updateRevealButtonText();
}

function updateRevealButtonText() {
  if (currentRevealIndex < revealOrder.length) {
    const nextRank = revealOrder[currentRevealIndex];
    let nextText = `${nextRank}位`;
    if (nextRank === 1) nextText = "🥇 1位";
    btnRevealNextRank.textContent = `▶ 第 ${nextText} を発表する`;
    btnRevealNextRank.disabled = false;
  } else {
    btnRevealNextRank.textContent = `🎉 全順位発表完了！`;
    btnRevealNextRank.disabled = true;
    if (autoRevealTimer) {
      clearInterval(autoRevealTimer);
      autoRevealTimer = null;
      btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
    }
  }
}

function revealNextRank() {
  if (currentRevealIndex >= revealOrder.length) return;

  const targetRank = revealOrder[currentRevealIndex];
  const targetCard = document.getElementById(`rankCard-${targetRank}`);
  if (targetCard) {
    targetCard.classList.add('revealed');
  }

  currentRevealIndex++;
  updateRevealButtonText();
}

function toggleAutoReveal() {
  if (autoRevealTimer) {
    // 停止
    clearInterval(autoRevealTimer);
    autoRevealTimer = null;
    btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
  } else {
    // 自動再生開始
    if (currentRevealIndex >= revealOrder.length) {
      resetRevealSequence();
    }
    btnAutoRevealRanks.textContent = "⏸️ 一時停止";
    revealNextRank();
    autoRevealTimer = setInterval(() => {
      if (currentRevealIndex < revealOrder.length) {
        revealNextRank();
      } else {
        clearInterval(autoRevealTimer);
        autoRevealTimer = null;
        btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
      }
    }, 2800); // 2.8秒おきに次を発表
  }
}

function resetRevealSequence() {
  if (autoRevealTimer) {
    clearInterval(autoRevealTimer);
    autoRevealTimer = null;
    btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
  }
  currentRevealIndex = 0;
  rankingCardsStack.querySelectorAll('.rank-card').forEach(c => {
    c.classList.remove('revealed');
  });
  updateRevealButtonText();
}

function toggleFullRanking() {
  isShowingFullRanking = !isShowingFullRanking;
  if (isShowingFullRanking) {
    rankingCardsStack.style.display = 'none';
    fullRankingView.style.display = 'block';
    btnToggleFullRanking.textContent = "🏆 順位発表カードに戻る";
  } else {
    fullRankingView.style.display = 'none';
    rankingCardsStack.style.display = 'flex';
    btnToggleFullRanking.textContent = "📋 全体ランキング表";
  }
}

function buildFullRankingTable() {
  let html = `
    <table class="full-ranking-table">
      <thead>
        <tr>
          <th style="width: 120px;">順位</th>
          <th>チーム名</th>
          <th style="text-align: right; width: 140px;">合計得点</th>
        </tr>
      </thead>
      <tbody>
  `;

  sortedTeams.forEach((t, i) => {
    const rank = i + 1;
    let rankBadge = `${rank}位`;
    if (rank === 1) rankBadge = `🥇 1位`;
    else if (rank === 2) rankBadge = `🥈 2位`;
    else if (rank === 3) rankBadge = `🥉 3位`;

    html += `
      <tr>
        <td style="font-weight: 800; color: ${rank === 1 ? '#d97706' : rank === 2 ? '#64748b' : rank === 3 ? '#c2410c' : '#0f172a'};">
          ${rankBadge}
        </td>
        <td style="font-weight: 700; color: #0f172a;">${escapeHtml(t.teamName)}</td>
        <td style="text-align: right; font-weight: 900; color: #2563eb;">${t.totalScore || 0} 点</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  fullRankingView.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
