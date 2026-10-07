/**
 * 問題データ管理 & 大会設定ロジック (setting.js)
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5];
let currentQuestions = DEFAULT_QUESTIONS;
let teamMasterList = typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : [];
let currentState = null;
let selectedQIndex = 0;

// 問題選択・ナビゲーション
const selectCurrentQuestion = document.getElementById('selectCurrentQuestion');
const btnPrevQuestion = document.getElementById('btnPrevQuestion');
const btnNextQuestion = document.getElementById('btnNextQuestion');

// 問題編集フォーム
const questionEditForm = document.getElementById('questionEditForm');
const editQuestionText = document.getElementById('editQuestionText');
const editQuestionImage = document.getElementById('editQuestionImage');
const editAnswerType = document.getElementById('editAnswerType');
const editCorrectAnswer = document.getElementById('editCorrectAnswer');
const editTextAnswer = document.getElementById('editTextAnswer');
const editChoiceAnswerGroup = document.getElementById('editChoiceAnswerGroup');
const editTextAnswerGroup = document.getElementById('editTextAnswerGroup');
const editPointMultiplier = document.getElementById('editPointMultiplier');
const editExplanation = document.getElementById('editExplanation');
const optionsEditorContainer = document.getElementById('optionsEditorContainer');
const optionsEditorGroup = document.getElementById('optionsEditorGroup');
const btnAddOption = document.getElementById('btnAddOption');
const btnRemoveOption = document.getElementById('btnRemoveOption');
const btnAddNewQuestion = document.getElementById('btnAddNewQuestion');
const btnDeleteCurrentQuestion = document.getElementById('btnDeleteCurrentQuestion');

// 設定フォーム
const cfgTargetTeams = document.getElementById('cfgTargetTeams');
const cfgRankLimit = document.getElementById('cfgRankLimit');
const cfgMaxPoint = document.getElementById('cfgMaxPoint');
const cfgDecrement = document.getElementById('cfgDecrement');
const cfgMinPoint = document.getElementById('cfgMinPoint');
const btnSaveConfig = document.getElementById('btnSaveConfig');

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
const btnImportJsonFile = document.getElementById('btnImportJsonFile');
const jsonFileInput = document.getElementById('jsonFileInput');
const jsonFileName = document.getElementById('jsonFileName');

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

  // 状態購読（設定値の初期ロード）
  quizStore.subscribeState(state => {
    currentState = state;
    if (state) {
      if (state.targetTeamCount) cfgTargetTeams.value = state.targetTeamCount;
      if (state.rankDisplayLimit) cfgRankLimit.value = state.rankDisplayLimit;
      if (state.scoreConfig) {
        const sc = state.scoreConfig;
        const rp = sc.rankPoints || {};
        const legacyMax = rp[1] ?? sc.rank1 ?? (sc.basePoint ? sc.basePoint + (sc.top1SpeedBonus || 0) : 100);
        const legacySecond = rp[2] ?? sc.rank2 ?? (sc.basePoint ? sc.basePoint + (sc.top2SpeedBonus || 0) : legacyMax - 10);
        cfgMaxPoint.value = sc.maxPoint ?? legacyMax;
        cfgDecrement.value = sc.decrement ?? Math.max(0, legacyMax - legacySecond);
        cfgMinPoint.value = sc.minPoint ?? sc.defaultPoint ?? sc.bottomHalf ?? 10;
      }
    }
  });

  setupEventListeners();
});

function setupEventListeners() {
  editAnswerType.addEventListener('change', updateAnswerTypeFields);

  // 問題移動
  selectCurrentQuestion.addEventListener('change', e => {
    selectedQIndex = Number(e.target.value);
    loadQuestionToEditor(selectedQIndex);
  });

  btnPrevQuestion.addEventListener('click', () => {
    if (selectedQIndex > 0) {
      selectedQIndex--;
      selectCurrentQuestion.value = selectedQIndex;
      loadQuestionToEditor(selectedQIndex);
    }
  });

  btnNextQuestion.addEventListener('click', () => {
    if (selectedQIndex < currentQuestions.length - 1) {
      selectedQIndex++;
      selectCurrentQuestion.value = selectedQIndex;
      loadQuestionToEditor(selectedQIndex);
    }
  });

  // 問題編集
  btnAddOption.addEventListener('click', addOptionField);
  btnRemoveOption.addEventListener('click', removeOptionField);
  btnAddNewQuestion.addEventListener('click', addNewQuestion);
  btnDeleteCurrentQuestion.addEventListener('click', deleteCurrentQuestion);
  questionEditForm.addEventListener('submit', handleSaveQuestionEdit);

  // 設定保存
  btnSaveConfig.addEventListener('click', handleSaveConfig);

  // Firebaseモーダル
  btnOpenFirebaseModal.addEventListener('click', () => {
    firebaseConfigInput.value = JSON.stringify(FirebaseManager.getConfig(), null, 2);
    openModal(firebaseModal);
  });
  btnCloseFirebaseModal.addEventListener('click', () => closeModal(firebaseModal));
  btnSaveFirebaseConfig.addEventListener('click', handleSaveFirebaseConfig);
  btnResetFirebaseConfig.addEventListener('click', () => {
    if (confirm("Firebase設定をリセットしますか？")) {
      FirebaseManager.resetConfig();
      location.reload();
    }
  });

  // JSONモーダル
  btnOpenJsonModal.addEventListener('click', () => {
    jsonEditorArea.value = JSON.stringify(rawQuestions, null, 2);
    openModal(jsonModal);
  });
  btnCloseJsonModal.addEventListener('click', () => closeModal(jsonModal));
  btnFormatJson.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonEditorArea.value);
      jsonEditorArea.value = JSON.stringify(parsed, null, 2);
    } catch (e) {
      alert("JSON構文エラーです: " + e.message);
    }
  });
  btnApplyJson.addEventListener('click', handleApplyJson);
  btnExportJson.addEventListener('click', handleExportJson);
  btnImportJsonFile.addEventListener('click', () => jsonFileInput.click());
  jsonFileInput.addEventListener('change', handleImportJsonFile);

  // 出題順モーダル
  btnOpenOrderModal.addEventListener('click', () => {
    renderOrderListEditor();
    openModal(orderModal);
  });
  btnCloseOrderModal.addEventListener('click', () => closeModal(orderModal));
  btnCancelOrder.addEventListener('click', () => closeModal(orderModal));
  btnSaveOrder.addEventListener('click', handleSaveOrder);

  // チーム定義モーダル
  btnOpenTeamListModal.addEventListener('click', () => {
    teamListTextArea.value = teamMasterList.join('\n');
    openModal(teamListModal);
  });
  btnCloseTeamListModal.addEventListener('click', () => closeModal(teamListModal));
  btnSaveTeamList.addEventListener('click', handleSaveTeamList);

  // モーダル外側クリックで閉じる
  [firebaseModal, jsonModal, orderModal, teamListModal].forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) closeModal(m);
    });
  });
}

// --- 問題編集 (GUI) ---

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
  if (selectedQIndex >= currentQuestions.length) {
    selectedQIndex = Math.max(0, currentQuestions.length - 1);
  }
  selectCurrentQuestion.value = selectedQIndex;
}

function loadQuestionToEditor(index) {
  const q = currentQuestions[index];
  if (!q) return;

  editQuestionText.value = q.question || '';
  editQuestionImage.value = q.image || '';
  editAnswerType.value = q.answerType === 'text' ? 'text' : 'choice';
  editTextAnswer.value = typeof q.answer === 'string' ? q.answer : '';
  updateAnswerTypeFields();
  editPointMultiplier.value = getPointMultiplier(q);
  editExplanation.value = q.explanation || '';

  renderOptionInputs(q.options || []);
  editCorrectAnswer.value = typeof q.answer === 'number' ? q.answer : 0;
}

function updateAnswerTypeFields() {
  const isTextAnswer = editAnswerType.value === 'text';
  editChoiceAnswerGroup.style.display = isTextAnswer ? 'none' : '';
  editTextAnswerGroup.style.display = isTextAnswer ? '' : 'none';
  optionsEditorGroup.style.display = isTextAnswer ? 'none' : '';
}

function renderOptionInputs(options) {
  optionsEditorContainer.innerHTML = '';
  options.forEach((opt, idx) => {
    const row = document.createElement('div');
    row.className = 'option-editor-item';
    row.setAttribute('data-idx', idx);

    row.innerHTML = `
      <span style="font-weight: 800; width: 24px; color: #0f172a;">${idx + 1}</span>
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
    if (!q.options) q.options = [];
    q.options.push({ text: `選択肢 ${currentCount + 1}`, image: "" });
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
  if (q && q.options) {
    q.options.pop();
    renderOptionInputs(q.options);
  }
}

async function handleSaveQuestionEdit(e) {
  e.preventDefault();
  const q = currentQuestions[selectedQIndex];
  if (!q) return;

  const newOptions = [];
  const rows = optionsEditorContainer.querySelectorAll('.option-editor-item');
  rows.forEach(r => {
    const textInput = r.querySelector('.opt-text-input');
    const imgInput = r.querySelector('.opt-img-input');
    newOptions.push({
      text: textInput.value.trim(),
      image: imgInput.value.trim()
    });
  });

  const isTextAnswer = editAnswerType.value === 'text';
  if (!isTextAnswer && newOptions.length < 2) {
    alert("選択肢は最低2個必要です。");
    return;
  }
  const pointMultiplier = Number(editPointMultiplier.value);
  if (!Number.isFinite(pointMultiplier) || pointMultiplier <= 0) {
    alert('ポイント倍率は0より大きい数値を入力してください。');
    return;
  }

  q.question = editQuestionText.value.trim();
  q.image = editQuestionImage.value.trim();
  q.answerType = isTextAnswer ? 'text' : 'choice';
  q.answer = isTextAnswer ? editTextAnswer.value.trim() : parseInt(editCorrectAnswer.value, 10);
  q.pointMultiplier = pointMultiplier;
  delete q.isDoublePoints;
  q.options = newOptions;
  q.explanation = editExplanation.value.trim();

  // rawQuestions を更新
  const targetRawIndex = rawQuestions.findIndex(rq => rq.id === q.id);
  if (targetRawIndex !== -1) {
    rawQuestions[targetRawIndex] = { ...q };
  } else {
    rawQuestions.push({ ...q });
  }

  rawQuestions = rawQuestions.map(question => {
    const { hasTimeLimit, timeLimitSeconds, isDoublePoints, ...cleanQuestion } = question;
    return { ...cleanQuestion, pointMultiplier: getPointMultiplier(question) };
  });
  await quizStore.saveQuestions(rawQuestions);
  alert("問題データを保存・同期しました！");
}

async function addNewQuestion() {
  const maxId = rawQuestions.reduce((max, q) => Math.max(max, q.id || 0), 0);
  const newQ = {
    id: maxId + 1,
    question: `新しい問題 ${maxId + 1}`,
    image: "",
    answerType: 'choice',
    pointMultiplier: 1,
    options: [
      { text: "選択肢 1", image: "" },
      { text: "選択肢 2", image: "" },
      { text: "選択肢 3", image: "" },
      { text: "選択肢 4", image: "" }
    ],
    answer: 0,
    explanation: ""
  };

  rawQuestions.push(newQ);
  if (currentQuestionOrder.length > 0) {
    currentQuestionOrder.push(newQ.id);
    await quizStore.saveQuestionOrder(currentQuestionOrder);
  }
  await quizStore.saveQuestions(rawQuestions);

  selectedQIndex = currentQuestions.length; // 新しい問題
  populateQuestionDropdown();
  loadQuestionToEditor(selectedQIndex);
  alert(`新規問題 (ID: ${newQ.id}) を追加しました。`);
}

async function deleteCurrentQuestion() {
  if (currentQuestions.length <= 1) {
    alert("問題が1問しかないため削除できません。");
    return;
  }
  const q = currentQuestions[selectedQIndex];
  if (!q) return;

  if (confirm(`問題「${q.question}」を本当に削除しますか？`)) {
    rawQuestions = rawQuestions.filter(rq => rq.id !== q.id);
    currentQuestionOrder = currentQuestionOrder.filter(id => id !== q.id);
    await quizStore.saveQuestionOrder(currentQuestionOrder);
    await quizStore.saveQuestions(rawQuestions);

    selectedQIndex = Math.max(0, selectedQIndex - 1);
    populateQuestionDropdown();
    loadQuestionToEditor(selectedQIndex);
    alert("問題を削除しました。");
  }
}

// --- 大会設定保存 ---

async function handleSaveConfig() {
  const maxPoint = Number(cfgMaxPoint.value);
  const decrement = Number(cfgDecrement.value);
  const minPoint = Number(cfgMinPoint.value);
  if (![maxPoint, decrement, minPoint].every(Number.isFinite) || maxPoint < 0 || decrement < 0 || minPoint < 0 || minPoint > maxPoint) {
    alert("得点は0以上で設定し、最低点は最高点以下にしてください。");
    return;
  }

  const updates = {
    targetTeamCount: parseInt(cfgTargetTeams.value, 10) || 100,
    rankDisplayLimit: parseInt(cfgRankLimit.value, 10) || 999,
    scoreConfig: { maxPoint, decrement, minPoint }
  };

  await quizStore.updateState(updates);
  alert("大会設定（人数・得点）を保存・反映しました！");
}

// --- 出題順 (Question Order) エディタ ---

let tempOrder = [];

function renderOrderListEditor() {
  tempOrder = [...currentQuestionOrder];
  if (tempOrder.length === 0) {
    tempOrder = rawQuestions.map(q => q.id);
  }

  orderListContainer.innerHTML = '';
  tempOrder.forEach((qid, idx) => {
    const q = rawQuestions.find(rq => rq.id === qid);
    const qText = q ? q.question : `(ID: ${qid} - 削除済み)`;
    const multiplier = getPointMultiplier(q);
    const doubleBadge = multiplier > 1 ? ` <span style="display:inline-block; font-size:0.75rem; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:4px;">${escapeHtml(ScoreEngine.getMultiplierLabel(multiplier))}</span>` : '';

    const item = document.createElement('div');
    item.draggable = true;
    item.classList.add('order-list-item');
    item.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; margin-bottom: 8px;
    `;

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
        <span style="font-weight: 800; color: #2563eb; width: 30px;">#${idx + 1}</span>
        <span style="font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(qText)}${doubleBadge}
        </span>
      </div>
      <div style="display: flex; gap: 6px; flex-shrink: 0;">
        <button type="button" class="btn btn-secondary btn-order-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 0.8rem;">↑ 上へ</button>
        <button type="button" class="btn btn-secondary btn-order-down" data-idx="${idx}" ${idx === tempOrder.length - 1 ? 'disabled' : ''} style="padding: 4px 8px; font-size: 0.8rem;">↓ 下へ</button>
      </div>
    `;
    orderListContainer.appendChild(item);

    item.addEventListener('dragstart', event => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(idx));
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', event => {
      event.preventDefault();
      item.classList.remove('drag-over');
      const fromIndex = Number(event.dataTransfer.getData('text/plain'));
      if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= tempOrder.length || fromIndex === idx) return;
      const [movedQuestion] = tempOrder.splice(fromIndex, 1);
      tempOrder.splice(idx, 0, movedQuestion);
      refreshOrderEditor();
    });
  });

  orderListContainer.querySelectorAll('.btn-order-up').forEach(b => {
    b.addEventListener('click', () => {
      const idx = Number(b.getAttribute('data-idx'));
      if (idx > 0) {
        const swap = tempOrder[idx];
        tempOrder[idx] = tempOrder[idx - 1];
        tempOrder[idx - 1] = swap;
        refreshOrderEditor();
      }
    });
  });

  orderListContainer.querySelectorAll('.btn-order-down').forEach(b => {
    b.addEventListener('click', () => {
      const idx = Number(b.getAttribute('data-idx'));
      if (idx < tempOrder.length - 1) {
        const swap = tempOrder[idx];
        tempOrder[idx] = tempOrder[idx + 1];
        tempOrder[idx + 1] = swap;
        refreshOrderEditor();
      }
    });
  });
}

function refreshOrderEditor() {
  currentQuestionOrder = [...tempOrder];
  renderOrderListEditor();
}

async function handleSaveOrder() {
  await quizStore.saveQuestionOrder(tempOrder);
  closeModal(orderModal);
  alert("出題順を保存・反映しました！");
}

// --- チーム一覧保存 ---

async function handleSaveTeamList() {
  const lines = teamListTextArea.value.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    alert("チーム名を1つ以上入力してください。");
    return;
  }

  await quizStore.saveTeamList(lines);
  closeModal(teamListModal);
  alert(`${lines.length} チームの一覧を保存しました！`);
}

// --- Firebase & JSON 設定モーダル ---

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

async function handleApplyJson() {
  try {
    const parsed = JSON.parse(jsonEditorArea.value);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      alert("問題の配列JSONを指定してください。");
      return;
    }
    rawQuestions = parsed;
    await quizStore.saveQuestions(rawQuestions);
    closeModal(jsonModal);
    alert("問題JSONを保存・同期しました！");
  } catch (e) {
    alert("JSONのパースに失敗しました: " + e.message);
  }
}

function handleExportJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawQuestions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "quiz_questions.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function handleImportJsonFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  jsonFileName.textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => {
    jsonEditorArea.value = ev.target.result;
  };
  reader.readAsText(file);
}

// モーダル共通制御
function openModal(el) {
  if (el) el.classList.add('active');
}

function closeModal(el) {
  if (el) el.classList.remove('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
