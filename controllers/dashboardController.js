const dashboardService = require('../services/dashboardService');

/**
 * Handle fetching dashboard command center summary.
 */
async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user.id);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard summary' });
  }
}

/**
 * Handle streak continuation micro-task action.
 */
async function continueStreak(req, res, next) {
  try {
    const result = await dashboardService.continueStreak(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Streak continuation error:', error);
    return res.status(500).json({ error: 'Failed to continue streak' });
  }
}

/**
 * Handle retrieving active daily quest challenge.
 */
async function getDailyQuest(req, res, next) {
  try {
    const quest = await dashboardService.getDailyQuest(req.user.id);
    return res.status(200).json(quest);
  } catch (error) {
    console.error('Get daily quest error:', error);
    return res.status(500).json({ error: 'Failed to retrieve daily quest' });
  }
}

/**
 * Handle claiming daily quest rewards.
 */
async function claimDailyQuest(req, res, next) {
  try {
    const result = await dashboardService.claimDailyQuest(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Claim daily quest error:', error);
    return res.status(500).json({ error: 'Failed to claim daily quest' });
  }
}

/**
 * Handle retrieving student's top weak topics.
 */
async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getWeakTopics(req.user.id);
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve weakness statistics' });
  }
}

module.exports = {
  getSummary,
  continueStreak,
  getDailyQuest,
  claimDailyQuest,
  getStats
};
