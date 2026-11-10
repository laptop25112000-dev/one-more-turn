// ============================================================================
// ONE MORE TURN — High-Res Cel-Shaded 3D Engine, Stealth & UI Controllers (engine.js)
// Implements Three.js high-DPI scene, first-person movement, crouch stealth [C],
// acoustic decoy [G], hiding wardrobes, monster capture tension, 180s time-loop
// reset transition, 15-area mini-map radar, Memory Journal, and puzzle modals.
// ============================================================================

window.OMT_Engine = (function () {
  let scene, camera, renderer, flashlight, flashlightTarget, ambientLight, hemiLight;
  let inspectScene, inspectCamera, inspectRenderer, inspectMesh;
  let clock;
  let animFrameId = null;

  const player = {
    pos: new THREE.Vector3(0, 1.7, 30.0),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    height: 1.7,
    crouchHeight: 1.05,
    radius: 0.42,
    onGround: true,
    isCrouching: false,
    isHidden: false,
    savedPosBeforeHide: null,
    walkSpeed: 5.0,
    sprintSpeed: 8.2,
    crouchSpeed: 3.1,
    jumpImpulse: 5.8,
    gravity: 15.0,
    bobTimer: 0,
    stepDistance: 0,
    flashlightOn: true
  };

  const keys = {};
  const touchMove = { forward: 0, right: 0, sprinting: false };
  let isPointerLocked = false;
  let isDraggingLook = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lookTouchId = null;
  let lastTouchX = 0;
  let lastTouchY = 0;

  const settings = {
    sensitivity: 1.0,
    graphics: 'high',
    resolutionScale: 1.25
  };

  let currentHoveredInteractable = null;
  let raycaster = null;
  let lastSecondTick = 180;
  let resetInProgress = false;

  let activeKeypadConfig = null;
  let currentKeypadInput = '';

  function init() {
    const container = document.getElementById('viewport-container');
    if (!container) return;

    scene = new THREE.Scene();
    // Stylized Genshin-inspired Starlight Indigo Night sky & atmospheric fog
    scene.background = new THREE.Color(0x11192e);
    scene.fog = new THREE.FogExp2(0x11192e, 0.022);

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 140);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5) * settings.resolutionScale);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0x5a6e91, 0.85);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0x90caf9, 0x2b2338, 0.68);
    scene.add(hemiLight);

    flashlight = new THREE.SpotLight(0xfff6e0, 2.4, 30, Math.PI / 5.0, 0.42, 1.2);
    flashlight.position.set(0.18, -0.12, 0);
    flashlightTarget = new THREE.Object3D();
    flashlightTarget.position.set(0, 0, -8);
    camera.add(flashlight);
    camera.add(flashlightTarget);
    flashlight.target = flashlightTarget;
    scene.add(camera);

    window.OMT_World.buildWorld(scene);
    window.OMT_Characters.initCharacters(scene, window.OMT_World.registerInteractable || (() => {}));
    Object.values(window.OMT_Characters.npcs).forEach((npc) => {
      const info = {
        id: npc.id,
        type: 'npc',
        npcKey: npc.id === 'npc_maya' ? 'maya' : 'rowan',
        title: npc.name,
        subtitle: `Press [E] to Speak with ${npc.name}`
      };
      npc.model.root.userData.interactable = info;
      window.OMT_World.interactables.push({ mesh: npc.model.root, ...info });
      npc.model.root.traverse((ch) => {
        if (ch.isMesh) ch.userData.interactable = info;
      });
    });

    raycaster = new THREE.Raycaster();
    raycaster.far = 4.4;
    clock = new THREE.Clock();

    setupInputHandlers();
    setup3DInspectionPreview();
    updateContinueButtonState();
    renderMiniMap();

    if (animFrameId) cancelAnimationFrame(animFrameId);
    animate();
  }

  function setup3DInspectionPreview() {
    const canvas = document.getElementById('inspect-3d-canvas');
    if (!canvas) return;
    inspectScene = new THREE.Scene();
    inspectScene.background = new THREE.Color(0x121829);
    inspectCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
    inspectCamera.position.set(0, 0.4, 2.2);
    inspectCamera.lookAt(0, 0, 0);

    inspectRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    inspectRenderer.setSize(220, 160);

    const l1 = new THREE.DirectionalLight(0xffffff, 1.3);
    l1.position.set(2, 3, 3);
    inspectScene.add(l1);
    inspectScene.add(new THREE.AmbientLight(0x8ecae6, 0.95));

    const geo = new THREE.OctahedronGeometry(0.68, 1);
    const mat = new THREE.MeshToonMaterial({
      color: 0xffd166,
      gradientMap: window.OMT_Textures.getToonGradientTexture()
    });
    inspectMesh = new THREE.Mesh(geo, mat);
    inspectScene.add(inspectMesh);
  }

  function setupInputHandlers() {
    window.addEventListener('resize', onWindowResize);

    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      const S = window.OMT_Systems.state;

      if (e.code === 'Escape') {
        if (S.activeModal) {
          closeAllModals();
        } else if (!S.inMenu) {
          togglePauseMenu();
        }
        return;
      }

      if (S.inMenu) return;

      if (e.code === 'Tab') {
        e.preventDefault();
        if (S.activeModal === 'journal') {
          closeAllModals();
        } else {
          openJournalModal('all');
        }
        return;
      }

      if (S.activeModal === 'keypad') {
        if (e.key >= '0' && e.key <= '9') {
          pressKeypadDigit(e.key);
        } else if (e.key === 'Backspace') {
          pressKeypadClear();
        } else if (e.key === 'Enter') {
          submitKeypadCode();
        }
        return;
      }

      if (S.isPaused || S.activeModal) return;

      if (e.code === 'KeyF') {
        toggleFlashlight();
      } else if (e.code === 'KeyC') {
        toggleCrouch();
      } else if (e.code === 'KeyG') {
        throwAcousticDecoy();
      } else if (e.code === 'KeyE') {
        triggerInteraction();
      } else if (e.code === 'KeyR') {
        triggerManualTimeLoopReset();
      } else if (e.code === 'Space' && player.onGround && !player.isHidden) {
        player.isCrouching = false;
        player.vel.y = player.jumpImpulse;
        player.onGround = false;
        updateStealthHUD();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    const viewport = document.getElementById('viewport-container');
    if (viewport) {
      viewport.addEventListener('click', () => {
        window.OMT_Audio.init();
        const S = window.OMT_Systems.state;
        if (!S.inMenu && !S.isPaused && !S.activeModal) {
          requestPointerLockSafe(viewport);
        }
      });

      viewport.addEventListener('mousedown', (e) => {
        if (!isPointerLocked && !window.OMT_Systems.state.inMenu && !window.OMT_Systems.state.isPaused) {
          isDraggingLook = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      viewport.addEventListener('touchstart', (e) => {
        window.OMT_Audio.init();
        const S = window.OMT_Systems.state;
        if (S.inMenu || S.isPaused || S.activeModal) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (lookTouchId === null) {
            lookTouchId = t.identifier;
            lastTouchX = t.clientX;
            lastTouchY = t.clientY;
            break;
          }
        }
      }, { passive: true });

      viewport.addEventListener('touchmove', (e) => {
        const S = window.OMT_Systems.state;
        if (S.inMenu || S.isPaused || S.activeModal || lookTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === lookTouchId) {
            const dx = t.clientX - lastTouchX;
            const dy = t.clientY - lastTouchY;
            lastTouchX = t.clientX;
            lastTouchY = t.clientY;
            const sens = 0.0042 * settings.sensitivity;
            player.yaw -= dx * sens;
            player.pitch -= dy * sens;
            player.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, player.pitch));
            break;
          }
        }
      }, { passive: true });

      const endTouchLook = (e) => {
        if (lookTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) {
            lookTouchId = null;
            break;
          }
        }
      };
      viewport.addEventListener('touchend', endTouchLook, { passive: true });
      viewport.addEventListener('touchcancel', endTouchLook, { passive: true });
    }

    window.addEventListener('mouseup', () => {
      isDraggingLook = false;
    });

    window.addEventListener('mousemove', (e) => {
      const S = window.OMT_Systems.state;
      if (S.inMenu || S.isPaused || S.activeModal) return;

      const sens = 0.0022 * settings.sensitivity;
      if (isPointerLocked) {
        player.yaw -= (e.movementX || 0) * sens;
        player.pitch -= (e.movementY || 0) * sens;
        player.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, player.pitch));
      } else if (isDraggingLook) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        player.yaw -= dx * sens * 1.3;
        player.pitch -= dy * sens * 1.3;
        player.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, player.pitch));
      }
    });

    document.addEventListener('pointerlockchange', () => {
      isPointerLocked = document.pointerLockElement !== null;
      const lockBadge = document.getElementById('pointer-lock-hint');
      if (lockBadge) {
        lockBadge.textContent = isPointerLocked
          ? 'MOUSE LOOK ACTIVE • [C] CROUCH • [G] DECOY • [TAB] JOURNAL'
          : 'CLICK 3D VIEW FOR MOUSE LOCK (OR DRAG TO LOOK)';
      }
    });
  }

  function requestPointerLockSafe(el) {
    try {
      if (el && el.requestPointerLock) el.requestPointerLock();
    } catch (e) {}
  }

  function exitPointerLockSafe() {
    try {
      if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    } catch (e) {}
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    const isPortraitPhone = window.innerWidth < 640 && window.innerHeight > window.innerWidth;
    camera.fov = isPortraitPhone ? 86 : 72;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function toggleFlashlight() {
    player.flashlightOn = !player.flashlightOn;
    if (flashlight) {
      flashlight.intensity = player.flashlightOn ? 2.4 : 0;
    }
    window.OMT_Audio.playFlashlightClick();
    const btn = document.getElementById('hud-flashlight-badge');
    if (btn) {
      btn.textContent = player.flashlightOn ? 'FLASHLIGHT: ON [F]' : 'FLASHLIGHT: OFF [F]';
      btn.className = player.flashlightOn
        ? 'px-2.5 py-1 rounded text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-400/40'
        : 'px-2.5 py-1 rounded text-xs font-mono bg-slate-800/80 text-slate-400 border border-slate-700';
    }
  }

  function toggleCrouch() {
    if (player.isHidden) return;
    player.isCrouching = !player.isCrouching;
    updateStealthHUD();
    showToast(player.isCrouching ? 'Stealth Crouch Active [C] — Footsteps Silenced & Detection Halved' : 'Standing Posture Restored');
  }

  function throwAcousticDecoy() {
    window.OMT_Audio.playDecoyBellSound();
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    const decoyPos = {
      x: player.pos.x + forward.x * 6.0,
      y: player.pos.y - 1.5,
      z: player.pos.z + forward.z * 6.0
    };
    window.OMT_Characters.triggerAcousticDecoy(decoyPos);
    showToast('🔔 Acoustic Decoy Chime Thrown! Nearby Stalkers Lured to Sound.');
  }

  function updateStealthHUD() {
    const crouchBtn = document.getElementById('hud-crouch-badge');
    if (crouchBtn) {
      if (player.isHidden) {
        crouchBtn.textContent = 'HIDDEN IN SANCTUARY [E TO EXIT]';
        crouchBtn.className = 'px-2.5 py-1 rounded text-xs font-mono bg-emerald-500/30 text-emerald-200 border border-emerald-400 font-bold';
      } else if (player.isCrouching) {
        crouchBtn.textContent = 'STEALTH: CROUCHING [C]';
        crouchBtn.className = 'px-2.5 py-1 rounded text-xs font-mono bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-semibold';
      } else {
        crouchBtn.textContent = 'POSTURE: STANDING [C]';
        crouchBtn.className = 'px-2.5 py-1 rounded text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700';
      }
    }
  }

  function checkCollision(nx, ny, nz) {
    const r = player.radius;
    const eyeH = player.isCrouching ? player.crouchHeight : player.height;
    const footY = ny - eyeH + 0.15;
    const headY = ny + 0.1;

    for (const c of window.OMT_World.wallColliders) {
      if (c.disabled) continue;
      if (headY < c.minY || footY > c.maxY) continue;
      if (nx + r > c.minX && nx - r < c.maxX && nz + r > c.minZ && nz - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  function updatePlayerMovement(dt) {
    if (player.isHidden) {
      camera.position.copy(player.pos);
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
      return;
    }

    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw)).normalize();

    let moveF = touchMove.forward;
    let moveR = touchMove.right;
    if (keys['KeyW'] || keys['ArrowUp']) moveF += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveF -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveR += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveR -= 1;

    if (keys['KeyQ']) player.yaw += 1.6 * dt;
    if (keys['KeyZ']) player.yaw -= 1.6 * dt;

    const isSprinting = !player.isCrouching && !!(keys['ShiftLeft'] || keys['ShiftRight'] || touchMove.sprinting);
    const surgeBoost = window.OMT_Systems.state.loopState.leylineSurgeActive ? 1.25 : 1.0;
    const speed = (player.isCrouching ? player.crouchSpeed : isSprinting ? player.sprintSpeed : player.walkSpeed) * surgeBoost;

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, moveF);
    wishDir.addScaledVector(right, moveR);
    if (wishDir.lengthSq() > 1) wishDir.normalize();

    const dx = wishDir.x * speed * dt;
    const dz = wishDir.z * speed * dt;

    if (!checkCollision(player.pos.x + dx, player.pos.y, player.pos.z)) {
      player.pos.x += dx;
    }
    if (!checkCollision(player.pos.x, player.pos.y, player.pos.z + dz)) {
      player.pos.z += dz;
    }

    const roomInfo = window.OMT_World.getRoomAt(player.pos.x, player.pos.z);
    const eyeH = player.isCrouching ? player.crouchHeight : player.height;
    const targetGroundY = roomInfo.floorY + eyeH;

    if (!player.onGround || player.pos.y > targetGroundY + 0.08) {
      player.vel.y -= player.gravity * dt;
      player.pos.y += player.vel.y * dt;
      if (player.pos.y <= targetGroundY) {
        player.pos.y = targetGroundY;
        player.vel.y = 0;
        player.onGround = true;
      }
    } else {
      player.pos.y = targetGroundY;
      player.vel.y = 0;
      player.onGround = true;
    }

    const horizSpeed = Math.hypot(wishDir.x, wishDir.z) * speed;
    if (horizSpeed > 0.4 && player.onGround) {
      player.bobTimer += dt * (isSprinting ? 13 : 9);
      player.stepDistance += horizSpeed * dt;
      const stride = isSprinting ? 2.15 : 1.75;
      if (player.stepDistance >= stride) {
        player.stepDistance = 0;
        if (!player.isCrouching) {
          window.OMT_Audio.playFootstep(roomInfo.surface, isSprinting);
        }
      }
    } else {
      player.bobTimer = 0;
    }

    const bobOffsetY = Math.sin(player.bobTimer) * (isSprinting ? 0.055 : 0.028);
    camera.position.set(player.pos.x, player.pos.y + bobOffsetY, player.pos.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    const locEl = document.getElementById('hud-location-name');
    if (locEl && locEl.textContent !== roomInfo.name) {
      locEl.textContent = roomInfo.name;
    }

    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    window.OMT_Audio.updateListener(player.pos, camForward);
  }

  function updateInteractionRaycast() {
    if (!raycaster || !camera) return;
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const meshes = window.OMT_World.interactables.map((item) => item.mesh);
    const hits = raycaster.intersectObjects(meshes, true);

    const promptBox = document.getElementById('hud-interaction-prompt');
    const titleEl = document.getElementById('hud-interact-title');
    const subEl = document.getElementById('hud-interact-sub');
    const crosshair = document.getElementById('hud-crosshair');

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData.interactable) {
        obj = obj.parent;
      }
      if (obj && obj.userData.interactable) {
        currentHoveredInteractable = obj.userData.interactable;
        if (promptBox && titleEl && subEl) {
          promptBox.classList.remove('hidden');
          titleEl.textContent = currentHoveredInteractable.title;
          subEl.textContent = getDynamicSubtitle(currentHoveredInteractable);
        }
        if (crosshair) {
          crosshair.className = 'w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-amber-400/40 transition-transform scale-125';
        }
        return;
      }
    }

    currentHoveredInteractable = null;
    if (promptBox) promptBox.classList.add('hidden');
    if (crosshair) {
      crosshair.className = 'w-2 h-2 rounded-full bg-white/80 border border-slate-900 transition-transform';
    }
  }

  function getDynamicSubtitle(item) {
    const S = window.OMT_Systems.state;
    if (item.type === 'door') {
      const d = window.OMT_World.doors[item.doorId];
      if (!d) return item.subtitle;
      if (!d.locked) return d.isOpen ? 'Press [E] to Close Door' : 'Press [E] to Open Door';
      if (window.OMT_Systems.hasItem('skeleton_key')) {
        return 'Press [E] to Unlock with Golden Celestial Skeleton Key!';
      }
      if (d.codeRequired && S.knownCodes[d.codeRequired]) {
        return `Press [E] to Unlock (Known Code: ${d.codeRequired})`;
      }
      if (d.keyRequired && window.OMT_Systems.hasItem(d.keyRequired)) {
        return 'Press [E] to Unlock with Key';
      }
      return d.lockReason;
    }
    return item.subtitle;
  }

  function triggerInteraction() {
    // If already hidden inside a Sanctuary Wardrobe, pressing [E] exits hiding!
    if (player.isHidden) {
      player.isHidden = false;
      if (player.savedPosBeforeHide) {
        player.pos.copy(player.savedPosBeforeHide);
      }
      updateStealthHUD();
      showToast('Stepped out of Sanctuary Wardrobe.');
      return;
    }

    if (!currentHoveredInteractable) return;
    const item = currentHoveredInteractable;
    const S = window.OMT_Systems.state;

    // 1. HIDING WARDROBES (Hello Neighbor Stealth)
    if (item.type === 'hiding_spot') {
      player.isHidden = true;
      player.savedPosBeforeHide = player.pos.clone();
      player.pos.set(item.hidePos.x, item.hidePos.y, item.hidePos.z);
      window.OMT_Audio.playDoorSound(true, false);
      updateStealthHUD();
      showToast('Hidden inside Sanctuary Wardrobe! Stalkers cannot detect you. Press [E] to exit.');
      return;
    }

    // 2. COURTYARD DECOY ALARM BELL
    if (item.type === 'decoy_bell') {
      window.OMT_Audio.playDecoyBellSound();
      window.OMT_Characters.triggerAcousticDecoy(item.bellPos);
      showToast('🔔 Courtyard Alarm Bell Rung! The Caretaker is rushing to investigate the bell!');
      return;
    }

    // 3. ASTRAL WINDMILL LEY-LINE BEACON
    if (item.type === 'beacon') {
      S.loopState.leylineSurgeActive = true;
      window.OMT_Characters.stunAllMonsters(14.0);
      window.OMT_Audio.playClueChime();
      showToast('⚡ Astral Windmill Ley-Line Surge Activated! +25% Sprint Speed & All Monsters Stunned for 14s!');
      return;
    }

    // 4. DOORS
    if (item.type === 'door') {
      const d = window.OMT_World.doors[item.doorId];
      if (!d) return;

      if (d.locked) {
        if (window.OMT_Systems.hasItem('skeleton_key')) {
          d.locked = false;
          d.isOpen = true;
          if (d.id === 'door_blast') S.loopState.blastDoorOpen = true;
          window.OMT_Audio.playDoorSound(true, false);
          showToast(`Unlocked ${d.name} with Golden Celestial Skeleton Key!`);
          return;
        }
        if (d.keyRequired && window.OMT_Systems.hasItem(d.keyRequired)) {
          d.locked = false;
          d.isOpen = true;
          window.OMT_Audio.playDoorSound(true, false);
          showToast(`Unlocked ${d.name}!`);
          return;
        }
        if (d.id === 'door_staircase' && S.loopState.basementUnlocked) {
          d.locked = false;
          d.isOpen = true;
          window.OMT_Audio.playDoorSound(true, false);
          return;
        }
        if (d.codeRequired) {
          openKeypadModal({
            id: d.id,
            title: d.name,
            code: d.codeRequired,
            hint:
              d.id === 'door_staff'
                ? 'Hint: Faculty Staff Room PIN (7392) is recorded in the Reception Sign-In Ledger & Classroom 102.'
                : d.id === 'door_neighbor_house'
                ? 'Hint: The Caretaker\'s Victorian House Padlock is the frozen loop time: [ 1 1 5 7 ].'
                : 'Hint: Underground Lab Blast Door PIN (9104) is held by Rowan and the Basement Voice Recorder.',
            onSuccess: () => {
              d.locked = false;
              d.isOpen = true;
              if (d.id === 'door_blast') S.loopState.blastDoorOpen = true;
              window.OMT_Audio.playDoorSound(true, false);
              showToast(`${d.name} Unlocked!`);
            }
          });
          return;
        }
        window.OMT_Audio.playDoorSound(false, true);
        showToast(d.lockReason);
        return;
      }

      d.isOpen = !d.isOpen;
      window.OMT_Audio.playDoorSound(d.isOpen, false);
      return;
    }

    // 5. DOCUMENTS & ENVIRONMENTAL INSPECTION
    if (item.type === 'document' || item.type === 'inspect') {
      if (item.clueId) {
        window.OMT_Systems.unlockClue(item.clueId, showToast);
      }
      openInspectionModal(item.title, item.description, item.type);
      return;
    }

    // 6. ITEM PICKUPS (Storage Key or Golden Celestial Skeleton Key)
    if (item.type === 'pickup') {
      if (item.itemKey === 'skeleton_key') {
        window.OMT_Systems.addItem('skeleton_key', 'Golden Celestial Skeleton Key');
        window.OMT_Characters.stunAllMonsters(10.0);
      } else {
        window.OMT_Systems.addItem(item.itemKey, 'Storage Room Utility Key');
      }
      if (item.clueId) {
        window.OMT_Systems.unlockClue(item.clueId, showToast);
      }
      updateHUDInventory();
      openInspectionModal(item.title, item.description, 'pickup');
      return;
    }

    // 7. KEYPADS / SAFES / COMBINATION LOCKERS
    if (item.type === 'keypad') {
      openKeypadModal({
        id: item.id,
        title: item.title,
        code: item.code,
        hint: item.hint,
        onSuccess: () => {
          if (item.rewardItem === 'staff_key') {
            window.OMT_Systems.addItem('staff_key', 'Faculty Staff Room Key');
            showToast('Collected: Faculty Staff Room Key!');
          } else if (item.rewardItem === 'tachyon_book_and_vial') {
            window.OMT_Systems.addItem('tachyon_book', 'Tachyon Harmonics Vol. III');
            window.OMT_Systems.addItem('temporal_vial', 'Temporal Sample Vial');
            showToast('Collected: Tachyon Vol. III & Temporal Sample Vial!');
          }
          if (item.clueId) {
            window.OMT_Systems.unlockClue(item.clueId, showToast);
          }
          updateHUDInventory();
        }
      });
      return;
    }

    if (item.type === 'library_shelf') {
      openLibraryShelfModal();
      return;
    }
    if (item.type === 'breaker') {
      openBreakerModal();
      return;
    }
    if (item.type === 'spectrometer') {
      openSpectrometerModal();
      return;
    }
    if (item.type === 'terminal') {
      openTerminalModal();
      return;
    }
    if (item.type === 'pylon') {
      handlePylonActivation(item.pylonId);
      return;
    }
    if (item.type === 'core_console') {
      openCoreConsoleModal();
      return;
    }
    if (item.type === 'npc') {
      openDialogueModal(item.npcKey);
      return;
    }
  }

  function handlePylonActivation(pylonId) {
    const S = window.OMT_Systems.state;
    const order = ['BETA', 'ALPHA', 'GAMMA'];
    const currentIdx = S.loopState.pylonsAligned.length;

    if (S.loopState.pylonsAligned.includes(pylonId)) {
      showToast(`Phase Pylon ${pylonId} is already energized!`);
      return;
    }

    const expected = order[currentIdx];
    if (pylonId === expected) {
      S.loopState.pylonsAligned.push(pylonId);
      window.OMT_Audio.playKeypadBeep(true);
      showToast(`Phase Pylon ${pylonId} Energized! (${S.loopState.pylonsAligned.length}/3 Aligned)`);
      if (S.loopState.pylonsAligned.length === 3) {
        window.OMT_Audio.playClueChime();
        showToast('ALL 3 PHASE PYLONS ALIGNED! Access the Central Stabilizer Console!');
      }
    } else {
      S.loopState.pylonsAligned = [];
      window.OMT_Audio.playKeypadBeep(false);
      showToast(`Phase Mismatch! Pylons discharged. Required Order: 1st BETA -> 2nd ALPHA -> 3rd GAMMA.`);
    }
  }

  // ==========================================================================
  // MODAL CONTROLLERS
  // ==========================================================================

  function openModalContainer(modalId) {
    exitPointerLockSafe();
    window.OMT_Systems.state.activeModal = modalId;
    document.querySelectorAll('.game-modal').forEach((el) => el.classList.add('hidden'));
    const target = document.getElementById(`modal-${modalId}`);
    if (target) target.classList.remove('hidden');
  }

  function closeAllModals() {
    window.OMT_Systems.state.activeModal = null;
    document.querySelectorAll('.game-modal').forEach((el) => el.classList.add('hidden'));
  }

  function openInspectionModal(title, description, type) {
    openModalContainer('inspect');
    document.getElementById('inspect-modal-title').textContent = title;
    document.getElementById('inspect-modal-body').textContent = description;
    if (inspectMesh) {
      inspectMesh.material.color.setHex(type === 'pickup' ? 0xffd166 : 0x4cc9f0);
    }
  }

  function openKeypadModal(cfg) {
    activeKeypadConfig = cfg;
    currentKeypadInput = '';
    openModalContainer('keypad');
    document.getElementById('keypad-modal-title').textContent = cfg.title;
    document.getElementById('keypad-modal-hint').textContent = cfg.hint || '';
    updateKeypadDisplay();

    const autoBtn = document.getElementById('keypad-auto-btn');
    const known = window.OMT_Systems.state.knownCodes[cfg.code];
    if (autoBtn) {
      if (known) {
        autoBtn.classList.remove('hidden');
        autoBtn.textContent = `⚡ Auto-Enter Known Code from Memory [${cfg.code}]`;
      } else {
        autoBtn.classList.add('hidden');
      }
    }
  }

  function updateKeypadDisplay() {
    const disp = document.getElementById('keypad-display');
    if (disp) {
      disp.textContent = currentKeypadInput.padEnd(4, '_').split('').join(' ');
    }
  }

  function pressKeypadDigit(d) {
    if (currentKeypadInput.length < 4) {
      currentKeypadInput += String(d);
      window.OMT_Audio.playKeypadBeep(null);
      updateKeypadDisplay();
    }
  }

  function pressKeypadClear() {
    currentKeypadInput = '';
    window.OMT_Audio.playKeypadBeep(null);
    updateKeypadDisplay();
  }

  function autoEnterKnownKeypadCode() {
    if (!activeKeypadConfig) return;
    currentKeypadInput = activeKeypadConfig.code;
    updateKeypadDisplay();
    submitKeypadCode();
  }

  function submitKeypadCode() {
    if (!activeKeypadConfig) return;
    if (currentKeypadInput === activeKeypadConfig.code) {
      window.OMT_Audio.playKeypadBeep(true);
      window.OMT_Systems.state.knownCodes[activeKeypadConfig.code] = activeKeypadConfig.title;
      window.OMT_Systems.savePersistentState();
      const cb = activeKeypadConfig.onSuccess;
      closeAllModals();
      if (cb) cb();
    } else {
      window.OMT_Audio.playKeypadBeep(false);
      const disp = document.getElementById('keypad-display');
      if (disp) disp.textContent = 'ERR!';
      setTimeout(() => {
        currentKeypadInput = '';
        updateKeypadDisplay();
      }, 650);
    }
  }

  function openLibraryShelfModal() {
    openModalContainer('library');
    const statusEl = document.getElementById('library-modal-status');
    const actionBtn = document.getElementById('library-place-book-btn');
    const S = window.OMT_Systems.state;

    if (S.loopState.librarySolved) {
      statusEl.textContent = 'COMPARTMENT OPEN: Rowan\'s Admin Terminal #04 Login is [ rowan_k / CHRONO88 ].';
      actionBtn.classList.add('hidden');
    } else if (window.OMT_Systems.hasItem('tachyon_book')) {
      statusEl.textContent = 'You are holding "Tachyon Harmonics Vol. III" from Maya\'s Locker #14. Place it into the open acoustic slot to trigger the hidden spring latch.';
      actionBtn.classList.remove('hidden');
    } else {
      statusEl.textContent = 'Volumes I and II of "Tachyon Harmonics" are lined up on the shelf, but Volume III is missing. (Clue: Check Classroom 101 & Maya\'s Locker #14 in the Main Hallway).';
      actionBtn.classList.add('hidden');
    }
  }

  function solveLibraryShelf() {
    const S = window.OMT_Systems.state;
    S.loopState.librarySolved = true;
    window.OMT_Systems.unlockClue('clue_library_compartment', showToast);
    openLibraryShelfModal();
  }

  function openBreakerModal() {
    openModalContainer('breaker');
    renderBreakerUI();
  }

  function toggleBreakerSwitch(key) {
    const S = window.OMT_Systems.state;
    S.loopState.breakers[key] = !S.loopState.breakers[key];
    window.OMT_Audio.playKeypadBeep(null);
    renderBreakerUI();
  }

  function renderBreakerUI() {
    const S = window.OMT_Systems.state;
    const weights = { A: 45, B: 30, C: 60, D: 15, E: 45 };
    let total = 0;
    Object.keys(weights).forEach((k) => {
      if (S.loopState.breakers[k]) total += weights[k];
      const btn = document.getElementById(`breaker-btn-${k}`);
      if (btn) {
        const on = S.loopState.breakers[k];
        btn.textContent = `Circuit ${k} (${weights[k]}V): ${on ? 'ON' : 'OFF'}`;
        btn.className = on
          ? 'w-full py-2.5 px-4 rounded font-mono text-sm font-bold bg-emerald-600 text-white border border-emerald-400 shadow'
          : 'w-full py-2.5 px-4 rounded font-mono text-sm bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700';
      }
    });

    const readout = document.getElementById('breaker-voltage-readout');
    const status = document.getElementById('breaker-status-badge');
    if (readout) readout.textContent = `${total} V / 120 V TARGET`;

    if (total === 120) {
      if (!S.loopState.powerRestored) {
        S.loopState.powerRestored = true;
        window.OMT_Audio.playKeypadBeep(true);
        window.OMT_Systems.unlockClue('clue_power_restored', showToast);
      }
      if (status) {
        status.textContent = 'GRID BALANCED AT 120V — AUXILIARY POWER ONLINE!';
        status.className = 'mt-3 p-2.5 rounded text-center font-mono text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-500';
      }
    } else {
      S.loopState.powerRestored = false;
      if (status) {
        status.textContent =
          total > 120
            ? 'OVERLOAD WARNING: Voltage exceeds 120V! Toggle off excess breakers.'
            : 'GRID OFFLINE: Combine switches to reach exactly 120V (e.g., A + C + D).';
        status.className = 'mt-3 p-2.5 rounded text-center font-mono text-xs bg-amber-950/60 text-amber-300 border border-amber-600/50';
      }
    }
  }

  function openSpectrometerModal() {
    openModalContainer('spectrometer');
    const S = window.OMT_Systems.state;
    const slider = document.getElementById('spectro-freq-slider');
    if (slider) {
      slider.value = S.loopState.spectrometerSolved ? 432 : 396;
    }
    updateSpectrometerUI();
  }

  function updateSpectrometerUI() {
    const S = window.OMT_Systems.state;
    const slider = document.getElementById('spectro-freq-slider');
    const valEl = document.getElementById('spectro-freq-val');
    const statusEl = document.getElementById('spectro-status-msg');
    const freq = slider ? parseInt(slider.value, 10) : 396;
    if (valEl) valEl.textContent = `${freq} Hz`;

    const canvas = document.getElementById('spectro-wave-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0b131e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const diff = Math.abs(freq - 432);
      ctx.strokeStyle = diff === 0 ? '#34c759' : '#4cc9f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 +
          Math.sin(x * 0.06) * 26 * Math.cos((diff / 40) * x * 0.03) +
          (diff === 0 ? 0 : Math.sin(x * 0.23) * (diff * 0.35));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (freq === 432) {
      if (!S.loopState.spectrometerSolved) {
        S.loopState.spectrometerSolved = true;
        window.OMT_Systems.unlockClue('clue_spectrometer_432', showToast);
      }
      if (statusEl) {
        statusEl.textContent = '★ HARMONIC EIGENVALUE LOCKED: 432 Hz! (Recorded in Memory Journal for the Underground Chrono-Core).';
        statusEl.className = 'mt-3 p-2.5 rounded font-mono text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-500';
      }
    } else if (statusEl) {
      statusEl.textContent = 'Adjust frequency slider until phase interference vanishes (Target Harmonic: 432 Hz).';
      statusEl.className = 'mt-3 p-2.5 rounded font-mono text-xs bg-slate-800 text-slate-300 border border-slate-700';
    }
  }

  function openTerminalModal() {
    openModalContainer('terminal');
    renderTerminalUI();
  }

  function renderTerminalUI() {
    const S = window.OMT_Systems.state;
    const body = document.getElementById('terminal-screen-body');
    if (!body) return;

    const hasPower = S.loopState.powerRestored || S.knownCodes['CHRONO88'] || S.flags.rowanConfessed;
    if (!hasPower) {
      body.innerHTML = `
        <div class="p-4 rounded bg-red-950/60 border border-red-500/60 text-red-200 font-mono text-xs space-y-2">
          <div class="font-bold text-sm">⚠ TERMINAL OFFLINE — AUXILIARY POWER REQUIRED</div>
          <p>Main 120V circuit breaker in the <strong>Utility Storage Room</strong> (East Wing) is tripped.</p>
          <p class="text-amber-300">Hint: Unlock the Staff Room (PIN 7392 or Safe Key) to get the Storage Room Key, then switch ON Breakers A (45V) + C (60V) + D (15V) = 120V.</p>
          <button onclick="window.OMT_Engine.bypassTerminalPowerWithMemory()" class="mt-2 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold">
            ⚡ Reroute Emergency UPS Battery (Boot Terminal Now)
          </button>
        </div>
      `;
      return;
    }

    const doorUnlocked = S.loopState.basementUnlocked;
    body.innerHTML = `
      <div class="font-mono text-xs space-y-3 text-emerald-300">
        <div class="flex items-center justify-between border-b border-emerald-500/30 pb-2">
          <span>USER: <strong>rowan_k (CHRONO88)</strong></span>
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">AUTH: GRANTED</span>
        </div>
        <div class="p-3 rounded bg-slate-900/90 border border-slate-700 text-slate-200 space-y-1.5 leading-relaxed">
          <div class="text-amber-300 font-bold">[ENCRYPTED LOG — DR. E. KAELEN, 11:48 PM]</div>
          <p>"Rowan & Maya triggered the Chrono-Core without completing the 3-Pylon harmonic alignment. The school is now trapped in a 180-second loop and Abyssal Chrono-Wraiths have breached the Ley-Line!"</p>
          <p>"To safely collapse the anomaly: <strong>1) Unlock the North Stairwell</strong> below, <strong>2) Enter Blast Door PIN [ 9 1 0 4 ]</strong> in the Restricted Basement, <strong>3) Energize Pylons BETA -> ALPHA -> GAMMA</strong>, and <strong>4) Tune the Central Console to 432 Hz</strong>."</p>
        </div>
        <div class="flex flex-wrap gap-2 pt-1">
          <button onclick="window.OMT_Engine.unlockBasementFromTerminal()" class="px-4 py-2.5 rounded font-bold text-xs ${
            doorUnlocked
              ? 'bg-emerald-800/60 text-emerald-200 border border-emerald-500'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
          }">
            ${doorUnlocked ? '✓ NORTH STAIRWELL MAGNETIC SEAL: UNLOCKED' : '🔓 DISENGAGE NORTH STAIRWELL MAGNETIC SEAL'}
          </button>
        </div>
      </div>
    `;
  }

  function bypassTerminalPowerWithMemory() {
    window.OMT_Systems.state.loopState.powerRestored = true;
    window.OMT_Audio.playKeypadBeep(true);
    renderTerminalUI();
  }

  function unlockBasementFromTerminal() {
    const S = window.OMT_Systems.state;
    S.loopState.basementUnlocked = true;
    const stairDoor = window.OMT_World.doors['door_staircase'];
    if (stairDoor) {
      stairDoor.locked = false;
      stairDoor.isOpen = true;
    }
    window.OMT_Systems.state.knownCodes['9104'] = 'Underground Lab Blast Door PIN';
    window.OMT_Systems.unlockClue('clue_terminal_logs', showToast);
    window.OMT_Systems.unlockClue('clue_incident_report', showToast);
    window.OMT_Audio.playKeypadBeep(true);
    showToast('North Stairwell Magnetic Seal Disengaged! You can now descend to the Restricted Basement.');
    renderTerminalUI();
  }

  function openDialogueModal(npcKey) {
    openModalContainer('dialogue');
    window.OMT_Audio.playVoiceBlip(npcKey === 'maya' ? 'Maya' : 'Rowan');
    renderDialogueUI(npcKey, null);
  }

  function renderDialogueUI(npcKey, customReply) {
    const elapsed = 180 - window.OMT_Systems.state.timeRemaining;
    const dlg = window.OMT_Systems.getNPCDialogue(npcKey, elapsed);

    document.getElementById('dialogue-speaker-name').textContent = dlg.speaker;
    document.getElementById('dialogue-speaker-role').textContent = dlg.role;
    document.getElementById('dialogue-speech-text').textContent = customReply || dlg.greeting;

    const optsContainer = document.getElementById('dialogue-options-list');
    optsContainer.innerHTML = '';

    dlg.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className =
        'w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-600/80 transition flex items-center justify-between';
      btn.innerHTML = `<span>${opt.label}</span><span class="text-amber-400 ml-2">→</span>`;
      btn.addEventListener('click', () => {
        window.OMT_Audio.playVoiceBlip(npcKey === 'maya' ? 'Maya' : 'Rowan');
        if (opt.onSelect) opt.onSelect(showToast);
        renderDialogueUI(npcKey, opt.reply);
      });
      optsContainer.appendChild(btn);
    });
  }

  function openCoreConsoleModal() {
    openModalContainer('core');
    renderCoreConsoleUI();
  }

  function renderCoreConsoleUI() {
    const S = window.OMT_Systems.state;
    const aligned = S.loopState.pylonsAligned;
    const isPylonsComplete =
      aligned.length === 3 && aligned[0] === 'BETA' && aligned[1] === 'ALPHA' && aligned[2] === 'GAMMA';

    const pylonBadge = document.getElementById('core-pylon-status');
    if (pylonBadge) {
      pylonBadge.innerHTML = isPylonsComplete
        ? '<span class="text-emerald-400 font-bold">✓ ALL 3 PHASE PYLONS ALIGNED (BETA → ALPHA → GAMMA)</span>'
        : `<span class="text-amber-300">Pylon Sequence Progress: [${aligned.join(' → ') || 'NONE'}] — Required: BETA → ALPHA → GAMMA</span>`;
    }

    const freqInput = document.getElementById('core-freq-input');
    if (freqInput) freqInput.value = S.loopState.coreFrequency;
    const freqDisplay = document.getElementById('core-freq-display');
    if (freqDisplay) freqDisplay.textContent = `${S.loopState.coreFrequency} Hz`;
  }

  function updateCoreFreqSlider(val) {
    window.OMT_Systems.state.loopState.coreFrequency = parseInt(val, 10);
    const freqDisplay = document.getElementById('core-freq-display');
    if (freqDisplay) freqDisplay.textContent = `${val} Hz`;
  }

  function quickAlignAllPylonsFromConsole() {
    const S = window.OMT_Systems.state;
    S.loopState.pylonsAligned = ['BETA', 'ALPHA', 'GAMMA'];
    S.loopState.coreFrequency = 432;
    window.OMT_Audio.playClueChime();
    showToast('Pylons BETA → ALPHA → GAMMA aligned & Frequency locked to 432 Hz!');
    renderCoreConsoleUI();
  }

  function executeChronoCoreEnding(endingType) {
    const S = window.OMT_Systems.state;
    const aligned = S.loopState.pylonsAligned;
    const isPylonsComplete =
      aligned.length === 3 && aligned[0] === 'BETA' && aligned[1] === 'ALPHA' && aligned[2] === 'GAMMA';

    if (endingType === 'true') {
      if (!isPylonsComplete || S.loopState.coreFrequency !== 432) {
        window.OMT_Audio.playKeypadBeep(false);
        showToast('Ensure Pylons are aligned (BETA → ALPHA → GAMMA) and Frequency is set to 432 Hz!');
        return;
      }
    }

    S.gameCompleted = true;
    S.isPaused = true;
    closeAllModals();
    window.OMT_Audio.playClueChime();

    const endingModal = document.getElementById('modal-ending');
    const titleEl = document.getElementById('ending-title');
    const subEl = document.getElementById('ending-subtitle');
    const bodyEl = document.getElementById('ending-narrative');
    const statsEl = document.getElementById('ending-stats');

    if (endingModal) endingModal.classList.remove('hidden');

    if (endingType === 'true') {
      titleEl.textContent = 'ENDING A — DAWN AFTER 11:57 (TRUE ENDING)';
      subEl.textContent = 'CHRONO-CORE HARMONIC STABILIZED AT 432 Hz • ABYSSAL RIFT SEALED';
      bodyEl.innerHTML = `
        <p>As you lock the Central Stabilizer Console to <strong>432 Hz</strong> across the aligned <strong>BETA → ALPHA → GAMMA</strong> phase pylons, a radiant wave of golden Ley-Line light sweeps through the subterranean vault and out across the Starlight Courtyard.</p>
        <p>The Abyssal Chrono-Wraiths dissolve into harmless stardust, the Caretaker drops his crimson lantern in shock, and Maya and Rowan watch in relief as their watches finally tick past <strong>11:57 PM</strong> into a golden morning dawn.</p>
        <p>You outsmarted the stalkers, uncovered every secret of Blackwood Academy, and broke the time loop forever.</p>
      `;
    } else {
      titleEl.textContent = 'ENDING B — ONE MORE TURN (PARADOX ENDING)';
      subEl.textContent = 'SINGULARITY OVERLOAD • ETERNAL OBSERVER';
      bodyEl.innerHTML = `
        <p>Choosing to force a raw tachyon discharge through the uncalibrated core, you collapse the subterranean singularity from within. A blinding wave of silver light sweeps through the basement, school corridors, and courtyard.</p>
        <p>Maya and Rowan wake safely outside the school gates in the morning sun—while your consciousness remains anchored to the final echo of 11:57 PM, standing watch over the Starlight Courtyard for one more turn.</p>
      `;
    }

    if (statsEl) {
      statsEl.textContent = `Loops Experienced: ${S.loopNumber} • Clues Discovered: ${S.discoveredClues.length} / ${Object.keys(window.OMT_Systems.CLUE_CATALOG).length} • Final Time Remaining: ${S.timeRemaining.toFixed(1)}s`;
    }
  }

  function openJournalModal(category = 'all') {
    openModalContainer('journal');
    renderJournalCategory(category);
  }

  function renderJournalCategory(category = 'all') {
    const S = window.OMT_Systems.state;
    const listEl = document.getElementById('journal-entries-list');
    const codesEl = document.getElementById('journal-known-codes');
    const scheduleEl = document.getElementById('journal-npc-schedules');

    document.querySelectorAll('.journal-tab-btn').forEach((btn) => {
      const isAct = btn.getAttribute('data-tab') === category;
      btn.className = isAct
        ? 'journal-tab-btn px-3 py-1.5 rounded text-xs font-mono font-bold bg-amber-500 text-slate-950'
        : 'journal-tab-btn px-3 py-1.5 rounded text-xs font-mono bg-slate-800 text-slate-300 hover:bg-slate-700';
    });

    if (listEl) {
      listEl.innerHTML = '';
      const discovered = S.discoveredClues
        .map((id) => window.OMT_Systems.CLUE_CATALOG[id])
        .filter(Boolean)
        .filter((entry) => category === 'all' || entry.category === category);

      if (discovered.length === 0) {
        listEl.innerHTML = `<div class="p-4 rounded bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-mono">No entries recorded in this category yet. Explore the 15 school & courtyard areas and press [E] on documents, chalkboards, computers, and NPCs!</div>`;
      } else {
        discovered.forEach((entry) => {
          const card = document.createElement('div');
          card.className = 'p-3.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1';
          card.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="font-bold text-amber-300 text-sm">${entry.title}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">${entry.category}</span>
            </div>
            <p class="text-xs text-emerald-300 font-mono">${entry.loopNote}</p>
            <p class="text-xs text-slate-300 leading-relaxed">${entry.detail}</p>
          `;
          listEl.appendChild(card);
        });
      }
    }

    if (codesEl) {
      const codes = Object.entries(S.knownCodes);
      if (codes.length === 0) {
        codesEl.innerHTML = `<div class="text-xs text-slate-400 font-mono">No PINs or passwords discovered yet. (Check Classroom 101 & 102 chalkboards, Reception Ledger, and Courtyard Fountain).</div>`;
      } else {
        codesEl.innerHTML = codes
          .map(
            ([code, label]) =>
              `<div class="flex items-center justify-between px-3 py-1.5 rounded bg-slate-800/90 border border-amber-500/30 text-xs font-mono">
                <span class="text-slate-200">${label}</span>
                <span class="font-bold text-amber-300">${code}</span>
              </div>`
          )
          .join('');
      }
    }

    if (scheduleEl) {
      const mayaAct = window.OMT_Characters.npcs.maya ? window.OMT_Characters.npcs.maya.activity : 'Main Hallway';
      const rowanAct = window.OMT_Characters.npcs.rowan ? window.OMT_Characters.npcs.rowan.activity : 'Science Lab';
      scheduleEl.innerHTML = `
        <div class="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-xs space-y-1">
          <div class="font-bold text-amber-300">Maya Lin — Current: ${mayaAct}</div>
          <div class="text-slate-400 font-mono text-[11px]">0-45s: Hallway Locker #14 → 45-110s: Library → 110-155s: Room 101 → 155-180s: North Stairwell</div>
        </div>
        <div class="p-2.5 rounded bg-slate-800/80 border border-slate-700 text-xs space-y-1">
          <div class="font-bold text-cyan-300">Rowan Kerr — Current: ${rowanAct}</div>
          <div class="text-slate-400 font-mono text-[11px]">0-45s: Sci-Lab Hall → 45-110s: Science Lab → 110-155s: Computer Lab → 155-180s: Basement Door</div>
        </div>
        <div class="p-2.5 rounded bg-rose-950/50 border border-rose-500/40 text-xs space-y-1">
          <div class="font-bold text-rose-300">⚠ Stalker Patrol Zones</div>
          <div class="text-rose-200/80 font-mono text-[11px]">• The Caretaker: Open-World Courtyard & Neighbor House<br>• Abyssal Wraith α: East Wing / Sci-Lab Corridor<br>• Abyssal Wraith Ω: Restricted Basement & Core Vault</div>
        </div>
      `;
    }
  }

  function updateLoopTimer(dt) {
    const S = window.OMT_Systems.state;
    if (S.inMenu || S.isPaused || S.activeModal || S.gameCompleted || resetInProgress) return;

    S.timeRemaining = Math.max(0, S.timeRemaining - dt);

    const secFloor = Math.floor(S.timeRemaining);
    if (secFloor !== lastSecondTick) {
      lastSecondTick = secFloor;
      if (secFloor <= 30 && secFloor > 0) {
        window.OMT_Audio.playTimerTick(secFloor <= 10);
      }
    }

    const mins = Math.floor(S.timeRemaining / 60);
    const secs = Math.floor(S.timeRemaining % 60);
    const tenths = Math.floor((S.timeRemaining % 1) * 10);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;

    const timerEl = document.getElementById('hud-timer-value');
    if (timerEl) {
      timerEl.textContent = formatted;
      if (S.timeRemaining <= 30) {
        timerEl.className = 'text-2xl font-mono font-black tracking-wider text-red-400 animate-pulse';
      } else if (S.timeRemaining <= 60) {
        timerEl.className = 'text-2xl font-mono font-black tracking-wider text-amber-300';
      } else {
        timerEl.className = 'text-2xl font-mono font-black tracking-wider text-emerald-300';
      }
    }

    if (S.timeRemaining <= 0 && !resetInProgress) {
      executeTimeLoopReset('180-SECOND TEMPORAL ANOMALY RESET');
    }
  }

  function triggerManualTimeLoopReset() {
    if (resetInProgress) return;
    executeTimeLoopReset('MANUAL TEMPORAL REWIND TRIGGERED');
  }

  function handleMonsterCaughtPlayer(monsterName) {
    if (resetInProgress) return;
    window.OMT_Audio.playMonsterGrowl(true);
    executeTimeLoopReset(`CAUGHT BY ${monsterName.toUpperCase()} — TEMPORAL REWIND!`);
  }

  function executeTimeLoopReset(reasonText) {
    resetInProgress = true;
    const S = window.OMT_Systems.state;
    closeAllModals();
    window.OMT_Audio.playTimeResetEffect();

    const overlay = document.getElementById('time-reset-overlay');
    const reasonEl = document.getElementById('time-reset-reason');
    const loopNumEl = document.getElementById('time-reset-loop-num');

    S.loopNumber += 1;
    window.OMT_Systems.savePersistentState();

    if (reasonEl) reasonEl.textContent = reasonText;
    if (loopNumEl) loopNumEl.textContent = `BEGINNING LOOP #${S.loopNumber} — 11:57:00 PM`;
    if (overlay) overlay.classList.remove('hidden');

    if (ambientLight) ambientLight.color.setHex(0x9d4edd);
    if (scene && scene.fog) scene.fog.color.setHex(0x240046);

    setTimeout(() => {
      player.pos.set(0, 1.7, 30.0);
      player.vel.set(0, 0, 0);
      player.yaw = 0;
      player.pitch = 0;
      player.isCrouching = false;
      player.isHidden = false;
      updateStealthHUD();

      window.OMT_Systems.resetLoopStateOnly();
      window.OMT_World.resetForNewLoop(S.knownCodes);
      window.OMT_Characters.resetPositions();
      updateHUDInventory();
      updateHUDLoopBadge();

      if (ambientLight) ambientLight.color.setHex(0x5a6e91);
      if (scene && scene.fog) scene.fog.color.setHex(0x11192e);
    }, 1150);

    setTimeout(() => {
      if (overlay) overlay.classList.add('hidden');
      resetInProgress = false;
      lastSecondTick = 180;
      showToast(`Loop #${S.loopNumber} Started — Your Memory Journal (${S.discoveredClues.length} clues) persists!`);
    }, 2250);
  }

  function updateHUDInventory() {
    const invEl = document.getElementById('hud-inventory-bar');
    if (!invEl) return;
    const items = window.OMT_Systems.state.loopState.inventory;
    if (items.length === 0) {
      invEl.innerHTML = `<span class="text-[11px] font-mono text-slate-400">Loop Inventory: Empty (Persistent Clues in [TAB] Journal)</span>`;
    } else {
      invEl.innerHTML = items
        .map(
          (i) =>
            `<span class="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-mono font-semibold">🔑 ${i.label}</span>`
        )
        .join('');
    }
  }

  function updateHUDLoopBadge() {
    const S = window.OMT_Systems.state;
    const badge = document.getElementById('hud-loop-counter');
    if (badge) badge.textContent = `LOOP #${S.loopNumber}`;
    const clueBadge = document.getElementById('hud-clue-counter');
    if (clueBadge) {
      clueBadge.textContent = `CLUES: ${S.discoveredClues.length}/${Object.keys(window.OMT_Systems.CLUE_CATALOG).length}`;
    }
  }

  function updateTensionUI() {
    const t = window.OMT_Characters.getTensionLevel();
    const bar = document.getElementById('hud-tension-bar');
    const label = document.getElementById('hud-tension-label');
    const dangerVignette = document.getElementById('danger-vignette-overlay');

    if (bar) {
      bar.style.width = `${t}%`;
      bar.className =
        t > 65
          ? 'h-full bg-rose-500 transition-all duration-150'
          : t > 25
          ? 'h-full bg-amber-400 transition-all duration-150'
          : 'h-full bg-emerald-400 transition-all duration-150';
    }
    if (label) {
      label.textContent =
        t > 65 ? `⚠ STALKER CHASING (${t}%)` : t > 25 ? `STALKER NEARBY (${t}%)` : `STEALTH CLEAR (${t}%)`;
      label.className =
        t > 65 ? 'text-[10px] font-mono font-bold text-rose-400 animate-pulse' : 'text-[10px] font-mono text-slate-300';
    }
    if (dangerVignette) {
      dangerVignette.style.opacity = t > 25 ? String((t / 100) * 0.65) : '0';
    }
  }

  function renderMiniMap() {
    const canvas = document.getElementById('hud-minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(10, 15, 26, 0.94)';
    ctx.fillRect(0, 0, w, h);

    // Coordinate transform covering X (-40..40) and Z (-70..80)
    const toX = (wx) => ((wx + 40) / 80) * w;
    const toY = (wz) => ((wz + 70) / 150) * h;

    window.OMT_World.ROOMS.forEach((r) => {
      const rx = toX(r.minX);
      const ry = toY(r.minZ);
      const rw = toX(r.maxX) - rx;
      const rh = toY(r.maxZ) - ry;
      ctx.fillStyle =
        r.id === 'courtyard'
          ? 'rgba(20, 83, 45, 0.45)'
          : r.floorY < -1
          ? 'rgba(88, 28, 135, 0.42)'
          : 'rgba(30, 41, 59, 0.78)';
      ctx.strokeStyle = r.floorY < -1 ? '#a855f7' : r.id === 'courtyard' ? '#34d399' : '#475569';
      ctx.lineWidth = 1;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    });

    // Draw NPCs
    if (window.OMT_Characters.npcs.maya) {
      const mp = window.OMT_Characters.npcs.maya.pos;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(toX(mp.x), toY(mp.z), 3.0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (window.OMT_Characters.npcs.rowan) {
      const rp = window.OMT_Characters.npcs.rowan.pos;
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.arc(toX(rp.x), toY(rp.z), 3.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Roaming Monsters (Crimson Dots + Threat Halo)
    Object.values(window.OMT_Characters.monsters).forEach((mon) => {
      const mx = toX(mon.pos.x);
      const my = toY(mon.pos.z);
      ctx.fillStyle = 'rgba(255, 42, 85, 0.25)';
      ctx.beginPath();
      ctx.arc(mx, my, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff2a55';
      ctx.beginPath();
      ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player (Arin)
    const px = toX(player.pos.x);
    const py = toY(player.pos.z);
    ctx.strokeStyle = 'rgba(52, 199, 89, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.sin(player.yaw) * 10, py - Math.cos(player.yaw) * 10);
    ctx.stroke();

    ctx.fillStyle = '#34c759';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function showToast(msg) {
    const toast = document.getElementById('hud-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
    updateHUDLoopBadge();
  }

  function startNewGame() {
    window.OMT_Audio.init();
    window.OMT_Systems.resetAllForNewGame();
    window.OMT_World.resetForNewLoop({});
    window.OMT_Characters.resetPositions();
    player.pos.set(0, 1.7, 30.0);
    player.yaw = 0;
    player.pitch = 0;
    player.isCrouching = false;
    player.isHidden = false;
    updateStealthHUD();

    window.OMT_Systems.state.inMenu = false;
    window.OMT_Systems.state.isPaused = false;
    closeAllModals();

    document.getElementById('main-menu-overlay').classList.add('hidden');
    document.getElementById('pause-menu-overlay').classList.add('hidden');
    document.getElementById('hud-overlay').classList.remove('hidden');
    updateHUDInventory();
    updateHUDLoopBadge();
    showToast('Loop #1 Started — Explore the School & Open-World Courtyard, and evade the Stalkers!');
  }

  function continueSavedGame() {
    window.OMT_Audio.init();
    const ok = window.OMT_Systems.loadPersistentState();
    if (!ok) {
      startNewGame();
      return;
    }
    window.OMT_Systems.resetLoopStateOnly();
    window.OMT_World.resetForNewLoop(window.OMT_Systems.state.knownCodes);
    window.OMT_Characters.resetPositions();
    player.pos.set(0, 1.7, 30.0);
    player.yaw = 0;
    player.pitch = 0;
    player.isCrouching = false;
    player.isHidden = false;
    updateStealthHUD();

    window.OMT_Systems.state.inMenu = false;
    window.OMT_Systems.state.isPaused = false;
    closeAllModals();

    document.getElementById('main-menu-overlay').classList.add('hidden');
    document.getElementById('pause-menu-overlay').classList.add('hidden');
    document.getElementById('hud-overlay').classList.remove('hidden');
    updateHUDInventory();
    updateHUDLoopBadge();
    showToast(`Resumed Loop #${window.OMT_Systems.state.loopNumber} with ${window.OMT_Systems.state.discoveredClues.length} Persistent Clues!`);
  }

  function updateContinueButtonState() {
    const btn = document.getElementById('menu-continue-btn');
    if (!btn) return;
    if (window.OMT_Systems.hasSavedGame()) {
      btn.disabled = false;
      btn.className =
        'w-full py-3 px-5 rounded-lg font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center justify-between';
    } else {
      btn.disabled = true;
      btn.className =
        'w-full py-3 px-5 rounded-lg font-semibold text-sm bg-slate-800/60 text-slate-500 border border-slate-700/50 cursor-not-allowed flex items-center justify-between';
    }
  }

  function togglePauseMenu() {
    const S = window.OMT_Systems.state;
    if (S.inMenu) return;
    S.isPaused = !S.isPaused;
    const pauseOverlay = document.getElementById('pause-menu-overlay');
    if (S.isPaused) {
      exitPointerLockSafe();
      if (pauseOverlay) pauseOverlay.classList.remove('hidden');
    } else {
      if (pauseOverlay) pauseOverlay.classList.add('hidden');
    }
  }

  function returnToMainMenu() {
    exitPointerLockSafe();
    window.OMT_Systems.savePersistentState();
    window.OMT_Systems.state.inMenu = true;
    window.OMT_Systems.state.isPaused = true;
    closeAllModals();
    document.getElementById('pause-menu-overlay').classList.add('hidden');
    document.getElementById('modal-ending').classList.add('hidden');
    document.getElementById('hud-overlay').classList.add('hidden');
    document.getElementById('main-menu-overlay').classList.remove('hidden');
    updateContinueButtonState();
  }

  function applyGraphicsPreset(preset) {
    settings.graphics = preset;
    if (!renderer || !scene) return;
    if (preset === 'low') {
      renderer.shadowMap.enabled = false;
      scene.fog.density = 0.032;
      settings.resolutionScale = 0.75;
    } else if (preset === 'medium') {
      renderer.shadowMap.enabled = true;
      scene.fog.density = 0.025;
      settings.resolutionScale = 1.0;
    } else {
      renderer.shadowMap.enabled = true;
      scene.fog.density = 0.020;
      settings.resolutionScale = 1.25;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5) * settings.resolutionScale);
  }

  function applyResolutionScale(scale) {
    settings.resolutionScale = parseFloat(scale) || 1.0;
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5) * settings.resolutionScale);
    }
  }

  function setSensitivity(val) {
    settings.sensitivity = parseFloat(val) || 1.0;
  }

  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (e) {}
  }

  function setTouchMove(dir, active) {
    if (dir === 'up') touchMove.forward = active ? 1 : 0;
    if (dir === 'down') touchMove.forward = active ? -1 : 0;
    if (dir === 'left') touchMove.right = active ? -1 : 0;
    if (dir === 'right') touchMove.right = active ? 1 : 0;
    if (dir === 'sprint') touchMove.sprinting = active;
  }

  function triggerJump() {
    if (player.onGround && !player.isHidden) {
      player.isCrouching = false;
      player.vel.y = player.jumpImpulse;
      player.onGround = false;
      updateStealthHUD();
    }
  }

  function toggleSprintTouch() {
    touchMove.sprinting = !touchMove.sprinting;
    const btn = document.getElementById('mobile-sprint-btn');
    if (btn) {
      btn.className = touchMove.sprinting
        ? 'px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-mono font-bold shadow'
        : 'px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700';
    }
  }

  function quickTeleportToRoom(roomId) {
    const r = window.OMT_World.ROOMS.find((rm) => rm.id === roomId);
    if (!r) return;
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;
    player.isHidden = false;
    player.isCrouching = false;
    updateStealthHUD();
    player.pos.set(cx, r.floorY + player.height, cz);
    closeAllModals();
    window.OMT_Systems.state.isPaused = false;
    document.getElementById('pause-menu-overlay').classList.add('hidden');
    showToast(`Moved to ${r.name}`);
  }

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    const dt = Math.min(clock ? clock.getDelta() : 0.016, 0.1);
    const S = window.OMT_Systems.state;
    const elapsedLoopTime = 180.0 - S.timeRemaining;

    if (!S.inMenu && !S.isPaused && !S.activeModal && !S.gameCompleted) {
      updatePlayerMovement(dt);
      updateInteractionRaycast();
      updateLoopTimer(dt);
      window.OMT_World.update(dt, elapsedLoopTime, S.loopState.pylonsAligned);
      window.OMT_Characters.update(dt, elapsedLoopTime, player.pos, S, {
        isCrouching: player.isCrouching,
        isHidden: player.isHidden,
        onCaught: handleMonsterCaughtPlayer
      });
      updateTensionUI();
      renderMiniMap();
    } else if (S.inMenu) {
      // Sweeping Genshin-style cinematic camera across the Starlight Courtyard & School Entrance
      const t = performance.now() * 0.00032;
      camera.position.set(Math.sin(t) * 8.5, 3.2, 45 + Math.cos(t * 0.7) * 10);
      camera.rotation.set(-0.08, Math.sin(t * 0.4) * 0.45, 0);
      window.OMT_World.update(dt, (performance.now() * 0.001) % 180, []);
    }

    if (S.activeModal === 'inspect' && inspectRenderer && inspectScene && inspectCamera && inspectMesh) {
      inspectMesh.rotation.y += dt * 1.4;
      inspectMesh.rotation.x = Math.sin(performance.now() * 0.002) * 0.2;
      inspectRenderer.render(inspectScene, inspectCamera);
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  return {
    init,
    startNewGame,
    continueSavedGame,
    togglePauseMenu,
    returnToMainMenu,
    toggleFlashlight,
    toggleCrouch,
    throwAcousticDecoy,
    triggerInteraction,
    triggerManualTimeLoopReset,
    openJournalModal,
    renderJournalCategory,
    closeAllModals,
    pressKeypadDigit,
    pressKeypadClear,
    submitKeypadCode,
    autoEnterKnownKeypadCode,
    solveLibraryShelf,
    toggleBreakerSwitch,
    updateSpectrometerUI,
    bypassTerminalPowerWithMemory,
    unlockBasementFromTerminal,
    updateCoreFreqSlider,
    quickAlignAllPylonsFromConsole,
    executeChronoCoreEnding,
    applyGraphicsPreset,
    applyResolutionScale,
    setSensitivity,
    toggleFullscreen,
    setTouchMove,
    triggerJump,
    toggleSprintTouch,
    quickTeleportToRoom
  };
})();
