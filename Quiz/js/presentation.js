/**
 * プレゼンテーション画面ロジック (presentation.js)
 * 白基調・見切れ防止設計・10位から1位への個別順位発表
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5];
let currentQuestions = DEFAULT_QUESTIONS;
let currentState = null;
let currentAnswers = {};
let allTeams = {};
let rankingChannel = null;
let subscribedAnswerQuestionId = null;
let unsubscribeCurrentAnswers = null;

// DOM要素
const waterContainer = document.getElementById('waterContainer');
const answeredCountEl = document.getElementById('answeredCount');
const targetCountEl = document.getElementById('targetCount');
const answeredPercentEl = document.getElementById('answeredPercent');
const answerBadge = document.getElementById('answerBadge');

const qNumberBadge = document.getElementById('qNumberBadge');
const presDoubleBadge = document.getElementById('presDoubleBadge');
const sceneStatusBadge = document.getElementById('sceneStatusBadge');

const presMain = document.getElementById('presMain');
const presImageWrapper = document.getElementById('presImageWrapper');
const presQuestionImage = document.getElementById('presQuestionImage');
const presQuestionText = document.getElementById('presQuestionText');
const presOptionsGrid = document.getElementById('presOptionsGrid');
const presTextAnswerNotice = document.getElementById('presTextAnswerNotice');
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
const btnResetReveal = document.getElementById('btnResetReveal');
const rankingCardsStack = document.getElementById('rankingCardsStack');
const playerQrPanel = document.getElementById('playerQrPanel');
const playerQrCode = document.getElementById('playerQrCode');
const playerQrUrl = document.getElementById('playerQrUrl');

// 順位発表管理用状態
let sortedTeams = [];
let revealOrder = []; // 発表する順序 [5, 4, 3, 2, 1]
let currentRevealIndex = 0; // 現在どこまで発表したか
let autoRevealTimer = null;
let finalRankingsInitialized = false;
let finalTeamsLoadStatus = 'idle';
let finalTeamsLoadPromise = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  if (typeof BroadcastChannel !== 'undefined') {
    rankingChannel = new BroadcastChannel('quiz-ranking');
    rankingChannel.addEventListener('message', event => {
      const command = event.data && event.data.type;
      if (command === 'getRevealStatus') {
        publishRevealStatus();
      } else if (command === 'revealNext') {
        revealNextRank();
      } else if (command === 'toggleAutoReveal') {
        toggleAutoReveal();
      } else if (command === 'resetReveal') {
        resetRevealSequence();
      }
    });
  }
  document.getElementById('btnClosePlayerQr').addEventListener('click', () => {
    quizStore.updateState({ playerQrVisible: false });
  });

  // 問題データ購読
  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    subscribeToActiveQuestionAnswers();
    renderCurrentQuestion();
  });

  // 出題順購読
  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    subscribeToActiveQuestionAnswers();
    renderCurrentQuestion();
  });

  // チーム情報購読
  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    updateWaterLevel();
    if (Object.keys(allTeams).length) finalTeamsLoadStatus = 'loaded';
    if (currentState && currentState.currentScene === 'final') {
      setupFinalRankings(false);
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

function subscribeToActiveQuestionAnswers() {
  const qIndex = currentState ? Number(currentState.currentQuestionIndex) || 0 : 0;
  const question = currentQuestions[qIndex] || currentQuestions[0];
  if (!question || question.id === subscribedAnswerQuestionId) return;
  if (unsubscribeCurrentAnswers) unsubscribeCurrentAnswers();
  subscribedAnswerQuestionId = question.id;
  currentAnswers = {};
  unsubscribeCurrentAnswers = quizStore.subscribeAnswers(question.id, answers => {
    currentAnswers = answers || {};
    updateWaterLevel();
  });
}

function applyState() {
  if (!currentState) return;

  const { status, currentScene, currentQuestionIndex, targetTeamCount } = currentState;
  setPlayerQrVisible(Boolean(currentState.playerQrVisible));
  const currentQ = currentQuestions[currentQuestionIndex] || currentQuestions[0];
  if (currentScene !== 'final') finalRankingsInitialized = false;

  targetCountEl.textContent = targetTeamCount || 100;

  subscribeToActiveQuestionAnswers();

  // ステータスバッジ
  qNumberBadge.textContent = `Q ${currentQuestionIndex + 1}`;

  // シーンごとの表示制御
  if (currentScene !== 'final' && (status === 'stopped' || currentScene === 'waiting')) {
    showSpecialView("まもなく開始します", "各チームのスマートフォンを準備してお待ちください。");
    sceneStatusBadge.textContent = "待機中";
    waterContainer.style.height = "0%";
    answerBadge.style.display = "none";
    return;
  }

  if (currentScene === 'final') {
    sceneStatusBadge.textContent = "最終結果発表";
    answerBadge.style.display = "none";
    showSpecialView("🎉 最終結果発表 🎉", "クイズ大会の成績上位チームを発表します！");
    const resetSequence = !finalRankingsInitialized;
    if (resetSequence) finalTeamsLoadStatus = 'idle';
    setupFinalRankings(resetSequence);
    finalRankingsInitialized = true;
    if (!Object.keys(allTeams).length) refreshFinalTeams();
    return;
  }
  // 出題・回答・正解表示シーン
  specialView.style.display = 'none';
  presMain.style.display = 'flex';
  presMain.classList.toggle('has-explanation', currentScene === 'result');
  answerBadge.style.display = 'flex';

  renderCurrentQuestion();

  if (currentScene === 'question') {
    sceneStatusBadge.textContent = "回答受付中";
    presExplanationBox.style.display = 'none';
    removeAnswerHighlights();
  } else if (currentScene === 'closed') {
    sceneStatusBadge.textContent = "回答受付終了";
    presExplanationBox.style.display = 'none';
    removeAnswerHighlights();
  } else if (currentScene === 'result') {
    sceneStatusBadge.textContent = "正解発表";
    highlightCorrectAnswer(currentQ);
  }
}

function showSpecialView(title, subtitle) {
  presMain.style.display = 'none';
  specialView.style.display = 'flex';
  specialView.classList.toggle('final-results-view', currentState && currentState.currentScene === 'final');
  specialTitle.textContent = title;
  specialSubtitle.textContent = subtitle;
  rankingRevealContainer.style.display = 'none';
}

function renderCurrentQuestion() {
  const qIndex = (currentState && currentState.currentQuestionIndex !== undefined) ? currentState.currentQuestionIndex : 0;
  const q = currentQuestions[qIndex] || currentQuestions[0];
  if (!q) return;
  presMain.classList.toggle('has-many-options', q.answerType !== 'text' && (q.options || []).length > 4);

  // 1. 問題画像 (あれば表示)
  const hasImage = Boolean(q.image && q.image.trim() !== '');
  presMain.classList.toggle('has-image', hasImage);
  if (hasImage) {
    presQuestionImage.src = q.image;
    presImageWrapper.style.display = 'flex';
  } else {
    presImageWrapper.style.display = 'none';
  }

  // 2. 問題文
  presQuestionText.textContent = q.question;

  // ポイント倍率バッジ表示制御
  if (presDoubleBadge) {
    const multiplier = getPointMultiplier(q);
    presDoubleBadge.textContent = ScoreEngine.getMultiplierBadge(multiplier);
    presDoubleBadge.style.display = multiplier > 1 ? 'inline-block' : 'none';
  }

  // 3. 選択肢 (2列グリッド: ◯◯ ◯◯ ◯◯)
  presOptionsGrid.innerHTML = '';
  const isTextAnswer = q.answerType === 'text';
  presOptionsGrid.style.display = isTextAnswer ? 'none' : '';
  const options = isTextAnswer ? [] : (q.options || []);
  const hasImageOptions = options.some(option => Boolean(option.image && option.image.trim() !== ''));
  presOptionsGrid.classList.toggle('has-image-options', hasImageOptions);
  presOptionsGrid.style.setProperty('--option-count', options.length);
  presTextAnswerNotice.textContent = '回答は参加者のスマートフォンから入力します';
  presTextAnswerNotice.style.display = isTextAnswer ? 'block' : 'none';
  options.forEach((opt, idx) => {
    const card = document.createElement('div');
    card.className = 'pres-option-card';
    if (hasImageOptions) card.classList.add('image-option-card');
    card.setAttribute('data-index', idx);

    const hasImage = Boolean(opt.image && opt.image.trim() !== '');
    const hasText = Boolean(String(opt.text || '').trim());

    let imgHtml = '';
    if (hasImage) {
      imgHtml = `<img src="${escapeHtml(opt.image)}" class="opt-thumb-image" alt="選択肢画像">`;
    }

    card.innerHTML = `
      <div class="opt-num-badge">${idx + 1}</div>
      ${imgHtml}
      ${hasText ? `<div class="opt-text-label">${escapeHtml(opt.text)}</div>` : ''}
    `;
    presOptionsGrid.appendChild(card);
  });

  // 4. 解説文
  presExplanationText.textContent = q.explanation || "解説はありません。";
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
  if (q.answerType === 'text') {
    presOptionsGrid.style.display = 'none';
    const modelAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
    presTextAnswerNotice.textContent = modelAnswer
      ? `模範解答: ${modelAnswer}`
      : '記述式回答を手動採点しました。';
    presTextAnswerNotice.style.display = 'block';
    presExplanationBox.style.display = 'block';
    return;
  }
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

function renderPlayerQr() {
  const playerUrl = 'https://kaiser0226.github.io/Quiz/player.html';
  playerQrUrl.href = playerUrl;
  playerQrCode.setAttribute('aria-label', `回答画面のQRコード: ${playerUrl}`);
  playerQrCode.replaceChildren();
  if (typeof QRCode !== 'function') {
    playerQrCode.textContent = 'QRコードを読み込めません。ページを再読み込みしてください。';
    return;
  }
  try {
    new QRCode(playerQrCode, {
      text: playerUrl,
      width: 1024,
      height: 1024,
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (error) {
    console.error('回答画面QRコードの生成に失敗しました:', error);
    playerQrCode.textContent = 'QRコードを生成できませんでした。ページを再読み込みしてください。';
  }
}

function setPlayerQrVisible(visible) {
  playerQrPanel.classList.toggle('is-visible', visible);
  playerQrPanel.setAttribute('aria-hidden', String(!visible));
  if (visible) renderPlayerQr();
}

function removeAnswerHighlights() {
  const cards = presOptionsGrid.querySelectorAll('.pres-option-card');
  cards.forEach(card => {
    card.classList.remove('is-correct');
    card.classList.remove('is-incorrect');
  });
}

// =========================================================
// 最終結果ランキング発表 (10位から1位を1チームずつ表示)
// =========================================================

function setupFinalRankings(resetSequence = false) {
  rankingRevealContainer.style.display = 'flex';
  const previousRevealCount = resetSequence ? 0 : currentRevealIndex;
  sortedTeams = Object.entries(allTeams || {})
    .filter(([, team]) => team && typeof team === 'object' && String(team.teamName || '').trim())
    .map(([teamId, team]) => ({
      ...team,
      teamId: team.teamId || teamId,
      totalScore: Number(team.totalScore) || 0
    }))
    .sort((a, b) =>
      b.totalScore - a.totalScore ||
      String(a.teamId).localeCompare(String(b.teamId), undefined, { numeric: true, sensitivity: 'base' })
    );

  const topCount = Math.min(10, sortedTeams.length);
  revealOrder = Array.from({ length: topCount }, (_, index) => topCount - index);
  currentRevealIndex = Math.min(previousRevealCount, revealOrder.length);

  rankingCardsStack.replaceChildren();
  const card = document.createElement('div');
  card.className = 'rank-card';
  card.id = 'rankDisplayCard';
  rankingCardsStack.appendChild(card);
  if (currentRevealIndex > 0) {
    renderRankCard(revealOrder[currentRevealIndex - 1], false);
  } else if (topCount === 0) {
    card.className = 'rank-card revealed';
    card.textContent = finalTeamsLoadStatus === 'loading' || finalTeamsLoadStatus === 'idle'
      ? 'チーム情報を読み込んでいます...'
      : finalTeamsLoadStatus === 'error'
        ? 'チーム情報を取得できませんでした。接続を確認してください。'
        : '登録されたチームがいません';
  }

  updateRevealButtonText();
}

async function refreshFinalTeams() {
  if (finalTeamsLoadPromise) return finalTeamsLoadPromise;

  finalTeamsLoadStatus = 'loading';
  setupFinalRankings(false);
  finalTeamsLoadPromise = quizStore.getTeams()
    .then(teams => {
      if (!currentState || currentState.currentScene !== 'final') return;
      if (!Object.keys(allTeams).length) allTeams = teams || {};
      finalTeamsLoadStatus = 'loaded';
      setupFinalRankings(false);
    })
    .catch(error => {
      console.error('最終結果発表のチーム情報を取得できませんでした:', error);
      if (currentState && currentState.currentScene === 'final') {
        finalTeamsLoadStatus = 'error';
        setupFinalRankings(false);
      }
    })
    .finally(() => {
      finalTeamsLoadPromise = null;
    });
  return finalTeamsLoadPromise;
}

function renderRankCard(rank, animate = true) {
  const card = document.getElementById('rankDisplayCard');
  const team = sortedTeams[rank - 1];
  if (!card || !team) return;

  card.className = `rank-card rank-${rank}`;
  card.replaceChildren();
  const rankLabel = document.createElement('div');
  rankLabel.className = 'rank-badge-text';
  rankLabel.textContent = `${rank}位`;
  const teamName = document.createElement('div');
  teamName.className = 'rank-team-text';
  teamName.textContent = splitTeamDisplayName(String(team.teamName)).name;
  const score = document.createElement('div');
  score.className = 'rank-score-text';
  score.textContent = `${Number(team.totalScore) || 0} 点`;
  card.append(rankLabel, teamName, score);

  if (animate) {
    card.classList.remove('revealed');
    void card.offsetWidth;
  }
  card.classList.add('revealed');
}

function updateRevealButtonText() {
  const hasTeams = revealOrder.length > 0;
  if (!hasTeams) {
    if (btnRevealNextRank) {
      btnRevealNextRank.textContent = finalTeamsLoadStatus === 'error'
        ? 'チーム情報を取得できません'
        : finalTeamsLoadStatus === 'loading' || finalTeamsLoadStatus === 'idle'
          ? 'チーム情報を読み込み中...'
          : '発表できるチームがいません';
      btnRevealNextRank.disabled = true;
    }
    if (btnAutoRevealRanks) btnAutoRevealRanks.disabled = true;
    if (autoRevealTimer) {
      clearInterval(autoRevealTimer);
      autoRevealTimer = null;
    }
  } else if (currentRevealIndex < revealOrder.length) {
    const nextRank = revealOrder[currentRevealIndex];
    if (btnRevealNextRank) {
      btnRevealNextRank.textContent = `▶ ${nextRank}位を発表する`;
      btnRevealNextRank.disabled = false;
    }
    if (btnAutoRevealRanks) btnAutoRevealRanks.disabled = false;
  } else {
    if (btnRevealNextRank) {
      btnRevealNextRank.textContent = `🎉 全順位発表完了！`;
      btnRevealNextRank.disabled = true;
    }
    if (btnAutoRevealRanks) btnAutoRevealRanks.disabled = false;
    if (autoRevealTimer) {
      clearInterval(autoRevealTimer);
      autoRevealTimer = null;
      if (btnAutoRevealRanks) btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
    }
  }
  publishRevealStatus();
}

function revealNextRank() {
  if (currentRevealIndex >= revealOrder.length) return;

  const targetRank = revealOrder[currentRevealIndex];
  renderRankCard(targetRank);
  currentRevealIndex++;
  if (targetRank === 1 && currentState && !currentState.finalResultsRevealed) {
    quizStore.updateState({ finalResultsRevealed: true });
    currentState.finalResultsRevealed = true;
  }

  updateRevealButtonText();
}

function toggleAutoReveal() {
  if (autoRevealTimer) {
    // 停止
    clearInterval(autoRevealTimer);
    autoRevealTimer = null;
    if (btnAutoRevealRanks) btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
    publishRevealStatus();
  } else {
    // 自動再生開始
    if (!revealOrder.length) return;
    if (currentRevealIndex >= revealOrder.length) {
      resetRevealSequence();
    }
    if (btnAutoRevealRanks) btnAutoRevealRanks.textContent = "⏸️ 一時停止";
    autoRevealTimer = setInterval(() => {
      if (currentRevealIndex < revealOrder.length) {
        revealNextRank();
      } else {
        clearInterval(autoRevealTimer);
        autoRevealTimer = null;
        if (btnAutoRevealRanks) btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
      }
    }, 2800); // 2.8秒おきに次を発表
    revealNextRank();
    publishRevealStatus();
  }
}

function resetRevealSequence() {
  if (autoRevealTimer) {
    clearInterval(autoRevealTimer);
    autoRevealTimer = null;
    if (btnAutoRevealRanks) btnAutoRevealRanks.textContent = "⏩ 1位まで自動再生";
  }
  currentRevealIndex = 0;
  if (currentState && currentState.finalResultsRevealed) {
    quizStore.updateState({ finalResultsRevealed: false });
    currentState.finalResultsRevealed = false;
  }
  const card = document.getElementById('rankDisplayCard');
  if (card) {
    card.replaceChildren();
    card.className = 'rank-card';
    if (revealOrder.length === 0) {
      card.classList.add('revealed');
      card.textContent = finalTeamsLoadStatus === 'loaded'
        ? '登録されたチームがいません'
        : finalTeamsLoadStatus === 'error'
          ? 'チーム情報を取得できませんでした。接続を確認してください。'
          : 'チーム情報を読み込んでいます...';
    }
  }
  updateRevealButtonText();
}

function publishRevealStatus() {
  if (!rankingChannel) return;
  const nextRank = revealOrder[currentRevealIndex];
  rankingChannel.postMessage({
    type: 'revealStatus',
    complete: currentRevealIndex >= revealOrder.length,
    nextLabel: nextRank ? `${nextRank}位` : '',
    autoPlaying: Boolean(autoRevealTimer)
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
