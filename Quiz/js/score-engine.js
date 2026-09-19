/**
 * 得点計算エンジン (Score Engine)
 * 
 * 4種類の得点ボーナス + 基本点:
 * 1. 基本点 (basePoint)
 * 2. 速かった方から3グループ (top1, top2, top3)
 * 3. 正解者の中で上位50% (topHalf)
 * 4. 正解者の中で下位50% (bottomHalf)
 * 5. 単独正解ボーナス (soloBonus: 正解者が1チームのみの場合)
 */

const DEFAULT_SCORE_CONFIG = {
  basePoint: 10,        // 基本正解点
  top1Bonus: 10,        // 最速1位ボーナス
  top2Bonus: 7,         // 最速2位ボーナス
  top3Bonus: 5,         // 最速3位ボーナス
  topHalfBonus: 5,      // 正解者上位50%ボーナス
  bottomHalfBonus: 2,   // 正解者下位50%ボーナス
  soloBonus: 30         // 単独正解特別ボーナス
};

class ScoreEngine {
  /**
   * 1問ごとの回答結果から獲得ポイントを計算
   * @param {Array} answers [{ teamId, teamName, selectedOption, answerTimeMs }]
   * @param {number} correctOption 正解の選択肢インデックス
   * @param {Object} config 得点設定オブジェクト
   * @returns {Object} { results: { [teamId]: { isCorrect, pointsAwarded, breakdown, rankInCorrect } }, correctCount, totalAnswers, correctRate }
   */
  static calculateQuestionScores(answers, correctOption, config = DEFAULT_SCORE_CONFIG) {
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
            base: 0,
            topSpeed: 0,
            halfTier: 0,
            solo: 0
          },
          answerTimeMs: a.answerTimeMs,
          rankInCorrect: null
        };
      }
    });

    if (correctCount === 0) {
      return { results, correctCount, totalAnswers, correctRate };
    }

    // 単独正解判定
    const isSolo = (correctCount === 1);

    // 正解者の中で上位50%の境界値 (同着や端数はCeilで計算)
    const topHalfCutoff = Math.ceil(correctCount / 2);

    correctAnswers.forEach((ans, index) => {
      const rank = index + 1; // 1-indexed
      let speedBonus = 0;
      let halfTierBonus = 0;
      let soloBonus = 0;

      // 1. 最速Top 3ボーナス
      if (rank === 1) speedBonus = config.top1Bonus || 0;
      else if (rank === 2) speedBonus = config.top2Bonus || 0;
      else if (rank === 3) speedBonus = config.top3Bonus || 0;

      // 2. 単独正解ボーナス or 上位・下位50%
      if (isSolo) {
        soloBonus = config.soloBonus || 0;
      } else {
        if (rank <= topHalfCutoff) {
          halfTierBonus = config.topHalfBonus || 0;
        } else {
          halfTierBonus = config.bottomHalfBonus || 0;
        }
      }

      const totalEarned = (config.basePoint || 0) + speedBonus + halfTierBonus + soloBonus;

      results[ans.teamId] = {
        teamId: ans.teamId,
        teamName: ans.teamName,
        isCorrect: true,
        pointsAwarded: totalEarned,
        breakdown: {
          base: config.basePoint || 0,
          topSpeed: speedBonus,
          halfTier: halfTierBonus,
          solo: soloBonus
        },
        answerTimeMs: ans.answerTimeMs,
        rankInCorrect: rank
      };
    });

    return {
      results,
      correctCount,
      totalAnswers,
      correctRate
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScoreEngine, DEFAULT_SCORE_CONFIG };
}
