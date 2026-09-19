// ============================
// シフトデータ
// ============================
// 時間帯定義
const TIME_SLOTS = [
  { id: "t1", label: "9時～", startHour: 9 },
  { id: "t2", label: "10時～", startHour: 10 },
  { id: "t3", label: "11時～", startHour: 11 },
  { id: "t4", label: "12時～", startHour: 12 },
  { id: "t5", label: "13時～", startHour: 13 },
  { id: "t6", label: "14時～", startHour: 14 },
  { id: "t7", label: "15時～", startHour: 15 },
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
    name: "しょーやん",
    ruby: "しょうご",
    emoji: "",
    role: "未詳",
    tags: ["賢い"],
    message: "ワンチャン占えます",
    color: "#ffab91",
    details: [
      { icon: "🎣", label: "趣味", value: "釣り" },
      { icon: "🐙", label: "好きな食べ物", value: "たこ焼き" },
      { icon: "📖", label: "苦手な教科", value: "こくご" },
      { icon: "📝", label: "嫌いなもの", value: "漢字テスト" },
      { icon: "👑", label: "ボス", value: "石田延広" }
    ]
  },
  {
    id: 2,
    name: "るいちゃん",
    ruby: "るい",
    emoji: "",
    role: "未詳",
    tags: ["猫"],
    message: "しつこい人実は好きです",
    color: "#84C98B",
    details: [
      { icon: "🎤", label: "好きなアーティスト", value: "back number" },
      { icon: "📸", label: "趣味", value: "写真を撮ること" },
      { icon: "🧹", label: "好きな雑用", value: "掃除" },
      { icon: "🐱", label: "好きな動物", value: "猫" },
      { icon: "🌏", label: "好きな国", value: "中国・北朝鮮" }
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
      { icon: "🎨", label: "好きな語感", value: "バンクシー" },
      { icon: "💇", label: "好きなもの", value: "毛" },
      { icon: "🚪", label: "趣味", value: "退部" },
      { icon: "🏆", label: "理系国語", value: "学年1位" },
      { icon: "🏃", label: "100m", value: "6秒台(自称)" }
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
      { icon: "👥", label: "好きな動物", value: "人間" },
      { icon: "🔫", label: "趣味", value: "スプラ" },
      { icon: "🍬", label: "好きなお菓子", value: "つぶグミ" },
      { icon: "🌀", label: "好きな言葉", value: "doom or zenith" },
      { icon: "💀", label: "最近考えていること", value: "哲学的にこの世界の帳尻合わせと死" },
      { icon: "📺", label: "好きなYoutuber", value: "ドズル社とニシコリ" }
    ]
  },
  {
    id: 9,
    name: "たかぴょん",
    ruby: "たかひと",
    emoji: "",
    role: "未詳",
    tags: ["人懐っこい"],
    message: "一生 視界に入ってて❤︎",
    color: "#bbe2f1",
    details: [
      { icon: "☕", label: "好きなもの", value: "スタバ" },
      { icon: "🍭", label: "好きな人", value: "お菓子を分けてくれる人" },
      { icon: "☁️", label: "体重", value: "マシュマロ3,000個分" },
      { icon: "🧺", label: "趣味", value: "ピクニック" },
      { icon: "👟", label: "特技", value: "早歩き" }
    ]
  },
  {
    id: 10,
    name: "さっくー",
    ruby: "ひさのぶ",
    emoji: "",
    role: "未詳",
    tags: ["純粋"],
    message: "当たったら褒めてください",
    color: "#3EB370",
    details: [
      { icon: "🌳", label: "好きな素材", value: "木" },
      { icon: "⚛️", label: "物理", value: "クラス3位" }
    ]
  },
  {
    id: 12,
    name: "しまちゃん",
    ruby: "はると",
    emoji: "",
    role: "未詳",
    tags: ["サボり魔"],
    message: "貢いでください",
    color: "#FF80ab",
    details: [
      { icon: "👂", label: "好きな部位", value: "耳たぶ" },
      { icon: "📏", label: "身長", value: "人権なし" },
      { icon: "💖", label: "推し", value: "会計の毛利" },
      { icon: "⏳", label: "後輩に舐められるまでにかかった日数", value: "0日" },
      { icon: "🎡", label: "趣味", value: "ガチャガチャ" }
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
      { icon: "🎵", label: "好きな曲", value: "me me she" },
      { icon: "🍔", label: "好きな食べ物", value: "ハンバーグ" },
      { icon: "🏀", label: "趣味", value: "バスケ" }
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
    name: "たかさん",
    ruby: "さら",
    emoji: "",
    role: "未詳",
    tags: ["不器用"],
    message: "待ってまーす♫",
    color: "#90caf9",
    details: [
      { icon: "🏀", label: "好きなスポーツ", value: "バスケと野球" },
      { icon: "🎤", label: "好きな歌手", value: "髭男" },
      { icon: "🏃", label: "通学距離", value: "フルマラソン1回分" }
    ]
  },
  {
    id: 17,
    name: "そーちゃん",
    ruby: "そういちろう",
    emoji: "",
    role: "未詳",
    tags: ["凡才"],
    message: "毒しちゃうよ♡",
    color: "#ff80ab",
    details: [
      { icon: "📚", label: "趣味", value: "読書・音楽を聴く" },
      { icon: "🎤", label: "好きなアーティスト", value: "Mr.Children" },
      { icon: "🤝", label: "特技", value: "人生相談" },
      { icon: "🚶", label: "最近ハマっていること", value: "散歩" },
      { icon: "✨", label: "長所", value: "自信家" }
    ]
  },
  {
    id: 18,
    name: "あずちゃん",
    ruby: "あずさ",
    emoji: "",
    role: "未詳",
    tags: ["気まぐれ", "適当"],
    message: "私にしちゃえば？？",
    color: "#932e44",
    details: [
      { icon: "🐾", label: "犬派or 猫派", value: "猫派" },
      { icon: "🍣", label: "好きな食べ物", value: "お寿司 タケノコ うどん" },
      { icon: "🌊", label: "好きな場所", value: "海" },
      { icon: "🎬", label: "趣味", value: "映画を見ること" },
      { icon: "🍵", label: "好きな味", value: "抹茶 チョコ" }
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
    name: "もえちゃん",
    ruby: "もえ",
    emoji: "",
    role: "未詳",
    tags: ["マイペース", "素直"],
    message: "うちの予想、意外と当たります笑",
    color: "#fff59d",
    details: [
      { icon: "🎤", label: "好きな歌手", value: "SHISHAMO" },
      { icon: "🎧", label: "趣味", value: "音楽聴くこと" },
      { icon: "🌸", label: "好きな季節", value: "春" },
      { icon: "🌼", label: "好きなお花", value: "ネモフィラ、菜の花" }
    ]
  },
  {
    id: 23,
    name: "りょーちゃん",
    ruby: "りょう",
    emoji: "",
    role: "未詳",
    tags: ["誠実"],
    message: "溺れて見ませんか？",
    color: "#ff80ab",
    details: [
      { icon: "🎬", label: "趣味", value: "映画" },
      { icon: "📏", label: "身長", value: "174cm" },
      { icon: "🍙", label: "好きな食べ物", value: "おにぎり" }
    ]
  },
  {
    id: 24,
    name: "しゅうたん",
    ruby: "しゅうすけ",
    emoji: "",
    role: "未詳",
    tags: ["アグレッシブ", "シンデレラ体型"],
    message: "ご主人様、ご用はなぁに？言ってごらぁん",
    color: "#ff80ab",
    details: [
      { icon: "📏", label: "身長", value: "177cm" },
      { icon: "🎬", label: "趣味", value: "音楽を聴く、映画鑑賞" },
      { icon: "🐱", label: "犬派猫派", value: "猫派" },
      { icon: "🐶", label: "犬顔派猫顔派", value: "犬顔派" }
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
      { icon: "🎬", label: "趣味", value: "映画鑑賞、音楽鑑賞" },
      { icon: "🍰", label: "好きな食べ物", value: "魚、スイーツ" },
      { icon: "🎞️", label: "好きな映画", value: "セッション、テネット" },
      { icon: "🦊", label: "好きな動物", value: "キツネ、レッサーパンダ" },
      { icon: "😋", label: "毎日の楽しみ", value: "美味しいものを食べること" }
    ]
  },
  {
    id: 26,
    name: "こうちゃん",
    ruby: "こうき",
    emoji: "",
    role: "未詳",
    tags: ["省エネ"],
    message: "現実逃避していきませんか？",
    color: "#90caf9",
    details: [
      { icon: "🏟️", label: "趣味", value: "散歩　スポーツ観戦" },
      { icon: "🍰", label: "好きな食べ物", value: "スイーツ" },
      { icon: "💤", label: "家に帰ったら", value: "まずは寝る" },
      { icon: "⚾", label: "好きなスポーツ", value: "野球　サッカー　バレー" }
    ]
  },
  {
    id: 27,
    name: "さゆみんご",
    ruby: "さゆみ",
    emoji: "",
    role: "未詳",
    tags: ["ポジティブ"],
    message: "ウチが当ててあげる♡",
    color: "#ffab91",
    details: [
      { icon: "", label: "好きな動物", value: "猫" },
      { icon: "", label: "趣味", value: "映画鑑賞とつまみ食い" },
      { icon: "", label: "特技", value: "寄り目" },
      { icon: "", label: "好きなお菓子", value: "蒲焼さん" }
    ]
  },
  {
    id: 31,
    name: "なのちゃん",
    ruby: "なのは",
    emoji: "",
    role: "未詳",
    tags: ["ちゅ、多様性。"],
    message: "なのの魔法をかけてあげる♡",
    color: "#00FFFF",
    details: [
      { icon: "🎶", label: "好きなこと", value: "歌うこと  お笑い鑑賞  クイズ" },
      { icon: "🎢", label: "好きなタイプ", value: "ジェットコースターに乗れる人" },
      { icon: "🎙️", label: "やってみたいこと", value: "コール＆レスポンス   ライブに行くこと" },
      { icon: "💭", label: "最近考えていること", value: "ダジャレ  変顔" },
      { icon: "🧠", label: "MBTI", value: "ENFP" }
    ]
  },
  {
    id: 32,
    name: "かほち",
    ruby: "かほ",
    emoji: "",
    role: "未詳",
    tags: ["自由人"],
    message: "まずは一回来てみてください",
    color: "#ffab91",
    details: [
      { icon: "", label: "趣味", value: "ドラマ鑑賞" },
      { icon: "", label: "好きな食べ物", value: "パン" },
      { icon: "", label: "特技", value: "よく食べること" },
      { icon: "", label: "好きな曲", value: "スケッチ" }
    ]
  },
  {
    id: 33,
    name: "ひろみ",
    ruby: "ひろと",
    emoji: "",
    role: "未詳",
    tags: ["たまに真面目"],
    message: "たくさんきてね",
    color: "#fff59d",
    details: [
      { icon: "🐶", label: "好きな動物", value: "犬" },
      { icon: "👟", label: "趣味", value: "服・スニーカー" },
      { icon: "🎤", label: "好きなアーティスト", value: "ONE OK ROCK" },
      { icon: "🏈", label: "部活", value: "アメフト部" },
      { icon: "🍜", label: "今年の目標", value: "山岡家に行く" }
    ]
  },
  {
    id: 34,
    name: "なごみ",
    ruby: "なごむ",
    emoji: "",
    role: "未詳",
    tags: ["ダメ人間サンプル", "あまったるい"],
    message: "4回は来てね",
    color: "#A4E5E0",
    details: [
      { icon: "🚶", label: "好きなもの", value: "歩くこと・漫画・アニメ・ネトフリ・野球" },
      { icon: "🐦", label: "Twitterのフォロワー", value: "6人" },
      { icon: "🏃", label: "50m走", value: "6.4秒" }
    ]
  },
  {
    id: 36,
    name: "のんちゃん",
    ruby: "かのん",
    emoji: "",
    role: "未詳",
    tags: ["しっかり者✨"],
    message: "授業中眠くなる魔法〜♡",
    color: "#ffffff",
    details: [
      { icon: "🍳", label: "好きなご飯", value: "オムライス" },
      { icon: "🐅", label: "好きな動物", value: "ホワイトタイガー" },
      { icon: "🍽️", label: "趣味", value: "食事" }
    ]
  },
  {
    id: 39,
    name: "たいちっち",
    ruby: "たいち",
    emoji: "",
    role: "未詳",
    tags: ["ずっと笑ってる"],
    message: "あなたのお悩みあてすぎます",
    color: "#ff80ab",
    details: [
      { icon: "🏰", label: "好きなもの", value: "ディズニー" },
      { icon: "🏝️", label: "最近ハマってること", value: "あつ森" },
      { icon: "🍱", label: "好きな食べ物", value: "ハンバーグと唐揚げと栗きんとん" },
      { icon: "😊", label: "得意なこと", value: "いつも笑顔でいること" },
      { icon: "📖", label: "好きな漫画", value: "ジャンプ作品全部" },
      { icon: "🎤", label: "好きな音楽", value: "Mr.Childrenの未完と足音" }
    ]
  },
  {
    id: 40,
    name: "ななめろ",
    ruby: "ななか",
    emoji: "",
    role: "未詳",
    tags: ["愛嬌"],
    message: "指名してください ɞ̴̶̷ ·̮ ɞ̴̶̷ ",
    color: "#DEA5A4",
    details: [
      { icon: "🎬", label: "趣味", value: "映画鑑賞" },
      { icon: "🍫", label: "好きな食べ物", value: "チョコレート" },
      { icon: "🐶", label: "好きな動物", value: "犬" },
      { icon: "🎤", label: "好きなアーティスト", value: "backnumber" },
      { icon: "🇰🇷", label: "行きたいところ", value: "韓国" }
    ]
  },
];

// シフトデータ（日付 → 時間帯 → スタッフID5人）
// シフトに合わせて変更してください
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
    t6: [27, 40, 39, 12, 22],
    t7: []
  }
};

// スタッフIDでルックアップ
function getStaff(id) {
  return STAFF.find(s => s.id === id);
}
