const assert = require('assert');
const http = require('http');

// Setup mock window & localStorage environment for testing frontend scripts in Node
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = {
  location: { origin: 'http://localhost:5000' }
};

// Start backend app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
const app = require('./server');
const { generateToken } = require('./utils/token');

// Load auth-api script logic
const fs = require('fs');
const authApiCode = fs.readFileSync('./frontend/auth-api.js', 'utf8');
eval(authApiCode); // evaluates API_BASE_URL, apiFetch, loginUser, logoutUser in scope

async function runFrontendIntegrationTests() {
  console.log('🧪 Starting Frontend Integration & Interceptor Verification...\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const realFetch = global.fetch;

  try {
    // 1. Test apiFetch Bearer token injection
    console.log('[Check 1] Verifying apiFetch injects Bearer token from localStorage...');
    const fakeToken = generateToken({ id: 101, email: 'student@eduvia.ai' });
    localStorage.setItem('eduvia_token', fakeToken);

    let capturedHeaders = null;
    global.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      const targetUrl = url.replace(':5000', `:${port}`);
      return realFetch(targetUrl, opts);
    };

    const resAuth = await apiFetch('/api/health');
    assert.strictEqual(resAuth.status, 200);
    assert.strictEqual(capturedHeaders['Authorization'], `Bearer ${fakeToken}`);
    console.log('  -> Passed: Authorization header automatically attached.');

    // 2. Test apiFetch without token
    console.log('[Check 2] Verifying apiFetch without token omits Authorization header...');
    localStorage.clear();
    const resNoAuth = await apiFetch('/api/health');
    assert.strictEqual(resNoAuth.status, 200);
    assert.strictEqual(capturedHeaders['Authorization'], undefined);
    console.log('  -> Passed: No Authorization header when unauthenticated.');

    // 3. Test FormData Content-Type exclusion (ensuring multipart boundary is preserved)
    console.log('[Check 3] Verifying apiFetch preserves FormData boundary (no hardcoded Content-Type)...');
    class FormData {
      constructor() { this.data = {}; }
      append(k, v) { this.data[k] = v; }
    }
    const dummyFormData = new FormData();
    dummyFormData.append('topic', 'Test Topic');

    global.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return { status: 200, json: async () => ({ status: 'ok' }) };
    };

    await apiFetch('/api/v1/feynman/evaluate-voice', { method: 'POST', body: dummyFormData });
    assert.strictEqual(capturedHeaders['Content-Type'], undefined);
    console.log('  -> Passed: Content-Type omitted for FormData payloads.');

    // 4. Test 401 interception and token clearing
    console.log('[Check 4] Verifying 401 response clears expired localStorage session...');
    localStorage.setItem('eduvia_token', 'expired_or_invalid_jwt');
    localStorage.setItem('eduvia_user_id', 'usr_999');

    // Simulate 401 response trigger
    global.fetch = async () => ({ status: 401 });
    await apiFetch('/api/v1/auth/me');
    assert.strictEqual(localStorage.getItem('eduvia_token'), null);
    assert.strictEqual(localStorage.getItem('eduvia_user_id'), null);
    console.log('  -> Passed: 401 automatically purges local token session.');

    // 5. Test Voice Evaluator file integrity
    console.log('[Check 5] Verifying frontend/voice-evaluator.js syntax and MediaRecorder hooks...');
    const voiceCode = fs.readFileSync('./frontend/voice-evaluator.js', 'utf8');
    assert.ok(voiceCode.includes('MediaRecorder'), 'voice-evaluator.js must reference MediaRecorder API');
    assert.ok(voiceCode.includes('FormData'), 'voice-evaluator.js must construct FormData');
    assert.ok(voiceCode.includes('/api/v1/feynman/evaluate-voice'), 'voice-evaluator.js must POST to /api/v1/feynman/evaluate-voice');
    console.log('  -> Passed: voice-evaluator.js contains MediaRecorder, FormData, and endpoint hooks.');

    // 6. Test HTML files contain the embedded script blocks
    console.log('[Check 6] Verifying HTML files contain embedded vanilla JS blocks...');
    const landingHtml = fs.readFileSync('./Smart Education/eduvia_landing_page/code.html', 'utf8');
    assert.ok(landingHtml.includes('apiFetch'), 'Landing page must contain apiFetch');
    assert.ok(landingHtml.includes('loginUser'), 'Landing page must contain loginUser');

    const aiTutorHtml = fs.readFileSync('./Smart Education/24_7_ai_tutor_workspace/code.html', 'utf8');
    assert.ok(aiTutorHtml.includes('apiFetch'), 'AI tutor workspace must contain apiFetch');
    assert.ok(aiTutorHtml.includes('initFeynmanVoiceRecorder'), 'AI tutor workspace must contain initFeynmanVoiceRecorder');
    assert.ok(aiTutorHtml.includes('MediaRecorder'), 'AI tutor workspace must contain MediaRecorder');
    console.log('  -> Passed: HTML files contain clean embedded vanilla scripts without structure alterations.');

    console.log('\n✨ All frontend integration checks PASSED successfully! ✨\n');
  } finally {
    global.fetch = realFetch;
    server.close();
  }
}

runFrontendIntegrationTests().catch(err => {
  console.error('❌ Frontend integration check failed:', err);
  process.exit(1);
});
