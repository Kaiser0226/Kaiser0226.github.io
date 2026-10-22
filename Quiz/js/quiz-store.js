/**
 * クイズ状態管理ストア (QuizStore)
 * Firebase Realtime Database と ローカル通信 (BroadcastChannel / LocalStorage) の両対応
 */

function splitTeamDisplayName(teamName) {
  const fullName = String(teamName || '').trim();
  const separator = fullName.indexOf(' ');
  return separator < 0
    ? { id: fullName, name: fullName }
    : { id: fullName.slice(0, separator), name: fullName.slice(separator + 1).trim() };
}

class QuizStore {
  constructor() {
    this.activeQuizId = localStorage.getItem('quiz_active_id') || 'default';
    this.firebaseApp = null;
    this.database = null;
    this.isFirebaseReady = false;
    this.latestState = null;
    this.latestTransition = null;
    this.listeners = {
      state: [],
      teams: [],
      answers: [],
      questions: [],
      teamSessions: [],
      hostMemo: []
    };

    // ローカル通信チャンネル
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('quiz_channel') : null;
    if (this.channel) {
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
          if (type === 'answers') {
            this.listeners.answers.forEach(subscription => {
              if (!event.data.questionId || subscription.questionId === event.data.questionId) {
                subscription.callback(data);
              }
            });
            return;
          }
          if (type === 'state') {
            this.publishState(data);
            return;
          }
          if (type === 'teamSession') {
            this.listeners.teamSessions.forEach(subscription => {
              if (subscription.teamId === event.data.teamId) subscription.callback(data);
            });
            return;
          }
          if (this.listeners[type]) {
            this.listeners[type].forEach(callback => callback(data));
          }
      };
    }

    // 初期化
    this.init();
  }

  getQuizPath(path) {
    const normalizedPath = path.replace(/^quiz\/?/, '');
    return this.activeQuizId === 'default'
      ? `quiz/${normalizedPath}`
      : `quizLibrary/${this.activeQuizId}/${normalizedPath}`;
  }

  getLocalKey(key) {
    return this.activeQuizId === 'default' ? key : `${key}_${this.activeQuizId}`;
  }

  quizRef(path) {
    return this.database.ref(this.getQuizPath(path));
  }

  getQuizList() {
    try {
      const list = JSON.parse(localStorage.getItem('quiz_library') || 'null');
      return Array.isArray(list) && list.length ? list : [{ id: 'default', name: '既定のクイズ' }];
    } catch {
      return [{ id: 'default', name: '既定のクイズ' }];
    }
  }

  async subscribeQuizList(callback) {
    const publish = list => {
      const safeList = Array.isArray(list) && list.length ? list : [{ id: 'default', name: '既定のクイズ' }];
      localStorage.setItem('quiz_library', JSON.stringify(safeList));
      callback(safeList);
    };
    publish(this.getQuizList());
    if (this.isFirebaseReady && this.database) {
      const listRef = this.database.ref('quiz/quizLibrary');
      listRef.on('value', snapshot => {
        const list = snapshot.val();
        if (!Array.isArray(list) || !list.length) {
          const initialList = this.getQuizList();
          listRef.set(initialList);
          publish(initialList);
        } else {
          publish(list);
        }
      });
    }
  }

  async saveQuizList(list) {
    localStorage.setItem('quiz_library', JSON.stringify(list));
    if (this.isFirebaseReady && this.database) {
      await this.database.ref('quiz/quizLibrary').set(list);
    }
  }

  async selectQuiz(quizId) {
    if (!this.getQuizList().some(quiz => quiz.id === quizId)) return false;
    localStorage.setItem('quiz_active_id', quizId);
    if (this.isFirebaseReady && this.database) {
      await this.database.ref('quiz/activeQuizId').set(quizId);
    }
    this.activeQuizId = quizId;
    if (this.channel) this.channel.postMessage({ type: 'activeQuiz', data: quizId });
    location.reload();
    return true;
  }

  async createQuiz(name) {
    const quizName = String(name || '').trim();
    if (!quizName) return false;
    const list = this.getQuizList();
    const id = `quiz-${Date.now().toString(36)}`;
    const quiz = { id, name: quizName };
    list.push(quiz);
    await this.saveQuizList(list);

    const sourceId = this.activeQuizId;
    this.activeQuizId = id;
    const sourceKey = key => sourceId === 'default' ? key : `${key}_${sourceId}`;
    const copyValue = (key, fallback) => localStorage.getItem(sourceKey(key)) || JSON.stringify(fallback);
    localStorage.setItem(this.getLocalKey('quiz_local_questions'), copyValue('quiz_local_questions', DEFAULT_QUESTIONS));
    localStorage.setItem(this.getLocalKey('quiz_local_question_order'), copyValue('quiz_local_question_order', typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : []));
    localStorage.setItem(this.getLocalKey('quiz_local_team_list'), copyValue('quiz_local_team_list', typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : []));
    localStorage.setItem(this.getLocalKey('quiz_local_state'), JSON.stringify(this.getDefaultState()));
    if (this.isFirebaseReady && this.database) {
      const sourcePath = sourceId === 'default' ? 'quiz' : `quizLibrary/${sourceId}`;
      const targetPath = `quizLibrary/${id}`;
      const [questions, order, teams] = await Promise.all([
        this.database.ref(`${sourcePath}/questions`).once('value'),
        this.database.ref(`${sourcePath}/questionOrder`).once('value'),
        this.database.ref(`${sourcePath}/teamList`).once('value')
      ]);
      const defaultState = this.getDefaultState();
      const copy = {
        [`${targetPath}/questions`]: questions.val() || DEFAULT_QUESTIONS,
        [`${targetPath}/questionOrder`]: order.val() || (typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : []),
        [`${targetPath}/teamList`]: teams.val() || (typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : []),
        [`${targetPath}/state`]: defaultState,
        [`${targetPath}/transition`]: this.getTransitionState(defaultState)
      };
      await this.database.ref().update(copy);
    }
    return this.selectQuiz(id);
  }

  async deleteActiveQuiz() {
    if (this.activeQuizId === 'default') return false;
    const removedId = this.activeQuizId;
    const list = this.getQuizList().filter(quiz => quiz.id !== removedId);
    await this.saveQuizList(list);
    if (this.isFirebaseReady && this.database) {
      await this.database.ref(`quizLibrary/${removedId}`).remove();
    }
    localStorage.setItem('quiz_active_id', 'default');
    return this.selectQuiz('default');
  }

  setupQuizListControls() {
    const selector = document.getElementById('activeQuizSelector');
    const addButton = document.getElementById('btnAddQuiz');
    const deleteButton = document.getElementById('btnDeleteQuiz');
    if (!selector || !addButton || !deleteButton) return;

    this.subscribeQuizList(list => {
      selector.innerHTML = '';
      list.forEach(quiz => {
        const option = document.createElement('option');
        option.value = quiz.id;
        option.textContent = quiz.name;
        selector.appendChild(option);
      });
      selector.value = this.activeQuizId;
      deleteButton.disabled = this.activeQuizId === 'default';
    });
    selector.addEventListener('change', () => this.selectQuiz(selector.value));
    addButton.addEventListener('click', async () => {
      const name = prompt('新しいクイズ名を入力してください');
      if (name === null) return;
      if (!name.trim()) {
        alert('クイズ名を入力してください。');
        return;
      }
      await this.createQuiz(name);
    });
    deleteButton.addEventListener('click', async () => {
      const activeQuiz = this.getQuizList().find(quiz => quiz.id === this.activeQuizId);
      if (!activeQuiz || this.activeQuizId === 'default') return;
      if (confirm(`「${activeQuiz.name}」を一覧と保存データから削除しますか？`)) {
        await this.deleteActiveQuiz();
      }
    });
  }

  init() {
    const isConfigured = FirebaseManager.isConfigured();
    if (isConfigured && typeof firebase !== 'undefined') {
      try {
        const config = FirebaseManager.getConfig();
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.database = firebase.database();
        this.isFirebaseReady = true;
        this.isConnectedToFirebase = false;

        this.database.ref('quiz/activeQuizId').on('value', snapshot => {
          const quizId = snapshot.val() || 'default';
          if (quizId !== this.activeQuizId) {
            this.activeQuizId = quizId;
            localStorage.setItem('quiz_active_id', quizId);
            location.reload();
          }
        });

        // Firebase公式の接続状態監視
        this.database.ref('.info/connected').on('value', snap => {
          this.isConnectedToFirebase = (snap.val() === true);
          console.log(`QuizStore: Firebase connection state => ${this.isConnectedToFirebase ? "ONLINE (Connected)" : "CONNECTING / OFFLINE"}`);
          if (this.listeners.connection) {
            this.listeners.connection.forEach(cb => cb(this.isConnectedToFirebase));
          }
        });

        console.log("QuizStore: Connected to Firebase Realtime Database");
      } catch (err) {
        console.warn("QuizStore: Firebase init failed, falling back to local mode", err);
        this.isFirebaseReady = false;
      }
    } else {
      console.log("QuizStore: Running in Local Fallback mode (BroadcastChannel & LocalStorage)");
      this.isFirebaseReady = false;
    }

    window.addEventListener('storage', event => {
      if (event.key === 'quiz_active_id' && event.newValue && event.newValue !== this.activeQuizId) {
        location.reload();
      }
    });
    if (this.channel) {
      this.channel.addEventListener('message', event => {
        if (event.data?.type === 'activeQuiz' && event.data.data !== this.activeQuizId) location.reload();
      });
    }
  }

  subscribeConnection(callback) {
    if (!this.listeners.connection) this.listeners.connection = [];
    this.listeners.connection.push(callback);
    callback(Boolean(this.isConnectedToFirebase));
  }

  // --- デフォルト初期状態 ---
  getDefaultState() {
    return {
      status: 'stopped', // 'running' | 'stopped'
      currentScene: 'waiting', // 'waiting' | 'question' | 'closed' | 'result' | 'final'
      currentQuestionIndex: 0,
      questionStartTime: 0,
      playerQrVisible: false,
      finalResultsRevealed: false,
      targetTeamCount: 100, // ユーザー要望：人数のデフォルトは100組
      rankDisplayLimit: 999, // 順位を表示する問題数上限（例: 5問目まで表示など）
      resetToken: 0, // 全体初期化トークン
      scoreConfig: { ...DEFAULT_SCORE_CONFIG },
      updatedAt: Date.now()
    };
  }

  getTransitionState(state) {
    return {
      status: state.status,
      currentScene: state.currentScene,
      currentQuestionIndex: state.currentQuestionIndex,
      questionStartTime: state.questionStartTime,
      updatedAt: state.updatedAt
    };
  }

  publishState(state) {
    const updated = { ...state };
    if (this.latestTransition
      && Number(this.latestTransition.updatedAt) > Number(updated.updatedAt)) {
      Object.assign(updated, this.latestTransition);
    }
    if (this.latestState
      && Number(this.latestState.updatedAt) === Number(updated.updatedAt)
      && JSON.stringify(this.latestState) === JSON.stringify(updated)) {
      return;
    }
    this.latestState = updated;
    localStorage.setItem(this.getLocalKey('quiz_local_state'), JSON.stringify(updated));
    this.listeners.state.forEach(callback => callback(updated));
  }

  // --- 状態の取得・購読 ---

  subscribeState(callback) {
    this.listeners.state.push(callback);

    // 1. まずローカルの最新状態またはデフォルト値を即座に同期返却（画面の初期化を即座に完了させる）
    const local = localStorage.getItem(this.getLocalKey('quiz_local_state'));
    const initialState = local ? JSON.parse(local) : this.getDefaultState();
    this.latestState = initialState;
    callback(initialState);

    // 2. Firebaseが有効な場合はリスナーを登録
    if (this.isFirebaseReady && this.database) {
      const stateRef = this.quizRef('state');
      stateRef.on('value', snapshot => {
        if (!snapshot.exists()) {
          // Firebase側が空の場合はデフォルト状態を自動投入
          const defaultState = this.getDefaultState();
          this.database.ref().update({
            [this.getQuizPath('state')]: defaultState,
            [this.getQuizPath('transition')]: this.getTransitionState(defaultState)
          }).catch(err => console.warn("QuizStore: Firebase state initialization failed:", err));
          this.publishState(defaultState);
        } else {
          const val = snapshot.val() || this.getDefaultState();
          this.publishState(val);
        }
      }, err => {
        console.warn("QuizStore: Firebase subscribeState error:", err);
      });

      this.quizRef('transition').on('value', snapshot => {
        const transition = snapshot.val();
        if (!transition) return;
        if (Number(transition.updatedAt) < Number(this.latestTransition && this.latestTransition.updatedAt || 0)) return;
        this.latestTransition = transition;
        this.publishState(this.latestState || this.getDefaultState());
      }, err => {
        console.warn("QuizStore: Firebase subscribeTransition error:", err);
      });
    }
  }

  async updateState(partialState) {
    const current = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_state')) || JSON.stringify(this.getDefaultState()));
    const updated = { ...current, ...partialState, updatedAt: Math.max(Date.now(), Number(current.updatedAt || 0) + 1) };
    const transitionKeys = ['status', 'currentScene', 'currentQuestionIndex', 'questionStartTime'];
    const updatesTransition = transitionKeys.some(key => Object.prototype.hasOwnProperty.call(partialState, key));
    if (updatesTransition) {
      this.latestTransition = this.getTransitionState(updated);
    }

    if (this.channel) {
      this.channel.postMessage({ type: 'state', data: updated });
    }
    this.publishState(updated);

    if (this.isFirebaseReady && this.database) {
      try {
        const updates = {};
        Object.keys(partialState).forEach(key => {
          updates[this.getQuizPath(`state/${key}`)] = partialState[key];
        });
        updates[this.getQuizPath('state/updatedAt')] = updated.updatedAt;

        if (updatesTransition) {
          updates[this.getQuizPath('transition')] = this.latestTransition;
        }
        await this.database.ref().update(updates);
      } catch (err) {
        console.warn("QuizStore: Firebase updateState failed:", err);
      }
    }
  }

  // --- 問題リストの取得・更新 ---

  subscribeQuestions(callback) {
    this.listeners.questions.push(callback);

    // 1. まず即座にデフォルト問題またはローカル保存問題を返却（描画ブロックを防止）
    const local = localStorage.getItem(this.getLocalKey('quiz_local_questions'));
    const initialQuestions = local ? JSON.parse(local) : DEFAULT_QUESTIONS;
    callback(initialQuestions);

    // 2. Firebaseが有効な場合はリスナー登録
    if (this.isFirebaseReady && this.database) {
      const qRef = this.quizRef('questions');
      qRef.on('value', snapshot => {
        if (!snapshot.exists()) {
          // Firebase側にまだ問題データがない場合はデフォルト問題を自動シード
          console.log("QuizStore: Seeding initial questions to Firebase");
          qRef.set(DEFAULT_QUESTIONS);
          callback(DEFAULT_QUESTIONS);
        } else {
          const val = snapshot.val();
          callback(val && val.length ? val : DEFAULT_QUESTIONS);
        }
      }, err => {
        console.warn("QuizStore: Firebase subscribeQuestions error:", err);
      });
    }
  }

  async saveQuestions(questions) {
    localStorage.setItem(this.getLocalKey('quiz_local_questions'), JSON.stringify(questions));
    if (this.channel) {
      this.channel.postMessage({ type: 'questions', data: questions });
    }
    this.listeners.questions.forEach(cb => cb(questions));

    if (this.isFirebaseReady && this.database) {
      try {
        await this.quizRef('questions').set(questions);
      } catch (err) {
        console.warn("QuizStore: Firebase saveQuestions failed:", err);
      }
    }
  }

  subscribeHostMemo(callback) {
    this.listeners.hostMemo.push(callback);
    const localKey = this.getLocalKey('quiz_local_host_memo');
    const localMemo = localStorage.getItem(localKey) || '';
    callback(localMemo);

    if (this.isFirebaseReady && this.database) {
      const memoRef = this.quizRef('hostMemo');
      memoRef.on('value', snapshot => {
        if (!snapshot.exists()) {
          const latestLocalMemo = localStorage.getItem(localKey) || '';
          if (latestLocalMemo) memoRef.set(latestLocalMemo);
          callback(latestLocalMemo);
          return;
        }
        const memo = String(snapshot.val() || '');
        localStorage.setItem(localKey, memo);
        callback(memo);
      }, err => {
        console.warn('QuizStore: Firebase subscribeHostMemo error:', err);
      });
    }
  }

  async saveHostMemo(memo) {
    const value = String(memo);
    localStorage.setItem(this.getLocalKey('quiz_local_host_memo'), value);
    if (this.channel) {
      this.channel.postMessage({ type: 'hostMemo', data: value });
    }
    this.listeners.hostMemo.forEach(callback => callback(value));

    if (this.isFirebaseReady && this.database) {
      try {
        await this.quizRef('hostMemo').set(value);
      } catch (err) {
        console.warn('QuizStore: Firebase saveHostMemo failed:', err);
        throw err;
      }
    }
  }

  // --- チーム登録・得点管理 ---

  subscribeTeams(callback) {
    this.listeners.teams.push(callback);

    const local = localStorage.getItem(this.getLocalKey('quiz_local_teams'));
    const initialTeams = local ? JSON.parse(local) : {};
    callback(initialTeams);

    if (this.isFirebaseReady && this.database) {
      this.quizRef('teams').on('value', snapshot => {
        const val = snapshot.val() || {};
        localStorage.setItem(this.getLocalKey('quiz_local_teams'), JSON.stringify(val));
        callback(val);
      }, err => {
        console.warn("QuizStore: Firebase subscribeTeams error:", err);
      });
    }
  }

  async getTeams() {
    const cachedTeams = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_teams')) || '{}');
    if (this.isFirebaseReady && this.database) {
      try {
        const snapshot = await this.quizRef('teams').once('value');
        const teams = snapshot.val() || {};
        localStorage.setItem(this.getLocalKey('quiz_local_teams'), JSON.stringify(teams));
        return teams;
      } catch (err) {
        console.warn("QuizStore: getTeams failed, using cached teams:", err);
        if (!Object.keys(cachedTeams).length) throw err;
      }
    }
    return cachedTeams;
  }

  async registerTeam(teamId, teamName) {
    if (this.isFirebaseReady && this.database) {
      const teamRef = this.quizRef(`teams/${teamId}`);
      const snapshot = await teamRef.once('value');
      let team;
      if (!snapshot.exists()) {
        team = {
          teamId,
          teamName,
          totalScore: 0,
          registeredAt: Date.now()
        };
        await teamRef.set(team);
      } else {
        team = { ...snapshot.val(), teamName, lastActive: Date.now() };
        await teamRef.update({ teamName, lastActive: team.lastActive });
      }
      const teams = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_teams')) || '{}');
      teams[teamId] = team;
      localStorage.setItem(this.getLocalKey('quiz_local_teams'), JSON.stringify(teams));
      if (this.channel) this.channel.postMessage({ type: 'teams', data: teams });
      this.listeners.teams.forEach(cb => cb(teams));
    } else {
      const teams = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_teams')) || '{}');
      if (!teams[teamId]) {
        teams[teamId] = {
          teamId,
          teamName,
          totalScore: 0,
          registeredAt: Date.now()
        };
      } else {
        teams[teamId].teamName = teamName;
        teams[teamId].lastActive = Date.now();
      }
      localStorage.setItem(this.getLocalKey('quiz_local_teams'), JSON.stringify(teams));
      if (this.channel) {
        this.channel.postMessage({ type: 'teams', data: teams });
      }
      this.listeners.teams.forEach(cb => cb(teams));
    }
  }

  async claimTeamSession(teamId, sessionId) {
    const session = { sessionId, updatedAt: Date.now() };
    if (this.isFirebaseReady && this.database) {
      const result = await this.quizRef(`teamSessions/${encodeURIComponent(teamId)}`).transaction(() => session);
      if (!result.committed) {
        throw new Error('チームの回答権を取得できませんでした。');
      }
    }

    localStorage.setItem(this.getLocalKey(`quiz_team_session_${teamId}`), JSON.stringify(session));
    if (this.channel) {
      this.channel.postMessage({ type: 'teamSession', teamId, data: session });
    }
  }

  subscribeTeamSession(teamId, callback) {
    const subscription = { teamId, callback };
    this.listeners.teamSessions.push(subscription);
    const localKey = this.getLocalKey(`quiz_team_session_${teamId}`);
    const localSession = localStorage.getItem(localKey);
    if (localSession) callback(JSON.parse(localSession));

    let firebaseRef = null;
    let firebaseCallback = null;
    if (this.isFirebaseReady && this.database) {
      firebaseRef = this.quizRef(`teamSessions/${encodeURIComponent(teamId)}`);
      firebaseCallback = snapshot => {
        callback(snapshot.val());
      };
      firebaseRef.on('value', firebaseCallback, err => {
        console.warn(`QuizStore: Firebase subscribeTeamSession error for ${teamId}:`, err);
      });
    }

    const storageCallback = event => {
      if (event.key === localKey) {
        callback(event.newValue ? JSON.parse(event.newValue) : null);
      }
    };
    window.addEventListener('storage', storageCallback);

    return () => {
      this.listeners.teamSessions = this.listeners.teamSessions.filter(item => item !== subscription);
      if (firebaseRef && firebaseCallback) firebaseRef.off('value', firebaseCallback);
      window.removeEventListener('storage', storageCallback);
    };
  }

  async isTeamSessionActive(teamId, sessionId) {
    if (this.isFirebaseReady && this.database) {
      const snapshot = await this.quizRef(`teamSessions/${encodeURIComponent(teamId)}`).once('value');
      const activeSession = snapshot.val();
      return Boolean(activeSession && activeSession.sessionId === sessionId);
    }
    const serializedSession = localStorage.getItem(
      this.getLocalKey(`quiz_team_session_${teamId}`)
    );
    if (!serializedSession) return false;
    return JSON.parse(serializedSession).sessionId === sessionId;
  }

  // --- 出題順 (Question Order) の取得・更新 ---

  subscribeQuestionOrder(callback) {
    if (!this.listeners.questionOrder) this.listeners.questionOrder = [];
    this.listeners.questionOrder.push(callback);

    const local = localStorage.getItem(this.getLocalKey('quiz_local_question_order'));
    const initialOrder = local ? JSON.parse(local) : (typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5]);
    callback(initialOrder);

    if (this.isFirebaseReady && this.database) {
      const orderRef = this.quizRef('questionOrder');
      orderRef.on('value', snapshot => {
        if (!snapshot.exists()) {
          orderRef.set(initialOrder);
          callback(initialOrder);
        } else {
          const val = snapshot.val();
          callback(Array.isArray(val) && val.length ? val : initialOrder);
        }
      }, err => {
        console.warn("QuizStore: Firebase subscribeQuestionOrder error:", err);
      });
    }
  }

  async saveQuestionOrder(order) {
    localStorage.setItem(this.getLocalKey('quiz_local_question_order'), JSON.stringify(order));
    if (this.channel) {
      this.channel.postMessage({ type: 'questionOrder', data: order });
    }
    if (this.listeners.questionOrder) {
      this.listeners.questionOrder.forEach(cb => cb(order));
    }

    if (this.isFirebaseReady && this.database) {
      try {
        await this.quizRef('questionOrder').set(order);
      } catch (err) {
        console.warn("QuizStore: Firebase saveQuestionOrder failed:", err);
      }
    }
  }

  // --- 参加チーム名マスターリストの取得・更新 ---

  subscribeTeamList(callback) {
    if (!this.listeners.teamList) this.listeners.teamList = [];
    this.listeners.teamList.push(callback);

    const local = localStorage.getItem(this.getLocalKey('quiz_local_team_list'));
    const initialList = local ? JSON.parse(local) : (typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : []);
    callback(initialList);

    if (this.isFirebaseReady && this.database) {
      const listRef = this.quizRef('teamList');
      listRef.on('value', snapshot => {
        if (!snapshot.exists()) {
          listRef.set(initialList);
          callback(initialList);
        } else {
          const val = snapshot.val();
          callback(Array.isArray(val) && val.length ? val : initialList);
        }
      }, err => {
        console.warn("QuizStore: Firebase subscribeTeamList error:", err);
      });
    }
  }

  async saveTeamList(list) {
    localStorage.setItem(this.getLocalKey('quiz_local_team_list'), JSON.stringify(list));
    if (this.channel) {
      this.channel.postMessage({ type: 'teamList', data: list });
    }
    if (this.listeners.teamList) {
      this.listeners.teamList.forEach(cb => cb(list));
    }

    if (this.isFirebaseReady && this.database) {
      try {
        await this.quizRef('teamList').set(list);
      } catch (err) {
        console.warn("QuizStore: Firebase saveTeamList failed:", err);
      }
    }
  }

  /**
   * 出題順リストに従って問題配列を整列して返すヘルパー
   */
  getOrderedQuestions(questions, order) {
    const visibleQuestions = questions.filter(question => !question.hidden);
    if (!order || !order.length) return visibleQuestions;
    const qMap = new Map(visibleQuestions.map(question => [String(question.id), question]));
    const orderedIds = new Set();

    const ordered = [];
    order.forEach(id => {
      const question = qMap.get(String(id));
      if (question && !orderedIds.has(String(id))) {
        ordered.push(question);
        orderedIds.add(String(id));
      }
    });

    // orderに載っていない問題があれば後ろに追加
    visibleQuestions.forEach(question => {
      if (!orderedIds.has(String(question.id))) {
        ordered.push(question);
      }
    });

    return ordered;
  }

  /**
   * 【完全初期化】チームデータ・得点・回答履歴をすべて完全にリセットする
   */
  async resetAllData(scoreConfig) {
    const localState = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_state')) || '{}');
    const defaultState = this.getDefaultState();
    defaultState.scoreConfig = scoreConfig || localState.scoreConfig || defaultState.scoreConfig;
    defaultState.resetToken = Date.now(); // 端末強制ログアウトリセット用トークン

    if (this.isFirebaseReady && this.database) {
      try {
        await this.database.ref().update({
          [this.getQuizPath('teams')]: null,
          [this.getQuizPath('answers')]: null,
          [this.getQuizPath('results')]: null,
          [this.getQuizPath('teamSessions')]: null,
          [this.getQuizPath('state')]: defaultState,
          [this.getQuizPath('transition')]: this.getTransitionState(defaultState)
        });
      } catch (err) {
        console.error("QuizStore: Firebase resetAllData failed:", err);
        throw err;
      }
    }

    // ローカルキャッシュクリア
    localStorage.setItem(this.getLocalKey('quiz_local_teams'), '{}');
    localStorage.removeItem(this.getLocalKey('quiz_local_answers'));
    localStorage.removeItem(this.getLocalKey('quiz_local_results'));
    Object.keys(localStorage)
      .filter(key => key.startsWith('quiz_team_session_')
        && (this.activeQuizId === 'default' || key.endsWith(`_${this.activeQuizId}`)))
      .forEach(key => localStorage.removeItem(key));
    this.listeners.teams.forEach(cb => cb({}));
    if (this.channel) {
      this.channel.postMessage({ type: 'teams', data: {} });
    }
    this.latestTransition = this.getTransitionState(defaultState);
    this.publishState(defaultState);

    if (this.channel) {
      this.channel.postMessage({ type: 'state', data: defaultState });
      this.channel.postMessage({ type: 'answers', data: {} });
      this.channel.postMessage({ type: 'resetAll', resetToken: defaultState.resetToken });
    }

    this.listeners.answers.forEach(subscription => subscription.callback({}));
  }

  async resetGameData() {
    return this.resetAllData();
  }

  /**
   * 参加チーム自体の全削除
   */
  async clearAllTeams() {
    if (this.isFirebaseReady && this.database) {
      await this.quizRef('teams').remove();
      await this.quizRef('answers').remove();
      await this.quizRef('results').remove();
    } else {
      localStorage.setItem(this.getLocalKey('quiz_local_teams'), '{}');
      localStorage.removeItem(this.getLocalKey('quiz_local_answers'));
      localStorage.removeItem(this.getLocalKey('quiz_local_results'));
      if (this.channel) {
        this.channel.postMessage({ type: 'teams', data: {} });
        this.channel.postMessage({ type: 'answers', data: {} });
      }
      this.listeners.teams.forEach(cb => cb({}));
      this.listeners.answers.forEach(subscription => subscription.callback({}));
    }
  }

  // --- 回答の送信・集計 ---

  subscribeAnswers(questionId, callback) {
    const subscription = { questionId, callback };
    this.listeners.answers.push(subscription);

    let firebaseRef = null;
    let firebaseCallback = null;
    if (this.isFirebaseReady && this.database) {
      firebaseRef = this.quizRef(`answers/${questionId}`);
      firebaseCallback = snapshot => {
        const val = snapshot.val() || {};
        callback(val);
      };
      firebaseRef.on('value', firebaseCallback);
    } else {
      const allAnswers = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_answers')) || '{}');
      const qAnswers = allAnswers[questionId] || {};
      callback(qAnswers);
    }

    return () => {
      this.listeners.answers = this.listeners.answers.filter(item => item !== subscription);
      if (firebaseRef && firebaseCallback) firebaseRef.off('value', firebaseCallback);
    };
  }

  async submitAnswer(questionId, teamId, teamName, answer, answerTimeMs, answerType = 'choice', sessionId = null) {
    if (sessionId && !await this.isTeamSessionActive(teamId, sessionId)) {
      throw new Error('別の端末がこのチームの回答権を引き継いだため、ログアウトしました。');
    }

    let state = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_state')) || 'null');
    if (this.isFirebaseReady && this.database) {
      const stateSnapshot = await this.quizRef('state').once('value');
      state = stateSnapshot.val();
    }
    if (!state || state.status !== 'running' || state.currentScene !== 'question') {
      throw new Error('回答受付は終了しました。');
    }

    const answerData = {
      teamId,
      teamName,
      answerTimeMs: Number(answerTimeMs),
      answeredAt: Date.now()
    };
    if (answerType === 'text') {
      answerData.answerText = String(answer);
      const question = await this.getQuestionById(questionId);
      if (question && question.answerType === 'text'
        && isTextAnswerCorrect(answerData.answerText, question.answer)) {
        answerData.manualIsCorrect = true;
        answerData.gradeSource = 'automatic';
        answerData.gradedAt = Date.now();
      }
    } else {
      answerData.selectedOption = Number(answer);
    }

    if (sessionId && !await this.isTeamSessionActive(teamId, sessionId)) {
      throw new Error('別の端末がこのチームの回答権を引き継いだため、ログアウトしました。');
    }

    const allAnswers = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_answers')) || '{}');
    if (!allAnswers[questionId]) allAnswers[questionId] = {};
    allAnswers[questionId][teamId] = answerData;
    localStorage.setItem(this.getLocalKey('quiz_local_answers'), JSON.stringify(allAnswers));

    if (this.isFirebaseReady && this.database) {
      await this.quizRef(`answers/${questionId}/${teamId}`).set(answerData);
    } else {
      this.publishAnswers(allAnswers[questionId], questionId);
    }
  }

  async getQuestionById(questionId) {
    if (this.isFirebaseReady && this.database) {
      const snapshot = await this.quizRef('questions').once('value');
      const questions = Object.values(snapshot.val() || DEFAULT_QUESTIONS);
      return questions.find(question => String(question.id) === String(questionId)) || null;
    }
    const questions = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_questions')) || 'null') || DEFAULT_QUESTIONS;
    return questions.find(question => String(question.id) === String(questionId)) || null;
  }

  publishAnswers(answers, questionId) {
    if (this.channel) {
      this.channel.postMessage({ type: 'answers', questionId, data: answers });
    }
    this.listeners.answers.forEach(subscription => {
      if (subscription.questionId === questionId) subscription.callback(answers);
    });
  }

  async setManualGrade(question, teamId, isCorrect) {
    if (question.answerType !== 'text') {
      throw new Error('記述式問題のみ手動採点できます。');
    }

    const answers = await this.getAnswersForQuestion(question.id);
    const answer = answers[teamId];
    if (!answer || typeof answer.answerText !== 'string') {
      throw new Error('採点対象の回答が見つかりません。');
    }
    answer.manualIsCorrect = Boolean(isCorrect);
    answer.gradeSource = 'manual';
    answer.gradedAt = Date.now();

    const allAnswers = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_answers')) || '{}');
    allAnswers[question.id] = answers;
    localStorage.setItem(this.getLocalKey('quiz_local_answers'), JSON.stringify(allAnswers));
    if (this.isFirebaseReady && this.database) {
      await this.quizRef(`answers/${question.id}/${teamId}`).update({
        manualIsCorrect: answer.manualIsCorrect,
        gradeSource: answer.gradeSource,
        gradedAt: answer.gradedAt
      });
    } else {
      this.publishAnswers(allAnswers[question.id], question.id);
    }

    const previousResults = await this.getQuestionResults(question.id);
    if (!previousResults || !previousResults.results) return;

    let teams = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_teams')) || '{}');
    let state = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_state')) || JSON.stringify(this.getDefaultState()));
    if (this.isFirebaseReady && this.database) {
      const [teamsSnapshot, stateSnapshot] = await Promise.all([
        this.quizRef('teams').once('value'),
        this.quizRef('state').once('value')
      ]);
      teams = teamsSnapshot.val() || {};
      state = stateSnapshot.val() || state;
    }

    const scoreConfig = state.scoreConfig || DEFAULT_SCORE_CONFIG;
    const scoreResult = ScoreEngine.calculateQuestionScores(
      Object.values(allAnswers[question.id]),
      question.answer,
      scoreConfig,
      getPointMultiplier(question)
    );
    const updatedTeams = { ...teams };
    Object.keys(scoreResult.results).forEach(id => {
      if (!updatedTeams[id]) return;
      const previousPoints = Number(previousResults.results[id]?.pointsAwarded) || 0;
      const nextPoints = Number(scoreResult.results[id].pointsAwarded) || 0;
      updatedTeams[id] = {
        ...updatedTeams[id],
        totalScore: Math.max(0, (Number(updatedTeams[id].totalScore) || 0) + nextPoints - previousPoints)
      };
    });
    await this.saveQuestionResults(question.id, scoreResult, updatedTeams);
  }

  async getAnswersForQuestion(questionId) {
    if (this.isFirebaseReady && this.database) {
      const snap = await this.quizRef(`answers/${questionId}`).once('value');
      return snap.val() || {};
    } else {
      const allAnswers = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_answers')) || '{}');
      return allAnswers[questionId] || {};
    }
  }

  // --- 正解判定・スコア保存 ---

  async saveQuestionResults(questionId, calculationResults, updatedTeams) {
    // ローカルキャッシュも即座に更新
    const allResults = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_results')) || '{}');
    allResults[questionId] = calculationResults;
    localStorage.setItem(this.getLocalKey('quiz_local_results'), JSON.stringify(allResults));
    localStorage.setItem(this.getLocalKey('quiz_local_teams'), JSON.stringify(updatedTeams));

    if (this.channel) {
      this.channel.postMessage({ type: 'results', questionId, data: calculationResults });
      this.channel.postMessage({ type: 'teams', data: updatedTeams });
    }
    this.listeners.teams.forEach(cb => cb(updatedTeams));

    if (this.isFirebaseReady && this.database) {
      const updates = {};
      updates[this.getQuizPath(`results/${questionId}`)] = calculationResults;
      Object.keys(updatedTeams).forEach(id => {
        updates[this.getQuizPath(`teams/${id}/totalScore`)] = updatedTeams[id].totalScore;
      });
      await this.database.ref().update(updates);
    }
  }

  async getQuestionResults(questionId) {
    if (this.isFirebaseReady && this.database) {
      try {
        const snap = await this.quizRef(`results/${questionId}`).once('value');
        const val = snap.val();
        if (val) return val;
      } catch (err) {
        console.warn(`QuizStore: getQuestionResults failed for ${questionId}, falling back to cache:`, err);
      }
    }
    const allResults = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_results')) || '{}');
    return allResults[questionId] || null;
  }

  /**
   * 結果データのリアルタイム購読（Firebase遅延時にも自動反映・再読込不要化）
   * @param {string|number} questionId
   * @param {function} callback 
   * @returns {function} unsubscribe関数
   */
  subscribeQuestionResults(questionId, callback) {
    // 1. ローカルキャッシュに既にあれば即時コールバック
    const allResults = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_results')) || '{}');
    if (allResults[questionId]) {
      callback(allResults[questionId]);
    }

    // 2. Firebase Realtime Database による監視
    let firebaseRef = null;
    let firebaseCallback = null;

    if (this.isFirebaseReady && this.database) {
      firebaseRef = this.quizRef(`results/${questionId}`);
      firebaseCallback = snapshot => {
        const val = snapshot.val();
        if (val) {
          // ローカルキャッシュも同期
          const currentLocal = JSON.parse(localStorage.getItem(this.getLocalKey('quiz_local_results')) || '{}');
          currentLocal[questionId] = val;
          localStorage.setItem(this.getLocalKey('quiz_local_results'), JSON.stringify(currentLocal));
          callback(val);
        }
      };
      firebaseRef.on('value', firebaseCallback, err => {
        console.warn(`QuizStore: Firebase subscribeQuestionResults error for ${questionId}:`, err);
      });
    }

    // 3. BroadcastChannel 受信
    const channelHandler = (event) => {
      if (event.data && event.data.type === 'results' && event.data.questionId === questionId) {
        callback(event.data.data);
      }
    };
    if (this.channel) {
      this.channel.addEventListener('message', channelHandler);
    }

    // クリーンアップ関数
    return () => {
      if (firebaseRef && firebaseCallback) {
        firebaseRef.off('value', firebaseCallback);
      }
      if (this.channel) {
        this.channel.removeEventListener('message', channelHandler);
      }
    };
  }
}

// グローバルインスタンス
const quizStore = new QuizStore();
