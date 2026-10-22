/**
 * 司会用画面ロジック
 */

let rawQuestions = DEFAULT_QUESTIONS;
let currentQuestionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [];
let currentQuestions = DEFAULT_QUESTIONS;
let currentState = null;
let allTeams = {};
let memoDirty = false;

const hostSyncStatus = document.getElementById('hostSyncStatus');
const hostQuestionNumber = document.getElementById('hostQuestionNumber');
const hostSceneStatus = document.getElementById('hostSceneStatus');
const hostQuestionImage = document.getElementById('hostQuestionImage');
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
  quizStore.subscribeConnection(isConnected => {
    hostSyncStatus.textContent = isConnected ? 'Firebase同期中' : 'オフライン / ローカル';
    hostSyncStatus.parentElement.classList.toggle('is-online', isConnected);
  });

  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    renderCurrentQuestion();
  });

  quizStore.subscribeQuestionOrder(order => {
    currentQuestionOrder = order || [];
    currentQuestions = quizStore.getOrderedQuestions(rawQuestions, currentQuestionOrder);
    renderCurrentQuestion();
  });

  quizStore.subscribeState(state => {
    currentState = state;
    renderCurrentQuestion();
  });

  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    renderRanking();
  });

  quizStore.subscribeHostMemo(memo => {
    if (!memoDirty) hostMemo.value = memo;
    hostMemoStatus.textContent = quizStore.isFirebaseReady
      ? 'Firebaseと同期済み'
      : 'ローカル保存（Firebase未接続）';
  });

  hostMemo.addEventListener('input', () => {
    memoDirty = true;
    hostMemoStatus.textContent = '未保存の変更があります';
  });
  btnSaveHostMemo.addEventListener('click', saveMemo);

  renderCurrentQuestion();
  renderRanking();
});

function renderCurrentQuestion() {
  const questionIndex = currentState ? Number(currentState.currentQuestionIndex) || 0 : 0;
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
  hostSceneStatus.textContent = sceneLabels[scene] || '進行状況を待っています';

  if (!question) {
    hostQuestionImage.hidden = true;
    hostQuestionText.textContent = '出題中の問題はありません';
    hostTextAnswerNotice.hidden = true;
    hostOptions.replaceChildren();
    hostCorrectAnswer.textContent = '正解情報はありません';
    hostExplanation.textContent = '';
    return;
  }

  hostQuestionText.textContent = question.question || '（問題文なし）';
  hostQuestionImage.hidden = !question.image;
  if (question.image) {
    hostQuestionImage.src = question.image;
    hostQuestionImage.alt = question.question || '問題画像';
  } else {
    hostQuestionImage.removeAttribute('src');
  }

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

      if (option.image) {
        const image = document.createElement('img');
        image.src = option.image;
        image.alt = `${index + 1}番の選択肢画像`;
        item.appendChild(image);
      }
      hostOptions.appendChild(item);
    });
  }

  const correctAnswer = getCorrectAnswerText(question);
  hostCorrectAnswer.textContent = `正解：${correctAnswer}`;
  hostExplanation.textContent = question.explanation || '解説はありません';
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
    await quizStore.saveHostMemo(hostMemo.value);
    memoDirty = false;
    hostMemoStatus.textContent = quizStore.isFirebaseReady
      ? 'Firebaseに保存しました'
      : 'この端末に保存しました（Firebase未接続）';
  } catch (error) {
    hostMemoStatus.textContent = '保存に失敗しました。接続を確認して再試行してください。';
    console.error('司会メモの保存に失敗しました:', error);
  } finally {
    btnSaveHostMemo.disabled = false;
  }
}
