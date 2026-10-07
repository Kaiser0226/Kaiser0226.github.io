/**
 * 得点計算エンジン (Score Engine)
 * 
 * 回答順に応じた段階減点とポイント倍率に対応
 */

const DEFAULT_SCORE_CONFIG = {
  maxPoint: 100,
  decrement: 10,
  minPoint: 10
};

function getPointMultiplier(question) {
  const multiplier = Number(question && question.pointMultiplier);
  if (Number.isFinite(multiplier) && multiplier > 0) return multiplier;
  return question && question.isDoublePoints ? 2 : 1;
}

function isTextAnswerCorrect(answerText, correctAnswers) {
  const acceptedAnswers = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
  return acceptedAnswers.some(answer =>
    typeof answer === 'string' && answer.length > 0 && answerText === answer
  );
}

class ScoreEngine {
  /**
   * 1問ごとの回答結果から獲得ポイントを計算
   * @param {Array} answers [{ teamId, teamName, selectedOption, answerTimeMs }]
   * @param {number|string} correctAnswer 正解の選択肢インデックスまたは模範解答
   * @param {Object} config 得点設定オブジェクト
   * @param {number|boolean} pointMultiplier 獲得ポイント倍率（booleanは既存データ互換用）
   * @returns {Object} { results: { [teamId]: { isCorrect, pointsAwarded, breakdown, rankInCorrect } }, correctCount, totalAnswers, correctRate }
   */
  static calculateQuestionScores(answers, correctAnswer, config = DEFAULT_SCORE_CONFIG, pointMultiplier = 1) {
    const results = {};
    const totalAnswers = answers.filter(answer =>
      answer.answerText === undefined || typeof answer.manualIsCorrect === 'boolean'
    ).length;

    // 正解者の抽出
    const requestedMultiplier = pointMultiplier === true ? 2 : Number(pointMultiplier);
    const multiplier = Number.isFinite(requestedMultiplier) && requestedMultiplier > 0
      ? requestedMultiplier
      : 1;
    const isDoublePoints = multiplier === 2;
    const isAnswerCorrect = answer => answer.manualIsCorrect !== undefined
      ? Boolean(answer.manualIsCorrect)
      : answer.answerText !== undefined
        ? isTextAnswerCorrect(answer.answerText, correctAnswer)
        : Number(answer.selectedOption) === Number(correctAnswer);
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
      return { results, correctCount, totalAnswers, correctRate, isDoublePoints, pointMultiplier: multiplier };
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

      // ポイント倍率を適用
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
      isDoublePoints,
      pointMultiplier: multiplier
    };
  }

  static getMultiplierLabel(multiplier) {
    const value = Number(multiplier);
    if (value === 2) return 'ダブルポイント';
    if (value === 3) return 'トリプルポイント';
    return `ポイント${value}倍`;
  }

  static getMultiplierBadge(multiplier) {
    const value = Number(multiplier);
    return value > 1 ? `🌟 ${this.getMultiplierLabel(value)} (${value}倍)` : '';
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
  module.exports = { ScoreEngine, DEFAULT_SCORE_CONFIG, getPointMultiplier, isTextAnswerCorrect };
}
