/**
 * スマートフォン回答端末ロジック (player.js)
 */

let myTeam = null; // { teamId, teamName }
let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5];
let currentQuestions = DEFAULT_QUESTIONS;
let teamMasterList = typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : [];
let currentState = null;
let allTeams = {};
let selectedOptionIndex = null;
let isAnswerLocked = false;
let currentQuestionResults = null;

// DOM要素
const playerBody = document.getElementById('playerBody');
const registerView = document.getElementById('registerView');
const gameView = document.getElementById('gameView');
const teamSelectDropdown = document.getElementById('teamSelectDropdown');
const btnRegisterTeam = document.getElementById('btnRegisterTeam');

// ヘッダー要素
const displayTeamName = document.getElementById('displayTeamName');
const displayQBadge = document.getElementById('displayQBadge');
const displayScore = document.getElementById('displayScore');
const displayRank = document.getElementById('displayRank');

// シーンコンテナ
const sceneWaiting = document.getElementById('sceneWaiting');
const sceneQuestion = document.getElementById('sceneQuestion');
const sceneResult = document.getElementById('sceneResult');
const sceneFinal = document.getElementById('sceneFinal');

// 回答シーン要素
const playerImageContainer = document.getElementById('playerImageContainer');
const playerQuestionImage = document.getElementById('playerQuestionImage');
const playerQuestionText = document.getElementById('playerQuestionText');
const playerOptionsList = document.getElementById('playerOptionsList');
const btnLock = document.getElementById('btnLock');

// 結果シーン要素
const verdictBanner = document.getElementById('verdictBanner');
const verdictTitle = document.getElementById('verdictTitle');
const verdictPoints = document.getElementById('verdictPoints');
const statCorrectRate = document.getElementById('statCorrectRate');
const statAnswerTime = document.getElementById('statAnswerTime');
const playerExplanationText = document.getElementById('playerExplanationText');
const playerRankingSection = document.getElementById('playerRankingSection');
const rankNotice = document.getElementById('rankNotice');
const rankingScrollBox = document.getElementById('rankingScrollBox');
const rankingTableBody = document.getElementById('rankingTableBody');

// 最終結果シーン要素
const finalMyRank = document.getElementById('finalMyRank');
const finalMyScore = document.getElementById('finalMyScore');
const finalTableBody = document.getElementById('finalTableBody');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // ブラウザの「戻る」による画面破損を防止
  try {
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', () => {
      history.pushState(null, null, location.href);
      if (myTeam) applyState();
    });
  } catch (e) {
    console.warn("history pushState error:", e);
  }

  // チームマスターリスト購読
  quizStore.subscribeTeamList(list => {
    teamMasterList = list || [];
    populateTeamDropdown();
  });

  // 問題データ購読
  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    if (myTeam) {
      applyState();
    }
  });

  // 出題順購読
  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    if (myTeam) {
      applyState();
    }
  });

  // チームデータ購読
  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    updateHeaderStats();
    populateTeamDropdown(); // 参加状況反映
    if (currentState && currentState.currentScene === 'result') {
      renderRankingsTable();
    } else if (currentState && currentState.currentScene === 'final') {
      renderFinalResults();
    }
  });

  // 状態購読
  quizStore.subscribeState(state => {
    // リセットトークン監視（管理者による完全初期化時）
    if (state && state.resetToken) {
      const lastToken = Number(localStorage.getItem('quiz_last_reset_token') || 0);
      if (state.resetToken > lastToken) {
        localStorage.setItem('quiz_last_reset_token', state.resetToken);
        resetPlayerSession();
        return;
      }
    }

    currentState = state;
    if (myTeam) {
      applyState();
    }
  });

  // チーム登録ボタン
  btnRegisterTeam.addEventListener('click', handleRegister);
  btnLock.addEventListener('click', handleLockAnswer);

  initTeam();
});

// --- チーム登録と認証 ---

function populateTeamDropdown() {
  if (!teamSelectDropdown) return;
  const currentVal = teamSelectDropdown.value;
  teamSelectDropdown.innerHTML = '<option value="">-- チームを選択してください --</option>';

  teamMasterList.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    // 参加中のチームかチェック
    const isJoined = Object.values(allTeams).some(t => t.teamName === name);
    opt.textContent = isJoined ? `${name} (参加中)` : name;
    teamSelectDropdown.appendChild(opt);
  });

  if (currentVal) {
    teamSelectDropdown.value = currentVal;
  }
}

function initTeam() {
  const saved = localStorage.getItem('quiz_player_team');
  if (saved) {
    try {
      myTeam = JSON.parse(saved);
      displayTeamName.textContent = myTeam.teamName;
      registerView.style.display = 'none';
      gameView.style.display = 'flex';
      quizStore.registerTeam(myTeam.teamId, myTeam.teamName);
      return;
    } catch (e) {
      console.error(e);
    }
  }

  // 未登録の場合
  registerView.style.display = 'flex';
  gameView.style.display = 'none';
  populateTeamDropdown();
}

async function handleRegister() {
  const selectedName = teamSelectDropdown.value;
  if (!selectedName) {
    alert("チームを選択してください");
    return;
  }

  // チーム名は選択制で固定のため、名前から一意のteamIdを生成
  const teamId = 'team_' + btoa(encodeURIComponent(selectedName)).replace(/=/g, '');
  myTeam = { teamId, teamName: selectedName };

  localStorage.setItem('quiz_player_team', JSON.stringify(myTeam));
  displayTeamName.textContent = selectedName;

  await quizStore.registerTeam(teamId, selectedName);

  registerView.style.display = 'none';
  gameView.style.display = 'flex';
  applyState();
}

function resetPlayerSession() {
  myTeam = null;
  selectedOptionIndex = null;
  isAnswerLocked = false;
  localStorage.removeItem('quiz_player_team');
  sessionStorage.clear();
  resetBodyLockedColor();

  registerView.style.display = 'flex';
  gameView.style.display = 'none';
  if (teamSelectDropdown) teamSelectDropdown.value = '';
  populateTeamDropdown();
}

// --- 状態の適用とシーン切り替え ---

function applyState() {
  if (!currentState || !myTeam) return;

  const { status, currentScene, currentQuestionIndex } = currentState;
  const currentQ = currentQuestions[currentQuestionIndex] || currentQuestions[0];

  displayQBadge.textContent = `第 ${currentQuestionIndex + 1} 問`;
  updateHeaderStats();

  // シーン隠蔽リセット（画面の逆戻し・切り替えによる不整合を防止）
  sceneWaiting.style.display = 'none';
  sceneQuestion.style.display = 'none';
  sceneResult.style.display = 'none';
  sceneFinal.style.display = 'none';

  // 背景カラーリセット
  if (currentScene !== 'question' && currentScene !== 'closed') {
    resetBodyLockedColor();
  }

  if (status === 'stopped' || currentScene === 'waiting') {
    resetBodyLockedColor();
    sceneWaiting.style.display = 'flex';
    selectedOptionIndex = null;
    isAnswerLocked = false;
  } else if (currentScene === 'question') {
    sceneQuestion.style.display = 'flex';
    setupQuestionScene(currentQ);
  } else if (currentScene === 'closed') {
    sceneQuestion.style.display = 'flex';
    // 回答締め切り状態
    btnLock.disabled = true;
    if (!isAnswerLocked) {
      btnLock.textContent = "回答時間終了";
    }
  } else if (currentScene === 'result') {
    sceneResult.style.display = 'flex';
    showResultScene(currentQ);
  } else if (currentScene === 'final') {
    resetBodyLockedColor();
    sceneFinal.style.display = 'flex';
    renderFinalResults();
  }
}

// ヘッダーの得点・順位更新
function updateHeaderStats() {
  if (!myTeam) return;
  const teamData = allTeams[myTeam.teamId];
  const score = teamData ? (teamData.totalScore || 0) : 0;
  displayScore.textContent = score;

  // 順位計算
  const list = Object.values(allTeams);
  list.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const myRank = list.findIndex(t => t.teamId === myTeam.teamId) + 1;

  // 指定問題数までの表示制限チェック
  const qNum = (currentState ? currentState.currentQuestionIndex : 0) + 1;
  const limit = (currentState && currentState.rankDisplayLimit) ? currentState.rankDisplayLimit : 999;

  if (qNum > limit && currentState && currentState.currentScene !== 'final') {
    displayRank.textContent = `非公開`;
  } else {
    displayRank.textContent = myRank > 0 ? `${myRank} 位` : `- 位`;
  }
}

// --- 出題・回答シーン ---

function setupQuestionScene(q) {
  if (!q) return;

  // 新しい問題になったらリセット
  const questionKey = `q_answered_${q.id}`;
  const alreadyAnswered = sessionStorage.getItem(questionKey);

  // 1. 問題画像
  if (q.image && q.image.trim() !== '') {
    playerQuestionImage.src = q.image;
    playerImageContainer.style.display = 'block';
  } else {
    playerImageContainer.style.display = 'none';
  }

  // 2. 問題文
  playerQuestionText.textContent = q.question;

  // 3. 選択肢ボタン生成
  playerOptionsList.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.setAttribute('data-index', idx);

    let imgHtml = '';
    if (opt.image && opt.image.trim() !== '') {
      imgHtml = `<img src="${opt.image}" class="opt-mobile-thumb" alt="画像">`;
    }

    btn.innerHTML = `
      <div class="opt-circle-num">${idx + 1}</div>
      ${imgHtml}
      <div style="flex: 1;">${opt.text}</div>
    `;

    btn.addEventListener('click', () => {
      if (isAnswerLocked) return;
      selectOption(idx);
    });

    playerOptionsList.appendChild(btn);
  });

  if (alreadyAnswered) {
    // すでに回答済み
    isAnswerLocked = true;
    selectedOptionIndex = Number(alreadyAnswered);
    applyLockedState(selectedOptionIndex);
  } else {
    isAnswerLocked = false;
    selectedOptionIndex = null;
    btnLock.disabled = true;
    btnLock.className = 'btn-lock';
    btnLock.textContent = '🔒 ロックする';
    resetBodyLockedColor();
  }
}

function selectOption(index) {
  selectedOptionIndex = index;
  const buttons = playerOptionsList.querySelectorAll('.option-btn');
  buttons.forEach(b => {
    const idx = Number(b.getAttribute('data-index'));
    if (idx === index) {
      b.classList.add('selected');
    } else {
      b.classList.remove('selected');
    }
  });

  btnLock.disabled = false;
}

// ロックボタン押下処理
async function handleLockAnswer() {
  if (isAnswerLocked || selectedOptionIndex === null || !currentState) return;

  const currentQ = currentQuestions[currentState.currentQuestionIndex];
  if (!currentQ) return;

  isAnswerLocked = true;

  // 回答時間計算 (ミリ秒)
  const startTime = currentState.questionStartTime || Date.now();
  const answerTimeMs = Math.max(10, Date.now() - startTime);

  // 送信
  await quizStore.submitAnswer(
    currentQ.id,
    myTeam.teamId,
    myTeam.teamName,
    selectedOptionIndex,
    answerTimeMs
  );

  sessionStorage.setItem(`q_answered_${currentQ.id}`, selectedOptionIndex.toString());
  sessionStorage.setItem(`q_time_${currentQ.id}`, answerTimeMs.toString());

  // 要件:「ロックボタンを押すと背景が選択肢の色に応じて変化する」
  applyLockedState(selectedOptionIndex);
}

function applyLockedState(index) {
  resetBodyLockedColor();
  playerBody.classList.add(`locked-opt-${index}`);

  btnLock.classList.add('locked');
  btnLock.disabled = true;
  btnLock.textContent = `✓ 選択肢${index + 1}で確定済み`;

  // 選択肢ボタンも確定表示
  const buttons = playerOptionsList.querySelectorAll('.option-btn');
  buttons.forEach(b => {
    const idx = Number(b.getAttribute('data-index'));
    if (idx === index) {
      b.classList.add('selected');
    } else {
      b.style.opacity = '0.5';
    }
  });
}

function resetBodyLockedColor() {
  for (let i = 0; i < 6; i++) {
    playerBody.classList.remove(`locked-opt-${i}`);
  }
}

// --- 回答後（結果・順位）シーン ---

async function showResultScene(q) {
  resetBodyLockedColor();
  const resultsData = await quizStore.getQuestionResults(q.id);

  const teamResult = resultsData && resultsData.results ? resultsData.results[myTeam.teamId] : null;
  const isCorrect = teamResult ? teamResult.isCorrect : false;
  const points = teamResult ? teamResult.pointsAwarded : 0;
  const correctRate = resultsData ? resultsData.correctRate : 0;

  // 保存されていた回答時間
  const savedTime = sessionStorage.getItem(`q_time_${q.id}`);
  const answerSeconds = savedTime ? (Number(savedTime) / 1000).toFixed(2) : "--";

  // 正解・不正解バナー
  if (isCorrect) {
    verdictBanner.className = 'verdict-banner correct';
    verdictTitle.textContent = "🎉 正解！";
    verdictPoints.textContent = `+${points} 点 獲得！`;
  } else {
    verdictBanner.className = 'verdict-banner incorrect';
    verdictTitle.textContent = "✕ 不正解...";
    verdictPoints.textContent = `+0 点`;
  }

  statCorrectRate.textContent = `${correctRate}%`;
  statAnswerTime.textContent = `${answerSeconds}秒`;
  playerExplanationText.textContent = q.explanation || "解説はありません。";

  // 順位一覧テーブルの描画
  renderRankingsTable();
}

function renderRankingsTable() {
  const qNum = (currentState ? currentState.currentQuestionIndex : 0) + 1;
  const limit = (currentState && currentState.rankDisplayLimit) ? currentState.rankDisplayLimit : 999;

  // 設定から一定問題数を超えて非表示にする要件
  if (qNum > limit) {
    playerRankingSection.style.display = 'block';
    rankNotice.textContent = "(終盤のため非公開)";
    rankingTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8;">現在順位は伏せられています。最終結果をお楽しみに！</td></tr>`;
    return;
  }

  playerRankingSection.style.display = 'block';
  rankNotice.textContent = "";

  const teamList = Object.values(allTeams);
  teamList.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  rankingTableBody.innerHTML = '';
  let targetRowElement = null;

  teamList.forEach((t, idx) => {
    const rank = idx + 1;
    const isMe = t.teamId === myTeam.teamId;

    const tr = document.createElement('tr');
    if (isMe) {
      tr.className = 'my-team-row';
      targetRowElement = tr;
    }

    tr.innerHTML = `
      <td>${rank}位</td>
      <td>${escapeHtml(t.teamName)}${isMe ? ' (あなた)' : ''}</td>
      <td style="text-align: right; font-weight: 700;">${t.totalScore || 0}点</td>
    `;
    rankingTableBody.appendChild(tr);
  });

  // ページ全体ではなく、ランキング内だけを自チームの行へスクロールする
  if (targetRowElement && rankingScrollBox) {
    setTimeout(() => {
      const rowRect = targetRowElement.getBoundingClientRect();
      const boxRect = rankingScrollBox.getBoundingClientRect();
      const rowCenter = rowRect.top + rowRect.height / 2;
      const boxCenter = boxRect.top + boxRect.height / 2;
      const targetScrollTop = rankingScrollBox.scrollTop + rowCenter - boxCenter;

      rankingScrollBox.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }, 200);
  }
}

// --- 最終結果シーン ---

function renderFinalResults() {
  const teamList = Object.values(allTeams);
  teamList.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  const myRank = teamList.findIndex(t => t.teamId === myTeam.teamId) + 1;
  const myData = allTeams[myTeam.teamId];
  const score = myData ? (myData.totalScore || 0) : 0;

  finalMyRank.textContent = myRank > 0 ? `第 ${myRank} 位` : `- 位`;
  finalMyScore.textContent = `総獲得得点: ${score} 点`;

  finalTableBody.innerHTML = '';
  teamList.forEach((t, idx) => {
    const rank = idx + 1;
    const isMe = t.teamId === myTeam.teamId;

    const tr = document.createElement('tr');
    if (isMe) tr.className = 'my-team-row';

    tr.innerHTML = `
      <td>${rank}位</td>
      <td>${escapeHtml(t.teamName)}${isMe ? ' (あなた)' : ''}</td>
      <td style="text-align: right; font-weight: 700;">${t.totalScore || 0}点</td>
    `;
    finalTableBody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
