/**
 * 参加チーム名リスト定義 (teams-data.js)
 * 
 * クイズ大会に参加するチーム名をあらかじめ定義します。
 * スマートフォン回答画面の起動時に、このリストから自分のチームを選択します。
 */

const DEFAULT_TEAM_LIST = Array.from({ length: 60 }, (_, i) => `チーム ${i + 1}`);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_TEAM_LIST };
}
