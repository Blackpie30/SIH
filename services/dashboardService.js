const pool = require('../db');

/**
 * Retrieve dashboard summary telemetry for student command center.
 */
async function getDashboardSummary(userId) {
  const [users] = await pool.query(
    'SELECT streak_days, longest_streak_days, xp_balance, freezes_available FROM users WHERE id = ?',
    [userId]
  );

  const user = users[0] || { streak_days: 0, longest_streak_days: 0, xp_balance: 0, freezes_available: 2 };

  return {
    streak: {
      current_days: user.streak_days,
      is_hot: user.streak_days > 3,
      longest_days: user.longest_streak_days,
      today_xp: 120,
      freezes_available: user.freezes_available,
      xp_multiplier: '1.4x',
      today_target: {
        completed: 3,
        total: 5,
        percentage: 60
      },
      weekly_calendar: [
        { day: 'M', completed: true },
        { day: 'T', completed: true },
        { day: 'W', completed: true },
        { day: 'T', completed: true },
        { day: 'F', completed: true },
        { day: 'S', is_today: true, completed: false },
        { day: 'S', scheduled: true }
      ]
    }
  };
}

/**
 * Trigger streak continuation micro-task (+40 XP).
 */
async function continueStreak(userId) {
  const STREAK_XP_AWARD = 40;

  await pool.query(
    `UPDATE users 
     SET xp_balance = xp_balance + ?,
         streak_days = streak_days + 1,
         longest_streak_days = GREATEST(longest_streak_days, streak_days + 1)
     WHERE id = ?`,
    [STREAK_XP_AWARD, userId]
  );

  const [users] = await pool.query(
    'SELECT streak_days, xp_balance FROM users WHERE id = ?',
    [userId]
  );

  const updatedUser = users[0] || { streak_days: 1, xp_balance: STREAK_XP_AWARD };

  return {
    xp_earned: STREAK_XP_AWARD,
    new_streak_days: updatedUser.streak_days,
    new_total_xp: updatedUser.xp_balance,
    message: 'Streak maintained! +40 XP awarded'
  };
}

/**
 * Retrieve active daily challenge quest and countdown timer.
 */
async function getDailyQuest(userId) {
  // Midnight calculation for seconds remaining in current day
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const secondsRemaining = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));

  return {
    quest_id: 'qst_daily_902',
    title: 'Systems & Doubts Accelerator',
    description: 'Solve 3 programming questions or review 1 student doubt in Systems.',
    seconds_remaining: secondsRemaining,
    current_step: 1,
    total_steps: 3,
    rewards: {
      xp: 100,
      streak_freeze: 1,
      badge: 'Quest Master Tier 1'
    }
  };
}

/**
 * Claim completed daily quest rewards.
 */
async function claimDailyQuest(userId) {
  const QUEST_XP = 100;
  const FREEZES_AWARDED = 1;

  await pool.query(
    'UPDATE users SET xp_balance = xp_balance + ?, freezes_available = freezes_available + ? WHERE id = ?',
    [QUEST_XP, FREEZES_AWARDED, userId]
  );

  return {
    success: true,
    xp_awarded: QUEST_XP,
    freezes_awarded: FREEZES_AWARDED,
    badge_unlocked: 'Quest Master Tier 1'
  };
}

/**
 * Fetch student's top weak topics from weak_topics table.
 */
async function getWeakTopics(userId) {
  const [rows] = await pool.query(
    `SELECT subject, topic_name, failure_count, last_failed_at
     FROM weak_topics
     WHERE user_id = ?
     ORDER BY failure_count DESC
     LIMIT 3`,
    [userId]
  );

  return { weak_topics: rows };
}

module.exports = {
  getDashboardSummary,
  continueStreak,
  getDailyQuest,
  claimDailyQuest,
  getWeakTopics
};
