// ============================
// 相性診断ロジック
// ============================

// AISHO_DATA は CSV から動的ロード（失敗時はフォールバック）
let AISHO_DATA = [];
let aishoCsvLoaded = false;

// フォールバック用ハードコードデータ（CSV が読めない環境用）
const AISHO_FALLBACK = [
  { id: 1,  ans: ["マイペース","自分から積極的に話しかける","リーダー役","友人や家族と過ごす","周囲と協力する","直感","とりあえずやってみる"] },
  { id: 26, ans: ["マイペース","周囲の様子を見ながら馴染む","作業役","友人や家族と過ごす","周囲と協力する","直感","誰かと一緒なら安心"] },
  { id: 5,  ans: ["マイペース","気が合いそうな人にだけ話しかける","アイデア役","趣味に没頭する","原因を分析してから動く","論理性","慣れてから挑戦したい"] },
  { id: 23, ans: ["マイペース","周囲の様子を見ながら馴染む","サポート役","友人や家族と過ごす","周囲と協力する","直感","慣れてから挑戦したい"] },
  { id: 18, ans: ["マイペース","気が合いそうな人にだけ話しかける","サポート役","外出して新しい体験をする","周囲と協力する","直感","誰かと一緒なら安心"] },
  { id: 22, ans: ["マイペース","自分から積極的に話しかける","サポート役","友人や家族と過ごす","状況が落ち着くまで様子見","周囲との調和","誰かと一緒なら安心"] },
  { id: 13, ans: ["面倒見がいい","周囲の様子を見ながら馴染む","リーダー役","友人や家族と過ごす","周囲と協力する","直感","とりあえずやってみる"] },
  { id: 12, ans: ["マイペース","周囲の様子を見ながら馴染む","サポート役","外出して新しい体験をする","状況が落ち着くまで様子見","直感","誰かと一緒なら安心"] },
  { id: 4,  ans: ["マイペース","周囲の様子を見ながら馴染む","リーダー役","友人や家族と過ごす","状況が落ち着くまで様子見","安定感","とりあえずやってみる"] },
  { id: 6,  ans: ["マイペース","周囲の様子を見ながら馴染む","リーダー役","のんびり休む","とにかくすぐ動く","周囲との調和","慣れてから挑戦したい"] },
  { id: 24, ans: ["行動力がある","自分から積極的に話しかける","作業役","友人や家族と過ごす","周囲と協力する","周囲との調和","誰かと一緒なら安心"] },
  { id: 25, ans: ["マイペース","必要があるまで静かにしている","アイデア役","のんびり休む","原因を分析してから動く","周囲との調和","情報を集めて準備したい"] },
  { id: 9,  ans: ["行動力がある","気が合いそうな人にだけ話しかける","サポート役","友人や家族と過ごす","周囲と協力する","直感","情報を集めて準備したい"] },
  { id: 17, ans: ["マイペース","気が合いそうな人にだけ話しかける","リーダー役","趣味に没頭する","原因を分析してから動く","論理性","とりあえずやってみる"] },
  { id: 14, ans: ["慎重で堅実","必要があるまで静かにしている","作業役","趣味に没頭する","原因を分析してから動く","周囲との調和","情報を集めて準備したい"] },
  { id: 2,  ans: ["行動力がある","周囲の様子を見ながら馴染む","リーダー役","のんびり休む","とにかくすぐ動く","直感","誰かと一緒なら安心"] },
  { id: 10, ans: ["マイペース","自分から積極的に話しかける","リーダー役","外出して新しい体験をする","とにかくすぐ動く","直感","とりあえずやってみる"] },
  { id: 15, ans: ["マイペース","自分から積極的に話しかける","作業役","趣味に没頭する","とにかくすぐ動く","直感","とりあえずやってみる"] },
];

// ============================
// CSV 読み込み（失敗時フォールバック）
// ============================
async function loadAishoCSV() {
  // file:// では fetch がブロックされるため即フォールバック
  if (window.location.protocol === 'file:') {
    console.info('[相性診断] file:// 環境 → フォールバックデータ使用');
    AISHO_DATA = AISHO_FALLBACK;
    aishoCsvLoaded = true;
    return;
  }
  try {
    const res = await fetch('aisho.csv');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text   = await res.text();
    const parsed = parseAishoCSV(text);
    if (parsed.length === 0) throw new Error('CSV が空');
    AISHO_DATA = parsed;
    console.info('[相性診断] CSV から ' + parsed.length + ' 件ロード完了');
  } catch (e) {
    console.warn('[相性診断] CSV 読み込み失敗 → フォールバック使用:', e.message);
    AISHO_DATA = AISHO_FALLBACK;
  }
  aishoCsvLoaded = true;
}

// 簡易 CSV パーサー（RFC4180 対応）
function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function parseAishoCSV(text) {
  const lines = text.trim().split('\n');
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 9) continue;
    const id = parseInt(cols[1].replace(/"/g, '').trim(), 10);
    if (isNaN(id)) continue;
    const ans = cols.slice(2, 9).map(c => c.replace(/^"|"$/g, '').trim());
    out.push({ id, ans });
  }
  return out;
}

// ページ読み込み時に CSV をフェッチ
document.addEventListener('DOMContentLoaded', loadAishoCSV);

// ============================
// 質問定義（重み付き）
// ============================
const AISHO_QUESTIONS = [
  { q: "自分に一番近いと思う特徴は？",   opts: ["行動力がある","マイペース","面倒見がいい","慎重で堅実"],                                                                  weight: 3   },
  { q: "新しい環境で始めにとる行動は？", opts: ["自分から積極的に話しかける","周囲の様子を見ながら馴染む","気が合いそうな人にだけ話しかける","必要があるまで静かにしている"], weight: 3   },
  { q: "集団作業で担当しがちな役割は？", opts: ["リーダー役","サポート役","アイデア役","作業役"],                                                                          weight: 1.5 },
  { q: "休日の理想的な過ごし方は？",     opts: ["外出して新しい体験をする","友人や家族と過ごす","趣味に没頭する","のんびり休む"],                                           weight: 2   },
  { q: "急なトラブルが起きたら？",       opts: ["とにかくすぐ動く","周囲と協力する","原因を分析してから動く","状況が落ち着くまで様子見"],                                     weight: 3   },
  { q: "何かを決めるとき重視するのは？", opts: ["直感","周囲との調和","論理性","安定感"],                                                                                  weight: 2   },
  { q: "初めて挑戦することに対して？",   opts: ["とりあえずやってみる","誰かと一緒なら安心","情報を集めて準備したい","慣れてから挑戦したい"],                                 weight: 1.5 },
];

const AISHO_TOTAL_WEIGHT = AISHO_QUESTIONS.reduce((s, q) => s + q.weight, 0);

// ============================
// 状態管理
// ============================
let aishoCurrentQ      = 0;
let aishoUserAns       = [];
let aishoAutoAdvancing = false;

// ============================
// 初期化
// ============================
function aishoInit() {
  if (!aishoCsvLoaded) {
    document.getElementById("aisho-quiz").style.display   = "block";
    document.getElementById("aisho-result").style.display = "none";
    document.getElementById("aisho-question-area").innerHTML =
      '<div class="aisho-loading"><div class="aisho-loading-spin">💫</div><div>データを読み込み中…</div></div>';
    document.getElementById("aisho-progress-fill").style.width = "0%";
    document.getElementById("aisho-btn-next").style.display    = "none";
    document.getElementById("aisho-btn-back").style.visibility = "hidden";
    setTimeout(aishoInit, 400);
    return;
  }

  aishoCurrentQ      = 0;
  aishoUserAns       = new Array(AISHO_QUESTIONS.length).fill(null);
  aishoAutoAdvancing = false;

  document.getElementById("aisho-quiz").style.display   = "block";
  document.getElementById("aisho-result").style.display = "none";
  document.getElementById("aisho-progress-fill").style.width  = "0%";
  document.getElementById("aisho-progress-label").textContent = "1 / " + AISHO_QUESTIONS.length;

  aishoRenderQuestion();
}

// ============================
// 質問描画
// ============================
function aishoRenderQuestion() {
  const q       = AISHO_QUESTIONS[aishoCurrentQ];
  const total   = AISHO_QUESTIONS.length;
  const current = aishoCurrentQ + 1;
  const selected = aishoUserAns[aishoCurrentQ];
  const isLast  = (aishoCurrentQ === total - 1);

  const answered = aishoUserAns.filter(a => a !== null).length;
  document.getElementById("aisho-progress-fill").style.width  = ((answered / total) * 100) + "%";
  document.getElementById("aisho-progress-label").textContent = current + " / " + total;

  const backBtn = document.getElementById("aisho-btn-back");
  backBtn.style.visibility = aishoCurrentQ === 0 ? "hidden" : "visible";

  const nextBtn = document.getElementById("aisho-btn-next");
  if (isLast) {
    nextBtn.style.display = "";
    nextBtn.disabled      = (selected === null);
    nextBtn.textContent   = "診断する ✨";
  } else {
    nextBtn.style.display = "none";
  }

  const optsHTML = q.opts.map((opt, i) =>
    '<button class="aisho-option-btn ' + (selected === opt ? 'selected' : '') + '"' +
    ' id="aisho-opt-' + i + '"' +
    ' onclick="aishoSelect(\'' + opt.replace(/'/g, "&#39;") + '\')">' +
    opt + '</button>'
  ).join('');

  document.getElementById("aisho-question-area").innerHTML =
    '<div class="aisho-question-card" style="animation: aishoSlideIn 0.3s ease forwards;">' +
    '<div class="aisho-q-num">Q' + current + '</div>' +
    '<div class="aisho-q-text">' + q.q + '</div>' +
    '<div class="aisho-options">' + optsHTML + '</div>' +
    '<p class="aisho-last-hint">' + (isLast ? "選択後、「診断する」を押してください" : "選ぶと次の質問に進みます") + '</p>' +
    '</div>';
}

// ============================
// 選択肢タップ
// ============================
function aishoSelect(value) {
  if (aishoAutoAdvancing) return;
  aishoUserAns[aishoCurrentQ] = value;
  const isLast = (aishoCurrentQ === AISHO_QUESTIONS.length - 1);

  document.querySelectorAll(".aisho-option-btn").forEach(btn => {
    btn.classList.toggle("selected", btn.textContent === value);
  });

  const answered = aishoUserAns.filter(a => a !== null).length;
  document.getElementById("aisho-progress-fill").style.width =
    ((answered / AISHO_QUESTIONS.length) * 100) + "%";

  if (isLast) {
    document.getElementById("aisho-btn-next").disabled = false;
  } else {
    aishoAutoAdvancing = true;
    setTimeout(function () {
      aishoCurrentQ++;
      aishoAutoAdvancing = false;
      aishoRenderQuestion();
    }, 80);
  }
}

// ============================
// 次へ／診断するボタン（Q7 専用）
// ============================
function aishoNext() {
  if (aishoUserAns[aishoCurrentQ] === null) return;
  if (aishoCurrentQ === AISHO_QUESTIONS.length - 1) aishoShowResult();
}

// ============================
// 戻るボタン
// ============================
function aishoBack() {
  if (aishoAutoAdvancing) return;
  if (aishoCurrentQ > 0) { aishoCurrentQ--; aishoRenderQuestion(); }
}

// ============================
// もう一度ボタン
// ============================
function aishoRetry() { aishoInit(); }

// ============================
// 一致率計算（重み付き・最低50%保証）
// ============================
function calcAishoRate(memberAns) {
  let score = 0;
  memberAns.forEach(function(ans, i) {
    if (ans === aishoUserAns[i]) score += AISHO_QUESTIONS[i].weight;
  });
  return Math.round(50 + (score / AISHO_TOTAL_WEIGHT) * 50);
}

// ============================
// 花吹雪エフェクト（通常版）
// ============================
function launchConfetti() {
  spawnConfetti(70, 1.2, 1.2, 0.6, 2500);
}

// 花吹雪エフェクト（PERFECT版：大量＋長時間）
function launchMegaConfetti() {
  spawnConfetti(200, 1.0, 2.5, 1.5, 5000);
}

function spawnConfetti(count, durBase, durRange, delayRange, lifeMs) {
  const colors = ['#d70074','#7b00c4','#f5c518','#ff80ab','#a0c4ff','#00d4aa','#ffb347','#ff6b35','#c8f7c5'];
  for (let i = 0; i < count; i++) {
    setTimeout(function() {
      const el  = document.createElement('div');
      el.className = 'aisho-confetti-piece';
      const size = 6 + Math.random() * 10;
      el.style.left            = (Math.random() * 100) + 'vw';
      el.style.width           = size + 'px';
      el.style.height          = size + 'px';
      el.style.background      = colors[Math.floor(Math.random() * colors.length)];
      el.style.borderRadius    = (Math.random() > 0.5 ? 50 : 2) + '%';
      el.style.animationDuration = (durBase + Math.random() * durRange) + 's';
      el.style.animationDelay  = (Math.random() * delayRange) + 's';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, lifeMs);
    }, i * 12);
  }
}

// ============================
// 花火エフェクト（PERFECT専用）
// ============================
function launchFireworks() {
  var bursts = [
    {x:20,y:18},{x:75,y:12},{x:50,y:25},{x:15,y:42},
    {x:82,y:38},{x:38,y:15},{x:65,y:48},{x:28,y:60},{x:70,y:20}
  ];
  bursts.forEach(function(b, idx) {
    setTimeout(function() { createFireworkBurst(b.x, b.y); }, idx * 280);
  });
}

function createFireworkBurst(xPct, yPct) {
  var colors = ['#d70074','#7b00c4','#f5c518','#ff80ab','#00d4aa','#ff6b35','#ffffff','#a0c4ff'];
  var numP = 22;
  for (var i = 0; i < numP; i++) {
    (function(idx) {
      var el    = document.createElement('div');
      el.className = 'aisho-fw-particle';
      var angle = (idx / numP) * 360;
      var dist  = 55 + Math.random() * 65;
      var rad   = angle * Math.PI / 180;
      var tx    = Math.cos(rad) * dist;
      var ty    = Math.sin(rad) * dist;
      var size  = 4 + Math.random() * 5;
      el.style.left    = xPct + 'vw';
      el.style.top     = yPct + 'vh';
      el.style.width   = size + 'px';
      el.style.height  = size + 'px';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.setProperty('--fw-tx', tx + 'px');
      el.style.setProperty('--fw-ty', ty + 'px');
      el.style.animationDuration = (0.6 + Math.random() * 0.5) + 's';
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 1400);
    })(i);
  }
  var flash = document.createElement('div');
  flash.className = 'aisho-fw-flash';
  flash.style.left = xPct + 'vw';
  flash.style.top  = yPct + 'vh';
  flash.style.background = colors[Math.floor(Math.random() * colors.length)];
  document.body.appendChild(flash);
  setTimeout(function() { flash.remove(); }, 900);
}

// ============================
// 100%一致バナー（PERFECT専用）
// ============================
function showPerfectBanner() {
  var banner = document.createElement('div');
  banner.className = 'aisho-perfect-banner';
  banner.innerHTML = '<div class="aisho-perfect-inner">💯 PERFECT MATCH!! 💯<br><span class="aisho-perfect-sub">全問一致！運命の出会い！</span></div>';
  document.body.appendChild(banner);
  setTimeout(function() { banner.remove(); }, 4000);
}

// ============================
// 結果を表示
// ============================
function aishoShowResult() {
  const results = AISHO_DATA.map(function(member) {
    return {
      id: member.id,
      rate: calcAishoRate(member.ans),
      rawScore: member.ans.reduce(function(s, ans, i) {
        return s + (ans === aishoUserAns[i] ? AISHO_QUESTIONS[i].weight : 0);
      }, 0)
    };
  });
  results.sort(function(a, b) { return b.rawScore - a.rawScore; });

  document.getElementById("aisho-quiz").style.display   = "none";
  document.getElementById("aisho-result").style.display = "block";
  document.getElementById("page-aisho").scrollTop = 0;

  launchConfetti();

  const rankEmojis = ["🥇","🥈","🥉"];

  const html = results.map(function(item, i) {
    const staff = getStaff(item.id);
    if (!staff) return "";
    const baseColor = staff.color.slice(0, 7);
    const rankEmoji = rankEmojis[i] || (i + 1) + "位";
    const shiftHTML = getStaffShiftTags(staff.id);

    if (i === 0) {
      return '<div class="aisho-result-top-wrap">' +
        '<div class="aisho-sparkle-ring">' +
          '<span class="aisho-sparkle s1">✦</span><span class="aisho-sparkle s2">★</span>' +
          '<span class="aisho-sparkle s3">✦</span><span class="aisho-sparkle s4">★</span>' +
          '<span class="aisho-sparkle s5">✦</span><span class="aisho-sparkle s6">★</span>' +
        '</div>' +
        '<div class="aisho-result-item aisho-top" style="--staff-color:' + baseColor + ';" onclick="openModal(' + staff.id + ')">' +
          '<div class="aisho-recommend-badge"><span class="aisho-badge-crown">👑</span><span>あなたにおすすめ！</span></div>' +
          '<div class="aisho-top-body">' +
            '<div class="aisho-top-avatar" style="--staff-color:' + baseColor + ';">' +
              '<img class="aisho-avatar-photo" src="photos/' + staff.id + '.jpg"' +
              ' onload="this.classList.add(\'loaded\');this.nextElementSibling.style.display=\'none\'"' +
              ' onerror="tryNextPhoto(this,' + staff.id + ',1)" alt="' + staff.name + '">' +
              '<span>' + staff.emoji + '</span>' +
            '</div>' +
            '<div class="aisho-top-name">' + staff.name + '</div>' +
            '<div class="aisho-top-role">' + staff.tags[0] + '</div>' +
            '<div class="aisho-top-rate">' + item.rate + '<span class="aisho-top-pct">%</span></div>' +
            '<div class="aisho-top-rate-label">一致率</div>' +
            '<div class="aisho-top-bar-bg"><div class="aisho-top-bar" style="width:' + item.rate + '%;"></div></div>' +
            (shiftHTML ? '<div class="aisho-shift-tags">' + shiftHTML + '</div>' : '') +
            '<div class="aisho-top-message">"' + staff.message + '"</div>' +
            '<div class="aisho-top-tap-hint">タップしてプロフィールを見る →</div>' +
          '</div>' +
        '</div></div>';
    }

    const rankClass = i === 1 ? "aisho-rank-2" : i === 2 ? "aisho-rank-3" : "";
    const showShift = (i <= 2 && shiftHTML);

    return '<div class="aisho-result-item ' + rankClass + '"' +
      ' style="animation-delay:' + (i * 0.05) + 's; --staff-color:' + baseColor + ';"' +
      ' onclick="openModal(' + staff.id + ')">' +
      '<div class="aisho-result-rank">' + rankEmoji + '</div>' +
      '<div class="aisho-result-avatar">' +
        '<img class="aisho-avatar-photo" src="photos/' + staff.id + '.jpg"' +
        ' onload="this.classList.add(\'loaded\');this.nextElementSibling.style.display=\'none\'"' +
        ' onerror="tryNextPhoto(this,' + staff.id + ',1)" alt="' + staff.name + '">' +
        '<span>' + staff.emoji + '</span>' +
      '</div>' +
      '<div class="aisho-result-info">' +
        '<div class="aisho-result-name">' + staff.name + '</div>' +
        '<div class="aisho-result-role">' + staff.tags[0] + '</div>' +
        (showShift ? '<div class="aisho-shift-tags aisho-shift-tags-sm">' + shiftHTML + '</div>' : '') +
      '</div>' +
      '<div class="aisho-result-rate-num-only">' + item.rate + '%</div>' +
      '<div class="aisho-result-bar-full">' +
        '<div class="aisho-result-bar-fill" style="width:' + item.rate + '%;" ></div>' +
      '</div></div>';
  }).join("");

  document.getElementById("aisho-result-list").innerHTML = html;
}

// ============================
// シフト時間タグ HTML
// ============================
function getStaffShiftTags(staffId) {
  const tags = [];
  const dayLabels = { "512": "5/12", "513": "5/13" };
  Object.keys(dayLabels).forEach(function(day) {
    (TIME_SLOTS || []).forEach(function(slot) {
      const ids = (SCHEDULE[day] && SCHEDULE[day][slot.id]) || [];
      if (ids.includes(staffId)) {
        // "11:10～11:40" 等の全角チルダを考慮。splitが効くように全角「～」を使用。
        const startTime = slot.label.split('～')[0] + '～';
        tags.push('<span class="aisho-shift-tag">🕐 ' + dayLabels[day] + ' ' + startTime + '</span>');
      }
    });
  });
  return tags.join("");
}
