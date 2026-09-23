const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';

const app = require('./server');
const { generateToken, verifyToken } = require('./utils/token');
const geminiService = require('./services/gemini.service');
const voiceController = require('./controllers/voice.controller');

// Helper to make HTTP requests to the running server
function request(server, options, postData = null, isRawBuffer = false) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData && !isRawBuffer) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr);
    } else if (postData && isRawBuffer) {
      reqOptions.headers['Content-Length'] = postData.length;
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);

    if (postData && !isRawBuffer) {
      const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
      req.write(dataStr);
    } else if (postData && isRawBuffer) {
      req.write(postData);
    }
    req.end();
  });
}

function buildMultipart(boundary, fields = {}, files = []) {
  const chunks = [];
  for (const [key, val] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }
  for (const f of files) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.fieldName}"; filename="${f.filename}"\r\nContent-Type: ${f.mimeType}\r\n\r\n`));
    chunks.push(f.buffer);
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

async function runTests() {
  console.log('🚀 Starting Automated Backend Verification...\n');

  // 1. Verify server.js line count
  const fs = require('fs');
  const serverContent = fs.readFileSync('./server.js', 'utf8');
  const lineCount = serverContent.split('\n').length;
  console.log(`[Check 1] server.js line count: ${lineCount}`);
  assert.ok(lineCount < 40, `server.js should be under 40 lines (got ${lineCount})`);

  // 2. Start HTTP server on random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 3. Test Health Endpoint
    console.log('[Check 2] Testing GET /api/health...');
    const healthRes = await request(server, { path: '/api/health', method: 'GET' });
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'ok');
    assert.strictEqual(healthRes.body.service, 'Brain Bytes API');
    console.log('  -> Passed: /api/health returns 200 OK');

    // 4. Test 404 Catch-All
    console.log('[Check 3] Testing 404 handler for undefined route...');
    const notFoundRes = await request(server, { path: '/api/v1/unknown', method: 'GET' });
    assert.strictEqual(notFoundRes.status, 404);
    assert.strictEqual(notFoundRes.body.error, 'Endpoint not found');
    console.log('  -> Passed: Undefined route returns 404');

    // 5. Test Auth Register Validation (Missing Fields)
    console.log('[Check 4] Testing POST /api/v1/auth/register input validation...');
    const regResEmpty = await request(server, { path: '/api/v1/auth/register', method: 'POST' }, {});
    assert.strictEqual(regResEmpty.status, 400);
    assert.strictEqual(regResEmpty.body.error, 'Full name is required');

    const regResShortPw = await request(server, { path: '/api/v1/auth/register', method: 'POST' }, {
      full_name: 'Alex',
      email: 'alex@stanford.edu',
      password: '123'
    });
    assert.strictEqual(regResShortPw.status, 400);
    assert.strictEqual(regResShortPw.body.error, 'Password must be at least 6 characters long');
    console.log('  -> Passed: Registration validation returns 400 on bad input');

    // 6. Test Auth Login Validation (Missing Fields)
    console.log('[Check 5] Testing POST /api/v1/auth/login input validation...');
    const loginResEmpty = await request(server, { path: '/api/v1/auth/login', method: 'POST' }, {});
    assert.strictEqual(loginResEmpty.status, 400);
    assert.strictEqual(loginResEmpty.body.error, 'Email is required');
    console.log('  -> Passed: Login validation returns 400 on missing credentials');

    // 7. Test Auth Logout
    console.log('[Check 6] Testing POST /api/v1/auth/logout...');
    const logoutRes = await request(server, { path: '/api/v1/auth/logout', method: 'POST' });
    assert.strictEqual(logoutRes.status, 200);
    assert.strictEqual(logoutRes.body.success, true);
    console.log('  -> Passed: Logout returns 200 with success: true');

    // 8. Test Auth Me - Missing Token (401) and Invalid Token (403)
    console.log('[Check 7] Testing GET /api/v1/auth/me token authentication guards...');
    const meNoToken = await request(server, { path: '/api/v1/auth/me', method: 'GET' });
    assert.strictEqual(meNoToken.status, 401);

    const meBadToken = await request(server, {
      path: '/api/v1/auth/me',
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.token.payload' }
    });
    assert.strictEqual(meBadToken.status, 403);
    console.log('  -> Passed: Auth middleware blocks missing/invalid tokens (401/403)');

    // 9. Test Dashboard Routes Protected by Auth
    console.log('[Check 8] Testing Dashboard routes protection without token...');
    const dashNoToken = await request(server, { path: '/api/v1/dashboard/summary', method: 'GET' });
    assert.strictEqual(dashNoToken.status, 401);

    const streakNoToken = await request(server, { path: '/api/v1/dashboard/streak/continue', method: 'POST' });
    assert.strictEqual(streakNoToken.status, 401);

    const questNoToken = await request(server, { path: '/api/v1/dashboard/daily-quest', method: 'GET' });
    assert.strictEqual(questNoToken.status, 401);
    console.log('  -> Passed: Dashboard routes strictly require Bearer token');

    // 10. Test JWT Token Utility
    console.log('[Check 9] Testing utils/token.js generate and verify...');
    const sampleToken = generateToken({ id: 99, email: 'test@eduvia.ai' });
    assert.ok(typeof sampleToken === 'string');

    let decodedSync;
    verifyToken(sampleToken, (err, decoded) => {
      assert.ifError(err);
      decodedSync = decoded;
    });
    assert.strictEqual(decodedSync.id, 99);
    assert.strictEqual(decodedSync.email, 'test@eduvia.ai');
    console.log('  -> Passed: utils/token generates and verifies tokens properly');

    // 11. Test Daily Quest Route with Valid Token
    console.log('[Check 10] Testing GET /api/v1/dashboard/daily-quest with valid token...');
    const questRes = await request(server, {
      path: '/api/v1/dashboard/daily-quest',
      method: 'GET',
      headers: { Authorization: `Bearer ${sampleToken}` }
    });
    assert.strictEqual(questRes.status, 200);
    assert.strictEqual(questRes.body.quest_id, 'qst_daily_902');
    assert.strictEqual(questRes.body.rewards.xp, 100);
    assert.strictEqual(questRes.body.rewards.streak_freeze, 1);
    console.log('  -> Passed: Daily quest returns expected structure per api-spec.md');

    // 12. Test Feynman Voice - Missing Audio File (400)
    console.log('[Check 11] Testing POST /api/v1/feynman/evaluate-voice without audio file...');
    const boundary = '----TestBoundary' + Math.random().toString(16);
    const noAudioPayload = buildMultipart(boundary, { topic: 'Binary Search Trees' }, []);
    const feynmanNoAudio = await request(server, {
      path: '/api/v1/feynman/evaluate-voice',
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    }, noAudioPayload, true);
    assert.strictEqual(feynmanNoAudio.status, 400);
    assert.ok(feynmanNoAudio.body.error.includes('Audio file is required'));
    console.log('  -> Passed: Voice controller returns 400 when audio file is missing');

    // 13. Test Feynman Voice - Missing Topic (400)
    console.log('[Check 12] Testing POST /api/v1/feynman/evaluate-voice without topic...');
    const dummyAudioBuffer = Buffer.from('FAKE_AUDIO_DATA_FOR_TESTING');
    const noTopicPayload = buildMultipart(boundary, {}, [
      { fieldName: 'audio', filename: 'explanation.webm', mimeType: 'audio/webm', buffer: dummyAudioBuffer }
    ]);
    const feynmanNoTopic = await request(server, {
      path: '/api/v1/feynman/evaluate-voice',
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    }, noTopicPayload, true);
    assert.strictEqual(feynmanNoTopic.status, 400);
    assert.ok(feynmanNoTopic.body.error.includes('Topic is required'));
    console.log('  -> Passed: Voice controller returns 400 when topic is missing');

    // 14. Test gemini.service.js input validation
    console.log('[Check 13] Testing services/gemini.service.js input validations...');
    await assert.rejects(
      async () => { await geminiService.evaluateFeynmanVoice({}); },
      /Valid audio buffer is required/
    );
    await assert.rejects(
      async () => { await geminiService.evaluateFeynmanVoice({ audioBuffer: Buffer.from('123') }); },
      /Topic string is required/
    );
    console.log('  -> Passed: gemini.service.js strictly validates input parameters');

    // 15. Test Feynman Voice - Invalid File Format (400 via multer filter)
    console.log('[Check 14] Testing POST /api/v1/feynman/evaluate-voice with invalid file format...');
    const invalidFormatPayload = buildMultipart(boundary, { topic: 'Sorting Algorithms' }, [
      { fieldName: 'audio', filename: 'malicious.txt', mimeType: 'text/plain', buffer: Buffer.from('hello world') }
    ]);
    const feynmanInvalidFormat = await request(server, {
      path: '/api/v1/feynman/evaluate-voice',
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    }, invalidFormatPayload, true);
    assert.strictEqual(feynmanInvalidFormat.status, 400);
    assert.ok(feynmanInvalidFormat.body.error.includes('Invalid file format'));
    console.log('  -> Passed: Multer filter rejects non-audio file types with 400 Bad Request');

    // 16. Test Storage Leak Prevention & try...finally cleanup in voice.controller.js
    console.log('[Check 15] Testing defensive disk unlinking and buffer dereferencing in evaluateVoice...');
    const tmpTestAudioPath = path.join(os.tmpdir(), `test_leak_guard_${Date.now()}.webm`);
    fs.writeFileSync(tmpTestAudioPath, 'dummy-audio-content');
    assert.strictEqual(fs.existsSync(tmpTestAudioPath), true, 'Temporary file must exist before test');

    const mockReq = {
      file: {
        path: tmpTestAudioPath,
        buffer: Buffer.from('dummy-audio-content'),
        mimetype: 'audio/webm'
      },
      body: { topic: '' } // Triggers early return with 400, testing try...finally execution
    };
    const mockRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.payload = data; return this; }
    };

    await voiceController.evaluateVoice(mockReq, mockRes, () => {});
    assert.strictEqual(mockRes.statusCode, 400);
    // Allow fs.unlink callback to complete
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(fs.existsSync(tmpTestAudioPath), false, 'Temporary disk audio file must be deleted by finally block');
    assert.strictEqual(mockReq.file.buffer, null, 'In-memory buffer must be dereferenced by finally block');
    console.log('  -> Passed: evaluateVoice properly unlinks disk files and nullifies buffers in finally block');

    console.log('\n✨ All 15 automated verification checks PASSED successfully! ✨\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
