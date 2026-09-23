// ==========================================
// FEYNMAN VOICE EVALUATOR (MediaRecorder API)
// ==========================================
function initFeynmanVoiceRecorder() {
  if (typeof document === 'undefined') return;

  function setup() {
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    // Target existing mic button in prompt bar without rewriting HTML
    const micButton = document.querySelector('button[title="Voice Input"]') ||
                      document.getElementById('btn-voice-record');
    const promptInput = document.getElementById('doubt-prompt-input');
    const chatThread = document.getElementById('chat-thread-container');

    if (!micButton) {
      return;
    }

    micButton.id = 'btn-feynman-mic';

  micButton.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecordingAndEvaluate();
    }
  });

  /**
   * Request microphone access and begin audio capture
   */
  async function startRecording() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Microphone recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();
      isRecording = true;

      // Update button UI style dynamically without changing HTML structure
      micButton.classList.add('bg-error-container/40', 'text-error', 'animate-pulse');
      micButton.title = 'Recording explanation... Click to stop and evaluate with Feynman AI';
      console.log('[Feynman] Audio recording started...');
    } catch (err) {
      console.error('[Feynman] Microphone access error:', err);
      alert('Could not access microphone: ' + err.message);
    }
  }

  /**
   * Stop MediaRecorder, construct FormData with Blob & topic, and POST to endpoint
   */
  async function stopRecordingAndEvaluate() {
    if (!mediaRecorder) return;

    mediaRecorder.onstop = async () => {
      micButton.classList.remove('bg-error-container/40', 'text-error', 'animate-pulse');
      micButton.title = 'Voice Input';
      isRecording = false;

      // Release microphone hardware
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }

      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });

      const topic = (promptInput && promptInput.value.trim()) 
        ? promptInput.value.trim() 
        : 'CPU Cache Locality & Memory Layouts';

      const statusId = 'feynman-status-' + Date.now();
      appendStatusBubble(statusId, `Analyzing your spoken explanation for "${topic}" with Feynman AI...`);

      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'feynman_recording.webm');
        formData.append('topic', topic);

        // Uses our Bearer-token-enabled apiFetch helper
        const response = await apiFetch('/api/v1/feynman/evaluate-voice', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Evaluation failed');
        }

        renderFeynmanEvaluationCard(statusId, topic, result);
      } catch (err) {
        console.error('[Feynman] Evaluation failed:', err);
        updateStatusError(statusId, err.message);
      }
    };

    mediaRecorder.stop();
  }

  function appendStatusBubble(id, text) {
    if (!chatThread) return;
    const bubble = document.createElement('div');
    bubble.id = id;
    bubble.className = 'flex gap-space-sm max-w-4xl mr-auto animate-pulse';
    bubble.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-tertiary-container/40 flex items-center justify-center text-tertiary shrink-0 mt-1">
        <span class="material-symbols-outlined text-[18px]">mic</span>
      </div>
      <div class="p-4 rounded-2xl rounded-tl-none bg-surface-container text-on-surface shadow-md">
        <p class="font-body-md text-body-md text-tertiary font-semibold">${escapeHtml(text)}</p>
      </div>
    `;
    chatThread.appendChild(bubble);
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function updateStatusError(id, errorText) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'flex gap-space-sm max-w-4xl mr-auto';
    el.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-error-container/40 flex items-center justify-center text-error shrink-0 mt-1">
        <span class="material-symbols-outlined text-[18px]">error</span>
      </div>
      <div class="p-4 rounded-2xl rounded-tl-none bg-surface-container text-error shadow-md">
        <p class="font-body-md text-body-md font-semibold">Evaluation Error: ${escapeHtml(errorText)}</p>
      </div>
    `;
  }

  function renderFeynmanEvaluationCard(id, topic, data) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'flex gap-space-sm max-w-4xl mr-auto';

    const gapsList = (data.identified_gaps || [])
      .map(gap => `<li class="flex items-start gap-1.5"><span class="text-error text-xs mt-1">▸</span><span>${escapeHtml(gap)}</span></li>`)
      .join('');

    const analogiesList = (data.metrics?.analogies_used || [])
      .map(a => `<span class="px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant/30 text-xs text-secondary font-medium">💡 ${escapeHtml(a)}</span>`)
      .join('');

    el.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-tertiary-container to-secondary-container flex items-center justify-center text-on-surface shrink-0 mt-1 shadow-md">
        <span class="material-symbols-outlined text-[18px]">psychology</span>
      </div>
      <div class="flex-1 space-y-3">
        <div class="p-5 rounded-2xl rounded-tl-none bg-surface-container text-on-surface shadow-xl border border-outline-variant/20 space-y-4">
          <div class="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-tertiary/20 text-tertiary font-label-sm text-label-sm font-bold uppercase tracking-wider">Feynman Evaluation</span>
              <span class="font-headline-sm text-headline-sm font-bold text-on-surface">${escapeHtml(topic)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-display-lg text-2xl font-extrabold text-tertiary">${data.feynman_score || 0}<span class="text-xs text-outline">/100</span></span>
              <span class="px-2 py-0.5 rounded-md bg-primary-container/30 text-primary text-xs font-bold uppercase">${escapeHtml(data.grade || 'Evaluated')}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1">
            <div class="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
              <span class="text-xs text-outline block">Simplicity</span>
              <span class="font-bold text-sm text-on-surface">${data.metrics?.simplicity ?? '--'}%</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20">
              <span class="text-xs text-outline block">Intuition</span>
              <span class="font-bold text-sm text-on-surface">${data.metrics?.intuition ?? '--'}%</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/20 col-span-2 sm:col-span-1">
              <span class="text-xs text-outline block">XP Awarded</span>
              <span class="font-bold text-sm text-primary">+${data.xp_awarded || 50} XP</span>
            </div>
          </div>

          ${analogiesList ? `
            <div class="space-y-1">
              <span class="text-xs text-outline font-semibold uppercase tracking-wider">Analogies Detected:</span>
              <div class="flex flex-wrap gap-1.5 pt-0.5">${analogiesList}</div>
            </div>
          ` : ''}

          ${gapsList ? `
            <div class="p-3 rounded-xl bg-surface-container-low border border-error/20 space-y-1.5">
              <span class="text-xs text-error font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">troubleshoot</span> Conceptual Gaps to Strengthen:
              </span>
              <ul class="text-xs text-on-surface-variant space-y-1">${gapsList}</ul>
            </div>
          ` : ''}

          <div class="pt-1 text-sm text-on-surface-variant italic leading-relaxed border-t border-outline-variant/15">
            "${escapeHtml(data.ai_mentor_feedback || data.feedback_text || '')}"
          </div>
        </div>
      </div>
    `;
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
  } // end setup

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

// Auto-run if running in browser
if (typeof window !== 'undefined') {
  window.initFeynmanVoiceRecorder = initFeynmanVoiceRecorder;
  initFeynmanVoiceRecorder();
}

