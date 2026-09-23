const fs = require('fs');
const multer = require('multer');
const geminiService = require('../services/gemini.service');

// Configure Multer for in-memory storage (20MB limit matching Gemini inline payload cap)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  },
  fileFilter: (req, file, cb) => {
    // Allow any standard audio format or octet-stream fallback
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload an audio file (WebM, MP3, WAV, etc.)'), false);
    }
  }
});

/**
 * Underlying fields middleware for 'audio' or 'audio_file' field.
 */
const uploadFields = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'audio_file', maxCount: 1 }
]);

/**
 * Middleware handling multipart/form-data upload with graceful Multer error interception.
 */
const uploadAudio = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Audio file exceeds the maximum 20MB limit'
          });
        }
        return res.status(400).json({
          error: `Upload error: ${err.message}`
        });
      }
      return res.status(400).json({
        error: err.message || 'File upload error'
      });
    }
    next();
  });
};

/**
 * Express controller handler for Feynman Voice Evaluation.
 * POST /api/v1/feynman/evaluate-voice
 */
async function evaluateVoice(req, res, next) {
  // Retrieve file from either single upload or fields
  const uploadedFile = req.file || 
    (req.files && (req.files.audio?.[0] || req.files.audio_file?.[0]));

  try {
    if (!uploadedFile) {
      return res.status(400).json({
        error: 'Audio file is required (multipart field "audio" or "audio_file")'
      });
    }

    const topic = req.body.topic;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        error: 'Topic is required in the request body'
      });
    }

    const grading = await geminiService.evaluateFeynmanVoice({
      audioBuffer: uploadedFile.buffer,
      mimeType: uploadedFile.mimetype,
      topic: topic.trim()
    });

    return res.status(200).json(grading);
  } catch (error) {
    console.error('Voice evaluation error:', error);

    if (error.message && error.message.includes('GEMINI_API_KEY')) {
      return res.status(500).json({
        error: 'Gemini AI service is not configured. Missing GEMINI_API_KEY.'
      });
    }

    return res.status(500).json({
      error: error.message || 'An unexpected error occurred during Feynman voice evaluation'
    });
  } finally {
    // Prevent storage leaks: if audio touched disk (e.g. diskStorage), delete immediately
    if (uploadedFile && uploadedFile.path) {
      fs.unlink(uploadedFile.path, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
          console.warn('Warning: Failed to clean up uploaded audio file:', unlinkErr.message);
        }
      });
    }

    // Release in-memory buffer to prevent heap retention under high concurrency
    if (uploadedFile && uploadedFile.buffer) {
      uploadedFile.buffer = null;
    }
  }
}

module.exports = {
  upload,
  uploadAudio,
  evaluateVoice
};
