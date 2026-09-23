const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubt.controller');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, doubtController.createDoubt);
router.post('/:id/upvote', doubtController.upvoteDoubt);
router.post('/:id/answers', authenticateToken, doubtController.submitAnswer);

module.exports = router;
