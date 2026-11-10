// ============================================================================
// ONE MORE TURN — 3D Spatial Web Audio & Tension/Monster Sound Engine (audio.js)
// Implements 3D PannerNode emitters, surface-adaptive footsteps, door creaks,
// monster proximity heartbeat, Abyssal Wraith growls, acoustic decoy chimes,
// and time-loop audio reversal effects with Master/Music/Ambience/SFX controls.
// ============================================================================

window.OMT_Audio = (function () {
  let ctx = null;
  let initialized = false;
  let muted = false;

  const volumes = {
    master: 0.85,
    music: 0.55,
    ambience: 0.70,
    sfx: 0.85
  };

  let masterGain = null;
  let musicGain = null;
  let ambienceGain = null;
  let sfxGain = null;

  const spatialEmitters = [];
  let musicInterval = null;
  let stepToggle = false;

  function init() {
    if (initialized) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();

      masterGain = ctx.createGain();
      musicGain = ctx.createGain();
      ambienceGain = ctx.createGain();
      sfxGain = ctx.createGain();

      musicGain.connect(masterGain);
      ambienceGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      applyVolumes();
      setupSpatialAmbience();
      startMysteriousMusic();
      initialized = true;
    } catch (e) {
      console.warn('Web Audio init skipped:', e);
    }
  }

  function applyVolumes() {
    if (!ctx || !masterGain) return;
    const now = ctx.currentTime;
    masterGain.gain.setTargetAtTime(muted ? 0 : volumes.master, now, 0.03);
    musicGain.gain.setTargetAtTime(volumes.music, now, 0.03);
    ambienceGain.gain.setTargetAtTime(volumes.ambience, now, 0.03);
    sfxGain.gain.setTargetAtTime(volumes.sfx, now, 0.03);
  }

  function setVolume(channel, val) {
    if (volumes[channel] !== undefined) {
      volumes[channel] = Math.max(0, Math.min(1, parseFloat(val)));
      applyVolumes();
    }
  }

  function toggleMute() {
    muted = !muted;
    applyVolumes();
    return muted;
  }

  function getVolumes() {
    return { ...volumes, muted };
  }

  function createSpatialLoop(x, y, z, freq, type, filterFreq, gainLevel, refDist = 4, maxDist = 28) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = new GainNode(ctx, { gain: gainLevel });
    const panner = ctx.createPanner();

    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDist;
    panner.maxDistance = maxDist;
    panner.rolloffFactor = 1.4;
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }

    osc.type = type;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(ambienceGain);
    osc.start();

    spatialEmitters.push({ osc, gain, panner, baseFreq: freq });
  }

  function setupSpatialAmbience() {
    if (!ctx) return;
    createSpatialLoop(0, 3.2, 8, 120, 'sawtooth', 320, 0.04, 3, 22);
    createSpatialLoop(0, 3.2, -10, 120, 'sawtooth', 320, 0.04, 3, 22);
    createSpatialLoop(11, 1.5, -22, 60, 'square', 240, 0.075, 2.5, 18);
    createSpatialLoop(-11, 1.5, -5, 185, 'triangle', 400, 0.045, 3, 18);
    createSpatialLoop(0, 2.5, 52, 288, 'sine', 520, 0.06, 5, 36); // Open-world Ley-Line Fountain chime
    createSpatialLoop(-24, 2.5, 54, 96, 'sawtooth', 260, 0.08, 4, 28); // Neighbor House ominous hum
    createSpatialLoop(0, -3.0, -59, 54, 'sawtooth', 190, 0.16, 5, 35);
    createSpatialLoop(0, -3.0, -59, 108, 'sine', 300, 0.12, 5, 35);
  }

  function updateListener(pos, forwardVec) {
    if (!ctx || !initialized) return;
    const l = ctx.listener;
    try {
      if (l.positionX) {
        l.positionX.setTargetAtTime(pos.x, ctx.currentTime, 0.02);
        l.positionY.setTargetAtTime(pos.y, ctx.currentTime, 0.02);
        l.positionZ.setTargetAtTime(pos.z, ctx.currentTime, 0.02);
        l.forwardX.setTargetAtTime(forwardVec.x, ctx.currentTime, 0.02);
        l.forwardY.setTargetAtTime(forwardVec.y, ctx.currentTime, 0.02);
        l.forwardZ.setTargetAtTime(forwardVec.z, ctx.currentTime, 0.02);
        l.upX.value = 0;
        l.upY.value = 1;
        l.upZ.value = 0;
      } else if (l.setPosition) {
        l.setPosition(pos.x, pos.y, pos.z);
        l.setOrientation(forwardVec.x, forwardVec.y, forwardVec.z, 0, 1, 0);
      }
    } catch (e) {}
  }

  function startMysteriousMusic() {
    if (!ctx) return;
    // Genshin-meets-Mystery harp/celesta & suspense bass intervals
    const notes = [293.66, 349.23, 440.00, 466.16, 587.33, 659.25, 523.25, 392.00];
    let step = 0;

    if (musicInterval) clearInterval(musicInterval);
    musicInterval = setInterval(() => {
      if (!ctx || ctx.state !== 'running' || muted) return;
      const now = ctx.currentTime;
      const freq = notes[step % notes.length];
      step++;

      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      sub.type = 'triangle';
      sub.frequency.setValueAtTime(freq * 0.25, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(880, now);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.085, now + 0.18);
      env.gain.exponentialRampToValueAtTime(0.0008, now + 2.8);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(env);
      env.connect(musicGain);

      osc.start(now);
      sub.start(now);
      osc.stop(now + 2.9);
      sub.stop(now + 2.9);
    }, 1800);
  }

  function playFootstep(surface = 'tile', isRunning = false) {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    stepToggle = !stepToggle;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    let baseFreq = 110;
    let dur = 0.08;
    if (surface === 'wood') {
      baseFreq = 82;
      dur = 0.11;
      osc.type = 'triangle';
      filter.frequency.value = 340;
    } else if (surface === 'grass') {
      baseFreq = 68;
      dur = 0.095;
      osc.type = 'sine';
      filter.frequency.value = 260;
    } else if (surface === 'concrete') {
      baseFreq = 135;
      dur = 0.07;
      osc.type = 'sine';
      filter.frequency.value = 580;
    } else if (surface === 'metal') {
      baseFreq = 240;
      dur = 0.12;
      osc.type = 'square';
      filter.frequency.value = 920;
    } else {
      baseFreq = 155;
      dur = 0.075;
      osc.type = 'triangle';
      filter.frequency.value = 680;
    }

    const pitchOffset = stepToggle ? 1.0 : 0.91;
    osc.frequency.setValueAtTime(baseFreq * pitchOffset, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + dur);

    const amp = isRunning ? 0.24 : 0.14;
    env.gain.setValueAtTime(amp, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(sfxGain);

    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  function playDoorSound(isOpen = true, isLocked = false) {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    if (isLocked) {
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.setValueAtTime(95, now + 0.06);
      env.gain.setValueAtTime(0.2, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(env);
      env.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
      return;
    }

    osc.type = 'sawtooth';
    const startF = isOpen ? 190 : 250;
    const endF = isOpen ? 280 : 140;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.linearRampToValueAtTime(endF, now + 0.38);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320;
    filter.Q.value = 4.0;

    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.18, now + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(filter);
    filter.connect(env);
    env.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.44);
  }

  function playFlashlightClick() {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
    env.gain.setValueAtTime(0.22, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(env);
    env.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  function playClueChime() {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    [432, 540, 648, 864].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      env.gain.setValueAtTime(0.001, now + idx * 0.08);
      env.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.75);
      osc.connect(env);
      env.connect(sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.8);
    });
  }

  function playKeypadBeep(isSuccess = null) {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = isSuccess === false ? 'sawtooth' : 'sine';
    const f = isSuccess === true ? 864 : isSuccess === false ? 160 : 520;
    osc.frequency.setValueAtTime(f, now);
    env.gain.setValueAtTime(0.16, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + (isSuccess !== null ? 0.28 : 0.08));
    osc.connect(env);
    env.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function playVoiceBlip(character = 'Maya') {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const base = character === 'Maya' ? 310 : 165;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(base + ((i * 37) % 60), now + i * 0.065);
      env.gain.setValueAtTime(0.09, now + i * 0.065);
      env.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.055);
      osc.connect(env);
      env.connect(sfxGain);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.06);
    }
  }

  function playTimerTick(urgent = false) {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(urgent ? 880 : 440, now);
    env.gain.setValueAtTime(urgent ? 0.14 : 0.06, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(env);
    env.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Monster Proximity Heartbeat Thump
  function playHeartbeatPulse(intensity = 0.5) {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 64 : 52, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.14);
      const gainVal = Math.min(0.38, 0.12 + intensity * 0.25);
      env.gain.setValueAtTime(gainVal, now + offset);
      env.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(env);
      env.connect(sfxGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  // Monster Spot / Chase Alert Stinger
  function playMonsterGrowl(isChase = true) {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const env = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(isChase ? 110 : 75, now);
    osc1.frequency.exponentialRampToValueAtTime(isChase ? 290 : 48, now + 0.55);
    osc2.frequency.setValueAtTime(isChase ? 116 : 79, now);
    osc2.frequency.exponentialRampToValueAtTime(isChase ? 58 : 42, now + 0.55);
    env.gain.setValueAtTime(0.24, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(env);
    osc2.connect(env);
    env.connect(sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.62);
    osc2.stop(now + 0.62);
  }

  // Acoustic Decoy Chime ([G] key or Bell Tower)
  function playDecoyBellSound() {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    [528, 792, 1056].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      env.gain.setValueAtTime(0.22, now + idx * 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(env);
      env.connect(sfxGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + 1.25);
    });
  }

  function playTimeResetEffect() {
    if (!ctx || !initialized) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const env = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(720, now + 1.1);
    osc1.frequency.exponentialRampToValueAtTime(48, now + 2.1);

    osc2.frequency.setValueAtTime(432, now);
    osc2.frequency.linearRampToValueAtTime(108, now + 1.1);
    osc2.frequency.exponentialRampToValueAtTime(864, now + 2.1);

    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.35, now + 1.0);
    env.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc1.connect(env);
    osc2.connect(env);
    env.connect(sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.25);
    osc2.stop(now + 2.25);
  }

  return {
    init,
    setVolume,
    toggleMute,
    getVolumes,
    updateListener,
    playFootstep,
    playDoorSound,
    playFlashlightClick,
    playClueChime,
    playKeypadBeep,
    playVoiceBlip,
    playTimerTick,
    playHeartbeatPulse,
    playMonsterGrowl,
    playDecoyBellSound,
    playTimeResetEffect
  };
})();
