/**
 * 得点計算エンジン (Score Engine)
 * 
 * 正解順位ごとの得点指定 + ダブルポイント対応:
 * - 1位、2位、3位の直接得点指定
 * - 上位50%、下位50%の得点指定 (4位以降の正解者)
 * - ダブルポイント（問題ごとの得点2倍設定）
 */

const DEFAULT_SCORE_CONFIG = {
  rank1: 100,      // 1位の得点
  rank2: 70,       // 2位の得点
  rank3: 50,       // 3位の得点
  topHalf: 30,     // 上位50%の得点
  bottomHalf: 10   // 下位50%の得点
};

class ScoreEngine {
  /**
   * 1問ごとの回答結果から獲得ポイントを計算
   * @param {Array} answers [{ teamId, teamName, selectedOption, answerTimeMs }]
   * @param {number} correctOption 正解の選択肢インデックス
   * @param {Object} config 得点設定オブジェクト
   * @param {boolean} isDoublePoints ダブルポイント(得点2倍)フラグ
   * @returns {Object} { results: { [teamId]: { isCorrect, pointsAwarded, breakdown, rankInCorrect } }, correctCount, totalAnswers, correctRate }
   */
  static calculateQuestionScores(answers, correctOption, config = DEFAULT_SCORE_CONFIG, isDoublePoints = false) {
    const results = {};
    const totalAnswers = answers.length;

    // 正解者の抽出
    const correctAnswers = answers
      .filter(a => Number(a.selectedOption) === Number(correctOption))
      .map(a => ({
        ...a,
        answerTimeMs: Number(a.answerTimeMs) || 9999999
      }));

    // 回答時間昇順でソート（より速い方が先頭）
    correctAnswers.sort((a, b) => a.answerTimeMs - b.answerTimeMs);

    const correctCount = correctAnswers.length;
    const correctRate = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;
    const multiplier = isDoublePoints ? 2 : 1;

    // 不正解チームの初期化
    answers.forEach(a => {
      const isCorrect = Number(a.selectedOption) === Number(correctOption);
      if (!isCorrect) {
        results[a.teamId] = {
          teamId: a.teamId,
          teamName: a.teamName,
          isCorrect: false,
          pointsAwarded: 0,
          breakdown: {
            rankPoint: 0,
            tier: 'incorrect',
            isDoublePoints: Boolean(isDoublePoints),
            multiplier
          },
          answerTimeMs: a.answerTimeMs,
          rankInCorrect: null
        };
      }
    });

    if (correctCount === 0) {
      return { results, correctCount, totalAnswers, correctRate, isDoublePoints: Boolean(isDoublePoints) };
    }

    // 正解者の中で上位50%の境界値 (端数はCeilで計算)
    const topHalfCutoff = Math.ceil(correctCount / 2);

    // 設定値の取得 (下位互換性フォールバック付き)
    const pRank1 = Number(config.rank1 ?? (config.rankPoints ? config.rankPoints[1] : (config.basePoint ? config.basePoint + (config.top1SpeedBonus || 0) : 100)));
    const pRank2 = Number(config.rank2 ?? (config.rankPoints ? config.rankPoints[2] : (config.basePoint ? config.basePoint + (config.top2SpeedBonus || 0) : 70)));
    const pRank3 = Number(config.rank3 ?? (config.rankPoints ? config.rankPoints[3] : (config.basePoint ? config.basePoint + (config.top3SpeedBonus || 0) : 50)));
    const pTopHalf = Number(config.topHalf ?? (config.rankPoints ? config.rankPoints[4] : (config.topHalfBonus ?? 30)));
    const pBottomHalf = Number(config.bottomHalf ?? (config.defaultPoint ?? (config.bottomHalfBonus ?? 10)));

    // 各正解者の得点を順位・パーセンタイル別に算出
    correctAnswers.forEach((ans, index) => {
      const rank = index + 1; // 1-indexed (1位, 2位, ...)
      let baseEarned = pBottomHalf;
      let tier = 'bottomHalf';

      if (rank === 1) {
        baseEarned = pRank1;
        tier = 'rank1';
      } else if (rank === 2) {
        baseEarned = pRank2;
        tier = 'rank2';
      } else if (rank === 3) {
        baseEarned = pRank3;
        tier = 'rank3';
      } else {
        // 4位以降: 上位50%か下位50%か
        if (rank <= topHalfCutoff) {
          baseEarned = pTopHalf;
          tier = 'topHalf';
        } else {
          baseEarned = pBottomHalf;
          tier = 'bottomHalf';
        }
      }

      // ダブルポイント適用
      const totalEarned = baseEarned * multiplier;

      results[ans.teamId] = {
        teamId: ans.teamId,
        teamName: ans.teamName,
        isCorrect: true,
        pointsAwarded: totalEarned,
        breakdown: {
          rankPoint: baseEarned,
          tier,
          isDoublePoints: Boolean(isDoublePoints),
          multiplier
        },
        answerTimeMs: ans.answerTimeMs,
        rankInCorrect: rank
      };
    });

    return {
      results,
      correctCount,
      totalAnswers,
      correctRate,
      isDoublePoints: Boolean(isDoublePoints)
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScoreEngine, DEFAULT_SCORE_CONFIG };
}
