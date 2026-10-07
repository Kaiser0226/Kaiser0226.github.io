let rawQuestions = DEFAULT_QUESTIONS;
let questionOrder = typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [];
let currentQuestions = DEFAULT_QUESTIONS;
let currentState = null;
let allTeams = {};
let currentAnswers = {};
let currentQuestion = null;
let unsubscribeAnswers = null;
let monitorSortKey = 'id';
let monitorSortDir = 'asc';

const statConnectedTeams = document.getElementById('statConnectedTeams');
const statAnsweredTeams = document.getElementById('statAnsweredTeams');
const statUnansweredTeams = document.getElementById('statUnansweredTeams');
const selectMonitorSort = document.getElementById('selectMonitorSort');
const monitorQuestionLabel = document.getElementById('monitorQuestionLabel');
const monitorAnswerTypeNote = document.getElementById('monitorAnswerTypeNote');
const teamMonitorBody = document.getElementById('teamMonitorBody');
const thSortId = document.getElementById('thSortId');
const thSortTime = document.getElementById('thSortTime');
const thSortScore = document.getElementById('thSortScore');

document.addEventListener('DOMContentLoaded', () => {
  selectMonitorSort.value = `${monitorSortKey}-${monitorSortDir}`;
  selectMonitorSort.addEventListener('change', event => {
    [monitorSortKey, monitorSortDir] = event.target.value.split('-');
    renderMonitor();
  });
  thSortId.addEventListener('click', () => toggleHeaderSort('id'));
  thSortTime.addEventListener('click', () => toggleHeaderSort('time'));
  thSortScore.addEventListener('click', () => toggleHeaderSort('score'));

  quizStore.subscribeQuestions(questions => {
    rawQuestions = questions || DEFAULT_QUESTIONS;
    updateOrderedQuestions();
  });
  quizStore.subscribeQuestionOrder(order => {
    questionOrder = order || [];
    updateOrderedQuestions();
  });
  quizStore.subscribeTeams(teams => {
    allTeams = teams || {};
    renderMonitor();
  });
  quizStore.subscribeState(state => {
    currentState = state;
    updateActiveQuestion();
  });
});

function updateOrderedQuestions() {
  currentQuestions = quizStore.getOrderedQuestions(rawQuestions, questionOrder);
  updateActiveQuestion();
}

function updateActiveQuestion() {
  const index = currentState ? Number(currentState.currentQuestionIndex) || 0 : 0;
  const question = currentQuestions[index] || currentQuestions[0] || null;
  if (!question) {
    currentQuestion = null;
    if (unsubscribeAnswers) unsubscribeAnswers();
    unsubscribeAnswers = null;
    currentAnswers = {};
    renderMonitor();
    return;
  }

  if (currentQuestion && currentQuestion.id === question.id) {
    renderMonitor();
    return;
  }

  if (unsubscribeAnswers) unsubscribeAnswers();
  currentQuestion = question;
  currentAnswers = {};
  monitorQuestionLabel.textContent = `第${index + 1}問の回答`;
  monitorAnswerTypeNote.textContent = question.answerType === 'text'
    ? `記述式問題です。回答欄の「正解」「不正解」を選んで手動採点してください。${question.answer ? ` 模範解答: ${question.answer}` : ''}`
    : '選択式問題の回答状況を表示しています。';
  unsubscribeAnswers = quizStore.subscribeAnswers(question.id, answers => {
    currentAnswers = answers || {};
    renderMonitor();
  });
  renderMonitor();
}

function renderMonitor() {
  const teams = Object.values(allTeams);
  const answeredCount = Object.keys(currentAnswers).length;
  statConnectedTeams.textContent = String(teams.length);
  statAnsweredTeams.textContent = String(answeredCount);
  statUnansweredTeams.textContent = String(Math.max(0, teams.length - answeredCount));
  teamMonitorBody.replaceChildren();

  updateSortIndicators();
  teams.sort((a, b) => {
    const answerA = currentAnswers[a.teamId];
    const answerB = currentAnswers[b.teamId];
    let comparison = 0;
    if (monitorSortKey === 'id') {
      comparison = (a.teamId || '').localeCompare(b.teamId || '', undefined, { numeric: true, sensitivity: 'base' });
    } else if (monitorSortKey === 'time') {
      const timeA = answerA && Number.isFinite(Number(answerA.answerTimeMs)) ? Number(answerA.answerTimeMs) : null;
      const timeB = answerB && Number.isFinite(Number(answerB.answerTimeMs)) ? Number(answerB.answerTimeMs) : null;
      if (timeA === null && timeB !== null) return 1;
      if (timeB === null && timeA !== null) return -1;
      comparison = (timeA || 0) - (timeB || 0);
    } else if (monitorSortKey === 'score') {
      comparison = (Number(a.totalScore) || 0) - (Number(b.totalScore) || 0);
    }
    return monitorSortDir === 'asc' ? comparison : -comparison;
  });
  teams.forEach(team => {
    const answer = currentAnswers[team.teamId];
    const row = document.createElement('tr');
    row.className = answer ? 'row-correct' : 'row-unanswered';

    const idCell = document.createElement('td');
    idCell.className = 'monitor-id';
    idCell.textContent = team.teamId || '';
    const nameCell = document.createElement('td');
    nameCell.className = 'monitor-team-name';
    nameCell.textContent = team.teamName || '';
    const answerCell = document.createElement('td');
    answerCell.className = 'answer-cell';
    const timeCell = document.createElement('td');
    timeCell.textContent = answer && answer.answerTimeMs
      ? `${(answer.answerTimeMs / 1000).toFixed(2)}秒`
      : '-';
    const scoreCell = document.createElement('td');
    scoreCell.className = 'monitor-score';
    scoreCell.textContent = `${Number(team.totalScore) || 0}`;

    if (!answer) {
      answerCell.textContent = '未回答';
      answerCell.classList.add('grade-pending');
    } else if (currentQuestion && currentQuestion.answerType === 'text') {
      const text = document.createElement('span');
      text.textContent = answer.answerText || '';
      answerCell.appendChild(text);
      appendManualGradeControls(answerCell, team.teamId, answer);
      row.className = answer.manualIsCorrect === true
        ? 'row-correct'
        : answer.manualIsCorrect === false
          ? 'row-incorrect'
          : 'row-unanswered';
    } else {
      const option = currentQuestion && currentQuestion.options
        ? currentQuestion.options[Number(answer.selectedOption)]
        : null;
      answerCell.textContent = option
        ? `${Number(answer.selectedOption) + 1}. ${option.text}`
        : `選択肢 ${Number(answer.selectedOption) + 1}`;
      const isCorrect = currentQuestion && Number(answer.selectedOption) === Number(currentQuestion.answer);
      answerCell.classList.add(isCorrect ? 'grade-correct' : 'grade-incorrect');
      row.className = isCorrect ? 'row-correct' : 'row-incorrect';
    }

    row.append(idCell, nameCell, answerCell, timeCell, scoreCell);
    teamMonitorBody.appendChild(row);
  });
}

function toggleHeaderSort(key) {
  if (monitorSortKey === key) {
    monitorSortDir = monitorSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    monitorSortKey = key;
    monitorSortDir = key === 'score' ? 'desc' : 'asc';
  }
  selectMonitorSort.value = `${monitorSortKey}-${monitorSortDir}`;
  renderMonitor();
}

function updateSortIndicators() {
  [thSortId, thSortTime, thSortScore].forEach(header => {
    header.classList.remove('sort-asc', 'sort-desc');
    if (header.dataset.sort === monitorSortKey) {
      header.classList.add(monitorSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

function appendManualGradeControls(cell, teamId, answer) {
  const state = document.createElement('span');
  const isGraded = typeof answer.manualIsCorrect === 'boolean';
  state.className = isGraded
    ? (answer.manualIsCorrect ? 'grade-correct' : 'grade-incorrect')
    : 'grade-pending';
  state.textContent = isGraded
    ? (answer.manualIsCorrect ? '（正解）' : '（不正解）')
    : '（未採点）';
  cell.appendChild(state);

  const controls = document.createElement('span');
  controls.className = 'manual-grade-controls';
  [
    { label: '⭕ 正解', value: true },
    { label: '❌ 不正解', value: false }
  ].forEach(grade => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.textContent = grade.label;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await quizStore.setManualGrade(currentQuestion, teamId, grade.value);
      } catch (error) {
        console.error('手動採点に失敗しました:', error);
        alert(`採点を保存できませんでした: ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
    controls.appendChild(button);
  });
  cell.appendChild(controls);
}
