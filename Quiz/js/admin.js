/**
 * 管理者コントロールパネル ロジック (admin.js)
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5];
let currentQuestions = DEFAULT_QUESTIONS;
let teamMasterList = typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : [];
let currentState = null;
let allTeams = {};
let currentAnswers = {};
let selectedQIndex = 0;

// DOM要素
const lblGameStatus = document.getElementById('lblGameStatus');
const lblCurrentScene = document.getElementById('lblCurrentScene');
const lblTargetTeams = document.getElementById('lblTargetTeams');
const btnResetScores = document.getElementById('btnResetScores');

// ★ ワンボタン進行
const btnMainAdvance = document.getElementById('btnMainAdvance');
const btnMainRollback = document.getElementById('btnMainRollback');

const selectCurrentQuestion = document.getElementById('selectCurrentQuestion');
const btnPrevQuestion = document.getElementById('btnPrevQuestion');
const btnNextQuestion = document.getElementById('btnNextQuestion');
const btnToggleTimerMode = document.getElementById('btnToggleTimerMode');
const btnForceCloseAnswers = document.getElementById('btnForceCloseAnswers');
const timerDetailText = document.getElementById('timerDetailText');

// 問題編集フォーム
const questionEditForm = document.getElementById('questionEditForm');
const editQuestionText = document.getElementById('editQuestionText');
const editQuestionImage = document.getElementById('editQuestionImage');
const editHasTimeLimit = document.getElementById('editHasTimeLimit');
const editTimeLimitSeconds = document.getElementById('editTimeLimitSeconds');
const editCorrectAnswer = document.getElementById('editCorrectAnswer');
const editExplanation = document.getElementById('editExplanation');
const optionsEditorContainer = document.getElementById('optionsEditorContainer');
const btnAddOption = document.getElementById('btnAddOption');
const btnRemoveOption = document.getElementById('btnRemoveOption');
const btnAddNewQuestion = document.getElementById('btnAddNewQuestion');
const btnDeleteCurrentQuestion = document.getElementById('btnDeleteCurrentQuestion');

// 設定フォーム
const cfgTargetTeams = document.getElementById('cfgTargetTeams');
const cfgRankLimit = document.getElementById('cfgRankLimit');
const cfgBasePoint = document.getElementById('cfgBasePoint');
const cfgTop1 = document.getElementById('cfgTop1');
const cfgTop2 = document.getElementById('cfgTop2');
const cfgTop3 = document.getElementById('cfgTop3');
const cfgTopHalf = document.getElementById('cfgTopHalf');
const cfgBottomHalf = document.getElementById('cfgBottomHalf');
const cfgSoloBonus = document.getElementById('cfgSoloBonus');
const btnSaveConfig = document.getElementById('btnSaveConfig');

// モニター要素
const statConnectedTeams = document.getElementById('statConnectedTeams');
const statAnsweredTeams = document.getElementById('statAnsweredTeams');
const statUnansweredTeams = document.getElementById('statUnansweredTeams');
const teamMonitorBody = document.getElementById('teamMonitorBody');
const btnGenerateDummyTeams = document.getElementById('btnGenerateDummyTeams');
const btnSimulateAnswers = document.getElementById('btnSimulateAnswers');

// モーダル関連
const btnOpenFirebaseModal = document.getElementById('btnOpenFirebaseModal');
const btnCloseFirebaseModal = document.getElementById('btnCloseFirebaseModal');
const firebaseModal = document.getElementById('firebaseModal');
const firebaseConfigInput = document.getElementById('firebaseConfigInput');
const btnSaveFirebaseConfig = document.getElementById('btnSaveFirebaseConfig');
const btnResetFirebaseConfig = document.getElementById('btnResetFirebaseConfig');

const btnOpenJsonModal = document.getElementById('btnOpenJsonModal');
const btnCloseJsonModal = document.getElementById('btnCloseJsonModal');
const jsonModal = document.getElementById('jsonModal');
const jsonEditorArea = document.getElementById('jsonEditorArea');
const btnFormatJson = document.getElementById('btnFormatJson');
const btnApplyJson = document.getElementById('btnApplyJson');
const btnExportJson = document.getElementById('btnExportJson');

// 出題順モーダル要素
const btnOpenOrderModal = document.getElementById('btnOpenOrderModal');
const btnCloseOrderModal = document.getElementById('btnCloseOrderModal');
const orderModal = document.getElementById('orderModal');
const orderListContainer = document.getElementById('orderListContainer');
const btnSaveOrder = document.getElementById('btnSaveOrder');
const btnCancelOrder = document.getElementById('btnCancelOrder');

// チーム名定義モーダル要素
const btnOpenTeamListModal = document.getElementById('btnOpenTeamListModal');
const btnCloseTeamListModal = document.getElementById('btnCloseTeamListModal');
const teamListModal = document.getElementById('teamListModal');
const teamListTextArea = document.getElementById('teamListTextArea');
const btnGenerate60TeamsText = document.getElementById('btnGenerate60TeamsText');
const btnSaveTeamList = document.getElementById('btnSaveTeamList');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 問題購読
  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    populateQuestionDropdown();
    loadQuestionToEditor(selectedQIndex);
  });

  // 出題順購読
  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    populateQuestionDropdown();
    loadQuestionToEditor(selectedQIndex);
  });

  // チーム名リスト購読
  quizStore.subscribeTeamList(list => {
    teamMasterList = list || [];
  });

  // チーム購読
  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    updateMonitor();
  });

  // 状態購読
  quizStore.subscribeState(state => {
    currentState = state;
    selectedQIndex = state.currentQuestionIndex || 0;
    applyStateToUI();
  });

  setupEventListeners();
});

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
    loadQuestionToEditor(selectedQIndex);
    syncQuestionIndexToState(selectedQIndex);
  });

  btnPrevQuestion.addEventListener('click', () => {
    if (selectedQIndex > 0) {
      selectedQIndex--;
      selectCurrentQuestion.value = selectedQIndex;
      loadQuestionToEditor(selectedQIndex);
      syncQuestionIndexToState(selectedQIndex);
    }
  });

  btnNextQuestion.addEventListener('click', () => {
    if (selectedQIndex < currentQuestions.length - 1) {
      selectedQIndex++;
      selectCurrentQuestion.value = selectedQIndex;
      loadQuestionToEditor(selectedQIndex);
      syncQuestionIndexToState(selectedQIndex);
    }
  });

  // タイマー切替・即時締切
  btnToggleTimerMode.addEventListener('click', toggleTimerMode);
  btnForceCloseAnswers.addEventListener('click', () => changeScene('closed'));

  // 問題編集
  btnAddOption.addEventListener('click', addOptionField);
  btnRemoveOption.addEventListener('click', removeOptionField);
  btnAddNewQuestion.addEventListener('click', addNewQuestion);
  btnDeleteCurrentQuestion.addEventListener('click', deleteCurrentQuestion);
  questionEditForm.addEventListener('submit', handleSaveQuestionEdit);

  // 設定保存
  btnSaveConfig.addEventListener('click', handleSaveConfig);

  // テスト支援
  btnGenerateDummyTeams.addEventListener('click', handleGenerateDummyTeams);
  btnSimulateAnswers.addEventListener('click', handleSimulateAnswers);

  // Firebaseモーダル
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

  // JSONモーダル
  btnOpenJsonModal.addEventListener('click', () => {
    jsonEditorArea.value = JSON.stringify(currentQuestions, null, 2);
    jsonModal.classList.add('active');
  });
  btnCloseJsonModal.addEventListener('click', () => jsonModal.classList.remove('active'));
  btnFormatJson.addEventListener('click', () => {
    try {
      const obj = JSON.parse(jsonEditorArea.value);
      jsonEditorArea.value = JSON.stringify(obj, null, 2);
    } catch (e) {
      alert("JSONの構文エラー: " + e.message);
    }
  });
  btnApplyJson.addEventListener('click', handleApplyJson);
  btnExportJson.addEventListener('click', handleExportJson);
  // 出題順モーダル
  btnOpenOrderModal.addEventListener('click', openOrderModal);
  btnCloseOrderModal.addEventListener('click', () => orderModal.classList.remove('active'));
  btnCancelOrder.addEventListener('click', () => orderModal.classList.remove('active'));
  btnSaveOrder.addEventListener('click', handleSaveOrder);

  // チーム名定義モーダル
  btnOpenTeamListModal.addEventListener('click', openTeamListModal);
  btnCloseTeamListModal.addEventListener('click', () => teamListModal.classList.remove('active'));
  btnGenerate60TeamsText.addEventListener('click', () => {
    teamListTextArea.value = Array.from({ length: 60 }, (_, i) => `チーム ${i + 1}`).join('\n');
  });
  btnSaveTeamList.addEventListener('click', handleSaveTeamList);
}

// --- ★ ワンボタン進行コントロール ---

function updateMainAdvanceButton() {
  if (!btnMainAdvance) return;
  const state = currentState || quizStore.getDefaultState();
  const qNum = (state.currentQuestionIndex || 0) + 1;
  const totalQ = currentQuestions.length;

  if (state.status !== 'running') {
    btnMainAdvance.textContent = `▶ クイズ開始 (第1問 待機へ)`;
    btnMainAdvance.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    btnMainAdvance.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
    return;
  }

  switch (state.currentScene) {
    case 'waiting':
      btnMainAdvance.textContent = `📢 第 ${qNum} 問 出題・回答開始！`;
      btnMainAdvance.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
      btnMainAdvance.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
      break;

    case 'question':
      btnMainAdvance.textContent = `⏹ 第 ${qNum} 問 回答を締め切る`;
      btnMainAdvance.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      btnMainAdvance.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
      break;

    case 'closed':
      btnMainAdvance.textContent = `💡 第 ${qNum} 問 正解発表・解説！`;
      btnMainAdvance.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
      btnMainAdvance.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
      break;

    case 'result':
      if (qNum < totalQ) {
        btnMainAdvance.textContent = `▶ 次の問題へ (第 ${qNum + 1} 問)`;
        btnMainAdvance.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btnMainAdvance.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
      } else {
        btnMainAdvance.textContent = `🏆 最終結果発表へ！`;
        btnMainAdvance.style.background = 'linear-gradient(135deg, #eab308, #ca8a04)';
        btnMainAdvance.style.boxShadow = '0 6px 20px rgba(234, 179, 8, 0.5)';
      }
      break;

    case 'final':
      btnMainAdvance.textContent = `🏁 大会終了 (初期待機へ戻す)`;
      btnMainAdvance.style.background = 'linear-gradient(135deg, #64748b, #475569)';
      btnMainAdvance.style.boxShadow = 'none';
      break;
  }
}

async function handleMainAdvance() {
  const state = currentState || quizStore.getDefaultState();
  const qNum = (state.currentQuestionIndex || 0) + 1;
  const totalQ = currentQuestions.length;

  if (state.status !== 'running') {
    // クイズ開始
    await quizStore.updateState({
      status: 'running',
      currentScene: 'waiting',
      currentQuestionIndex: 0
    });
    selectedQIndex = 0;
    loadQuestionToEditor(0);
    return;
  }

  switch (state.currentScene) {
    case 'waiting':
      // 出題・回答開始
      await changeScene('question');
      break;

    case 'question':
      // 回答締切
      await changeScene('closed');
      break;

    case 'closed':
      // 正解発表・解説
      await changeScene('result');
      break;

    case 'result':
      if (qNum < totalQ) {
        // 次の問題へ (waiting画面をスキップ)
        selectedQIndex = (state.currentQuestionIndex || 0) + 1;
        selectCurrentQuestion.value = selectedQIndex;
        loadQuestionToEditor(selectedQIndex);
        await quizStore.updateState({
          currentQuestionIndex: selectedQIndex,
          currentScene: 'question'
        });
      } else {
        // 最終結果発表
        await changeScene('final');
      }
      break;

    case 'final':
      // 大会終了
      if (confirm("大会を終了し、初期状態（待機画面）に戻しますか？")) {
        await quizStore.updateState({
          status: 'stopped',
          currentScene: 'waiting',
          currentQuestionIndex: 0
        });
      }
      break;
  }
}

async function handleMainRollback() {
  const state = currentState || quizStore.getDefaultState();
  if (state.status !== 'running') {
    alert("クイズは停止中です。");
    return;
  }

  const sceneOrder = ['waiting', 'question', 'closed', 'result'];
  const curIdx = sceneOrder.indexOf(state.currentScene);

  if (state.currentScene === 'final') {
    await changeScene('result');
    return;
  }

  if (curIdx > 0) {
    // 同一問題内で1つ前のシーンへ
    await changeScene(sceneOrder[curIdx - 1]);
  } else if (curIdx === 0 && (state.currentQuestionIndex || 0) > 0) {
    // 前の問題の正解発表へ巻き戻し
    selectedQIndex = state.currentQuestionIndex - 1;
    selectCurrentQuestion.value = selectedQIndex;
    loadQuestionToEditor(selectedQIndex);
    await quizStore.updateState({
      currentQuestionIndex: selectedQIndex,
      currentScene: 'result'
    });
  } else {
    alert("これ以上前には戻せません。");
  }
}

// --- 状態のUI反映 ---

function applyStateToUI() {
  if (!currentState) return;

  const { status, currentScene, currentQuestionIndex, targetTeamCount, isTimerRunning } = currentState;

  // ゲームステータス
  if (status === 'running') {
    lblGameStatus.textContent = "進行中";
    lblGameStatus.className = "status-badge-live running";
  } else {
    lblGameStatus.textContent = "停止中";
    lblGameStatus.className = "status-badge-live stopped";
  }

  // ワンボタンの表示更新
  updateMainAdvanceButton();

  // 想定組数表示 (デフォルト100)
  lblTargetTeams.textContent = targetTeamCount || 100;
  cfgTargetTeams.value = targetTeamCount || 100;

  // シーンボタンのアクティブ状態
  document.querySelectorAll('.scene-btn').forEach(btn => {
    if (btn.getAttribute('data-scene') === currentScene) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const sceneLabels = {
    waiting: "1. 待機中",
    question: "2. 出題・回答受付中",
    closed: "3. 回答締切",
    result: "4. 正解発表・解説",
    final: "5. 最終結果発表"
  };
  lblCurrentScene.textContent = sceneLabels[currentScene] || currentScene;

  // タイマー状態
  if (isTimerRunning) {
    btnToggleTimerMode.textContent = "手動進行へ切替";
    timerDetailText.textContent = "タイマー稼働中 (自動カウントダウン)";
  } else {
    btnToggleTimerMode.textContent = "タイマー進行へ切替";
    timerDetailText.textContent = "手動進行中 (時間制限なし)";
  }

  // 設定値の反映
  if (currentState.scoreConfig) {
    const sc = currentState.scoreConfig;
    cfgBasePoint.value = sc.basePoint ?? DEFAULT_SCORE_CONFIG.basePoint;
    cfgTop1.value = sc.top1Bonus ?? DEFAULT_SCORE_CONFIG.top1Bonus;
    cfgTop2.value = sc.top2Bonus ?? DEFAULT_SCORE_CONFIG.top2Bonus;
    cfgTop3.value = sc.top3Bonus ?? DEFAULT_SCORE_CONFIG.top3Bonus;
    cfgTopHalf.value = sc.topHalfBonus ?? DEFAULT_SCORE_CONFIG.topHalfBonus;
    cfgBottomHalf.value = sc.bottomHalfBonus ?? DEFAULT_SCORE_CONFIG.bottomHalfBonus;
    cfgSoloBonus.value = sc.soloBonus ?? DEFAULT_SCORE_CONFIG.soloBonus;
  }
  if (currentState.rankDisplayLimit !== undefined) {
    cfgRankLimit.value = currentState.rankDisplayLimit;
  }

  // 現在の問題に対する回答を購読
  const currentQ = currentQuestions[currentQuestionIndex];
  if (currentQ) {
    quizStore.subscribeAnswers(currentQ.id, answers => {
      currentAnswers = answers || {};
      updateMonitor();
    });
  }
}

// --- クイズステータス＆シーン操作 ---

async function toggleGameStatus() {
  const newStatus = currentState && currentState.status === 'running' ? 'stopped' : 'running';
  await quizStore.updateState({ status: newStatus });
}

async function handleResetScores() {
  const msg = "【警告: 全データ完全初期化】\n\n参加チームデータ、回答ログ、獲得得点をすべて消去し、ゲーム進行も最初の待機画面にリセットします。\n参加者のスマートフォン画面もすべて初期チーム選択画面に戻ります。\n\n本当に実行しますか？";
  if (confirm(msg)) {
    await quizStore.resetAllData();
    selectedQIndex = 0;
    loadQuestionToEditor(0);
    alert("チームデータ・得点・回答ログをすべて初期化しました。");
  }
}

async function changeScene(scene) {
  const currentQ = currentQuestions[selectedQIndex];
  const updates = { currentScene: scene };

  if (scene === 'question') {
    updates.questionStartTime = Date.now();
    updates.isTimerRunning = currentQ ? (currentQ.hasTimeLimit !== false) : false;
  } else if (scene === 'result') {
    // 正解発表時に得点集計を実行
    if (currentQ) {
      await calculateAndApplyScores(currentQ);
    }
  }

  await quizStore.updateState(updates);
}

// リアルタイムタイマー切替
async function toggleTimerMode() {
  const newMode = !(currentState && currentState.isTimerRunning);
  await quizStore.updateState({ isTimerRunning: newMode });
}

// 得点計算と保存
async function calculateAndApplyScores(q) {
  const answersList = Object.values(currentAnswers);
  const scoreConfig = (currentState && currentState.scoreConfig) ? currentState.scoreConfig : DEFAULT_SCORE_CONFIG;

  const scoreResult = ScoreEngine.calculateQuestionScores(answersList, q.answer, scoreConfig);

  // 各チームの総得点に加算
  const updatedTeams = { ...allTeams };
  Object.keys(scoreResult.results).forEach(teamId => {
    const earned = scoreResult.results[teamId].pointsAwarded || 0;
    if (updatedTeams[teamId]) {
      updatedTeams[teamId] = {
        ...updatedTeams[teamId],
        totalScore: (updatedTeams[teamId].totalScore || 0) + earned
      };
    }
  });

  await quizStore.saveQuestionResults(q.id, scoreResult, updatedTeams);
}

async function syncQuestionIndexToState(index) {
  await quizStore.updateState({ currentQuestionIndex: index });
}

// --- 問題編集 (GUI) ---

function populateQuestionDropdown() {
  selectCurrentQuestion.innerHTML = '';
  currentQuestions.forEach((q, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `Q${idx + 1}: ${q.question.substring(0, 24)}...`;
    selectCurrentQuestion.appendChild(opt);
  });
  selectCurrentQuestion.value = selectedQIndex;
}

function loadQuestionToEditor(index) {
  const q = currentQuestions[index];
  if (!q) return;

  editQuestionText.value = q.question;
  editQuestionImage.value = q.image || '';
  editHasTimeLimit.checked = q.hasTimeLimit !== false;
  editTimeLimitSeconds.value = q.timeLimitSeconds || 15;
  editExplanation.value = q.explanation || '';

  // 選択肢レンダリング
  renderOptionInputs(q.options);
  editCorrectAnswer.value = q.answer || 0;
}

function renderOptionInputs(options) {
  optionsEditorContainer.innerHTML = '';
  options.forEach((opt, idx) => {
    const row = document.createElement('div');
    row.className = 'option-editor-item';
    row.setAttribute('data-idx', idx);

    row.innerHTML = `
      <span style="font-weight: 800; width: 24px;">${idx + 1}</span>
      <input type="text" class="form-input opt-text-input" value="${escapeHtml(opt.text)}" placeholder="選択肢テキスト" style="flex: 2;">
      <input type="text" class="form-input opt-img-input" value="${escapeHtml(opt.image || '')}" placeholder="画像パス(任意)" style="flex: 1;">
    `;
    optionsEditorContainer.appendChild(row);
  });

  // 正解セレクトの選択肢更新
  editCorrectAnswer.innerHTML = '';
  const colors = ["赤", "青", "黄", "緑", "水色", "紫"];
  options.forEach((_, idx) => {
    const o = document.createElement('option');
    o.value = idx;
    o.textContent = `選択肢 ${idx + 1} (${colors[idx] || ''})`;
    editCorrectAnswer.appendChild(o);
  });
}

function addOptionField() {
  const currentCount = optionsEditorContainer.querySelectorAll('.option-editor-item').length;
  if (currentCount >= 6) {
    alert("選択肢は最大6個までです。");
    return;
  }
  const q = currentQuestions[selectedQIndex];
  if (q) {
    q.options.push({ text: `選択肢${currentCount + 1}`, image: "" });
    renderOptionInputs(q.options);
  }
}

function removeOptionField() {
  const currentCount = optionsEditorContainer.querySelectorAll('.option-editor-item').length;
  if (currentCount <= 2) {
    alert("選択肢は最低2個必要です。");
    return;
  }
  const q = currentQuestions[selectedQIndex];
  if (q) {
    q.options.pop();
    renderOptionInputs(q.options);
  }
}

async function handleSaveQuestionEdit(e) {
  e.preventDefault();
  const q = currentQuestions[selectedQIndex];
  if (!q) return;

  const optTextInputs = optionsEditorContainer.querySelectorAll('.opt-text-input');
  const optImgInputs = optionsEditorContainer.querySelectorAll('.opt-img-input');

  const newOptions = [];
  optTextInputs.forEach((input, i) => {
    newOptions.push({
      text: input.value.trim() || `選択肢${i + 1}`,
      image: optImgInputs[i].value.trim()
    });
  });

  q.question = editQuestionText.value.trim();
  q.image = editQuestionImage.value.trim();
  q.hasTimeLimit = editHasTimeLimit.checked;
  q.timeLimitSeconds = Number(editTimeLimitSeconds.value) || 15;
  q.options = newOptions;
  q.answer = Number(editCorrectAnswer.value);
  q.explanation = editExplanation.value.trim();

  await quizStore.saveQuestions(currentQuestions);
  populateQuestionDropdown();
  alert("問題データを保存しました！");
}

async function addNewQuestion() {
  const newId = currentQuestions.length + 1;
  const newQ = {
    id: newId,
    question: `新しい問題 ${newId}`,
    image: "",
    options: [
      { text: "選択肢1", image: "" },
      { text: "選択肢2", image: "" },
      { text: "選択肢3", image: "" },
      { text: "選択肢4", image: "" }
    ],
    answer: 0,
    explanation: "",
    hasTimeLimit: true,
    timeLimitSeconds: 15
  };
  currentQuestions.push(newQ);
  selectedQIndex = currentQuestions.length - 1;
  await quizStore.saveQuestions(currentQuestions);
  populateQuestionDropdown();
  loadQuestionToEditor(selectedQIndex);
}

async function deleteCurrentQuestion() {
  if (currentQuestions.length <= 1) {
    alert("問題は最低1問必要です。");
    return;
  }
  if (confirm("この問題を削除しますか？")) {
    currentQuestions.splice(selectedQIndex, 1);
    selectedQIndex = Math.max(0, selectedQIndex - 1);
    await quizStore.saveQuestions(currentQuestions);
    populateQuestionDropdown();
    loadQuestionToEditor(selectedQIndex);
  }
}

// --- 大会設定の保存 ---

async function handleSaveConfig() {
  const numberOrDefault = (input, defaultValue) => {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : defaultValue;
  };
  const updates = {
    targetTeamCount: numberOrDefault(cfgTargetTeams, 100),
    rankDisplayLimit: numberOrDefault(cfgRankLimit, 999),
    scoreConfig: {
      basePoint: numberOrDefault(cfgBasePoint, DEFAULT_SCORE_CONFIG.basePoint),
      top1Bonus: numberOrDefault(cfgTop1, DEFAULT_SCORE_CONFIG.top1Bonus),
      top2Bonus: numberOrDefault(cfgTop2, DEFAULT_SCORE_CONFIG.top2Bonus),
      top3Bonus: numberOrDefault(cfgTop3, DEFAULT_SCORE_CONFIG.top3Bonus),
      topHalfBonus: numberOrDefault(cfgTopHalf, DEFAULT_SCORE_CONFIG.topHalfBonus),
      bottomHalfBonus: numberOrDefault(cfgBottomHalf, DEFAULT_SCORE_CONFIG.bottomHalfBonus),
      soloBonus: numberOrDefault(cfgSoloBonus, DEFAULT_SCORE_CONFIG.soloBonus)
    }
  };

  await quizStore.updateState(updates);
  alert("大会設定（人数・ボーナス）を保存しました！");
}

// --- リアルタイムモニター ---

function updateMonitor() {
  const teamsList = Object.values(allTeams);
  const totalTeams = teamsList.length;
  const answeredTotal = Object.keys(currentAnswers).length;

  statConnectedTeams.textContent = totalTeams;
  statAnsweredTeams.textContent = answeredTotal;
  statUnansweredTeams.textContent = Math.max(0, totalTeams - answeredTotal);

  teamMonitorBody.innerHTML = '';
  teamsList.forEach(t => {
    const ans = currentAnswers[t.teamId];
    const isAnswered = Boolean(ans);
    const optNum = isAnswered ? Number(ans.selectedOption) + 1 : "-";
    const timeSec = isAnswered && ans.answerTimeMs ? (ans.answerTimeMs / 1000).toFixed(2) + "s" : "-";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600;">${escapeHtml(t.teamName)}</td>
      <td style="color: ${isAnswered ? '#10b981' : '#94a3b8'}; font-weight: 700;">${optNum}</td>
      <td style="color: #94a3b8;">${timeSec}</td>
      <td style="text-align: right; font-weight: 700;">${t.totalScore || 0}</td>
    `;
    teamMonitorBody.appendChild(tr);
  });
}

// --- テスト支援 (ダミーチーム生成 & シミュレーション) ---

async function handleGenerateDummyTeams() {
  if (confirm("動作テスト用に60チームを一括登録しますか？")) {
    for (let i = 1; i <= 60; i++) {
      const id = `dummy_team_${i}`;
      const name = `チーム ${i}`;
      await quizStore.registerTeam(id, name);
    }
    alert("60チームの登録が完了しました！");
  }
}

async function handleSimulateAnswers() {
  const currentQ = currentQuestions[selectedQIndex];
  if (!currentQ) return;

  const teamsList = Object.values(allTeams);
  if (teamsList.length === 0) {
    alert("登録されているチームがありません。「60チーム生成」を実行してください。");
    return;
  }

  const numOptions = currentQ.options.length;
  const startTime = currentState ? currentState.questionStartTime || Date.now() : Date.now();

  for (const t of teamsList) {
    const randomOption = Math.floor(Math.random() * numOptions);
    const randomTime = Math.floor(Math.random() * 12000) + 1500; // 1.5s〜13.5s
    await quizStore.submitAnswer(currentQ.id, t.teamId, t.teamName, randomOption, randomTime);
  }
  alert(`${teamsList.length} チームの回答シミュレーションを完了しました！`);
}

// --- Firebase & JSON 設定モーダル ---

function handleSaveFirebaseConfig() {
  let raw = firebaseConfigInput.value.trim();
  try {
    // もし "const firebaseConfig = { ... };" のようなコードが貼られた場合、{ ... } を抽出
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      raw = match[0];
    }
    // JSのオブジェクト構文（キーがクォートなし等）を安全にパース
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // JSON.parseが失敗した場合はFunctionで安全に評価
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

async function handleApplyJson() {
  try {
    const parsed = JSON.parse(jsonEditorArea.value);
    if (!Array.isArray(parsed)) throw new Error("問題データは配列 [] である必要があります。");
    currentQuestions = parsed;
    await quizStore.saveQuestions(currentQuestions);
    populateQuestionDropdown();
    loadQuestionToEditor(0);
    jsonModal.classList.remove('active');
    alert("問題JSONを正常に反映しました！");
  } catch (e) {
    alert("JSON反映エラー: " + e.message);
  }
}

function handleExportJson() {
  const jsonStr = JSON.stringify(currentQuestions, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "quiz_questions.json";
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// --- 出題順 (Question Order) モーダル操作 ---

let tempOrder = [];

function openOrderModal() {
  tempOrder = [...currentQuestionOrder];
  // 登録問題で未登録のIDがあれば追加
  rawQuestions.forEach(q => {
    if (!tempOrder.includes(q.id)) {
      tempOrder.push(q.id);
    }
  });
  renderOrderList();
  orderModal.classList.add('active');
}

function renderOrderList() {
  orderListContainer.innerHTML = '';
  const qMap = {};
  rawQuestions.forEach(q => { qMap[q.id] = q; });

  tempOrder.forEach((id, idx) => {
    const q = qMap[id];
    const qText = q ? q.question : `(ID: ${id}) 削除された問題`;

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '10px 14px';
    row.style.marginBottom = '8px';
    row.style.background = '#0f172a';
    row.style.borderRadius = '8px';
    row.style.border = '1px solid #334155';

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
        <span style="font-weight: 800; color: #38bdf8; width: 36px;">#${idx + 1}</span>
        <span style="font-size: 0.8rem; background: #334155; padding: 2px 8px; border-radius: 4px;">ID:${id}</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${escapeHtml(qText)}</span>
      </div>
      <div style="display: flex; gap: 6px; flex-shrink: 0; margin-left: 12px;">
        <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" ${idx === 0 ? 'disabled' : ''} onclick="moveOrderItem(${idx}, -1)">↑ 上へ</button>
        <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" ${idx === tempOrder.length - 1 ? 'disabled' : ''} onclick="moveOrderItem(${idx}, 1)">↓ 下へ</button>
      </div>
    `;
    orderListContainer.appendChild(row);
  });
}

window.moveOrderItem = function(index, dir) {
  const targetIdx = index + dir;
  if (targetIdx < 0 || targetIdx >= tempOrder.length) return;
  const item = tempOrder.splice(index, 1)[0];
  tempOrder.splice(targetIdx, 0, item);
  renderOrderList();
};

async function handleSaveOrder() {
  currentQuestionOrder = [...tempOrder];
  await quizStore.saveQuestionOrder(currentQuestionOrder);
  currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
  populateQuestionDropdown();
  loadQuestionToEditor(selectedQIndex);
  orderModal.classList.remove('active');
  alert("問題の出題順を保存・適用しました！");
}

// --- 参加チーム名定義 モーダル操作 ---

function openTeamListModal() {
  teamListTextArea.value = teamMasterList.join('\n');
  teamListModal.classList.add('active');
}

async function handleSaveTeamList() {
  const lines = teamListTextArea.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    alert("チーム名を最低1つ入力してください。");
    return;
  }

  // 重複チェック
  const unique = Array.from(new Set(lines));
  teamMasterList = unique;
  await quizStore.saveTeamList(teamMasterList);
  teamListModal.classList.remove('active');
  alert(`${teamMasterList.length} チームの名前リストを保存しました！\n（参加者のスマホ画面に選択肢として反映されます）`);
}
