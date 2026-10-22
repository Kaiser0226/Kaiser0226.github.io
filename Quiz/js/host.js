/**
 * 司会用画面ロジック
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [];
let currentQuestions = DEFAULT_QUESTIONS;
let currentState = null;
let allTeams = {};
let memoDirty = false;
let hostMemos = {};
let memoDrafts = {};
let loadedMemoQuestionId = null;
let followsQuiz = true;
let selectedQuestionId = null;

const hostSyncStatus = document.getElementById('hostSyncStatus');
const hostQuestionNumber = document.getElementById('hostQuestionNumber');
const hostQuestionPicker = document.getElementById('hostQuestionPicker');
const hostFollowNotice = document.getElementById('hostFollowNotice');
const hostSceneStatus = document.getElementById('hostSceneStatus');
const hostQuestionText = document.getElementById('hostQuestionText');
const hostTextAnswerNotice = document.getElementById('hostTextAnswerNotice');
const hostOptions = document.getElementById('hostOptions');
const hostCorrectAnswer = document.getElementById('hostCorrectAnswer');
const hostExplanation = document.getElementById('hostExplanation');
const hostMemo = document.getElementById('hostMemo');
const hostMemoStatus = document.getElementById('hostMemoStatus');
const btnSaveHostMemo = document.getElementById('btnSaveHostMemo');
const hostRanking = document.getElementById('hostRanking');

document.addEventListener('DOMContentLoaded', () => {
  memoDrafts = JSON.parse(localStorage.getItem(quizStore.getLocalKey('quiz_local_host_memo_drafts')) || '{}');

  quizStore.subscribeConnection(isConnected => {
    hostSyncStatus.textContent = isConnected ? 'Firebase同期中' : 'オフライン / ローカル';
    hostSyncStatus.parentElement.classList.toggle('is-online', isConnected);
  });

  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    syncQuestionPicker();
    renderCurrentQuestion();
  });

  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    syncQuestionPicker();
    renderCurrentQuestion();
  });

  quizStore.subscribeState(state => {
    currentState = state;
    syncQuestionPicker();
    renderCurrentQuestion();
    if (followsQuiz) loadMemoForSelectedQuestion();
  });

  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    renderRanking();
  });

  quizStore.subscribeHostMemos(memos => {
    hostMemos = memos || {};
    loadMemoForSelectedQuestion();
    hostMemoStatus.textContent = quizStore.isFirebaseReady
      ? 'Firebaseと同期済み'
      : 'ローカル保存（Firebase未接続）';
  });

  hostQuestionPicker.addEventListener('change', () => {
    const questionId = hostQuestionPicker.value;
    if (!questionId) return;
    followsQuiz = false;
    selectedQuestionId = questionId;
    hostFollowNotice.textContent = '手動で問題を選択中です。進行との自動同期は停止しています（再読み込みで再開）。';
    hostFollowNotice.classList.add('is-manual');
    hostSceneStatus.textContent = '手動選択中（進行同期停止）';
    renderCurrentQuestion();
    loadMemoForSelectedQuestion();
  });

  hostMemo.addEventListener('input', () => {
    memoDirty = true;
    const questionId = String(loadedMemoQuestionId || '');
    if (questionId) {
      memoDrafts[questionId] = hostMemo.value;
      localStorage.setItem(quizStore.getLocalKey('quiz_local_host_memo_drafts'), JSON.stringify(memoDrafts));
    }
    hostMemoStatus.textContent = 'この問題の未保存メモがあります';
  });
  btnSaveHostMemo.addEventListener('click', saveMemo);

  renderCurrentQuestion();
  renderRanking();
});

function renderCurrentQuestion() {
  const questionIndex = followsQuiz
    ? (currentState ? Number(currentState.currentQuestionIndex) || 0 : 0)
    : currentQuestions.findIndex(question => String(question.id) === String(selectedQuestionId));
  const question = currentQuestions[questionIndex];
  const scene = currentState && currentState.currentScene;
  const sceneLabels = {
    waiting: '待機中',
    question: '回答受付中',
    closed: '回答締切',
    result: '正解発表中',
    final: '最終結果発表'
  };

  hostQuestionNumber.textContent = question ? `Q ${questionIndex + 1}` : 'Q --';
  if (followsQuiz) {
    hostSceneStatus.textContent = sceneLabels[scene] || '進行状況を待っています';
  }

  if (!question) {
    hostQuestionText.textContent = '出題中の問題はありません';
    hostTextAnswerNotice.hidden = true;
    hostOptions.replaceChildren();
    hostCorrectAnswer.textContent = '正解情報はありません';
    hostExplanation.textContent = '';
    return;
  }

  hostQuestionText.textContent = question.question || '（問題文なし）';

  const isTextAnswer = question.answerType === 'text';
  hostTextAnswerNotice.hidden = !isTextAnswer;
  hostOptions.replaceChildren();
  if (!isTextAnswer) {
    (question.options || []).forEach((option, index) => {
      const item = document.createElement('li');
      item.className = 'host-option';
      const colorIndex = Math.min(index + 1, 8);
      item.style.setProperty('--option-color', `var(--opt-${colorIndex})`);
      item.style.setProperty('--option-bg', `var(--opt-${colorIndex}-bg)`);
      item.style.setProperty('--option-border', `var(--opt-${colorIndex}-border)`);

      const label = document.createElement('span');
      label.className = 'host-option-label';
      label.textContent = String(index + 1);
      item.appendChild(label);

      const text = document.createElement('span');
      text.textContent = option.text || '';
      item.appendChild(text);
      hostOptions.appendChild(item);
    });
  }

  const correctAnswer = getCorrectAnswerText(question);
  hostCorrectAnswer.textContent = `正解：${correctAnswer}`;
  hostExplanation.textContent = question.explanation || '解説はありません';
}

function syncQuestionPicker() {
  const displayedQuestionId = followsQuiz
    ? currentQuestions[Number(currentState && currentState.currentQuestionIndex) || 0]?.id
    : selectedQuestionId;

  hostQuestionPicker.replaceChildren();
  currentQuestions.forEach((question, index) => {
    const option = document.createElement('option');
    option.value = String(question.id);
    const questionLabel = String(question.question || '').replace(/\s+/g, ' ').trim();
    option.textContent = `Q${index + 1}: ${questionLabel || '（問題文なし）'}`;
    hostQuestionPicker.appendChild(option);
  });

  if (!currentQuestions.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '表示できる問題がありません';
    hostQuestionPicker.appendChild(option);
    hostQuestionPicker.disabled = true;
    return;
  }

  hostQuestionPicker.disabled = false;
  const selectedStillExists = currentQuestions.some(question =>
    String(question.id) === String(displayedQuestionId)
  );
  if (!selectedStillExists) {
    selectedQuestionId = currentQuestions[0].id;
  }
  hostQuestionPicker.value = String(selectedStillExists ? displayedQuestionId : selectedQuestionId);
  if (!followsQuiz) {
    selectedQuestionId = hostQuestionPicker.value;
  }
}

function getDisplayedQuestionId() {
  const index = currentQuestions.findIndex(question =>
    String(question.id) === String(selectedQuestionId)
  );
  return followsQuiz
    ? String(currentQuestions[Number(currentState && currentState.currentQuestionIndex) || 0]?.id || '')
    : String(currentQuestions[index]?.id || '');
}

function loadMemoForSelectedQuestion() {
  const questionId = getDisplayedQuestionId();
  const memoKey = String(questionId || '');
  if (!memoKey || memoKey === String(loadedMemoQuestionId || '')) {
    if (memoDirty) return;
  } else if (memoDirty && loadedMemoQuestionId) {
    memoDrafts[String(loadedMemoQuestionId)] = hostMemo.value;
    localStorage.setItem(quizStore.getLocalKey('quiz_local_host_memo_drafts'), JSON.stringify(memoDrafts));
  }

  loadedMemoQuestionId = memoKey || null;
  memoDirty = Boolean(memoKey && Object.prototype.hasOwnProperty.call(memoDrafts, memoKey));
  hostMemo.value = memoKey ? memoDrafts[memoKey] ?? hostMemos[memoKey] ?? '' : '';
  hostMemoStatus.textContent = quizStore.isFirebaseReady
    ? (memoDirty ? 'この問題の未保存メモがあります' : 'この問題のメモをFirebaseと同期')
    : (memoDirty ? 'この問題の未保存メモがあります' : 'この問題のメモをローカル保存');
}

function getCorrectAnswerText(question) {
  if (question.answerType === 'text') {
    return Array.isArray(question.answer) ? question.answer.join(' / ') : String(question.answer || '');
  }
  const answerIndex = Number(question.answer);
  const correctOption = question.options && question.options[answerIndex];
  return correctOption ? `${answerIndex + 1}. ${correctOption.text || ''}` : '未設定';
}

function renderRanking() {
  const teams = Object.values(allTeams)
    .filter(team => team && typeof team === 'object')
    .sort((a, b) => {
      const scoreDifference = (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
      if (scoreDifference !== 0) return scoreDifference;
      return String(a.teamId || '').localeCompare(String(b.teamId || ''), 'ja');
    });

  hostRanking.replaceChildren();
  if (teams.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'host-empty-ranking';
    empty.textContent = 'チームの登録を待っています';
    hostRanking.appendChild(empty);
    return;
  }

  teams.slice(0, 3).forEach((team, index) => {
    const item = document.createElement('li');
    item.className = 'host-ranking-item';

    const rank = document.createElement('span');
    rank.className = 'host-rank-number';
    rank.textContent = `${ScoreEngine.getRankLabel(teams, index)}`;

    const name = document.createElement('span');
    name.className = 'host-team-name';
    name.textContent = team.teamName || team.teamId || 'チーム名なし';

    const score = document.createElement('span');
    score.className = 'host-team-score';
    score.textContent = `${Number(team.totalScore) || 0} 点`;

    item.append(rank, name, score);
    hostRanking.appendChild(item);
  });
}

async function saveMemo() {
  btnSaveHostMemo.disabled = true;
  hostMemoStatus.textContent = '保存中...';
  try {
    const questionId = loadedMemoQuestionId;
    if (!questionId) {
      hostMemoStatus.textContent = '保存する問題を選択してください';
      return;
    }
    await quizStore.saveHostMemo(questionId, hostMemo.value);
    delete memoDrafts[String(questionId)];
    localStorage.setItem(quizStore.getLocalKey('quiz_local_host_memo_drafts'), JSON.stringify(memoDrafts));
    memoDirty = false;
    hostMemoStatus.textContent = quizStore.isFirebaseReady
      ? 'この問題のメモをFirebaseに保存しました'
      : 'この問題のメモを端末に保存しました（Firebase未接続）';
  } catch (error) {
    hostMemoStatus.textContent = '保存に失敗しました。接続を確認して再試行してください。';
    console.error('司会メモの保存に失敗しました:', error);
  } finally {
    btnSaveHostMemo.disabled = false;
  }
}
