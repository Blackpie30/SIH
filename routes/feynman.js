const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voice.controller');

router.post('/evaluate-voice', voiceController.uploadAudio, voiceController.evaluateVoice);

module.exports = router;
