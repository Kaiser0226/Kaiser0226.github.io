/**
 * 得点計算エンジン (Score Engine)
 * 
 * 正解順位ごとの得点指定 + ダブルポイント対応:
 * - 1位〜5位などの順位に応じた直接得点指定
 * - 指定順位以降の正解者デフォルト得点
 * - ダブルポイント（問題ごとの得点2倍設定）
 */

const DEFAULT_SCORE_CONFIG = {
  rankPoints: {
    1: 100, // 1位
    2: 70,  // 2位
    3: 50,  // 3位
    4: 40,  // 4位
    5: 30   // 5位
  },
  defaultPoint: 10 // 6位以降の正解者得点
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

    // 各正解者の得点を順位別に算出
    correctAnswers.forEach((ans, index) => {
      const rank = index + 1; // 1-indexed (1位, 2位, ...)
      let baseEarned = 10;

      // 順位別得点設定から取得
      if (config && config.rankPoints) {
        if (config.rankPoints[rank] !== undefined) {
          baseEarned = Number(config.rankPoints[rank]);
        } else {
          baseEarned = Number(config.defaultPoint !== undefined ? config.defaultPoint : 10);
        }
      } else if (config && config.basePoint !== undefined) {
        // 旧設定フォーマット互換
        baseEarned = Number(config.basePoint);
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
