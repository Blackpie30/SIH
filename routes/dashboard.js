const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', dashboardController.getSummary);
router.post('/streak/continue', dashboardController.continueStreak);
router.get('/daily-quest', dashboardController.getDailyQuest);
router.post('/daily-quest/claim', dashboardController.claimDailyQuest);
router.get('/stats', dashboardController.getStats);

module.exports = router;
