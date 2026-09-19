/**
 * Firebase設定ファイル
 * 
 * 【Firebaseの接続設定方法】
 * 1. 下記の firebaseConfig オブジェクトに、Firebase Console から取得した設定情報を貼り付けてください。
 * 2. または、管理者画面 (admin.html) の「⚙️ 設定」モーダルから直接貼り付けて保存することも可能です。
 */

const FIREBASE_CONFIG_DEFAULT = {
  apiKey: "AIzaSyA-tsN_ANUMirM5lIUte7pOeSvt585nGt8",
  authDomain: "ryoko-quiz.firebaseapp.com",
  databaseURL: "https://ryoko-quiz-default-rtdb.firebaseio.com",
  projectId: "ryoko-quiz",
  storageBucket: "ryoko-quiz.firebasestorage.app",
  messagingSenderId: "675351531312",
  appId: "1:675351531312:web:ad3a5e0d3ae06d59acc2f5",
  measurementId: "G-SFESE0WVH1"
};

class FirebaseManager {
  static getConfig() {
    let config = { ...FIREBASE_CONFIG_DEFAULT };

    // LocalStorageに保存されたカスタム設定があれば優先
    const saved = localStorage.getItem('quiz_firebase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.apiKey !== "YOUR_API_KEY") {
          config = { ...config, ...parsed };
        }
      } catch (e) {
        console.error("Failed to parse saved firebase config:", e);
      }
    }

    // databaseURLが抜けている場合はprojectIdから自動推定
    if (!config.databaseURL && config.projectId) {
      config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
    }

    return config;
  }

  static saveConfig(config) {
    if (!config.databaseURL && config.projectId) {
      config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
    }
    localStorage.setItem('quiz_firebase_config', JSON.stringify(config));
  }

  static resetConfig() {
    localStorage.removeItem('quiz_firebase_config');
  }

  static isConfigured() {
    const config = this.getConfig();
    return Boolean(
      config &&
      config.apiKey &&
      config.apiKey !== "YOUR_API_KEY" &&
      config.projectId
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIREBASE_CONFIG_DEFAULT, FirebaseManager };
}
