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

// DOM要素
const lblGameStatus = document.getElementById('lblGameStatus');
const lblCurrentScene = document.getElementById('lblCurrentScene');
const lblTargetTeams = document.getElementById('lblTargetTeams');
const btnResetScores = document.getElementById('btnResetScores');

// ★ ワンボタン進行
const btnMainAdvance = document.getElementById('btnMainAdvance');
const btnMainRollback = document.getElementById('btnMainRollback');

// 問題ナビゲーション・タイマー
const selectCurrentQuestion = document.getElementById('selectCurrentQuestion');
const btnPrevQuestion = document.getElementById('btnPrevQuestion');
const btnNextQuestion = document.getElementById('btnNextQuestion');
const btnToggleTimerMode = document.getElementById('btnToggleTimerMode');
const btnForceCloseAnswers = document.getElementById('btnForceCloseAnswers');
const timerDetailText = document.getElementById('timerDetailText');

// モニター要素
const statConnectedTeams = document.getElementById('statConnectedTeams');
const statAnsweredTeams = document.getElementById('statAnsweredTeams');
const statUnansweredTeams = document.getElementById('statUnansweredTeams');
const teamMonitorBody = document.getElementById('teamMonitorBody');
const selectMonitorSort = document.getElementById('selectMonitorSort');
const thSortId = document.getElementById('thSortId');
const thSortTime = document.getElementById('thSortTime');
const thSortScore = document.getElementById('thSortScore');

let monitorSortKey = 'id'; // 'id', 'time', 'score'
let monitorSortDir = 'asc'; // 'asc', 'desc'


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

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 問題購読
  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    populateQuestionDropdown();
  });

  // 出題順購読
  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    populateQuestionDropdown();
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

    // 現在の問題の回答購読
    const currentQ = currentQuestions[selectedQIndex] || currentQuestions[0];
    if (currentQ) {
      quizStore.subscribeAnswers(currentQ.id, answers => {
        currentAnswers = answers || {};
        updateMonitor();
      });
    }
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

  // タイマー切替・即時締切
  btnToggleTimerMode.addEventListener('click', toggleTimerMode);
  btnForceCloseAnswers.addEventListener('click', () => changeScene('closed'));

  // テスト・シミュレーション支援
  btnGenerateDummyTeams.addEventListener('click', handleGenerateDummyTeams);
  btnSimulateAnswers.addEventListener('click', handleSimulateAnswers);
  if (btnClearAnswersOnly) {
    btnClearAnswersOnly.addEventListener('click', handleClearAnswersOnly);
  }

  // モニターソート制御
  if (selectMonitorSort) {
    // Initialize dropdown to current sort setting
    const initialValue = `${monitorSortKey}-${monitorSortDir}`;
    selectMonitorSort.value = initialValue;
    // Apply initial sorting
    updateMonitor();
    // Handle changes
    selectMonitorSort.addEventListener('change', e => {
      const [key, dir] = e.target.value.split('-');
      monitorSortKey = key;
      monitorSortDir = dir;
      updateMonitor();
    });
  }

  // Header sort click handlers
  if (thSortId) { thSortId.addEventListener('click', () => toggleHeaderSort('id')); }
  if (thSortTime) { thSortTime.addEventListener('click', () => toggleHeaderSort('time')); }
  if (thSortScore) { thSortScore.addEventListener('click', () => toggleHeaderSort('score')); }

  // Admin ranking button listener (broadcast to presentation and player)
  const rankingChannel = new BroadcastChannel('quiz-ranking');
  const btnNextRankAdmin = document.getElementById('btnNextRankAdmin');
  if (btnNextRankAdmin) {
    btnNextRankAdmin.addEventListener('click', () => {
      rankingChannel.postMessage({ type: 'nextRank' });
    });
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
}

// UI状態の反映
function applyStateToUI() {
  if (!currentState) return;

  const { status, currentScene, currentQuestionIndex, targetTeamCount, isTimerRunning } = currentState;

  // ステータスバッジ
  lblGameStatus.textContent = status === 'running' ? "進行中" : "停止中";
  lblGameStatus.className = `status-badge-live ${status}`;

  // 想定チーム数
  lblTargetTeams.textContent = targetTeamCount || 100;

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

  // タイマー詳細テキスト
  const q = currentQuestions[currentQuestionIndex] || currentQuestions[0];
  const sec = (q && q.timeLimitSeconds) ? q.timeLimitSeconds : 15;
  const timerOn = (q && q.hasTimeLimit !== false) && (isTimerRunning !== false);
  timerDetailText.textContent = timerOn
    ? `制限時間: ${sec}秒 (タイマー稼働中)`
    : `タイマー停止 (手動進行モード)`;
  btnToggleTimerMode.textContent = timerOn ? "手動進行へ切替" : "タイマー稼働へ切替";

  // メイン進行ボタンのラベル更新
  updateMainButtonText();
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
  const updates = { currentScene: scene };

  if (scene === 'question') {
    updates.questionStartTime = Date.now();
    updates.status = 'running';
  } else if (scene === 'waiting') {
    updates.status = 'stopped';
  }

  await quizStore.updateState(updates);

  // 正解発表シーンに移行した場合、得点計算を実行
  if (scene === 'result') {
    const currentQ = currentQuestions[selectedQIndex];
    if (currentQ) {
      await calculateAndApplyScores(currentQ);
    }
  }
}

// 完全初期化
async function handleResetScores() {
  const msg = "⚠️ 【警告: 全データ完全初期化】\n\n登録チーム、回答ログ、獲得得点をすべて消去し、ゲーム進行を初期状態にリセットします。\n参加者のスマートフォン画面も初期チーム選択画面に戻ります。\n\n本当に実行しますか？";
  if (confirm(msg)) {
    try {
      await quizStore.resetAllData();
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

// --- リアルタイムモニター ---

function toggleHeaderSort(key) {
  if (monitorSortKey === key) {
    monitorSortDir = monitorSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    monitorSortKey = key;
    monitorSortDir = key === 'score' ? 'desc' : 'asc';
  }
  if (selectMonitorSort) {
    selectMonitorSort.value = `${monitorSortKey}-${monitorSortDir}`;
  }
  updateMonitor();
}

function updateMonitor() {
  const teamsList = Object.values(allTeams);
  const totalTeams = teamsList.length;
  const answeredTotal = Object.keys(currentAnswers).length;

  if (statConnectedTeams) statConnectedTeams.textContent = totalTeams;
  if (statAnsweredTeams) statAnsweredTeams.textContent = answeredTotal;
  if (statUnansweredTeams) statUnansweredTeams.textContent = Math.max(0, totalTeams - answeredTotal);

  // ヘッダーのソートインジケーター更新
  [thSortId, thSortTime, thSortScore].forEach(th => {
    if (!th) return;
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.getAttribute('data-sort') === monitorSortKey) {
      th.classList.add(monitorSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  // 現在の問題の正解インデックス
  const currentQ = currentQuestions[selectedQIndex];
  const correctAnswerIdx = currentQ ? Number(currentQ.answer) : null;

  // ソート処理
  teamsList.sort((a, b) => {
    const ansA = currentAnswers[a.teamId];
    const ansB = currentAnswers[b.teamId];

    if (monitorSortKey === 'id') {
      const res = (a.teamId || '').localeCompare(b.teamId || '', undefined, { numeric: true, sensitivity: 'base' });
      return monitorSortDir === 'asc' ? res : -res;
    } else if (monitorSortKey === 'time') {
      const timeA = (ansA && ansA.answerTimeMs !== undefined) ? ansA.answerTimeMs : null;
      const timeB = (ansB && ansB.answerTimeMs !== undefined) ? ansB.answerTimeMs : null;
      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return 1;
      if (timeB === null) return -1;
      const diff = timeA - timeB;
      return monitorSortDir === 'asc' ? diff : -diff;
    } else if (monitorSortKey === 'score') {
      const diff = (a.totalScore || 0) - (b.totalScore || 0);
      return monitorSortDir === 'asc' ? diff : -diff;
    }
    return 0;
  });

  if (!teamMonitorBody) return;
  teamMonitorBody.innerHTML = '';

  teamsList.forEach(t => {
    const ans = currentAnswers[t.teamId];
    const isAnswered = Boolean(ans);
    const selectedOpt = isAnswered ? Number(ans.selectedOption) : null;
    const isCorrect = isAnswered && (correctAnswerIdx !== null) && (selectedOpt === correctAnswerIdx);
    const timeSec = isAnswered && ans.answerTimeMs ? (ans.answerTimeMs / 1000).toFixed(2) + "s" : "-";

    let rowClass = "row-unanswered";
    let badgeHtml = `<span class="badge-ans unanswered">-</span>`;

    if (isAnswered) {
      if (isCorrect) {
        rowClass = "row-correct";
        badgeHtml = `<span class="badge-ans correct">⭕ ${selectedOpt + 1}</span>`;
      } else {
        rowClass = "row-incorrect";
        badgeHtml = `<span class="badge-ans incorrect">❌ ${selectedOpt + 1}</span>`;
      }
    }

    const tr = document.createElement('tr');
    tr.className = rowClass;
    tr.innerHTML = `
      <td style="font-size: 0.78rem; color: #64748b; font-family: monospace;">${escapeHtml(t.teamId)}</td>
      <td style="font-weight: 700; color: #0f172a;">${escapeHtml(t.teamName)}</td>
      <td style="text-align: center;">${badgeHtml}</td>
      <td style="color: #475569; font-weight: 700;">${timeSec}</td>
      <td style="text-align: right; font-weight: 800; color: #2563eb;">${t.totalScore || 0}</td>
    `;
    teamMonitorBody.appendChild(tr);
  });
}

// --- テスト支援 (指定チーム数のダミー生成 & シミュレーション) ---

async function handleGenerateDummyTeams() {
  const count = parseInt(simTeamCount.value, 10) || 10;
  if (count <= 0 || count > 500) {
    alert("チーム数は 1〜500 の範囲で指定してください。");
    return;
  }

  if (confirm(`動作テスト用に ${count} チームを一括登録しますか？`)) {
    for (let i = 1; i <= count; i++) {
      const id = `dummy_team_${i}`;
      const name = `チーム ${i}`;
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

  const numOptions = currentQ.options.length;

  for (const t of teamsList) {
    const randomOption = Math.floor(Math.random() * numOptions);
    const randomTime = Math.floor(Math.random() * 12000) + 1500; // 1.5s〜13.5s
    await quizStore.submitAnswer(currentQ.id, t.teamId, t.teamName, randomOption, randomTime);
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
