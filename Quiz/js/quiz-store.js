/**
 * クイズ状態管理ストア (QuizStore)
 * Firebase Realtime Database と ローカル通信 (BroadcastChannel / LocalStorage) の両対応
 */

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

  // --- デフォルト初期状態 ---
  getDefaultState() {
    return {
      status: 'stopped', // 'running' | 'stopped'
      currentScene: 'waiting', // 'waiting' | 'question' | 'closed' | 'result' | 'final'
      currentQuestionIndex: 0,
      questionStartTime: 0,
      timerDuration: 15,
      isTimerRunning: false,
      remainingSeconds: 15,
      targetTeamCount: 100, // ユーザー要望：人数のデフォルトは100組
      rankDisplayLimit: 999, // 順位を表示する問題数上限（例: 5問目まで表示など）
      scoreConfig: {
        basePoint: 10,
        top1Bonus: 10,
        top2Bonus: 7,
        top3Bonus: 5,
        topHalfBonus: 5,
        bottomHalfBonus: 2,
        soloBonus: 30
      },
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

  /**
   * 全チームの得点と回答履歴をリセット
   */
  async resetAllScores() {
    if (this.isFirebaseReady && this.database) {
      // チームのスコアを0にリセット
      const teamsSnap = await this.database.ref('quiz/teams').once('value');
      const teams = teamsSnap.val() || {};
      const updates = {};
      Object.keys(teams).forEach(id => {
        updates[`quiz/teams/${id}/totalScore`] = 0;
      });
      await this.database.ref().update(updates);
      // 回答履歴と結果をクリア
      await this.database.ref('quiz/answers').remove();
      await this.database.ref('quiz/results').remove();
    } else {
      const teams = JSON.parse(localStorage.getItem('quiz_local_teams') || '{}');
      Object.keys(teams).forEach(id => {
        teams[id].totalScore = 0;
      });
      localStorage.setItem('quiz_local_teams', JSON.stringify(teams));
      localStorage.removeItem('quiz_local_answers');
      localStorage.removeItem('quiz_local_results');
      if (this.channel) {
        this.channel.postMessage({ type: 'teams', data: teams });
        this.channel.postMessage({ type: 'answers', data: {} });
      }
      this.listeners.teams.forEach(cb => cb(teams));
      this.listeners.answers.forEach(cb => cb({}));
    }
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
      this.listeners.answers.forEach(cb => cb({}));
    }
  }

  // --- 回答の送信・集計 ---

  subscribeAnswers(questionId, callback) {
    this.listeners.answers.push(callback);

    if (this.isFirebaseReady && this.database) {
      this.database.ref(`quiz/answers/${questionId}`).on('value', snapshot => {
        const val = snapshot.val() || {};
        callback(val);
      });
    } else {
      const allAnswers = JSON.parse(localStorage.getItem('quiz_local_answers') || '{}');
      const qAnswers = allAnswers[questionId] || {};
      callback(qAnswers);
    }
  }

  async submitAnswer(questionId, teamId, teamName, selectedOption, answerTimeMs) {
    const answerData = {
      teamId,
      teamName,
      selectedOption: Number(selectedOption),
      answerTimeMs: Number(answerTimeMs),
      answeredAt: Date.now()
    };

    if (this.isFirebaseReady && this.database) {
      await this.database.ref(`quiz/answers/${questionId}/${teamId}`).set(answerData);
    } else {
      const allAnswers = JSON.parse(localStorage.getItem('quiz_local_answers') || '{}');
      if (!allAnswers[questionId]) allAnswers[questionId] = {};
      allAnswers[questionId][teamId] = answerData;
      localStorage.setItem('quiz_local_answers', JSON.stringify(allAnswers));
      if (this.channel) {
        this.channel.postMessage({ type: 'answers', data: allAnswers[questionId] });
      }
      this.listeners.answers.forEach(cb => cb(allAnswers[questionId]));
    }
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
    if (this.isFirebaseReady && this.database) {
      const updates = {};
      updates[`quiz/results/${questionId}`] = calculationResults;
      Object.keys(updatedTeams).forEach(id => {
        updates[`quiz/teams/${id}/totalScore`] = updatedTeams[id].totalScore;
      });
      await this.database.ref().update(updates);
    } else {
      const allResults = JSON.parse(localStorage.getItem('quiz_local_results') || '{}');
      allResults[questionId] = calculationResults;
      localStorage.setItem('quiz_local_results', JSON.stringify(allResults));
      localStorage.setItem('quiz_local_teams', JSON.stringify(updatedTeams));

      if (this.channel) {
        this.channel.postMessage({ type: 'teams', data: updatedTeams });
      }
      this.listeners.teams.forEach(cb => cb(updatedTeams));
    }
  }

  async getQuestionResults(questionId) {
    if (this.isFirebaseReady && this.database) {
      const snap = await this.database.ref(`quiz/results/${questionId}`).once('value');
      return snap.val();
    } else {
      const allResults = JSON.parse(localStorage.getItem('quiz_local_results') || '{}');
      return allResults[questionId];
    }
  }
}

// グローバルインスタンス
const quizStore = new QuizStore();
