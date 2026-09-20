const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const durationInfo = document.getElementById('durationInfo');
    const waveWrap = document.getElementById('waveWrap');
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const selectionEl = document.getElementById('selection');
    const leftHandle = document.getElementById('leftHandle');
    const rightHandle = document.getElementById('rightHandle');
    const playhead = document.getElementById('playhead');
    const startInput = document.getElementById('startInput');
    const endInput = document.getElementById('endInput');
    const lengthInput = document.getElementById('lengthInput');
    const playFullBtn = document.getElementById('playFullBtn');
    const playCutBtn = document.getElementById('playCutBtn');
    const stopBtn = document.getElementById('stopBtn');
    const exportBtn = document.getElementById('exportBtn');
    const downloadLink = document.getElementById('downloadLink');
    const audioPreview = document.getElementById('audioPreview');

    let audioContext;
    let audioBuffer;
    let sourceNode;
    let startedAt = 0;
    let playOffset = 0;
    let animationId;
    let currentBlobUrl;
    let startTime = 0;
    let endTime = 0;
    let activeHandle = null;

    function ensureAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioContext;
    }

    function formatTime(seconds) {
      if (!Number.isFinite(seconds)) return '0:00.000';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
      return `${m}:${s}.${ms}`;
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function setDisabled(disabled) {
      [startInput, endInput, playFullBtn, playCutBtn, exportBtn].forEach(el => el.disabled = disabled);
      stopBtn.disabled = true;
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWaveform();
      updateSelectionUi();
    }

    function drawWaveform() {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (!audioBuffer) {
        ctx.fillStyle = '#6f7a90';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Load an audio file to begin', rect.width / 2, rect.height / 2);
        return;
      }

      const data = audioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / rect.width);
      const amp = rect.height / 2;
      ctx.strokeStyle = '#7c9cff';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x < rect.width; x++) {
        let min = 1;
        let max = -1;
        const start = x * step;
        const stop = Math.min(start + step, data.length);
        for (let i = start; i < stop; i++) {
          const v = data[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        ctx.moveTo(x, (1 + min) * amp);
        ctx.lineTo(x, (1 + max) * amp);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.stroke();
    }

    function timeToX(time) {
      if (!audioBuffer) return 0;
      return (time / audioBuffer.duration) * waveWrap.clientWidth;
    }

    function xToTime(x) {
      if (!audioBuffer) return 0;
      return clamp((x / waveWrap.clientWidth) * audioBuffer.duration, 0, audioBuffer.duration);
    }

    function updateSelectionUi() {
      if (!audioBuffer) {
        selectionEl.style.display = 'none';
        leftHandle.style.display = 'none';
        rightHandle.style.display = 'none';
        playhead.style.display = 'none';
        return;
      }

      selectionEl.style.display = 'block';
      leftHandle.style.display = 'grid';
      rightHandle.style.display = 'grid';

      const left = timeToX(startTime);
      const right = timeToX(endTime);
      selectionEl.style.left = `${left}px`;
      selectionEl.style.width = `${Math.max(0, right - left)}px`;
      leftHandle.style.left = `${left}px`;
      rightHandle.style.left = `${right}px`;

      startInput.value = startTime.toFixed(3);
      endInput.value = endTime.toFixed(3);
      lengthInput.value = Math.max(0, endTime - startTime).toFixed(3);
      durationInfo.textContent = `Duration: ${formatTime(audioBuffer.duration)}`;
    }

    async function loadFile(file) {
      stopPlayback();
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
      downloadLink.classList.add('disabled');
      downloadLink.removeAttribute('href');

      fileInfo.textContent = `Loading ${file.name}...`;
      const arrayBuffer = await file.arrayBuffer();
      const ctxAudio = ensureAudioContext();
      audioBuffer = await ctxAudio.decodeAudioData(arrayBuffer.slice(0));

      startTime = 0;
      endTime = audioBuffer.duration;
      currentBlobUrl = URL.createObjectURL(file);
      audioPreview.src = currentBlobUrl;
      fileInfo.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB · ${audioBuffer.numberOfChannels} channel(s)`;
      setDisabled(false);
      drawWaveform();
      updateSelectionUi();
    }

    function stopPlayback() {
      if (sourceNode) {
        try { sourceNode.stop(); } catch (_) {}
        sourceNode.disconnect();
        sourceNode = null;
      }
      cancelAnimationFrame(animationId);
      playhead.style.display = 'none';
      stopBtn.disabled = true;
    }

    function playRegion(start, duration) {
      if (!audioBuffer) return;
      stopPlayback();
      const ctxAudio = ensureAudioContext();
      sourceNode = ctxAudio.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ctxAudio.destination);
      sourceNode.start(0, start, duration);
      startedAt = ctxAudio.currentTime;
      playOffset = start;
      stopBtn.disabled = false;
      sourceNode.onended = stopPlayback;
      updatePlayhead(duration);
    }

    function updatePlayhead(duration) {
      const elapsed = ensureAudioContext().currentTime - startedAt;
      const time = playOffset + elapsed;
      if (elapsed <= duration && audioBuffer) {
        playhead.style.display = 'block';
        playhead.style.left = `${timeToX(time)}px`;
        animationId = requestAnimationFrame(() => updatePlayhead(duration));
      }
    }

    function validateInputs() {
      if (!audioBuffer) return;
      let s = clamp(parseFloat(startInput.value) || 0, 0, audioBuffer.duration);
      let e = clamp(parseFloat(endInput.value) || 0, 0, audioBuffer.duration);
      if (e < s) [s, e] = [e, s];
      if (e === s) e = Math.min(audioBuffer.duration, s + 0.001);
      startTime = s;
      endTime = e;
      updateSelectionUi();
    }

    function cutBuffer(buffer, start, end) {
      const sampleRate = buffer.sampleRate;
      const startSample = Math.floor(start * sampleRate);
      const endSample = Math.floor(end * sampleRate);
      const frameCount = Math.max(1, endSample - startSample);
      const cut = ensureAudioContext().createBuffer(buffer.numberOfChannels, frameCount, sampleRate);

      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const input = buffer.getChannelData(ch).subarray(startSample, endSample);
        cut.copyToChannel(input, ch, 0);
      }
      return cut;
    }

    function audioBufferToWav(buffer) {
      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const bytesPerSample = 2;
      const blockAlign = numChannels * bytesPerSample;
      const dataLength = buffer.length * blockAlign;
      const arrayBuffer = new ArrayBuffer(44 + dataLength);
      const view = new DataView(arrayBuffer);
      let offset = 0;

      writeString('RIFF');
      view.setUint32(offset, 36 + dataLength, true); offset += 4;
      writeString('WAVE');
      writeString('fmt ');
      view.setUint32(offset, 16, true); offset += 4;
      view.setUint16(offset, 1, true); offset += 2;
      view.setUint16(offset, numChannels, true); offset += 2;
      view.setUint32(offset, sampleRate, true); offset += 4;
      view.setUint32(offset, sampleRate * blockAlign, true); offset += 4;
      view.setUint16(offset, blockAlign, true); offset += 2;
      view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
      writeString('data');
      view.setUint32(offset, dataLength, true); offset += 4;

      const channels = [];
      for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch));

      for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          const sample = clamp(channels[ch][i], -1, 1);
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
          offset += 2;
        }
      }

      function writeString(str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i));
      }

      return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await loadFile(file);
      } catch (error) {
        console.error(error);
        fileInfo.textContent = 'Could not decode this file. Try another browser-supported audio format.';
        setDisabled(true);
      }
    });

    leftHandle.addEventListener('pointerdown', e => { activeHandle = 'left'; leftHandle.setPointerCapture(e.pointerId); });
    rightHandle.addEventListener('pointerdown', e => { activeHandle = 'right'; rightHandle.setPointerCapture(e.pointerId); });

    window.addEventListener('pointermove', e => {
      if (!activeHandle || !audioBuffer) return;
      const rect = waveWrap.getBoundingClientRect();
      const time = xToTime(e.clientX - rect.left);
      if (activeHandle === 'left') startTime = clamp(time, 0, endTime - 0.001);
      if (activeHandle === 'right') endTime = clamp(time, startTime + 0.001, audioBuffer.duration);
      updateSelectionUi();
    });

    window.addEventListener('pointerup', () => { activeHandle = null; });

    waveWrap.addEventListener('click', e => {
      if (!audioBuffer || activeHandle) return;
      const rect = waveWrap.getBoundingClientRect();
      const clicked = xToTime(e.clientX - rect.left);
      const mid = (startTime + endTime) / 2;
      if (clicked < mid) startTime = clamp(clicked, 0, endTime - 0.001);
      else endTime = clamp(clicked, startTime + 0.001, audioBuffer.duration);
      updateSelectionUi();
    });

    startInput.addEventListener('change', validateInputs);
    endInput.addEventListener('change', validateInputs);

    playFullBtn.addEventListener('click', () => playRegion(0, audioBuffer.duration));
    playCutBtn.addEventListener('click', () => playRegion(startTime, endTime - startTime));
    stopBtn.addEventListener('click', stopPlayback);

    exportBtn.addEventListener('click', () => {
      if (!audioBuffer) return;
      const cut = cutBuffer(audioBuffer, startTime, endTime);
      const wavBlob = audioBufferToWav(cut);
      const url = URL.createObjectURL(wavBlob);
      const baseName = 'cut-audio';
      downloadLink.href = url;
      downloadLink.download = `${baseName}-${startTime.toFixed(2)}-${endTime.toFixed(2)}.wav`;
      downloadLink.classList.remove('disabled');
      audioPreview.src = url;
      fileInfo.textContent = `Cut ready · ${formatTime(endTime - startTime)} · WAV export`;
    });

    window.addEventListener('resize', resizeCanvas);
    setDisabled(true);
    resizeCanvas();