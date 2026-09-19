/**
 * プレゼンテーション画面ロジック (presentation.js)
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

const specialView = document.getElementById('specialView');
const specialTitle = document.getElementById('specialTitle');
const specialSubtitle = document.getElementById('specialSubtitle');
const finalRankingsContainer = document.getElementById('finalRankingsContainer');

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
      renderFinalRankings();
    }
  });

  // 状態購読
  quizStore.subscribeState(state => {
    currentState = state;
    applyState();
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
    showSpecialView("🎉 最終結果発表 🎉", "クイズ大会の順位とスコアです！");
    renderFinalRankings();
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
    highlightCorrectAnswer(currentQ);
  }
}

function showSpecialView(title, subtitle) {
  presMain.style.display = 'none';
  specialView.style.display = 'flex';
  specialTitle.textContent = title;
  specialSubtitle.textContent = subtitle;
  finalRankingsContainer.style.display = 'none';
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
  q.options.forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'pres-option-card';
    card.setAttribute('data-index', idx);

    let imgHtml = '';
    if (opt.image && opt.image.trim() !== '') {
      imgHtml = `<img src="${opt.image}" class="opt-thumb-image" alt="選択肢画像">`;
    }

    card.innerHTML = `
      <div class="opt-num-badge">${idx + 1}</div>
      ${imgHtml}
      <div class="opt-text-label">${opt.text}</div>
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

  // 時間制限の有無（問題データ設定または管理画面でのリアルタイム切替）
  const hasLimit = (q.hasTimeLimit !== false) && (currentState.isTimerRunning !== false);

  if (!hasLimit) {
    // 手動進行モード（時間制限なし）
    presTimerContainer.style.display = 'none';
    document.body.classList.remove('timer-warning-active');
    return;
  }

  // Show timer UI
  presTimerContainer.style.display = 'flex';
  const totalDuration = q.timeLimitSeconds || 15;
  // Use shared start time; if missing, wait briefly for it to arrive from admin
  let startTime = currentState.questionStartTime;
  if (!startTime) {
    // Fallback: set now and sync to store (should already be set by admin)
    startTime = Date.now();
    quizStore.updateState({ questionStartTime: startTime });
  }

  async function tick() {
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, totalDuration - elapsed);
    const percent = Math.max(0, (remaining / totalDuration) * 100);

    presTimerFill.style.width = `${percent}%`;
    presTimerSeconds.textContent = `${Math.ceil(remaining)}s`;

    // 警告判定 (残り5秒以下 または 20%以下)
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
      // Auto‑advance to result scene when timer expires
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

  // 水位高さを 0%〜100% で更新
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

// 最終結果ランキングの表示
function renderFinalRankings() {
  finalRankingsContainer.style.display = 'block';
  const teamList = Object.values(allTeams);

  // 得点降順ソート
  teamList.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  let html = `
    <table class="ranking-table" style="background: rgba(30, 41, 59, 0.9); border-radius: 12px; overflow: hidden; width: 100%; font-size: 1.3rem;">
      <thead>
        <tr style="background: #0f172a;">
          <th style="padding: 16px;">順位</th>
          <th style="padding: 16px;">チーム名</th>
          <th style="padding: 16px; text-align: right;">合計得点</th>
        </tr>
      </thead>
      <tbody>
  `;

  teamList.slice(0, 20).forEach((t, i) => {
    const rank = i + 1;
    let rankBadge = `${rank}位`;
    if (rank === 1) rankBadge = `🥇 1位`;
    else if (rank === 2) rankBadge = `🥈 2位`;
    else if (rank === 3) rankBadge = `🥉 3位`;

    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
        <td style="padding: 14px; font-weight: 800; color: ${rank <= 3 ? '#facc15' : 'white'};">${rankBadge}</td>
        <td style="padding: 14px; font-weight: 700;">${escapeHtml(t.teamName)}</td>
        <td style="padding: 14px; text-align: right; font-weight: 800; color: #38bdf8;">${t.totalScore || 0} 点</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  finalRankingsContainer.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
