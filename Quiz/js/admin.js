/**
 * 管理者コントロールパネル ロジック (admin.js)
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5];
let currentQuestions = DEFAULT_QUESTIONS;
let currentState = null;
let allTeams = {};
let currentAnswers = {};
let selectedQIndex = 0;
let rankingChannel = null;
let subscribedAnswerQuestionId = null;
let unsubscribeCurrentAnswers = null;
let lastSimulationTargetCount = null;

// DOM要素
const lblGameStatus = document.getElementById('lblGameStatus');
const lblCurrentScene = document.getElementById('lblCurrentScene');
const lblTargetTeams = document.getElementById('lblTargetTeams');
const btnResetScores = document.getElementById('btnResetScores');

// ★ ワンボタン進行
const btnMainAdvance = document.getElementById('btnMainAdvance');
const btnMainRollback = document.getElementById('btnMainRollback');

// 問題ナビゲーション
const selectCurrentQuestion = document.getElementById('selectCurrentQuestion');
const btnPrevQuestion = document.getElementById('btnPrevQuestion');
const btnNextQuestion = document.getElementById('btnNextQuestion');

// モニター要素
const statConnectedTeams = document.getElementById('statConnectedTeams');
const statAnsweredTeams = document.getElementById('statAnsweredTeams');
const statUnansweredTeams = document.getElementById('statUnansweredTeams');
const statManuallyGradedTeams = document.getElementById('statManuallyGradedTeams');


// シミュレーション
const simTeamCount = document.getElementById('simTeamCount');
const btnGenerateDummyTeams = document.getElementById('btnGenerateDummyTeams');
const btnSimulateAnswers = document.getElementById('btnSimulateAnswers');
const btnClearAnswersOnly = document.getElementById('btnClearAnswersOnly');

// Firebase設定モーダル
const btnOpenFirebaseModal = document.getElementById('btnOpenFirebaseModal');
const btnCloseFirebaseModal = document.getElementById('btnCloseFirebaseModal');
const firebaseModal = document.getElementById('firebaseModal');
const firebaseConfigInput = document.getElementById('firebaseConfigInput');
const btnSaveFirebaseConfig = document.getElementById('btnSaveFirebaseConfig');
const btnResetFirebaseConfig = document.getElementById('btnResetFirebaseConfig');
const btnTogglePlayerQr = document.getElementById('btnTogglePlayerQr');
const presentationPreviewFrameContainer = document.getElementById('presentationPreviewFrameContainer');
const presentationPreviewFrame = document.getElementById('presentationPreviewFrame');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setupPresentationPreviewScaling();

  // 問題購読
  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    populateQuestionDropdown();
    subscribeToSelectedQuestionAnswers();
  });

  // 出題順購読
  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    populateQuestionDropdown();
    subscribeToSelectedQuestionAnswers();
  });

  // チーム購読
  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    updateMonitor();
  });

  // 状態購読
  quizStore.subscribeState(state => {
    const previousScene = currentState && currentState.currentScene;
    currentState = state;
    selectedQIndex = state.currentQuestionIndex || 0;
    applyStateToUI();
    if (state.currentScene === 'final' && previousScene !== 'final' && rankingChannel) {
      rankingChannel.postMessage({ type: 'getRevealStatus' });
    }

    subscribeToSelectedQuestionAnswers();
  });

  setupEventListeners();
});

function setupPresentationPreviewScaling() {
  const scalePreview = () => {
    const scale = presentationPreviewFrameContainer.clientWidth / 1920;
    presentationPreviewFrame.style.transform = `scale(${scale})`;
  };

  scalePreview();
  new ResizeObserver(scalePreview).observe(presentationPreviewFrameContainer);
}

function setupEventListeners() {
  // ★ ワンボタン進行
  btnMainAdvance.addEventListener('click', handleMainAdvance);
  btnMainRollback.addEventListener('click', handleMainRollback);

  // 完全初期化
  btnResetScores.addEventListener('click', handleResetScores);

  // シーン切替ボタン
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const scene = btn.getAttribute('data-scene');
      changeScene(scene);
    });
  });

  // 問題移動
  selectCurrentQuestion.addEventListener('change', e => {
    selectedQIndex = Number(e.target.value);
    syncQuestionIndexToState(selectedQIndex);
  });

  btnPrevQuestion.addEventListener('click', () => {
    if (selectedQIndex > 0) {
      selectedQIndex--;
      selectCurrentQuestion.value = selectedQIndex;
      syncQuestionIndexToState(selectedQIndex);
    }
  });

  btnNextQuestion.addEventListener('click', () => {
    if (selectedQIndex < currentQuestions.length - 1) {
      selectedQIndex++;
      selectCurrentQuestion.value = selectedQIndex;
      syncQuestionIndexToState(selectedQIndex);
    }
  });

  // テスト・シミュレーション支援
  btnGenerateDummyTeams.addEventListener('click', handleGenerateDummyTeams);
  btnSimulateAnswers.addEventListener('click', handleSimulateAnswers);
  if (btnClearAnswersOnly) {
    btnClearAnswersOnly.addEventListener('click', handleClearAnswersOnly);
  }

  // Admin ranking button listener (broadcast to presentation and player)
  rankingChannel = new BroadcastChannel('quiz-ranking');
  rankingChannel.addEventListener('message', event => {
    if (event.data && event.data.type === 'revealStatus') {
      updateFinalRankingControls(event.data);
    }
  });
  document.getElementById('btnRevealNextRankAdmin').addEventListener('click', () => sendRankingCommand('revealNext'));
  document.getElementById('btnAutoRevealRanksAdmin').addEventListener('click', () => sendRankingCommand('toggleAutoReveal'));
  document.getElementById('btnToggleFullRankingAdmin').addEventListener('click', () => sendRankingCommand('toggleFullRanking'));
  document.getElementById('btnResetRevealAdmin').addEventListener('click', () => sendRankingCommand('resetReveal'));
  if (currentState && currentState.currentScene === 'final') {
    rankingChannel.postMessage({ type: 'getRevealStatus' });
  }

  // Firebaseモーダル
  if (btnOpenFirebaseModal) {
    btnOpenFirebaseModal.addEventListener('click', () => {
      firebaseConfigInput.value = JSON.stringify(FirebaseManager.getConfig(), null, 2);
      firebaseModal.classList.add('active');
    });
    btnCloseFirebaseModal.addEventListener('click', () => firebaseModal.classList.remove('active'));
    btnSaveFirebaseConfig.addEventListener('click', handleSaveFirebaseConfig);
    btnResetFirebaseConfig.addEventListener('click', () => {
      if (confirm("Firebase設定をリセットしますか？")) {
        FirebaseManager.resetConfig();
        location.reload();
      }
    });
    firebaseModal.addEventListener('click', e => {
      if (e.target === firebaseModal) firebaseModal.classList.remove('active');
    });
  }

  btnTogglePlayerQr.addEventListener('click', () => {
    const channel = new BroadcastChannel('quiz-presentation');
    channel.postMessage({ type: 'showPlayerQr' });
    channel.close();
    window.open('presentation.html?showPlayerQr=1', 'quizPresentation');
  });
}

// UI状態の反映
function applyStateToUI() {
  if (!currentState) return;

  const { status, currentScene, currentQuestionIndex, targetTeamCount } = currentState;
  document.getElementById('finalRankingControls').style.display = currentScene === 'final' ? 'flex' : 'none';

  // ステータスバッジ
  lblGameStatus.textContent = status === 'running' ? "進行中" : "停止中";
  lblGameStatus.className = `status-badge-live ${status}`;

  // 想定チーム数
  const expectedTeamCount = targetTeamCount || 100;
  lblTargetTeams.textContent = expectedTeamCount;
  if (simTeamCount && lastSimulationTargetCount !== expectedTeamCount) {
    simTeamCount.value = expectedTeamCount;
    lastSimulationTargetCount = expectedTeamCount;
  }

  // シーン名ラベル
  const sceneMap = {
    waiting: "待機中 (指示待ち)",
    question: "出題中 (回答受付中)",
    closed: "回答締切",
    result: "正解発表・解説",
    final: "最終結果発表"
  };
  lblCurrentScene.textContent = sceneMap[currentScene] || currentScene;

  // シーンボタンスタイル
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-scene') === currentScene);
  });

  // 問題セレクトボックス
  if (selectCurrentQuestion.value !== String(currentQuestionIndex)) {
    selectCurrentQuestion.value = currentQuestionIndex;
  }

  // メイン進行ボタンのラベル更新
  updateMainButtonText();
}

function sendRankingCommand(type) {
  if (rankingChannel) rankingChannel.postMessage({ type });
}

function updateFinalRankingControls(status) {
  const nextButton = document.getElementById('btnRevealNextRankAdmin');
  nextButton.textContent = status.complete
    ? '🎉 全順位発表完了！'
    : `▶ ${status.nextLabel || '次の順位'}を発表する`;
  nextButton.disabled = Boolean(status.complete);
  document.getElementById('btnAutoRevealRanksAdmin').textContent = status.autoPlaying
    ? '⏸️ 一時停止'
    : '⏩ 1位まで自動再生';
  document.getElementById('btnToggleFullRankingAdmin').textContent = status.isShowingFullRanking
    ? '🏆 順位発表カードに戻る'
    : '📋 全体ランキング表';
}

function updateMainButtonText() {
  if (!currentState) return;
  const { currentScene, currentQuestionIndex } = currentState;
  const totalQ = currentQuestions.length;
  const qNum = currentQuestionIndex + 1;

  let label = "▶ クイズ開始 (第1問へ)";
  let colorClass = "btn-main-advance";

  switch (currentScene) {
    case 'waiting':
      label = `▶ 第 ${qNum} 問 を出題する`;
      break;
    case 'question':
      label = `⏹️ 回答を締め切る (第 ${qNum} 問)`;
      break;
    case 'closed':
      label = `✨ 正解を発表する (第 ${qNum} 問)`;
      break;
    case 'result':
      if (qNum < totalQ) {
        label = `⏩ 次の問題へ (第 ${qNum + 1} 問 出題)`;
      } else {
        label = `🏆 最終結果発表へ進む`;
      }
      break;
    case 'final':
      label = `🎉 クイズ大会 終了`;
      break;
  }

  btnMainAdvance.textContent = label;
}

// ★ ワンボタンメイン進行
async function handleMainAdvance() {
  if (!currentState) return;
  const { currentScene, currentQuestionIndex } = currentState;
  const totalQ = currentQuestions.length;

  switch (currentScene) {
    case 'waiting':
      await changeScene('question');
      break;

    case 'question':
      await changeScene('closed');
      break;

    case 'closed':
      await changeScene('result');
      break;

    case 'result':
      if (currentQuestionIndex < totalQ - 1) {
        const nextIdx = currentQuestionIndex + 1;
        selectedQIndex = nextIdx;
        selectCurrentQuestion.value = nextIdx;
        await quizStore.updateState({
          currentQuestionIndex: nextIdx,
          currentScene: 'question',
          questionStartTime: Date.now()
        });
      } else {
        await changeScene('final');
      }
      break;

    case 'final':
      alert("全問題が終了しました！お疲れ様でした。");
      break;
  }
}

// ★ 1つ戻すボタン
async function handleMainRollback() {
  if (!currentState) return;
  const { currentScene, currentQuestionIndex } = currentState;

  if (currentScene === 'final') {
    await changeScene('result');
  } else if (currentScene === 'result') {
    await changeScene('closed');
  } else if (currentScene === 'closed') {
    await changeScene('question');
  } else if (currentScene === 'question') {
    if (confirm("出題をキャンセルして待機状態に戻しますか？")) {
      await changeScene('waiting');
    }
  } else if (currentScene === 'waiting' && currentQuestionIndex > 0) {
    const prevIdx = currentQuestionIndex - 1;
    selectedQIndex = prevIdx;
    selectCurrentQuestion.value = prevIdx;
    await quizStore.updateState({
      currentQuestionIndex: prevIdx,
      currentScene: 'result'
    });
  }
}

// シーン変更
async function changeScene(scene) {
  // 正解発表シーンに移行する場合、クライアントの受信遅延・フライング誤判定を防ぐため
  // 先に得点計算とFirebase/キャッシュへの保存を確実に完了させる
  if (scene === 'result') {
    const currentQ = currentQuestions[selectedQIndex];
    if (currentQ) {
      await calculateAndApplyScores(currentQ);
    }
  }

  const updates = { currentScene: scene };

  if (scene === 'final') {
    updates.finalResultsRevealed = false;
  }

  if (scene === 'question') {
    updates.questionStartTime = Date.now();
    updates.status = 'running';
  } else if (scene === 'waiting') {
    updates.status = 'stopped';
  }

  await quizStore.updateState(updates);
}

// 完全初期化
async function handleResetScores() {
  const msg = "⚠️ 【警告: 全データ完全初期化】\n\n登録チーム、回答ログ、獲得得点をすべて消去し、ゲーム進行を初期状態にリセットします。\n参加者のスマートフォン画面も初期チーム選択画面に戻ります。\n\n本当に実行しますか？";
  if (confirm(msg)) {
    try {
      await quizStore.resetAllData(currentState && currentState.scoreConfig);
      selectedQIndex = 0;
      if (selectCurrentQuestion) selectCurrentQuestion.value = 0;
      allTeams = {};
      currentAnswers = {};
      updateMonitor();
      alert("チームデータ・得点・回答ログをすべて初期化しました。");
    } catch (e) {
      console.error("初期化エラー:", e);
      alert("初期化中にエラーが発生しました: " + e.message);
    }
  }
}

// 得点計算と保存
async function calculateAndApplyScores(q) {
  const answersList = Object.values(currentAnswers);
  const scoreConfig = (currentState && currentState.scoreConfig) ? currentState.scoreConfig : DEFAULT_SCORE_CONFIG;

  const scoreResult = ScoreEngine.calculateQuestionScores(answersList, q.answer, scoreConfig, getPointMultiplier(q));
  const previousResults = await quizStore.getQuestionResults(q.id);

  // 再集計時は以前のこの問題の得点との差分だけを反映する
  const updatedTeams = { ...allTeams };
  Object.keys(scoreResult.results).forEach(teamId => {
    const earned = scoreResult.results[teamId].pointsAwarded || 0;
    const previousEarned = Number(previousResults && previousResults.results
      && previousResults.results[teamId] && previousResults.results[teamId].pointsAwarded) || 0;
    if (updatedTeams[teamId]) {
      updatedTeams[teamId] = {
        ...updatedTeams[teamId],
        totalScore: Math.max(0, (updatedTeams[teamId].totalScore || 0) + earned - previousEarned)
      };
    }
  });

  await quizStore.saveQuestionResults(q.id, scoreResult, updatedTeams);
}

async function syncQuestionIndexToState(index) {
  await quizStore.updateState({ currentQuestionIndex: index });
}

function populateQuestionDropdown() {
  selectCurrentQuestion.innerHTML = '';
  currentQuestions.forEach((q, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    const multiplier = getPointMultiplier(q);
    const badge = multiplier > 1 ? ` [${ScoreEngine.getMultiplierLabel(multiplier)}]` : '';
    opt.textContent = `Q${idx + 1}${badge}: ${q.question.substring(0, 22)}...`;
    selectCurrentQuestion.appendChild(opt);
  });
  selectCurrentQuestion.value = selectedQIndex;
}

// --- リアルタイムモニター ---

function updateMonitor() {
  const totalTeams = Object.keys(allTeams).length;
  const answeredTotal = Object.keys(currentAnswers).length;

  if (statConnectedTeams) statConnectedTeams.textContent = totalTeams;
  if (statAnsweredTeams) statAnsweredTeams.textContent = answeredTotal;
  if (statUnansweredTeams) statUnansweredTeams.textContent = Math.max(0, totalTeams - answeredTotal);
  if (statManuallyGradedTeams) {
    const activeQuestion = currentQuestions[selectedQIndex];
    statManuallyGradedTeams.textContent = activeQuestion && activeQuestion.answerType === 'text'
      ? Object.values(currentAnswers)
        .filter(answer => typeof answer.manualIsCorrect === 'boolean' && answer.gradeSource !== 'automatic').length
      : 0;
  }
}

function subscribeToSelectedQuestionAnswers() {
  const currentQ = currentQuestions[selectedQIndex] || currentQuestions[0];
  if (!currentQ || currentQ.id === subscribedAnswerQuestionId) return;
  if (unsubscribeCurrentAnswers) unsubscribeCurrentAnswers();
  subscribedAnswerQuestionId = currentQ.id;
  currentAnswers = {};
  unsubscribeCurrentAnswers = quizStore.subscribeAnswers(currentQ.id, answers => {
    currentAnswers = answers || {};
    updateMonitor();
  });
}

// --- テスト支援 (指定チーム数のダミー生成 & シミュレーション) ---

async function handleGenerateDummyTeams() {
  const count = parseInt(simTeamCount.value, 10) || 100;
  if (count <= 0 || count > 500) {
    alert("チーム数は 1〜500 の範囲で指定してください。");
    return;
  }

  if (confirm(`動作テスト用に ${count} チームを一括登録しますか？`)) {
    for (let i = 1; i <= count; i++) {
      const id = `dummy_team_${i}`;
      const name = `${i} チーム ${i}`;
      await quizStore.registerTeam(id, name);
    }
    alert(`${count} チームの登録が完了しました！`);
  }
}

async function handleSimulateAnswers() {
  const currentQ = currentQuestions[selectedQIndex];
  if (!currentQ) return;

  const teamsList = Object.values(allTeams);
  if (teamsList.length === 0) {
    alert("登録されているチームがありません。「指定チーム数でダミー生成」を実行してください。");
    return;
  }

  const numOptions = (currentQ.options || []).length;

  for (const t of teamsList) {
    const randomOption = currentQ.answerType === 'text'
      ? (Math.random() < 0.5 && String(currentQ.answer || '').length > 0 ? currentQ.answer : '誤答')
      : Math.floor(Math.random() * numOptions);
    const randomTime = Math.floor(Math.random() * 12000) + 1500; // 1.5s〜13.5s
    await quizStore.submitAnswer(currentQ.id, t.teamId, t.teamName, randomOption, randomTime, currentQ.answerType);
  }
  alert(`${teamsList.length} チームの回答シミュレーションを完了しました！`);
}

async function handleClearAnswersOnly() {
  const currentQ = currentQuestions[selectedQIndex];
  if (!currentQ) return;

  if (confirm(`現在選択中の問題 (Q${selectedQIndex + 1}) の回答のみをクリアしますか？`)) {
    await quizStore.clearAnswersForQuestion(currentQ.id);
    currentAnswers = {};
    updateMonitor();
    alert("回答をクリアしました。");
  }
}

// Firebaseモーダル
function handleSaveFirebaseConfig() {
  let raw = firebaseConfigInput.value.trim();
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) raw = match[0];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = (new Function(`return (${raw});`))();
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("オブジェクト形式ではありません。");
    }
    FirebaseManager.saveConfig(parsed);
    alert("Firebase設定を保存しました。再接続のためページをリロードします。");
    location.reload();
  } catch (e) {
    alert("設定の読み取りに失敗しました: " + e.message);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
