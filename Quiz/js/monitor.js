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
let selectedHistoryQuestionIds = new Set();
let historyQuestionSelectionInitialized = false;
let historyQuestionSelectionChanged = false;
const historyResultsByQuestion = {};
const historyResultSubscriptions = new Map();
let historySortKey = 'id';
let historySortDir = 'asc';

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
const tabLive = document.getElementById('tabLive');
const tabHistory = document.getElementById('tabHistory');
const livePanel = document.getElementById('livePanel');
const historyPanel = document.getElementById('historyPanel');
const selectAllHistoryQuestions = document.getElementById('selectAllHistoryQuestions');
const historyQuestionOptions = document.getElementById('historyQuestionOptions');
const historyQuestionFilterLabel = document.getElementById('historyQuestionFilterLabel');
const selectHistorySort = document.getElementById('selectHistorySort');
const historyQuestionLabel = document.getElementById('historyQuestionLabel');
const historyTeamBody = document.getElementById('historyTeamBody');
const historyTableHeadRow = document.getElementById('historyTableHeadRow');

document.addEventListener('DOMContentLoaded', () => {
  selectMonitorSort.value = `${monitorSortKey}-${monitorSortDir}`;
  selectHistorySort.value = `${historySortKey}-${historySortDir}`;
  selectMonitorSort.addEventListener('change', event => {
    [monitorSortKey, monitorSortDir] = event.target.value.split('-');
    renderMonitor();
  });
  selectHistorySort.addEventListener('change', event => {
    [historySortKey, historySortDir] = event.target.value.split('-');
    renderHistory();
  });
  selectAllHistoryQuestions.addEventListener('change', () => {
    historyQuestionSelectionChanged = true;
    selectedHistoryQuestionIds = selectAllHistoryQuestions.checked
      ? new Set(currentQuestions.map(question => String(question.id)))
      : new Set();
    renderHistoryQuestionOptions();
    syncHistoryResultSubscriptions();
    renderHistory();
  });
  historyQuestionOptions.addEventListener('change', event => {
    const checkbox = event.target.closest('input[data-question-id]');
    if (!checkbox) return;
    historyQuestionSelectionChanged = true;
    if (checkbox.checked) {
      selectedHistoryQuestionIds.add(checkbox.dataset.questionId);
    } else {
      selectedHistoryQuestionIds.delete(checkbox.dataset.questionId);
    }
    updateHistoryQuestionSelectionState();
    syncHistoryResultSubscriptions();
    renderHistory();
  });
  tabLive.addEventListener('click', () => setMonitorTab('live'));
  tabHistory.addEventListener('click', () => setMonitorTab('history'));
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
    renderHistory();
  });
  quizStore.subscribeState(state => {
    currentState = state;
    updateActiveQuestion();
  });
});

function updateOrderedQuestions() {
  currentQuestions = quizStore.getOrderedQuestions(rawQuestions, questionOrder);
  updateHistoryQuestionOptions();
  updateActiveQuestion();
}

function updateHistoryQuestionOptions() {
  const currentIds = new Set(currentQuestions.map(question => String(question.id)));
  if (!historyQuestionSelectionInitialized) {
    selectedHistoryQuestionIds = currentIds;
    historyQuestionSelectionInitialized = true;
  } else if (!historyQuestionSelectionChanged) {
    selectedHistoryQuestionIds = currentIds;
  } else {
    const hadAllQuestionsSelected = currentQuestions.length > 0
      && selectedHistoryQuestionIds.size === currentQuestions.length;
    selectedHistoryQuestionIds = new Set(
      [...selectedHistoryQuestionIds].filter(questionId => currentIds.has(questionId))
    );
    if (hadAllQuestionsSelected) selectedHistoryQuestionIds = currentIds;
  }
  renderHistoryQuestionOptions();
  syncHistoryResultSubscriptions();
  renderHistory();
}

function renderHistoryQuestionOptions() {
  historyQuestionOptions.replaceChildren();
  currentQuestions.forEach((question, index) => {
    const label = document.createElement('label');
    label.className = 'history-question-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.questionId = String(question.id);
    checkbox.checked = selectedHistoryQuestionIds.has(String(question.id));
    const text = document.createElement('span');
    text.textContent = `第${index + 1}問: ${question.question}`;
    label.title = question.question;
    label.append(checkbox, text);
    historyQuestionOptions.appendChild(label);
  });
  updateHistoryQuestionSelectionState();
}

function updateHistoryQuestionSelectionState() {
  const selectedCount = currentQuestions.filter(question =>
    selectedHistoryQuestionIds.has(String(question.id))
  ).length;
  selectAllHistoryQuestions.checked = currentQuestions.length > 0
    && selectedCount === currentQuestions.length;
  selectAllHistoryQuestions.indeterminate = selectedCount > 0
    && selectedCount < currentQuestions.length;
  historyQuestionFilterLabel.textContent = selectedCount === currentQuestions.length
    ? `表示する問題（すべて・${selectedCount}問）`
    : `表示する問題（${selectedCount}/${currentQuestions.length}問）`;
}

function syncHistoryResultSubscriptions() {
  const selectedIds = new Set([...selectedHistoryQuestionIds]);
  historyResultSubscriptions.forEach((unsubscribe, questionId) => {
    if (!selectedIds.has(questionId)) {
      unsubscribe();
      historyResultSubscriptions.delete(questionId);
      delete historyResultsByQuestion[questionId];
    }
  });
  currentQuestions.forEach(question => {
    const questionId = String(question.id);
    if (!selectedIds.has(questionId) || historyResultSubscriptions.has(questionId)) return;
    const unsubscribe = quizStore.subscribeQuestionResults(question.id, results => {
      historyResultsByQuestion[questionId] = results || null;
      renderHistory();
    });
    historyResultSubscriptions.set(questionId, unsubscribe);
  });
}

function setMonitorTab(tab) {
  const showLive = tab === 'live';
  livePanel.hidden = !showLive;
  historyPanel.hidden = showLive;
  tabLive.classList.toggle('is-active', showLive);
  tabHistory.classList.toggle('is-active', !showLive);
  tabLive.setAttribute('aria-selected', String(showLive));
  tabHistory.setAttribute('aria-selected', String(!showLive));
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
    ? `記述式問題です。回答欄の「正解」「不正解」を選んで手動採点してください。${question.answer ? ` 模範解答: ${Array.isArray(question.answer) ? question.answer.join(' / ') : question.answer}` : ''}`
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
      comparison = splitTeamDisplayName(a.teamName).id.localeCompare(
        splitTeamDisplayName(b.teamName).id, undefined, { numeric: true, sensitivity: 'base' }
      );
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
    const displayName = splitTeamDisplayName(team.teamName);
    idCell.textContent = displayName.id;
    const nameCell = document.createElement('td');
    nameCell.className = 'monitor-team-name';
    nameCell.textContent = displayName.name;
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
      if (answer.gradeSource === 'automatic' && answer.manualIsCorrect === true) {
        const autoGrade = document.createElement('span');
        autoGrade.className = 'grade-correct';
        autoGrade.textContent = '（自動正解）';
        answerCell.appendChild(autoGrade);
      } else {
        appendManualGradeControls(answerCell, team.teamId, answer);
      }
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

function renderHistory() {
  if (!historyTeamBody) return;
  const selectedQuestions = currentQuestions.filter(question =>
    selectedHistoryQuestionIds.has(String(question.id))
  );
  historyQuestionLabel.textContent = `表示中: ${selectedQuestions.length}問`;
  historyTeamBody.replaceChildren();
  historyTableHeadRow.replaceChildren();
  appendHistoryHeader('ID', 'id');
  appendHistoryHeader('チーム名');
  appendHistoryHeader('合計点', 'score');
  selectedQuestions.forEach(question => {
    const questionIndex = currentQuestions.indexOf(question);
    appendHistoryHeader(`第${questionIndex + 1}問`);
  });

  const teams = Object.values(allTeams);
  teams.sort((teamA, teamB) => {
    let comparison = 0;
    if (historySortKey === 'id') {
      comparison = splitTeamDisplayName(teamA.teamName).id.localeCompare(
        splitTeamDisplayName(teamB.teamName).id, undefined, { numeric: true, sensitivity: 'base' }
      );
    } else {
      comparison = getHistoryTotalScore(teamA, selectedQuestions)
        - getHistoryTotalScore(teamB, selectedQuestions);
    }
    return historySortDir === 'asc' ? comparison : -comparison;
  });

  teams.forEach(team => {
    const row = document.createElement('tr');
    const displayName = splitTeamDisplayName(team.teamName);
    const idCell = document.createElement('td');
    idCell.className = 'monitor-id';
    idCell.textContent = displayName.id;
    const nameCell = document.createElement('td');
    nameCell.className = 'monitor-team-name';
    nameCell.textContent = displayName.name;
    const totalCell = document.createElement('td');
    totalCell.className = 'monitor-score';
    totalCell.textContent = `${getHistoryTotalScore(team, selectedQuestions)}`;
    row.append(idCell, nameCell, totalCell);
    selectedQuestions.forEach(question => {
      const scoreCell = document.createElement('td');
      scoreCell.className = 'monitor-score';
      scoreCell.textContent = `${getHistoryQuestionScore(team, question)}`;
      row.appendChild(scoreCell);
    });
    historyTeamBody.appendChild(row);
  });
}

function appendHistoryHeader(label, sortKey = null) {
  const header = document.createElement('th');
  header.textContent = label;
  if (sortKey) {
    header.className = 'sortable';
    header.dataset.sort = sortKey;
    if (sortKey === historySortKey) {
      header.classList.add(historySortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
    header.addEventListener('click', () => toggleHistoryHeaderSort(sortKey));
  }
  historyTableHeadRow.appendChild(header);
}

function getHistoryQuestionScore(team, question) {
  const questionId = String(question.id);
  const result = historyResultsByQuestion[questionId]
    && historyResultsByQuestion[questionId].results
    && historyResultsByQuestion[questionId].results[team.teamId];
  return Number(result && result.pointsAwarded) || 0;
}

function getHistoryTotalScore(team, questions) {
  return questions.reduce((total, question) => total + getHistoryQuestionScore(team, question), 0);
}

function toggleHistoryHeaderSort(key) {
  if (historySortKey === key) {
    historySortDir = historySortDir === 'asc' ? 'desc' : 'asc';
  } else {
    historySortKey = key;
    historySortDir = key === 'score' ? 'desc' : 'asc';
  }
  selectHistorySort.value = `${historySortKey}-${historySortDir}`;
  renderHistory();
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
