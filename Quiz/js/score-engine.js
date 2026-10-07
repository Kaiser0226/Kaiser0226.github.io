/**
 * 得点計算エンジン (Score Engine)
 * 
 * 回答順に応じた段階減点とダブルポイントに対応
 */

const DEFAULT_SCORE_CONFIG = {
  maxPoint: 100,
  decrement: 10,
  minPoint: 10
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
    const totalAnswers = answers.filter(answer =>
      answer.answerText === undefined || typeof answer.manualIsCorrect === 'boolean'
    ).length;

    // 正解者の抽出
    const isAnswerCorrect = answer => answer.manualIsCorrect !== undefined
      ? Boolean(answer.manualIsCorrect)
      : Number(answer.selectedOption) === Number(correctOption);
    const correctAnswers = answers
      .filter(isAnswerCorrect)
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
      const isPending = a.manualIsCorrect === undefined && a.answerText !== undefined;
      const isCorrect = isAnswerCorrect(a);
      if (isPending) {
        results[a.teamId] = {
          teamId: a.teamId,
          teamName: a.teamName,
          isCorrect: null,
          pending: true,
          pointsAwarded: 0,
          answerTimeMs: a.answerTimeMs,
          rankInCorrect: null
        };
      } else if (!isCorrect) {
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

    const legacyMax = Number(config.rankPoints?.[1] ?? config.rank1 ?? 100);
    const legacySecond = Number(config.rankPoints?.[2] ?? config.rank2 ?? legacyMax - 10);
    const maxPoint = Math.max(0, Number(config.maxPoint ?? legacyMax));
    const decrement = Math.max(0, Number(config.decrement ?? legacyMax - legacySecond));
    const minPoint = Math.max(0, Number(config.minPoint ?? config.defaultPoint ?? 10));

    // 同じ回答時間のチームは同順位・同得点にする
    const answerTimeCounts = new Map();
    correctAnswers.forEach(answer => {
      answerTimeCounts.set(answer.answerTimeMs, (answerTimeCounts.get(answer.answerTimeMs) || 0) + 1);
    });
    let previousAnswerTime = null;
    let currentRank = 0;
    correctAnswers.forEach((ans, index) => {
      if (previousAnswerTime === null || ans.answerTimeMs !== previousAnswerTime) {
        currentRank = index + 1;
      }
      previousAnswerTime = ans.answerTimeMs;

      const baseEarned = Math.max(minPoint, maxPoint - (currentRank - 1) * decrement);

      // ダブルポイント適用
      const totalEarned = baseEarned * multiplier;

      results[ans.teamId] = {
        teamId: ans.teamId,
        teamName: ans.teamName,
        isCorrect: true,
        pointsAwarded: totalEarned,
        breakdown: {
          rankPoint: baseEarned,
          tier: currentRank === 1 ? 'rank1' : 'ranked',
          isDoublePoints: Boolean(isDoublePoints),
          multiplier
        },
        answerTimeMs: ans.answerTimeMs,
        rankInCorrect: currentRank,
        rankTieCount: answerTimeCounts.get(ans.answerTimeMs)
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

  static getRankLabel(sortedTeams, index) {
    const score = Number(sortedTeams[index]?.totalScore) || 0;
    let rank = index + 1;
    while (rank > 1 && (Number(sortedTeams[rank - 2].totalScore) || 0) === score) {
      rank--;
    }
    const tieCount = sortedTeams.filter(team => (Number(team.totalScore) || 0) === score).length;
    return `${tieCount > 1 ? '同率' : ''}${rank}位`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScoreEngine, DEFAULT_SCORE_CONFIG };
}
