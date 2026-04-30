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
    id: 1,
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
    name: "とくちゃん♡",
    ruby: "とくたろう",
    emoji: "",
    role: "未詳",
    tags: ["濃いよ"],
    message: "すごいのかましちゃおーとおもいます♡",
    color: "#F067A6",
    details: [
      { icon: "", label: "好きな語感", value: "バンクシー" },
      { icon: "", label: "好きなもの", value: "毛" },
      { icon: "", label: "趣味", value: "退部" },
      { icon: "", label: "理系国語", value: "学年1位" },
      { icon: "", label: "100m", value: "6秒台(自称)" }
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
    name: "ひとぷー",
    ruby: "ひとし",
    emoji: "",
    role: "未詳",
    tags: ["小さい"],
    message: "choose doom or zenith",
    color: "#00A968",
    details: [
      { icon: "", label: "好きな動物", value: "人間" },
      { icon: "", label: "趣味", value: "スプラ" },
      { icon: "", label: "好きなお菓子", value: "つぶグミ" },
      { icon: "", label: "好きな言葉", value: "doom or zenith" },
      { icon: "", label: "最近考えていること", value: "哲学的にこの世界の帳尻合わせと死" },
      { icon: "", label: "好きなYoutuber", value: "ドズル社とニシコリ" }
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
    name: "しま",
    ruby: "はると",
    emoji: "",
    role: "未詳",
    tags: ["サボり魔"],
    message: "貢いでください",
    color: "#FF80ab",
    details: [
      { icon: "", label: "好きな部位", value: "耳たぶ" },
      { icon: "", label: "身長", value: "人権なし" },
      { icon: "", label: "推し", value: "会計の毛利" },
      { icon: "", label: "後輩に舐められるまでにかかった日数", value: "0日" },
      { icon: "", label: "趣味", value: "ガチャガチャ" }
    ]
  },
  {
    id: 13,
    name: "とも",
    ruby: "ともき",
    emoji: "",
    role: "未詳",
    tags: ["元気"],
    message: "お隣失礼",
    color: "#F0566E",
    details: [
      { icon: "", label: "好きな曲", value: "me me she" },
      { icon: "", label: "趣味", value: "バスケ" }
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
    name: "くうちゃん",
    ruby: "くう",
    emoji: "",
    role: "未詳",
    tags: ["マイペース"],
    message: "愛嬌は期待しないでください。",
    color: "#000000",
    details: [
      { icon: "", label: "趣味", value: "映画鑑賞、音楽鑑賞" },
      { icon: "", label: "好きな食べ物", value: "魚、スイーツ" },
      { icon: "", label: "好きな映画", value: "セッション、テネット" },
      { icon: "", label: "好きな動物", value: "キツネ、レッサーパンダ" },
      { icon: "", label: "毎日の楽しみ", value: "美味しいものを食べること" }
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
    name: "なごみ",
    ruby: "なごむ",
    emoji: "",
    role: "未詳",
    tags: ["あまったるい"],
    message: "4回は来てね",
    color: "#A4E5E0",
    details: [
      { icon: "", label: "好きなもの", value: "歩くこと・漫画・アニメ・ネトフリ・野球" },
      { icon: "", label: "Twitterのフォロワー", value: "6人以下" }
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
    t5: [19, 5, 1, 2, 40],
    t6: [10, 6, 34, 31, 27],
    t7: [4, 22, 12, 14, 16]
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
