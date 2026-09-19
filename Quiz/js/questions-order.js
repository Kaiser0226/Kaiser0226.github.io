/**
 * 問題の出題順を定義するファイル (questions-order.js)
 * 
 * questions-data.js の各問題の ID を出題したい順番で並べてください。
 */

const DEFAULT_QUESTION_ORDER = [1, 2, 3, 4, 5];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_QUESTION_ORDER };
}
