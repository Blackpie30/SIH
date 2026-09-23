# Brain Bytes - Hackathon MVP API Specification

## 1. Auth Foundation
* `POST /api/v1/auth/register` - Register student.
* `POST /api/v1/auth/login` - Authenticate and return JWT.

## 2. Core Dashboard & Weakness Tracking
* `GET /api/v1/dashboard/stats` - Returns student's top 3 weak topics based on past quiz failures.
* `GET /api/v1/quizzes/generate` - Triggers Gemini to generate 3 MCQs specifically targeting the user's weak topics.
* `POST /api/v1/quizzes/submit` - Submits answers and recalculates the weakness frequency in the database.

## 3. The X-Factor: Feynman Voice Evaluator
* `POST /api/v1/feynman/evaluate-voice` 
  - **Payload:** `multipart/form-data` containing `.webm` or `.mp3` audio blob and a `topic` string.
  - **Action:** Sends audio to Gemini for transcription and conceptual evaluation.
  - **Returns:** JSON with `{ feynman_score, grade, identified_gaps, feedback_text }`.

## 4. P2P Community (Minimal)
* `GET /api/v1/doubts` - Fetch recent student doubts.
* `POST /api/v1/doubts` - Publish a new doubt to the community.