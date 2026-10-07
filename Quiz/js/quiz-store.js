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
    this.firebaseApp = null;
    this.database = null;
    this.isFirebaseReady = false;
    this.listeners = {
      state: [],
      teams: [],
      answers: [],
      questions: []
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
          if (this.listeners[type]) {
            this.listeners[type].forEach(callback => callback(data));
          }
      };
    }

    // 初期化
    this.init();
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
      finalResultsRevealed: false,
      targetTeamCount: 100, // ユーザー要望：人数のデフォルトは100組
      rankDisplayLimit: 999, // 順位を表示する問題数上限（例: 5問目まで表示など）
      resetToken: 0, // 全体初期化トークン
      scoreConfig: { ...DEFAULT_SCORE_CONFIG },
      updatedAt: Date.now()
    };
  }

  // --- 状態の取得・購読 ---

  subscribeState(callback) {
    this.listeners.state.push(callback);

    // 1. まずローカルの最新状態またはデフォルト値を即座に同期返却（画面の初期化を即座に完了させる）
    const local = localStorage.getItem('quiz_local_state');
    const initialState = local ? JSON.parse(local) : this.getDefaultState();
    callback(initialState);

    // 2. Firebaseが有効な場合はリスナーを登録
    if (this.isFirebaseReady && this.database) {
      const stateRef = this.database.ref('quiz/state');
      stateRef.on('value', snapshot => {
        if (!snapshot.exists()) {
          // Firebase側が空の場合はデフォルト状態を自動投入
          stateRef.set(this.getDefaultState());
          callback(this.getDefaultState());
        } else {
          const val = snapshot.val() || this.getDefaultState();
          callback(val);
        }
      }, err => {
        console.warn("QuizStore: Firebase subscribeState error:", err);
      });
    }
  }

  async updateState(partialState) {
    const current = JSON.parse(localStorage.getItem('quiz_local_state') || JSON.stringify(this.getDefaultState()));
    const updated = { ...current, ...partialState, updatedAt: Date.now() };
    localStorage.setItem('quiz_local_state', JSON.stringify(updated));

    if (this.channel) {
      this.channel.postMessage({ type: 'state', data: updated });
    }
    this.listeners.state.forEach(cb => cb(updated));

    if (this.isFirebaseReady && this.database) {
      try {
        await this.database.ref('quiz/state').update({
          ...partialState,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.warn("QuizStore: Firebase updateState failed:", err);
      }
    }
  }

  // --- 問題リストの取得・更新 ---

  subscribeQuestions(callback) {
    this.listeners.questions.push(callback);

    // 1. まず即座にデフォルト問題またはローカル保存問題を返却（描画ブロックを防止）
    const local = localStorage.getItem('quiz_local_questions');
    const initialQuestions = local ? JSON.parse(local) : DEFAULT_QUESTIONS;
    callback(initialQuestions);

    // 2. Firebaseが有効な場合はリスナー登録
    if (this.isFirebaseReady && this.database) {
      const qRef = this.database.ref('quiz/questions');
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
    localStorage.setItem('quiz_local_questions', JSON.stringify(questions));
    if (this.channel) {
      this.channel.postMessage({ type: 'questions', data: questions });
    }
    this.listeners.questions.forEach(cb => cb(questions));

    if (this.isFirebaseReady && this.database) {
      try {
        await this.database.ref('quiz/questions').set(questions);
      } catch (err) {
        console.warn("QuizStore: Firebase saveQuestions failed:", err);
      }
    }
  }

  // --- チーム登録・得点管理 ---

  subscribeTeams(callback) {
    this.listeners.teams.push(callback);

    const local = localStorage.getItem('quiz_local_teams');
    const initialTeams = local ? JSON.parse(local) : {};
    callback(initialTeams);

    if (this.isFirebaseReady && this.database) {
      this.database.ref('quiz/teams').on('value', snapshot => {
        const val = snapshot.val() || {};
        callback(val);
      }, err => {
        console.warn("QuizStore: Firebase subscribeTeams error:", err);
      });
    }
  }

  async registerTeam(teamId, teamName) {
    if (this.isFirebaseReady && this.database) {
      const teamRef = this.database.ref(`quiz/teams/${teamId}`);
      const snapshot = await teamRef.once('value');
      if (!snapshot.exists()) {
        await teamRef.set({
          teamId,
          teamName,
          totalScore: 0,
          registeredAt: Date.now()
        });
      } else {
        await teamRef.update({ teamName, lastActive: Date.now() });
      }
    } else {
      const teams = JSON.parse(localStorage.getItem('quiz_local_teams') || '{}');
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
      localStorage.setItem('quiz_local_teams', JSON.stringify(teams));
      if (this.channel) {
        this.channel.postMessage({ type: 'teams', data: teams });
      }
      this.listeners.teams.forEach(cb => cb(teams));
    }
  }

  // --- 出題順 (Question Order) の取得・更新 ---

  subscribeQuestionOrder(callback) {
    if (!this.listeners.questionOrder) this.listeners.questionOrder = [];
    this.listeners.questionOrder.push(callback);

    const local = localStorage.getItem('quiz_local_question_order');
    const initialOrder = local ? JSON.parse(local) : (typeof DEFAULT_QUESTION_ORDER !== 'undefined' ? DEFAULT_QUESTION_ORDER : [1, 2, 3, 4, 5]);
    callback(initialOrder);

    if (this.isFirebaseReady && this.database) {
      const orderRef = this.database.ref('quiz/questionOrder');
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
    localStorage.setItem('quiz_local_question_order', JSON.stringify(order));
    if (this.channel) {
      this.channel.postMessage({ type: 'questionOrder', data: order });
    }
    if (this.listeners.questionOrder) {
      this.listeners.questionOrder.forEach(cb => cb(order));
    }

    if (this.isFirebaseReady && this.database) {
      try {
        await this.database.ref('quiz/questionOrder').set(order);
      } catch (err) {
        console.warn("QuizStore: Firebase saveQuestionOrder failed:", err);
      }
    }
  }

  // --- 参加チーム名マスターリストの取得・更新 ---

  subscribeTeamList(callback) {
    if (!this.listeners.teamList) this.listeners.teamList = [];
    this.listeners.teamList.push(callback);

    const local = localStorage.getItem('quiz_local_team_list');
    const initialList = local ? JSON.parse(local) : (typeof DEFAULT_TEAM_LIST !== 'undefined' ? DEFAULT_TEAM_LIST : []);
    callback(initialList);

    if (this.isFirebaseReady && this.database) {
      const listRef = this.database.ref('quiz/teamList');
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
    localStorage.setItem('quiz_local_team_list', JSON.stringify(list));
    if (this.channel) {
      this.channel.postMessage({ type: 'teamList', data: list });
    }
    if (this.listeners.teamList) {
      this.listeners.teamList.forEach(cb => cb(list));
    }

    if (this.isFirebaseReady && this.database) {
      try {
        await this.database.ref('quiz/teamList').set(list);
      } catch (err) {
        console.warn("QuizStore: Firebase saveTeamList failed:", err);
      }
    }
  }

  /**
   * 出題順リストに従って問題配列を整列して返すヘルパー
   */
  getOrderedQuestions(questions, order) {
    if (!order || !order.length) return questions;
    const qMap = {};
    questions.forEach(q => {
      qMap[q.id] = q;
    });

    const ordered = [];
    order.forEach(id => {
      if (qMap[id]) {
        ordered.push(qMap[id]);
      }
    });

    // orderに載っていない問題があれば後ろに追加
    questions.forEach(q => {
      if (!order.includes(q.id)) {
        ordered.push(q);
      }
    });

    return ordered.length ? ordered : questions;
  }

  /**
   * 【完全初期化】チームデータ・得点・回答履歴をすべて完全にリセットする
   */
  async resetAllData(scoreConfig) {
    const localState = JSON.parse(localStorage.getItem('quiz_local_state') || '{}');
    const defaultState = this.getDefaultState();
    defaultState.scoreConfig = scoreConfig || localState.scoreConfig || defaultState.scoreConfig;
    defaultState.resetToken = Date.now(); // 端末強制ログアウトリセット用トークン

    if (this.isFirebaseReady && this.database) {
      try {
        await this.database.ref('quiz/teams').remove();
        await this.database.ref('quiz/answers').remove();
        await this.database.ref('quiz/results').remove();
        await this.database.ref('quiz/state').set(defaultState);
      } catch (err) {
        console.error("QuizStore: Firebase resetAllData failed:", err);
      }
    }

    // ローカルキャッシュクリア
    localStorage.removeItem('quiz_local_teams');
    localStorage.removeItem('quiz_local_answers');
    localStorage.removeItem('quiz_local_results');
    localStorage.setItem('quiz_local_state', JSON.stringify(defaultState));

    if (this.channel) {
      this.channel.postMessage({ type: 'state', data: defaultState });
      this.channel.postMessage({ type: 'teams', data: {} });
      this.channel.postMessage({ type: 'answers', data: {} });
      this.channel.postMessage({ type: 'resetAll', resetToken: defaultState.resetToken });
    }

    this.listeners.state.forEach(cb => cb(defaultState));
    this.listeners.teams.forEach(cb => cb({}));
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
      await this.database.ref('quiz/teams').remove();
      await this.database.ref('quiz/answers').remove();
      await this.database.ref('quiz/results').remove();
    } else {
      localStorage.setItem('quiz_local_teams', '{}');
      localStorage.removeItem('quiz_local_answers');
      localStorage.removeItem('quiz_local_results');
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
      firebaseRef = this.database.ref(`quiz/answers/${questionId}`);
      firebaseCallback = snapshot => {
        const val = snapshot.val() || {};
        callback(val);
      };
      firebaseRef.on('value', firebaseCallback);
    } else {
      const allAnswers = JSON.parse(localStorage.getItem('quiz_local_answers') || '{}');
      const qAnswers = allAnswers[questionId] || {};
      callback(qAnswers);
    }

    return () => {
      this.listeners.answers = this.listeners.answers.filter(item => item !== subscription);
      if (firebaseRef && firebaseCallback) firebaseRef.off('value', firebaseCallback);
    };
  }

  async submitAnswer(questionId, teamId, teamName, answer, answerTimeMs, answerType = 'choice') {
    const answerData = {
      teamId,
      teamName,
      answerTimeMs: Number(answerTimeMs),
      answeredAt: Date.now()
    };
    if (answerType === 'text') {
      answerData.answerText = String(answer);
      const question = await this.getQuestionById(questionId);
      if (question && question.answerType === 'text' && String(question.answer || '') !== ''
        && answerData.answerText === String(question.answer)) {
        answerData.manualIsCorrect = true;
        answerData.gradeSource = 'automatic';
        answerData.gradedAt = Date.now();
      }
    } else {
      answerData.selectedOption = Number(answer);
    }

    const allAnswers = JSON.parse(localStorage.getItem('quiz_local_answers') || '{}');
    if (!allAnswers[questionId]) allAnswers[questionId] = {};
    allAnswers[questionId][teamId] = answerData;
    localStorage.setItem('quiz_local_answers', JSON.stringify(allAnswers));

    if (this.isFirebaseReady && this.database) {
      await this.database.ref(`quiz/answers/${questionId}/${teamId}`).set(answerData);
    } else {
      this.publishAnswers(allAnswers[questionId], questionId);
    }
  }

  async getQuestionById(questionId) {
    if (this.isFirebaseReady && this.database) {
      const snapshot = await this.database.ref('quiz/questions').once('value');
      const questions = Object.values(snapshot.val() || DEFAULT_QUESTIONS);
      return questions.find(question => String(question.id) === String(questionId)) || null;
    }
    const questions = JSON.parse(localStorage.getItem('quiz_local_questions') || 'null') || DEFAULT_QUESTIONS;
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

    const allAnswers = JSON.parse(localStorage.getItem('quiz_local_answers') || '{}');
    allAnswers[question.id] = answers;
    localStorage.setItem('quiz_local_answers', JSON.stringify(allAnswers));
    if (this.isFirebaseReady && this.database) {
      await this.database.ref(`quiz/answers/${question.id}/${teamId}`).update({
        manualIsCorrect: answer.manualIsCorrect,
        gradeSource: answer.gradeSource,
        gradedAt: answer.gradedAt
      });
    } else {
      this.publishAnswers(allAnswers[question.id], question.id);
    }

    const previousResults = await this.getQuestionResults(question.id);
    if (!previousResults || !previousResults.results) return;

    let teams = JSON.parse(localStorage.getItem('quiz_local_teams') || '{}');
    let state = JSON.parse(localStorage.getItem('quiz_local_state') || JSON.stringify(this.getDefaultState()));
    if (this.isFirebaseReady && this.database) {
      const [teamsSnapshot, stateSnapshot] = await Promise.all([
        this.database.ref('quiz/teams').once('value'),
        this.database.ref('quiz/state').once('value')
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
      const snap = await this.database.ref(`quiz/answers/${questionId}`).once('value');
      return snap.val() || {};
    } else {
      const allAnswers = JSON.parse(localStorage.getItem('quiz_local_answers') || '{}');
      return allAnswers[questionId] || {};
    }
  }

  // --- 正解判定・スコア保存 ---

  async saveQuestionResults(questionId, calculationResults, updatedTeams) {
    // ローカルキャッシュも即座に更新
    const allResults = JSON.parse(localStorage.getItem('quiz_local_results') || '{}');
    allResults[questionId] = calculationResults;
    localStorage.setItem('quiz_local_results', JSON.stringify(allResults));
    localStorage.setItem('quiz_local_teams', JSON.stringify(updatedTeams));

    if (this.channel) {
      this.channel.postMessage({ type: 'results', questionId, data: calculationResults });
      this.channel.postMessage({ type: 'teams', data: updatedTeams });
    }
    this.listeners.teams.forEach(cb => cb(updatedTeams));

    if (this.isFirebaseReady && this.database) {
      const updates = {};
      updates[`quiz/results/${questionId}`] = calculationResults;
      Object.keys(updatedTeams).forEach(id => {
        updates[`quiz/teams/${id}/totalScore`] = updatedTeams[id].totalScore;
      });
      await this.database.ref().update(updates);
    }
  }

  async getQuestionResults(questionId) {
    if (this.isFirebaseReady && this.database) {
      try {
        const snap = await this.database.ref(`quiz/results/${questionId}`).once('value');
        const val = snap.val();
        if (val) return val;
      } catch (err) {
        console.warn(`QuizStore: getQuestionResults failed for ${questionId}, falling back to cache:`, err);
      }
    }
    const allResults = JSON.parse(localStorage.getItem('quiz_local_results') || '{}');
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
    const allResults = JSON.parse(localStorage.getItem('quiz_local_results') || '{}');
    if (allResults[questionId]) {
      callback(allResults[questionId]);
    }

    // 2. Firebase Realtime Database による監視
    let firebaseRef = null;
    let firebaseCallback = null;

    if (this.isFirebaseReady && this.database) {
      firebaseRef = this.database.ref(`quiz/results/${questionId}`);
      firebaseCallback = snapshot => {
        const val = snapshot.val();
        if (val) {
          // ローカルキャッシュも同期
          const currentLocal = JSON.parse(localStorage.getItem('quiz_local_results') || '{}');
          currentLocal[questionId] = val;
          localStorage.setItem('quiz_local_results', JSON.stringify(currentLocal));
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
