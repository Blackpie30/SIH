const { GoogleGenAI, Type } = require('@google/genai');

/**
 * Strict JSON schema for Feynman Technique evaluation output.
 * Fully aligned with api-spec.md POST /api/v1/feynman/evaluate-voice.
 */
const feynmanGradingSchema = {
  type: Type.OBJECT,
  properties: {
    feynman_score: {
      type: Type.INTEGER,
      description: 'Overall Feynman technique evaluation score between 0 and 100.'
    },
    grade: {
      type: Type.STRING,
      description: 'Mastery grade classification: Mastery (90+), Proficient (75-89), Developing (60-74), or Novice (<60).'
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        simplicity: {
          type: Type.INTEGER,
          description: 'Score from 0 to 100 measuring plain-language explanation without needlessly complex terms.'
        },
        intuition: {
          type: Type.INTEGER,
          description: 'Score from 0 to 100 measuring how well the core intuition was conveyed.'
        },
        jargon_handling: {
          type: Type.STRING,
          description: 'Assessment of whether jargon was avoided, grounded, or explained simply.'
        },
        analogies_used: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of real-world analogies or physical mental models identified in the speech.'
        }
      },
      required: ['simplicity', 'intuition', 'jargon_handling', 'analogies_used']
    },
    identified_gaps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of conceptual gaps, missing edge cases, or misconceptions spotted in the explanation.'
    },
    ai_mentor_feedback: {
      type: Type.STRING,
      description: 'Constructive pedagogical mentor feedback addressing the student.'
    },
    feedback_text: {
      type: Type.STRING,
      description: 'Summary feedback text aligned with mentor feedback.'
    },
    xp_awarded: {
      type: Type.INTEGER,
      description: 'Gamification XP points awarded (typically 40 to 50 XP).'
    }
  },
  required: ['feynman_score', 'grade', 'metrics', 'identified_gaps', 'ai_mentor_feedback', 'xp_awarded']
};

/**
 * Pure service function to evaluate spoken concept explanations against the Feynman technique.
 *
 * @param {Object} params
 * @param {Buffer|Uint8Array} params.audioBuffer - Raw audio binary buffer
 * @param {string} [params.mimeType='audio/webm'] - Audio MIME type (e.g. audio/webm, audio/mp3, audio/wav)
 * @param {string} params.topic - Topic or concept being explained
 * @returns {Promise<Object>} Strict JSON grading object
 */
async function evaluateFeynmanVoice({ audioBuffer, mimeType = 'audio/webm', topic }) {
  if (!audioBuffer || !Buffer.isBuffer(audioBuffer) && !(audioBuffer instanceof Uint8Array)) {
    throw new Error('Valid audio buffer is required');
  }

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    throw new Error('Topic string is required');
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase() || 'audio/webm';

  const prompt = `You are an elite professor and cognitive mentor applying the Feynman Technique.
The student has recorded an audio explanation of the following topic:
Topic: "${topic.trim()}"

Analyze their spoken words, conceptual flow, and depth:
1. Simplicity: Did they explain it simply enough that a beginner or 10-year-old could follow?
2. Intuition: Did they build true intuitive understanding rather than reciting rote textbook jargon?
3. Jargon Handling: Did they spot and ground jargon, or use it as a crutch?
4. Gaps: What crucial links, edge cases, or physical realities did they omit or confuse?
5. Score: Assign a realistic score (0-100) and grade (Mastery, Proficient, Developing, Novice). Award XP (between 30 and 50 XP).

Evaluate the audio and return the strict JSON schema response.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: normalizedMime,
              data: base64Audio
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: feynmanGradingSchema,
      temperature: 0.2
    }
  });

  const parsed = JSON.parse(response.text);
  if (!parsed.feedback_text && parsed.ai_mentor_feedback) {
    parsed.feedback_text = parsed.ai_mentor_feedback;
  }

  return parsed;
}

module.exports = {
  evaluateFeynmanVoice,
  feynmanGradingSchema
};
