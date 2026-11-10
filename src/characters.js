// ============================================================================
// ONE MORE TURN — Cel-Shaded Characters & 3D Monster Stalker AI (characters.js)
// Builds articulated Genshin-style cel-shaded models for Maya and Rowan PLUS
// 3 roaming 3D Monsters: The Caretaker ("The Warden" in the Open-World Courtyard)
// and 2 Abyssal Chrono-Wraiths with vision cones, sound-decoy investigation,
// stealth detection, tension meter calculation, and capture mechanics.
// ============================================================================

window.OMT_Characters = (function () {
  const npcs = {};
  const monsters = {};
  let tensionLevel = 0; // 0 to 100
  let decoyTarget = null; // { x, y, z, timer }
  letheartbeatCooldown = 0;

  function createNameBadgeTexture(name, role, accentColor) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(12, 16, 28, 0.88)';
    ctx.fillRect(4, 4, 248, 56);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 30);
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(role, 128, 50);
    return new THREE.CanvasTexture(c);
  }

  function addCelOutline(mesh, scale = 1.05, color = 0x0b0f19) {
    if (!mesh.geometry) return;
    const outMat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    const outMesh = new THREE.Mesh(mesh.geometry, outMat);
    outMesh.scale.set(scale, scale, scale);
    mesh.add(outMesh);
  }

  function buildArticulatedCharacter(cfg) {
    const root = new THREE.Group();
    const toonGrad = window.OMT_Textures.getToonGradientTexture();
    const skinMat = new THREE.MeshToonMaterial({ color: cfg.skinColor, gradientMap: toonGrad });
    const blazerMat = new THREE.MeshToonMaterial({ color: cfg.blazerColor, gradientMap: toonGrad });
    const pantsMat = new THREE.MeshToonMaterial({ color: cfg.pantsColor, gradientMap: toonGrad });
    const hairMat = new THREE.MeshToonMaterial({ color: cfg.hairColor, gradientMap: toonGrad });
    const accentMat = new THREE.MeshToonMaterial({ color: cfg.accentColor, gradientMap: toonGrad });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.64, 0.26), blazerMat);
    torso.position.y = 1.08;
    torso.castShadow = true;
    addCelOutline(torso, 1.05);
    root.add(torso);

    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.28), accentMat);
    tie.position.set(0, 0.06, 0);
    torso.add(tie);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.54, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skinMat);
    addCelOutline(headMesh, 1.05);
    headPivot.add(headMesh);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.34), hairMat);
    hair.position.set(0, 0.14, -0.01);
    addCelOutline(hair, 1.04);
    headPivot.add(hair);
    if (cfg.longHair) {
      const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.11), hairMat);
      backHair.position.set(0, -0.03, -0.14);
      headPivot.add(backHair);
    }

    const eyeMat = new THREE.MeshBasicMaterial({ color: cfg.eyeColor || 0x1d3557 });
    [-0.065, 0.065].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.02), eyeMat);
      eye.position.set(ex, 0.02, 0.155);
      headPivot.add(eye);
    });

    root.add(headPivot);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.31, 1.34, 0);
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.14), blazerMat);
    leftArm.position.y = -0.24;
    addCelOutline(leftArm, 1.05);
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), skinMat);
    leftHand.position.y = -0.54;
    leftArmPivot.add(leftArm);
    leftArmPivot.add(leftHand);
    root.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.31, 1.34, 0);
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.14), blazerMat);
    rightArm.position.y = -0.24;
    addCelOutline(rightArm, 1.05);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.11), skinMat);
    rightHand.position.y = -0.54;
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.26), accentMat);
    prop.position.set(0, -0.56, 0.1);
    rightArmPivot.add(rightArm);
    rightArmPivot.add(rightHand);
    rightArmPivot.add(prop);
    root.add(rightArmPivot);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.12, 0.76, 0);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.74, 0.16), pantsMat);
    leftLeg.position.y = -0.37;
    addCelOutline(leftLeg, 1.05);
    leftLegPivot.add(leftLeg);
    root.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.12, 0.76, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.74, 0.16), pantsMat);
    rightLeg.position.y = -0.37;
    addCelOutline(rightLeg, 1.05);
    rightLegPivot.add(rightLeg);
    root.add(rightLegPivot);

    const badgeTex = createNameBadgeTexture(cfg.name, cfg.role, cfg.badgeHex);
    const spriteMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true });
    const badgeSprite = new THREE.Sprite(spriteMat);
    badgeSprite.position.set(0, 2.05, 0);
    badgeSprite.scale.set(1.45, 0.36, 1);
    root.add(badgeSprite);

    return {
      root,
      torso,
      headPivot,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      badgeSprite
    };
  }

  // Build 3D Monster Model (The Caretaker Neighbor OR Abyssal Chrono-Wraith)
  function buildMonsterModel(cfg) {
    const root = new THREE.Group();
    const toonGrad = window.OMT_Textures.getToonGradientTexture();

    if (cfg.monsterType === 'warden') {
      // Hello Neighbor-inspired Caretaker with Trench Coat, Fedora Hat & Crimson Searchlight Lantern
      const coatMat = new THREE.MeshToonMaterial({ color: 0x231942, gradientMap: toonGrad });
      const hatMat = new THREE.MeshToonMaterial({ color: 0x140d26, gradientMap: toonGrad });
      const glowRed = new THREE.MeshBasicMaterial({ color: 0xff2a55 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.85, 0.34), coatMat);
      torso.position.y = 1.18;
      addCelOutline(torso, 1.05, 0xff0033);
      root.add(torso);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.36, 0.34),
        new THREE.MeshToonMaterial({ color: 0xd8b4a0, gradientMap: toonGrad })
      );
      head.position.y = 1.82;
      addCelOutline(head, 1.05);
      // Glowing red spectacles & mustache
      [-0.08, 0.08].forEach((ex) => {
        const goggle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.04), glowRed);
        goggle.position.set(ex, 0.03, 0.17);
        head.add(goggle);
      });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 16), hatMat);
      brim.position.y = 0.2;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.22, 16), hatMat);
      crown.position.y = 0.31;
      head.add(brim);
      head.add(crown);
      root.add(head);

      // Lantern Arm holding Crimson Searchlight
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(0.42, 1.35, 0.35);
      const lanternMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 10), glowRed);
      lanternGroup.add(lanternMesh);
      const pt = new THREE.PointLight(0xff2a55, 1.8, 12, 1.5);
      lanternGroup.add(pt);
      root.add(lanternGroup);
    } else {
      // Genshin Rifthound / Abyssal Chrono-Wraith (Floating Void Entity with Claws & Halo)
      const voidMat = new THREE.MeshToonMaterial({ color: 0x1a0b2e, gradientMap: toonGrad });
      const runeMat = new THREE.MeshBasicMaterial({ color: 0xf72585 });

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), voidMat);
      core.position.y = 1.45;
      addCelOutline(core, 1.08, 0xf72585);
      root.add(core);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.05, 10, 32), runeMat);
      halo.position.y = 1.45;
      root.add(halo);
      root.userData.halo = halo;

      // Floating Claws
      [-0.58, 0.58].forEach((cx) => {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 6), voidMat);
        claw.position.set(cx, 1.25, 0.3);
        claw.rotation.x = Math.PI * 0.75;
        addCelOutline(claw, 1.07, 0x7209b7);
        root.add(claw);
      });

      const pt = new THREE.PointLight(0xf72585, 1.4, 10, 1.6);
      pt.position.y = 1.45;
      root.add(pt);
    }

    // Ground Detection Ring / Vision Cone Indicator
    const coneRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.45, 24),
      new THREE.MeshBasicMaterial({ color: 0xff2a55, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    coneRing.rotation.x = -Math.PI / 2;
    coneRing.position.y = 0.05;
    root.add(coneRing);

    const badgeTex = createNameBadgeTexture(cfg.name, cfg.role, '#ff4d6d');
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true }));
    badgeSprite.position.set(0, 2.38, 0);
    badgeSprite.scale.set(1.55, 0.38, 1);
    root.add(badgeSprite);

    return { root, coneRing, badgeSprite };
  }

  function initCharacters(scene, registerInteractableFn) {
    // 1. MAYA LIN
    const mayaModel = buildArticulatedCharacter({
      name: 'MAYA LIN',
      role: 'HONORS PHYSICS • AWAKE',
      skinColor: 0xf4d5c6,
      blazerColor: 0x2b4c7e,
      pantsColor: 0x1d2436,
      hairColor: 0x1f1a38,
      accentColor: 0xffd166,
      eyeColor: 0x4cc9f0,
      badgeHex: '#ffd166',
      longHair: true
    });
    scene.add(mayaModel.root);

    npcs.maya = {
      id: 'npc_maya',
      name: 'Maya Lin',
      model: mayaModel,
      pos: new THREE.Vector3(-2.1, 0, 14.5),
      rotY: 0.6,
      activity: 'Inspecting Hallway Locker #14',
      isWalking: false,
      animTime: 0,
      schedule: [
        { tStart: 0, tEnd: 45, x: -2.1, y: 0, z: 14.5, rotY: 0.6, activity: 'Checking watch by Hallway Locker #14' },
        { tStart: 45, tEnd: 110, x: -9.5, y: 0, z: 8.5, rotY: 3.14, activity: 'Searching the Library Physics Archive' },
        { tStart: 110, tEnd: 155, x: 9.8, y: 0, z: 18.0, rotY: 1.57, activity: 'Reviewing Lorentz equations in Classroom 101' },
        { tStart: 155, tEnd: 180, x: -1.5, y: 0, z: -21.0, rotY: 3.14, activity: 'Waiting anxiously by the North Stairwell' }
      ],
      allySchedule: { x: -2.5, y: -5, z: -53.5, rotY: 3.14, activity: 'Assisting Arin at the Underground Chrono-Core' }
    };

    registerInteractableFn(mayaModel.root, {
      id: 'npc_maya',
      type: 'npc',
      npcKey: 'maya',
      title: 'Maya Lin (Physics Student)',
      subtitle: 'Press [E] to Speak with Maya'
    });

    // 2. ROWAN KERR
    const rowanModel = buildArticulatedCharacter({
      name: 'ROWAN KERR',
      role: 'CHRONOS LAB ASSISTANT',
      skinColor: 0xeac4b0,
      blazerColor: 0x26544c,
      pantsColor: 0x1b2926,
      hairColor: 0x5c3a28,
      accentColor: 0x7bdff2,
      eyeColor: 0x7bf1a8,
      badgeHex: '#7bdff2',
      longHair: false
    });
    scene.add(rowanModel.root);

    npcs.rowan = {
      id: 'npc_rowan',
      name: 'Rowan Kerr',
      model: rowanModel,
      pos: new THREE.Vector3(2.2, 0, -6.5),
      rotY: -0.8,
      activity: 'Guarding the Science Lab Corridor',
      isWalking: false,
      animTime: 1.5,
      schedule: [
        { tStart: 0, tEnd: 45, x: 2.2, y: 0, z: -6.5, rotY: -0.8, activity: 'Pacing outside the Science Laboratory' },
        { tStart: 45, tEnd: 110, x: 8.8, y: 0, z: -9.5, rotY: 1.57, activity: 'Muttering safe code (0418) in the Science Lab' },
        { tStart: 110, tEnd: 155, x: -8.8, y: 0, z: -8.5, rotY: -1.57, activity: 'Checking Admin Terminal #04 in Computer Lab' },
        { tStart: 155, tEnd: 180, x: 1.5, y: 0, z: -21.5, rotY: 3.14, activity: 'Guarding the Basement Stairwell Door' }
      ],
      allySchedule: { x: 2.5, y: -5, z: -53.5, rotY: 3.14, activity: 'Monitoring Core Stability in Underground Lab' }
    };

    registerInteractableFn(rowanModel.root, {
      id: 'npc_rowan',
      type: 'npc',
      npcKey: 'rowan',
      title: 'Rowan Kerr (Lab Assistant)',
      subtitle: 'Press [E] to Speak with Rowan'
    });

    // ------------------------------------------------------------------------
    // 3 ROAMING MONSTERS / STALKERS
    // ------------------------------------------------------------------------
    const wardenModel = buildMonsterModel({
      monsterType: 'warden',
      name: 'THE CARETAKER',
      role: 'COURTYARD & HALL STALKER'
    });
    scene.add(wardenModel.root);
    monsters.warden = {
      id: 'monster_warden',
      name: 'The Caretaker (Neighbor)',
      model: wardenModel,
      pos: new THREE.Vector3(-12, 0, 52),
      rotY: 0,
      state: 'PATROL', // PATROL | INVESTIGATE | CHASE | STUNNED
      stunTimer: 0,
      wpIndex: 0,
      speed: 2.85,
      chaseSpeed: 4.35,
      waypoints: [
        { x: -12, y: 0, z: 52 },
        { x: 0, y: 0, z: 42 },
        { x: 12, y: 0, z: 52 },
        { x: 0, y: 0, z: 66 },
        { x: -12, y: 0, z: 62 }
      ]
    };

    const wraithAlphaModel = buildMonsterModel({
      monsterType: 'wraith',
      name: 'ABYSSAL WRAITH α',
      role: 'CORRIDOR VOID STALKER'
    });
    scene.add(wraithAlphaModel.root);
    monsters.wraithAlpha = {
      id: 'monster_wraith_alpha',
      name: 'Abyssal Chrono-Wraith Alpha',
      model: wraithAlphaModel,
      pos: new THREE.Vector3(10, 0, -11),
      rotY: 0,
      state: 'PATROL',
      stunTimer: 0,
      wpIndex: 0,
      speed: 2.5,
      chaseSpeed: 4.1,
      waypoints: [
        { x: 10, y: 0, z: -11 },
        { x: 10, y: 0, z: 5 },
        { x: 0, y: 0, z: -14 },
        { x: -10, y: 0, z: -6 }
      ]
    };

    const wraithOmegaModel = buildMonsterModel({
      monsterType: 'wraith',
      name: 'ABYSSAL WRAITH Ω',
      role: 'BASEMENT VOID GUARDIAN'
    });
    scene.add(wraithOmegaModel.root);
    monsters.wraithOmega = {
      id: 'monster_wraith_omega',
      name: 'Abyssal Chrono-Wraith Omega',
      model: wraithOmegaModel,
      pos: new THREE.Vector3(-6, -5, -44),
      rotY: 0,
      state: 'PATROL',
      stunTimer: 0,
      wpIndex: 0,
      speed: 2.4,
      chaseSpeed: 3.95,
      waypoints: [
        { x: -6, y: -5, z: -44 },
        { x: 6, y: -5, z: -44 },
        { x: 5, y: -5, z: -58 },
        { x: -5, y: -5, z: -58 }
      ]
    };
  }

  function triggerAcousticDecoy(pos) {
    decoyTarget = { x: pos.x, y: pos.y, z: pos.z, timer: 11.0 };
    Object.values(monsters).forEach((m) => {
      if (Math.abs(m.pos.y - pos.y) < 3.0 && m.state !== 'STUNNED') {
        m.state = 'INVESTIGATE';
      }
    });
  }

  function stunAllMonsters(duration = 12.0) {
    Object.values(monsters).forEach((m) => {
      m.state = 'STUNNED';
      m.stunTimer = duration;
    });
    tensionLevel = 0;
  }

  function update(dt, elapsedLoopTime, playerPos, memoryState, stealthInfo = {}) {
    // Update Maya & Rowan
    Object.keys(npcs).forEach((key) => {
      const npc = npcs[key];
      npc.animTime += dt;

      let target = npc.schedule[0];
      const isAlly =
        (key === 'maya' && memoryState.flags.mayaTrustsArin && memoryState.loopState.blastDoorOpen) ||
        (key === 'rowan' && memoryState.flags.rowanConfessed && memoryState.loopState.blastDoorOpen);

      if (isAlly) {
        target = npc.allySchedule;
      } else {
        for (const slot of npc.schedule) {
          if (elapsedLoopTime >= slot.tStart && elapsedLoopTime <= slot.tEnd) {
            target = slot;
            break;
          }
        }
      }

      npc.activity = target.activity;

      const dx = target.x - npc.pos.x;
      const dz = target.z - npc.pos.z;
      const dy = target.y - npc.pos.y;
      const distSq = dx * dx + dz * dz + dy * dy;

      if (distSq > 0.08) {
        npc.isWalking = true;
        const speed = 2.6;
        const step = Math.min(Math.sqrt(distSq), speed * dt);
        const angle = Math.atan2(dx, dz);
        npc.pos.x += (dx / Math.sqrt(distSq)) * step;
        npc.pos.z += (dz / Math.sqrt(distSq)) * step;
        npc.pos.y += (dy / Math.sqrt(distSq)) * step;
        npc.rotY = angle;
      } else {
        npc.isWalking = false;
        npc.pos.set(target.x, target.y, target.z);
        npc.rotY = target.rotY;
      }

      const m = npc.model;
      m.root.position.copy(npc.pos);

      const distToPlayer = npc.pos.distanceTo(playerPos);
      if (distToPlayer < 4.2 && Math.abs(npc.pos.y - (playerPos.y - 1.7)) < 2.0) {
        const lookAngle = Math.atan2(playerPos.x - npc.pos.x, playerPos.z - npc.pos.z);
        m.root.rotation.y = lookAngle;
        m.headPivot.rotation.y = Math.sin(npc.animTime * 1.5) * 0.08;
      } else {
        m.root.rotation.y = npc.rotY;
        m.headPivot.rotation.y = Math.sin(npc.animTime * 0.9) * 0.22;
      }

      if (npc.isWalking) {
        const swing = Math.sin(npc.animTime * 7.5) * 0.55;
        m.leftLegPivot.rotation.x = swing;
        m.rightLegPivot.rotation.x = -swing;
        m.leftArmPivot.rotation.x = -swing * 0.8;
        m.rightArmPivot.rotation.x = swing * 0.8;
        m.torso.position.y = 1.08 + Math.abs(Math.cos(npc.animTime * 7.5)) * 0.035;
      } else {
        const breath = Math.sin(npc.animTime * 2.2) * 0.015;
        m.torso.position.y = 1.08 + breath;
        m.leftLegPivot.rotation.x *= 0.85;
        m.rightLegPivot.rotation.x *= 0.85;
        m.leftArmPivot.rotation.x = Math.sin(npc.animTime * 1.5) * 0.08;
        m.rightArmPivot.rotation.x = -0.55 + Math.sin(npc.animTime * 3.1) * 0.12;
      }
    });

    // Update Decoy Timer
    if (decoyTarget) {
      decoyTarget.timer -= dt;
      if (decoyTarget.timer <= 0) decoyTarget = null;
    }

    // Update 3D Roaming Monsters & Calculate Tension
    const isCrouching = !!stealthInfo.isCrouching;
    const isHidden = !!stealthInfo.isHidden;
    const onCaught = stealthInfo.onCaught;

    let maxThreat = 0;

    Object.values(monsters).forEach((mon) => {
      if (mon.model.root.userData.halo) {
        mon.model.root.userData.halo.rotation.z += dt * 2.5;
        mon.model.root.userData.halo.rotation.x += dt * 1.4;
      }

      if (mon.state === 'STUNNED') {
        mon.stunTimer -= dt;
        mon.model.coneRing.material.color.setHex(0x4cc9f0);
        if (mon.stunTimer <= 0) mon.state = 'PATROL';
        return;
      }

      const sameFloor = Math.abs(mon.pos.y - (playerPos.y - (isCrouching ? 1.05 : 1.7))) < 2.2;
      const dxP = playerPos.x - mon.pos.x;
      const dzP = playerPos.z - mon.pos.z;
      const distToArin = Math.hypot(dxP, dzP);

      // Detection range reduced when Arin crouches; zero when hidden in Sanctuary Wardrobe or near Entrance safe zone (z: 25..33, x: -3..3)
      const inEntranceSafeZone = playerPos.z > 25 && playerPos.z < 33.5 && Math.abs(playerPos.x) < 3.5;
      const detectRadius = isCrouching ? 5.2 : 9.2;

      if (!isHidden && !inEntranceSafeZone && sameFloor && distToArin < detectRadius) {
        if (mon.state !== 'CHASE') {
          mon.state = 'CHASE';
          window.OMT_Audio.playMonsterGrowl(true);
        }
      } else if (decoyTarget && Math.abs(mon.pos.y - decoyTarget.y) < 2.5) {
        mon.state = 'INVESTIGATE';
      } else if (mon.state === 'CHASE' && (isHidden || inEntranceSafeZone || !sameFloor || distToArin > 13.5)) {
        mon.state = 'PATROL';
      }

      // Determine movement target
      let tx = mon.pos.x;
      let tz = mon.pos.z;
      let moveSpd = mon.speed;

      if (mon.state === 'CHASE') {
        tx = playerPos.x;
        tz = playerPos.z;
        moveSpd = mon.chaseSpeed;
        mon.model.coneRing.material.color.setHex(0xff0033);
      } else if (mon.state === 'INVESTIGATE' && decoyTarget) {
        tx = decoyTarget.x;
        tz = decoyTarget.z;
        moveSpd = mon.speed * 1.2;
        mon.model.coneRing.material.color.setHex(0xffd166);
      } else {
        const wp = mon.waypoints[mon.wpIndex % mon.waypoints.length];
        tx = wp.x;
        tz = wp.z;
        if (Math.hypot(tx - mon.pos.x, tz - mon.pos.z) < 0.6) {
          mon.wpIndex = (mon.wpIndex + 1) % mon.waypoints.length;
        }
        mon.model.coneRing.material.color.setHex(0xf72585);
      }

      const mdx = tx - mon.pos.x;
      const mdz = tz - mon.pos.z;
      const mdist = Math.hypot(mdx, mdz);
      if (mdist > 0.05) {
        const step = Math.min(mdist, moveSpd * dt);
        mon.pos.x += (mdx / mdist) * step;
        mon.pos.z += (mdz / mdist) * step;
        mon.rotY = Math.atan2(mdx, mdz);
      }

      mon.model.root.position.set(mon.pos.x, mon.pos.y + Math.sin(elapsedLoopTime * 4.0) * 0.08, mon.pos.z);
      mon.model.root.rotation.y = mon.rotY;

      // Threat / Tension contribution
      if (sameFloor && distToArin < 14.0 && !isHidden) {
        const threat = Math.max(0, Math.min(100, ((14.0 - distToArin) / 12.6) * 100));
        if (threat > maxThreat) maxThreat = threat;

        // Check capture!
        if (distToArin < 1.35 && !inEntranceSafeZone && onCaught) {
          onCaught(mon.name);
        }
      }
    });

    tensionLevel += (maxThreat - tensionLevel) * Math.min(1, dt * 5.0);

    // Play proximity heartbeat sound when tension is high
    letheartbeatCooldown -= dt;
    if (tensionLevel > 30 && letheartbeatCooldown <= 0) {
      window.OMT_Audio.playHeartbeatPulse(tensionLevel / 100);
      letheartbeatCooldown = Math.max(0.42, 1.15 - (tensionLevel / 100) * 0.65);
    }
  }

  function resetPositions() {
    if (npcs.maya) {
      npcs.maya.pos.set(-2.1, 0, 14.5);
      npcs.maya.isWalking = false;
    }
    if (npcs.rowan) {
      npcs.rowan.pos.set(2.2, 0, -6.5);
      npcs.rowan.isWalking = false;
    }
    if (monsters.warden) {
      monsters.warden.pos.set(-12, 0, 52);
      monsters.warden.state = 'PATROL';
      monsters.warden.wpIndex = 0;
    }
    if (monsters.wraithAlpha) {
      monsters.wraithAlpha.pos.set(10, 0, -11);
      monsters.wraithAlpha.state = 'PATROL';
      monsters.wraithAlpha.wpIndex = 0;
    }
    if (monsters.wraithOmega) {
      monsters.wraithOmega.pos.set(-6, -5, -44);
      monsters.wraithOmega.state = 'PATROL';
      monsters.wraithOmega.wpIndex = 0;
    }
    tensionLevel = 0;
    decoyTarget = null;
  }

  function getTensionLevel() {
    return Math.round(tensionLevel);
  }

  return {
    npcs,
    monsters,
    initCharacters,
    update,
    resetPositions,
    triggerAcousticDecoy,
    stunAllMonsters,
    getTensionLevel
  };
})();
