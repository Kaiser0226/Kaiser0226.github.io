// ============================
// シフトデータ
// ============================
// 時間帯定義
const TIME_SLOTS = [
  { id: "t1", label: "9:00〜10:00" },
  { id: "t2", label: "10:00〜11:00" },
  { id: "t3", label: "11:00〜12:00" },
  { id: "t4", label: "12:00〜13:00" },
  { id: "t5", label: "13:00〜14:00" },
  { id: "t6", label: "14:00〜14:30" },
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
    name: "かい",
    ruby: "かい",
    emoji: "🧸",
    role: "Webサイト作成担当",
    tags: ["受付", "AI頼り"],
    message: "使えそうかなこのサイト",
    color: "#90caf9",
    details: [
      { icon: "📏", label: "身長", value: "155cm(自称)" },
      { icon: "⚖️", label: "体重", value: "54kg" },
      { icon: "🎯", label: "趣味", value: "パソコンいじり" },
      { icon: "🏃", label: "50m走", value: "7.5秒" },
      { icon: "🍖", label: "好きな食べ物", value: "炒飯・餃子" },
      { icon: "🧊", label: "自慢", value: "体育は冬でも半袖" }
    ]
  },
  {
    id: 2,
    name: "はるちゃん",
    ruby: "はるき",
    emoji: "🐥",
    role: "嫉妬担当",
    tags: ["愛らしい", "反逆者の野心家"],
    message: "君が次のご主人様？",
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
    id: 3,
    name: "てつ",
    ruby: "てつ",
    emoji: "🐱",
    role: "四柱推命担当",
    tags: ["四柱推命", "本格派"],
    message: "ゆっくり占うからね〜",
    color: "#ffcc80",
    details: [
      { icon: "📏", label: "身長", value: "187cm" },
      { icon: "⚖️", label: "体重", value: "108kg" },
      { icon: "🎯", label: "趣味", value: "筋トレ（ベンチ200kg）" },
      { icon: "🏋️", label: "特技", value: "車を少し持ち上げる" },
      { icon: "🍖", label: "食事量", value: "1日6食" }
    ]
  },
  {
    id: 4,
    name: "しん",
    ruby: "しん",
    emoji: "🐰",
    role: "霊視担当",
    tags: ["霊視", "直感型"],
    message: "大丈夫だよ〜見えてるから",
    color: "#ce93d8",
    details: [
      { icon: "📏", label: "身長", value: "195cm" },
      { icon: "⚖️", label: "体重", value: "115kg" },
      { icon: "🎯", label: "趣味", value: "夜の散歩（威圧）" },
      { icon: "👁️", label: "特技", value: "暗闇でも目が光る" },
      { icon: "🧊", label: "耐性", value: "冬でも半袖" }
    ]
  },
  {
    id: 5,
    name: "けん",
    ruby: "けん",
    emoji: "🐶",
    role: "西洋占星術担当",
    tags: ["星占い", "丁寧"],
    message: "星、見てみよっか〜",
    color: "#80deea",
    details: [
      { icon: "📏", label: "身長", value: "189cm" },
      { icon: "⚖️", label: "体重", value: "107kg" },
      { icon: "🎯", label: "趣味", value: "星を見る（肉眼）" },
      { icon: "🌌", label: "特技", value: "星座を勝手に増やす" },
      { icon: "🧱", label: "特性", value: "壁に寄りかかると壁がへこむ" }
    ]
  },
  {
    id: 6,
    name: "だい",
    ruby: "だい",
    emoji: "🐹",
    role: "易占い担当",
    tags: ["易", "深読み"],
    message: "ちょっと占わせてね〜",
    color: "#ffab91",
    details: [
      { icon: "📏", label: "身長", value: "191cm" },
      { icon: "⚖️", label: "体重", value: "111kg" },
      { icon: "🎯", label: "趣味", value: "石積み（片手）" },
      { icon: "🎲", label: "特技", value: "サイコロを投げずに出す" },
      { icon: "🌪️", label: "特徴", value: "歩くと風が起きる" }
    ]
  },
  {
    id: 7,
    name: "ゆう",
    ruby: "ゆう",
    emoji: "🐼",
    role: "オラクルカード担当",
    tags: ["カード", "優しい"],
    message: "カード引いてみようか〜",
    color: "#b0bec5",
    details: [
      { icon: "📏", label: "身長", value: "188cm" },
      { icon: "⚖️", label: "体重", value: "109kg" },
      { icon: "🎯", label: "趣味", value: "カードシャッフル（衝撃波）" },
      { icon: "🃏", label: "特技", value: "カードを壁に刺す" },
      { icon: "📦", label: "癖", value: "椅子を壊しがち" }
    ]
  },
  {
    id: 8,
    name: "まさ",
    ruby: "まさ",
    emoji: "🐧",
    role: "数秘術担当",
    tags: ["数秘術", "分析型"],
    message: "数字で見ていくね〜",
    color: "#c5e1a5",
    details: [
      { icon: "📏", label: "身長", value: "194cm" },
      { icon: "⚖️", label: "体重", value: "113kg" },
      { icon: "🎯", label: "趣味", value: "暗算（桁が違う）" },
      { icon: "🧮", label: "特技", value: "指で九九以外も計算" },
      { icon: "📊", label: "特徴", value: "体脂肪率を誤差なく当てる" }
    ]
  },
  {
    id: 9,
    name: "たく",
    ruby: "たく",
    emoji: "🐢",
    role: "風水担当",
    tags: ["風水", "環境改善"],
    message: "部屋の運気、整えよっか〜",
    color: "#ffe082",
    details: [
      { icon: "📏", label: "身長", value: "186cm" },
      { icon: "⚖️", label: "体重", value: "104kg" },
      { icon: "🎯", label: "趣味", value: "家具移動（片手）" },
      { icon: "🏠", label: "特技", value: "間取りを一瞬で把握" },
      { icon: "🧭", label: "特徴", value: "方向感覚が異常に正確" }
    ]
  },
  {
    id: 10,
    name: "かず",
    ruby: "かず",
    emoji: "🐸",
    role: "霊感タロット担当",
    tags: ["霊感", "タロット"],
    message: "ちょっと感じ取ってみるね〜",
    color: "#bcaaa4",
    details: [
      { icon: "📏", label: "身長", value: "192cm" },
      { icon: "⚖️", label: "体重", value: "110kg" },
      { icon: "🎯", label: "趣味", value: "静止（長時間）" },
      { icon: "👻", label: "特技", value: "背後に気配を出す" },
      { icon: "🕶️", label: "特徴", value: "常にサングラス" }
    ]
  },
  {
    id: 11,
    name: "はやと",
    ruby: "はやと",
    emoji: "🐻",
    role: "タロット担当",
    tags: ["タロット", "直感型"],
    message: "ふわっと見てみるね〜",
    color: "#90caf9",
    details: [
      { icon: "📏", label: "身長", value: "191cm" },
      { icon: "⚖️", label: "体重", value: "109kg" },
      { icon: "🎯", label: "趣味", value: "滝行（冬限定）" },
      { icon: "🌊", label: "特技", value: "水圧に逆らって立つ" }
    ]
  },
  {
    id: 12,
    name: "こうた",
    ruby: "こうた",
    emoji: "🐯",
    role: "手相担当",
    tags: ["手相", "丁寧"],
    message: "手、ちょっと貸してね〜",
    color: "#a5d6a7",
    details: [
      { icon: "📏", label: "身長", value: "188cm" },
      { icon: "⚖️", label: "体重", value: "106kg" },
      { icon: "🎯", label: "趣味", value: "薪割り（素手）" },
      { icon: "🪓", label: "特技", value: "丸太を真っ二つ" }
    ]
  },
  {
    id: 13,
    name: "ゆうた",
    ruby: "ゆうた",
    emoji: "🐗",
    role: "四柱推命担当",
    tags: ["四柱推命", "本格派"],
    message: "じっくり見ていこうか〜",
    color: "#ffcc80",
    details: [
      { icon: "📏", label: "身長", value: "193cm" },
      { icon: "⚖️", label: "体重", value: "114kg" },
      { icon: "🎯", label: "趣味", value: "山登り（走り）" },
      { icon: "⛰️", label: "特技", value: "斜面ダッシュ" }
    ]
  },
  {
    id: 14,
    name: "しょう",
    ruby: "しょう",
    emoji: "🐺",
    role: "霊視担当",
    tags: ["霊視", "直感型"],
    message: "大丈夫、見えてるよ〜",
    color: "#ce93d8",
    details: [
      { icon: "📏", label: "身長", value: "196cm" },
      { icon: "⚖️", label: "体重", value: "118kg" },
      { icon: "🎯", label: "趣味", value: "夜間巡回（無音）" },
      { icon: "🌙", label: "特技", value: "足音を消す" }
    ]
  },
  {
    id: 15,
    name: "りく",
    ruby: "りく",
    emoji: "🐨",
    role: "西洋占星術担当",
    tags: ["星占い", "穏やか"],
    message: "星、ゆっくり見ようね〜",
    color: "#80deea",
    details: [
      { icon: "📏", label: "身長", value: "187cm" },
      { icon: "⚖️", label: "体重", value: "103kg" },
      { icon: "🎯", label: "趣味", value: "天体観測（肉眼）" },
      { icon: "🌌", label: "特技", value: "流れ星を呼ぶ（自称）" }
    ]
  },
  {
    id: 16,
    name: "けいた",
    ruby: "けいた",
    emoji: "🐒",
    role: "易占い担当",
    tags: ["易", "分析型"],
    message: "少し占わせてね〜",
    color: "#ffab91",
    details: [
      { icon: "📏", label: "身長", value: "190cm" },
      { icon: "⚖️", label: "体重", value: "108kg" },
      { icon: "🎯", label: "趣味", value: "石投げ（遠投）" },
      { icon: "🎲", label: "特技", value: "石で水切り20回" }
    ]
  },
  {
    id: 17,
    name: "なお",
    ruby: "なお",
    emoji: "🐦",
    role: "オラクルカード担当",
    tags: ["カード", "優しい"],
    message: "カード引いてみよ〜",
    color: "#b0bec5",
    details: [
      { icon: "📏", label: "身長", value: "189cm" },
      { icon: "⚖️", label: "体重", value: "107kg" },
      { icon: "🎯", label: "趣味", value: "カード投げ（高速）" },
      { icon: "🃏", label: "特技", value: "紙で指を切らせる" }
    ]
  },
  {
    id: 18,
    name: "あきら",
    ruby: "あきら",
    emoji: "🐙",
    role: "数秘術担当",
    tags: ["数秘術", "論理派"],
    message: "数字で見ていくね〜",
    color: "#c5e1a5",
    details: [
      { icon: "📏", label: "身長", value: "194cm" },
      { icon: "⚖️", label: "体重", value: "112kg" },
      { icon: "🎯", label: "趣味", value: "計算（暗算100桁）" },
      { icon: "🧮", label: "特技", value: "円周率を言い続ける" }
    ]
  },
  {
    id: 19,
    name: "ゆうじ",
    ruby: "ゆうじ",
    emoji: "🐘",
    role: "風水担当",
    tags: ["風水", "環境"],
    message: "運気整えるね〜",
    color: "#ffe082",
    details: [
      { icon: "📏", label: "身長", value: "192cm" },
      { icon: "⚖️", label: "体重", value: "111kg" },
      { icon: "🎯", label: "趣味", value: "模様替え（壁ごと）" },
      { icon: "🏠", label: "特技", value: "家具配置で空気変える" }
    ]
  },
  {
    id: 20,
    name: "しゅん",
    ruby: "しゅん",
    emoji: "🐍",
    role: "霊感タロット担当",
    tags: ["霊感", "タロット"],
    message: "感じてみるね〜",
    color: "#bcaaa4",
    details: [
      { icon: "📏", label: "身長", value: "188cm" },
      { icon: "⚖️", label: "体重", value: "105kg" },
      { icon: "🎯", label: "趣味", value: "無言待機（長時間）" },
      { icon: "👻", label: "特技", value: "気配を消す" }
    ]
  },
  {
    id: 21,
    name: "たかし",
    ruby: "たかし",
    emoji: "🐳",
    role: "タロット担当",
    tags: ["タロット", "安心"],
    message: "気軽にどうぞ〜",
    color: "#90caf9",
    details: [
      { icon: "📏", label: "身長", value: "195cm" },
      { icon: "⚖️", label: "体重", value: "117kg" },
      { icon: "🎯", label: "趣味", value: "深呼吸（轟音）" },
      { icon: "💨", label: "特技", value: "息でろうそく全部消す" }
    ]
  },
  {
    id: 22,
    name: "ゆきお",
    ruby: "ゆきお",
    emoji: "🐧",
    role: "手相担当",
    tags: ["手相", "丁寧"],
    message: "優しく見るね〜",
    color: "#a5d6a7",
    details: [
      { icon: "📏", label: "身長", value: "187cm" },
      { icon: "⚖️", label: "体重", value: "104kg" },
      { icon: "🎯", label: "趣味", value: "氷割り（拳）" },
      { icon: "🧊", label: "特技", value: "冷気に強い" }
    ]
  },
  {
    id: 23,
    name: "えいじ",
    ruby: "えいじ",
    emoji: "🦁",
    role: "四柱推命担当",
    tags: ["四柱推命", "分析"],
    message: "見ていこうか〜",
    color: "#ffcc80",
    details: [
      { icon: "📏", label: "身長", value: "193cm" },
      { icon: "⚖️", label: "体重", value: "113kg" },
      { icon: "🎯", label: "趣味", value: "遠吠え（迫力）" },
      { icon: "🗣️", label: "特技", value: "声がよく通る" }
    ]
  },
  {
    id: 24,
    name: "ひろ",
    ruby: "ひろ",
    emoji: "🐎",
    role: "霊視担当",
    tags: ["霊視", "直感"],
    message: "感じるよ〜",
    color: "#ce93d8",
    details: [
      { icon: "📏", label: "身長", value: "190cm" },
      { icon: "⚖️", label: "体重", value: "108kg" },
      { icon: "🎯", label: "趣味", value: "全力疾走（突然）" },
      { icon: "🏃", label: "特技", value: "スタートダッシュ最速" }
    ]
  },
  {
    id: 25,
    name: "そうた",
    ruby: "そうた",
    emoji: "🐬",
    role: "西洋占星術担当",
    tags: ["星占い", "やさしい"],
    message: "ゆっくり見ようね〜",
    color: "#80deea",
    details: [
      { icon: "📏", label: "身長", value: "189cm" },
      { icon: "⚖️", label: "体重", value: "106kg" },
      { icon: "🎯", label: "趣味", value: "波観察（長時間）" },
      { icon: "🌊", label: "特技", value: "水しぶきを避ける" }
    ]
  }
];

// シフトデータ（日付 → 時間帯 → スタッフID5人）
// 実際のシフトに合わせて変更してください
const SCHEDULE = {
  "512": {
    t1: [],
    t2: [1, 2, 3, 4, 5],
    t3: [6, 7, 8, 9, 10],
    t4: [11, 12, 13, 14, 15],
    t5: [16, 17, 18, 19, 20],
    t6: [21, 22, 23, 24, 25],
  },
  "513": {
    t1: [6, 7, 8, 9, 10],
    t2: [11, 12, 13, 14, 15],
    t3: [16, 17, 18, 19, 20],
    t4: [21, 22, 23, 24, 25],
    t5: [1, 2, 3, 4, 5],
    t6: [6, 7, 8, 9, 10],
  }
};

// スタッフIDでルックアップ
function getStaff(id) {
  return STAFF.find(s => s.id === id);
}
