/**
 * デフォルト問題データ
 * 各問題のプロパティ:
 * - id: 一意な識別子 (数値または文字列)
 * - question: 問題文
 * - image: 問題画像のパス (空文字の場合は画像なし)
 * - options: 選択肢の配列 (2〜6個)
 *   - text: 選択肢テキスト
 *   - image: 選択肢画像パス (任意)
 * - answer: 選択式の正解インデックス、または記述式の模範解答（文字列または文字列配列）
 * - answerType: 'choice' (省略時) または 'text' (記述式・完全一致自動判定／手動採点)
 * - explanation: 解答解説テキスト
 * - pointMultiplier: 獲得ポイント倍率
 */

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    question: "日本の首都はどこでしょう？",
    image: "",
    options: [
      { text: "東京", image: "" },
      { text: "京都", image: "" },
      { text: "大阪", image: "" },
      { text: "名古屋", image: "" }
    ],
    answer: 0,
    explanation: "現在の日本の首都は東京都です。政治・経済の中心地となっています。",
    pointMultiplier: 1
  },
  {
    id: 2,
    question: "この国旗はどこの国のものでしょう？",
    image: "images/q_2_main.png",
    options: [
      { text: "フランス", image: "" },
      { text: "イタリア", image: "" },
      { text: "ドイツ", image: "" }
    ],
    answer: 1,
    explanation: "緑・白・赤の縦三色旗はイタリア共和国の国旗です。（フランスは青・白・赤）",
    pointMultiplier: 1
  },
  {
    id: 3,
    question: "太陽系で最も大きい惑星はどれでしょう？",
    image: "",
    options: [
      { text: "地球", image: "" },
      { text: "火星", image: "" },
      { text: "木星", image: "" },
      { text: "土星", image: "" },
      { text: "金星", image: "" },
      { text: "海王星", image: "" }
    ],
    answer: 2,
    explanation: "木星は太陽系最大の惑星で、直径は地球の約11倍、質量は地球の約318倍あります。",
    pointMultiplier: 1
  },
  {
    id: 4,
    question: "次のうち、「哺乳類」に分類される動物はどれでしょう？（画像参照）",
    image: "",
    options: [
      { text: "カモノハシ", image: "images/q_4_opt_1.png" },
      { text: "ペンギン", image: "images/q_4_opt_2.png" }
    ],
    answer: 0,
    explanation: "カモノハシは卵を産みますが、母乳で子どもを育てるため哺乳類（単孔目）に分類されます。ペンギンは鳥類です。",
    pointMultiplier: 1
  },
  {
    id: 5,
    question: "富士山の標高は何メートルでしょう？",
    image: "",
    options: [
      { text: "3,333 m", image: "" },
      { text: "3,776 m", image: "" },
      { text: "3,998 m", image: "" },
      { text: "4,120 m", image: "" }
    ],
    answer: 1,
    explanation: "富士山の最高峰（剣ヶ峰）の標高は3,776メートルです。「みななろう（3776）富士山」と覚えられます。",
    pointMultiplier: 2
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_QUESTIONS };
}
