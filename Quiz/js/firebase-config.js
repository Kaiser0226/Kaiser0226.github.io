/**
 * Firebase設定ファイル
 * 
 * 【Firebaseの接続設定方法】
 * 1. 下記の firebaseConfig オブジェクトに、Firebase Console から取得した設定情報を貼り付けてください。
 * 2. または、管理者画面 (admin.html) の「⚙️ 設定」モーダルから直接貼り付けて保存することも可能です。
 */

const FIREBASE_CONFIG_DEFAULT = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

class FirebaseManager {
  static getConfig() {
    // LocalStorageに保存されたカスタム設定があれば優先
    const saved = localStorage.getItem('quiz_firebase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.apiKey !== "YOUR_API_KEY") {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved firebase config:", e);
      }
    }
    return FIREBASE_CONFIG_DEFAULT;
  }

  static saveConfig(config) {
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
      config.databaseURL &&
      !config.databaseURL.includes("YOUR_PROJECT_ID")
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FIREBASE_CONFIG_DEFAULT, FirebaseManager };
}
