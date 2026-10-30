(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const startButton = $("#spatial-start");
  const stopButton = $("#spatial-stop");
  const status = $("#spatial-status");
  const azimuth = $("#spatial-azimuth");
  const elevation = $("#spatial-elevation");
  const distance = $("#spatial-distance");
  const reverb = $("#spatial-reverb");
  const azimuthValue = $("#spatial-azimuth-value");
  const elevationValue = $("#spatial-elevation-value");
  const distanceValue = $("#spatial-distance-value");
  const reverbValue = $("#spatial-reverb-value");

  if (!startButton || !stopButton) return;

  let displayStream = null;
  let audioContext = null;
  let source = null;
  let panner = null;
  let dryGain = null;
  let wetGain = null;
  let convolver = null;
  let impulseBuffer = null;
  let active = false;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("spatial-error", isError);
  }

  function makeImpulse(context, seconds = 2.2, decay = 2.6) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const fade = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * fade;
      }
    }
    return buffer;
  }

  function updateSpatialSettings() {
    const az = Number(azimuth.value) * Math.PI / 180;
    const el = Number(elevation.value) * Math.PI / 180;
    const radius = Number(distance.value);
    const horizontal = Math.cos(el) * radius;

    if (panner) {
      panner.positionX.setValueAtTime(Math.sin(az) * horizontal, audioContext.currentTime);
      panner.positionY.setValueAtTime(Math.sin(el) * radius, audioContext.currentTime);
      panner.positionZ.setValueAtTime(-Math.cos(az) * horizontal, audioContext.currentTime);
      panner.refDistance = 1;
      panner.maxDistance = 100;
      panner.rolloffFactor = 1;
    }
    if (wetGain) wetGain.gain.setTargetAtTime(Number(reverb.value) / 100 * 0.65, audioContext.currentTime, 0.04);

    azimuthValue.textContent = azimuth.value + "°";
    elevationValue.textContent = elevation.value + "°";
    distanceValue.textContent = Number(distance.value).toFixed(1) + " m";
    reverbValue.textContent = reverb.value + "%";
  }

  function buildAudioGraph(stream) {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) throw new Error("共有音声がありません。「タブの音声を共有」を有効にしてください。");

    audioContext = new AudioContext();
    source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
    panner = audioContext.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.orientationX.value = 0;
    panner.orientationY.value = 0;
    panner.orientationZ.value = -1;
    panner.positionX.value = 0;
    panner.positionY.value = 0;
    panner.positionZ.value = -1;

    dryGain = audioContext.createGain();
    wetGain = audioContext.createGain();
    convolver = audioContext.createConvolver();
    impulseBuffer = makeImpulse(audioContext);
    convolver.buffer = impulseBuffer;

    source.connect(panner);
    panner.connect(dryGain);
    dryGain.gain.value = 0.88;
    dryGain.connect(audioContext.destination);
    panner.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(audioContext.destination);
    updateSpatialSettings();

    audioTracks[0].addEventListener("ended", stop, { once: true });
  }

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setStatus("このブラウザでは画面共有音声を取得できません。HTTPS環境のChromeなどで試してください。", true);
      return;
    }

    startButton.disabled = true;
    setStatus("共有するタブを選択してください…");
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true
      });
      buildAudioGraph(displayStream);
      await audioContext.resume();
      active = true;
      startButton.hidden = true;
      stopButton.hidden = false;
      setStatus("立体音響を再生中 · HRTF");
    } catch (error) {
      cleanup();
      const message = error && error.name === "NotAllowedError"
        ? "画面共有がキャンセルされたか、許可されませんでした。"
        : (error && error.message) || String(error);
      setStatus(message, true);
    } finally {
      startButton.disabled = false;
    }
  }

  function cleanup() {
    if (displayStream) displayStream.getTracks().forEach((track) => track.stop());
    if (source) source.disconnect();
    if (panner) panner.disconnect();
    if (dryGain) dryGain.disconnect();
    if (convolver) convolver.disconnect();
    if (wetGain) wetGain.disconnect();
    if (audioContext && audioContext.state !== "closed") audioContext.close().catch(() => {});
    displayStream = null;
    audioContext = null;
    source = null;
    panner = null;
    dryGain = null;
    wetGain = null;
    convolver = null;
    impulseBuffer = null;
    active = false;
    startButton.hidden = false;
    stopButton.hidden = true;
  }

  function stop() {
    if (!active && !displayStream) return;
    cleanup();
    setStatus("停止しました。");
  }

  [azimuth, elevation, distance, reverb].forEach((control) => {
    control.addEventListener("input", updateSpatialSettings);
  });
  startButton.addEventListener("click", start);
  stopButton.addEventListener("click", stop);
  window.addEventListener("pagehide", cleanup);
  updateSpatialSettings();
})();
