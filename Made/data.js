// ============================
// シフトデータ
// ============================
// 時間帯定義
const TIME_SLOTS = [
  { id: "t1", label: "9時～" },
  { id: "t2", label: "10時～" },
  { id: "t3", label: "11時～" },
  { id: "t4", label: "12時～" },
  { id: "t5", label: "13時～" },
  { id: "t6", label: "14時～" },
  { id: "t7", label: "15時～" },
];

// ============================
// スタッフデータ
// ============================
// 各スタッフの "details" 配列で、モーダルに表示する項目を自由に追加・削除できます。
// 各項目: { icon: "絵文字", label: "ラベル", value: "内容" }
// 項目の数・種類はスタッフごとに異なっても構いません。
const STAFF = [
  {
    id: 2,
    name: "2",
    ruby: "2",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 4,
    name: "4",
    ruby: "4",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 5,
    name: "はるちゃん",
    ruby: "はるき",
    emoji: "",
    role: "嫉妬担当",
    tags: ["愛らしい", "反逆者の野心家"],
    message: "俺と海と君、I see you.",
    color: "#a5d6a7",
    details: [
      { icon: "📏", label: "好きなタイプ", value: "狐" },
      { icon: "⚖️", label: "体重", value: "象3頭分" },
      { icon: "🎯", label: "趣味", value: "下剋上" },
      { icon: "🔥", label: "自分の好みのパーツ", value: "左手" },
      { icon: "🛠️", label: "特技", value: "諜報活動(暗殺)" }
    ]
  },
  {
    id: 6,
    name: "6",
    ruby: "6",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 9,
    name: "9",
    ruby: "9",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 10,
    name: "10",
    ruby: "10",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 12,
    name: "12",
    ruby: "12",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 13,
    name: "13",
    ruby: "13",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 14,
    name: "つばきちゃん",
    ruby: "つばき",
    emoji: "",
    role: "未詳",
    tags: ["真面目"],
    message: "ぜひ来てね〜！",
    color: "#ff80ab",
    details: [
      { icon: "🎹", label: "趣味", value: "研究・ピアノ" },
      { icon: "🧬", label: "好きな教科", value: "生物" },
      { icon: "🍍", label: "嫌いなもの", value: "パイナップル" },
      { icon: "🎮", label: "好きなゲーム", value: "モンスターハンター・ポケモン" },
      { icon: "🌑", label: "怖いもの", value: "暗いところ" }
    ]
  },
  {
    id: 16,
    name: "16",
    ruby: "16",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 17,
    name: "17",
    ruby: "17",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 18,
    name: "18",
    ruby: "18",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 19,
    name: "きゅま",
    ruby: "きゅうま",
    emoji: "",
    role: "猿",
    tags: ["猿"],
    message: "ホハァッ！！ホハッ！ホホホホッ！！\nキィィーッ！ホハァッ！ホッホッホッ！！\nホハッ！ホハァァァッ！！",
    color: "#205ba9",
    details: [
      { icon: "🙈", label: "ホホハ", value: "ホハ" },
      { icon: "🐒", label: "ホハホハ", value: "ホホホ" },
      { icon: "🙉", label: "ホハハハ", value: "ホホハ" },
      { icon: "🙊", label: "ホハ", value: "ホハホハ" },
      { icon: "🦧", label: "ホホホ", value: "ホハハハ" }
    ]
  },
  {
    id: 22,
    name: "22",
    ruby: "22",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 23,
    name: "23",
    ruby: "23",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 24,
    name: "24",
    ruby: "24",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 25,
    name: "25",
    ruby: "25",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 26,
    name: "26",
    ruby: "26",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 27,
    name: "27",
    ruby: "27",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 31,
    name: "31",
    ruby: "31",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 32,
    name: "32",
    ruby: "32",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 33,
    name: "33",
    ruby: "33",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 34,
    name: "34",
    ruby: "34",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 36,
    name: "36",
    ruby: "36",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 39,
    name: "39",
    ruby: "39",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
  {
    id: 40,
    name: "40",
    ruby: "40",
    emoji: "",
    role: "未詳",
    tags: ["未詳"],
    message: "未定",
    color: "#ffffffff",
    details: [
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" },
      { icon: "", label: "XXXXXX", value: "未定" }
    ]
  },
];

// シフトデータ（日付 → 時間帯 → スタッフID5人）
// 実際のシフトに合わせて変更してください
const SCHEDULE = {
  "512": {
    t1: [],
    t2: [],
    t3: [25, 13, 9, 36, 2],
    t4: [23, 4, 24, 32, 18],
    t5: [19, 5, 39, 2, 40],
    t6: [10, 6, 34, 31, 27],
    t7: [4, 23, 12, 14, 16]
  },
  "513": {
    t1: [9, 19, 39, 40, 22],
    t2: [23, 33, 17, 5, 19],
    t3: [13, 4, 17, 34, 24],
    t4: [13, 5, 6, 10, 16],
    t5: [33, 26, 17, 24, 2],
    t6: [26, 40, 39, 12, 22],
    t7: []
  }
};

// スタッフIDでルックアップ
function getStaff(id) {
  return STAFF.find(s => s.id === id);
}
