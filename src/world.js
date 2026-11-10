// ============================================================================
// ONE MORE TURN — Expanded 15-Area Genshin Cel-Shaded School & Open-World Campus (world.js)
// Builds the 12 interior school areas PLUS 3 expansive Open-World & Hello Neighbor
// exterior areas (13. Starlight Courtyard & Sakura Gardens, 14. The Caretaker's
// Victorian House, 15. Windmill Generator & Observatory), floating Ley-Line
// particles, Eclipse Moon skybox, hiding wardrobes, and animated windmill blades.
// ============================================================================

window.OMT_World = (function () {
  const wallColliders = [];
  const doors = {};
  const interactables = [];
  const emergencyLights = [];
  const ceilingLights = [];
  let coreRings = [];
  let coreCrystal = null;
  let pylonMeshes = {};
  let particleSystem = null;
  let windmillBlades = null;
  let fountainRings = [];

  // 15 Interconnected Areas (12 Interior School Areas + 3 Open-World Exterior / Neighbor Areas)
  const ROOMS = [
    { id: 'entrance', name: '1. School Entrance', minX: -4, maxX: 4, minZ: 24, maxZ: 34, floorY: 0, surface: 'tile' },
    { id: 'hallway', name: '3. Main Hallway', minX: -4, maxX: 4, minZ: -24, maxZ: 24, floorY: 0, surface: 'tile' },
    { id: 'reception', name: '2. Reception Office', minX: -16, maxX: -4, minZ: 14, maxZ: 24, floorY: 0, surface: 'tile' },
    { id: 'library', name: '5. School Library', minX: -16, maxX: -4, minZ: 0, maxZ: 13, floorY: 0, surface: 'wood' },
    { id: 'complab', name: '7. Computer Laboratory', minX: -16, maxX: -4, minZ: -13, maxZ: -1, floorY: 0, surface: 'tile' },
    { id: 'staff', name: '8. Faculty Staff Room', minX: -16, maxX: -4, minZ: -24, maxZ: -14, floorY: 0, surface: 'wood' },
    { id: 'class101', name: '4A. Classroom 101 (Physics)', minX: 4, maxX: 16, minZ: 12, maxZ: 24, floorY: 0, surface: 'wood' },
    { id: 'class102', name: '4B. Classroom 102 (History)', minX: 4, maxX: 16, minZ: -1, maxZ: 11, floorY: 0, surface: 'wood' },
    { id: 'scilab', name: '6. Science Laboratory', minX: 4, maxX: 16, minZ: -14, maxZ: -2, floorY: 0, surface: 'tile' },
    { id: 'storage', name: '9. Utility Storage Room', minX: 4, maxX: 16, minZ: -24, maxZ: -15, floorY: 0, surface: 'concrete' },
    { id: 'staircase', name: '10. Basement Staircase', minX: -4, maxX: 4, minZ: -36, maxZ: -24, floorY: -2.5, surface: 'concrete' },
    { id: 'basement', name: '11. Restricted Basement', minX: -10, maxX: 10, minZ: -48, maxZ: -36, floorY: -5, surface: 'concrete' },
    { id: 'underlab', name: '12. Secret Underground Research Lab', minX: -14, maxX: 14, minZ: -68, maxZ: -48, floorY: -5, surface: 'metal' },
    { id: 'neighbor', name: '14. Caretaker\'s Victorian House', minX: -34, maxX: -16, minZ: 44, maxZ: 68, floorY: 0, surface: 'wood' },
    { id: 'windmill', name: '15. Astral Windmill & Bell Tower', minX: 16, maxX: 34, minZ: 44, maxZ: 68, floorY: 0, surface: 'concrete' },
    { id: 'courtyard', name: '13. Open-World Starlight Courtyard', minX: -38, maxX: 38, minZ: 34, maxZ: 78, floorY: 0, surface: 'grass' }
  ];

  function addCollider(minX, maxX, minZ, maxZ, minY = -10, maxY = 10, id = null) {
    const col = { minX, maxX, minZ, maxZ, minY, maxY, id, disabled: false };
    wallColliders.push(col);
    return col;
  }

  function registerInteractable(mesh, info) {
    mesh.userData.interactable = info;
    interactables.push({ mesh, ...info });
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.userData.interactable = info;
      }
    });
  }

  // Helper to add crisp Genshin-style dark cel-outline around key 3D meshes
  function addCelOutline(mesh, scale = 1.04, color = 0x0b0f19) {
    if (!mesh.geometry) return;
    const outMat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    const outMesh = new THREE.Mesh(mesh.geometry, outMat);
    outMesh.scale.set(scale, scale, scale);
    mesh.add(outMesh);
  }

  function buildWallSegment(scene, x1, z1, x2, z2, yBottom, height, thickness, mat, addCol = true) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;
    const geo = new THREE.BoxGeometry(Math.abs(dx) > Math.abs(dz) ? len : thickness, height, Math.abs(dz) >= Math.abs(dx) ? len : thickness);
    const mesh = new THREE.Mesh(geo, mat);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    mesh.position.set(cx, yBottom + height / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (addCol) {
      const hx = (Math.abs(dx) > Math.abs(dz) ? len : thickness) / 2;
      const hz = (Math.abs(dz) >= Math.abs(dx) ? len : thickness) / 2;
      addCollider(cx - hx, cx + hx, cz - hz, cz + hz, yBottom, yBottom + height);
    }
    return mesh;
  }

  function buildWallWithDoor(scene, axis, fixedCoord, startCoord, endCoord, doorCenter, doorWidth, yBottom, height, mat, doorConfig) {
    const halfD = doorWidth / 2;
    const seg1End = doorCenter - halfD;
    const seg2Start = doorCenter + halfD;
    const doorHeight = 2.55;

    if (axis === 'z') {
      if (seg1End > startCoord) {
        buildWallSegment(scene, fixedCoord, startCoord, fixedCoord, seg1End, yBottom, height, 0.28, mat, true);
      }
      if (endCoord > seg2Start) {
        buildWallSegment(scene, fixedCoord, seg2Start, fixedCoord, endCoord, yBottom, height, 0.28, mat, true);
      }
      if (height > doorHeight) {
        buildWallSegment(scene, fixedCoord, seg1End, fixedCoord, seg2Start, yBottom + doorHeight, height - doorHeight, 0.28, mat, false);
      }
      if (doorConfig) {
        createDoor(scene, 'z', fixedCoord, doorCenter, yBottom, doorWidth, doorHeight, doorConfig);
      }
    } else {
      if (seg1End > startCoord) {
        buildWallSegment(scene, startCoord, fixedCoord, seg1End, fixedCoord, yBottom, height, 0.28, mat, true);
      }
      if (endCoord > seg2Start) {
        buildWallSegment(scene, seg2Start, fixedCoord, endCoord, fixedCoord, yBottom, height, 0.28, mat, true);
      }
      if (height > doorHeight) {
        buildWallSegment(scene, seg1End, fixedCoord, seg2Start, fixedCoord, yBottom + doorHeight, height - doorHeight, 0.28, mat, false);
      }
      if (doorConfig) {
        createDoor(scene, 'x', doorCenter, fixedCoord, yBottom, doorWidth, doorHeight, doorConfig);
      }
    }
  }

  function createDoor(scene, axis, x, z, yBottom, width, height, cfg) {
    const pivot = new THREE.Group();
    const panelW = width - 0.12;
    const panelH = height - 0.08;
    const isMetal = cfg.metal || false;
    const toonGrad = window.OMT_Textures.getToonGradientTexture();
    const doorMat = new THREE.MeshToonMaterial({
      color: isMetal ? 0x455a64 : 0x6d4c3d,
      gradientMap: toonGrad
    });

    let col;
    let doorMesh;
    if (axis === 'z') {
      pivot.position.set(x, yBottom, z - panelW / 2);
      const geo = new THREE.BoxGeometry(0.12, panelH, panelW);
      doorMesh = new THREE.Mesh(geo, doorMat);
      doorMesh.position.set(0, panelH / 2, panelW / 2);
      col = addCollider(x - 0.22, x + 0.22, z - width / 2, z + width / 2, yBottom, yBottom + height, cfg.id);
    } else {
      pivot.position.set(x - panelW / 2, yBottom, z);
      const geo = new THREE.BoxGeometry(panelW, panelH, 0.12);
      doorMesh = new THREE.Mesh(geo, doorMat);
      doorMesh.position.set(panelW / 2, panelH / 2, 0);
      col = addCollider(x - width / 2, x + width / 2, z - 0.22, z + 0.22, yBottom, yBottom + height, cfg.id);
    }
    addCelOutline(doorMesh, 1.03);

    const glassMat = new THREE.MeshBasicMaterial({
      color: isMetal ? 0x7bdff2 : 0xffe599,
      transparent: true,
      opacity: 0.45
    });
    const glassGeo = axis === 'z'
      ? new THREE.BoxGeometry(0.14, 0.65, panelW * 0.45)
      : new THREE.BoxGeometry(panelW * 0.45, 0.65, 0.14);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.y = 0.35;
    doorMesh.add(glassMesh);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.85, roughness: 0.2 });
    const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.26), handleMat);
    if (axis === 'z') {
      handleMesh.position.set(0, -0.05, panelW * 0.36);
    } else {
      handleMesh.position.set(panelW * 0.36, -0.05, 0);
    }
    doorMesh.add(handleMesh);

    const ledMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 10),
      new THREE.MeshBasicMaterial({ color: cfg.locked ? 0xff3b30 : 0x34c759 })
    );
    ledMesh.position.set(
      axis === 'z' ? (x > 0 ? -0.18 : 0.18) : (x + width / 2 + 0.22),
      yBottom + 1.45,
      axis === 'z' ? (z + width / 2 + 0.22) : (z > -30 ? 0.18 : -0.18)
    );
    scene.add(ledMesh);

    if (cfg.signTitle) {
      const signTex = window.OMT_Textures.getSignTexture(cfg.signTitle, cfg.signSub || '');
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signGeo = axis === 'z' ? new THREE.BoxGeometry(0.06, 0.42, 1.2) : new THREE.BoxGeometry(1.2, 0.42, 0.06);
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(
        axis === 'z' ? (x > 0 ? x - 0.16 : x + 0.16) : x,
        yBottom + 2.75,
        axis === 'z' ? z : z + 0.16
      );
      scene.add(signMesh);
    }

    pivot.add(doorMesh);
    scene.add(pivot);

    const doorObj = {
      id: cfg.id,
      name: cfg.name,
      pivot,
      doorMesh,
      ledMat: ledMesh.material,
      collider: col,
      isOpen: false,
      locked: !!cfg.locked,
      initialLocked: !!cfg.locked,
      keyRequired: cfg.keyRequired || null,
      codeRequired: cfg.codeRequired || null,
      lockReason: cfg.lockReason || 'Locked.',
      targetAngle: 0,
      currentAngle: 0,
      openAngle: cfg.openDir === -1 ? -Math.PI * 0.48 : Math.PI * 0.48
    };

    doors[cfg.id] = doorObj;

    registerInteractable(doorMesh, {
      id: cfg.id,
      type: 'door',
      title: cfg.name,
      subtitle: cfg.locked ? 'Locked — Press [E] to Inspect / Unlock' : 'Press [E] to Open / Close',
      doorId: cfg.id
    });
  }

  function addCeilingLight(scene, x, y, z, color = 0xfff3dc, intensity = 1.05, distance = 16, hasVolumetric = true) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.36),
      new THREE.MeshBasicMaterial({ color })
    );
    group.add(fixture);

    const light = new THREE.PointLight(color, intensity, distance, 1.5);
    light.position.set(0, -0.25, 0);
    group.add(light);

    if (hasVolumetric) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 3.2, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      cone.position.set(0, -1.65, 0);
      group.add(cone);
    }

    scene.add(group);
    ceilingLights.push({ light, fixtureMat: fixture.material, baseIntensity: intensity, baseColor: new THREE.Color(color) });
    return light;
  }

  function addEmergencyLight(scene, x, y, z) {
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff2a1f });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.14), bulbMat);
    bulb.position.set(x, y, z);
    scene.add(bulb);

    const pt = new THREE.PointLight(0xff2a1f, 0.85, 12, 1.7);
    pt.position.set(x, y - 0.15, z);
    scene.add(pt);
    emergencyLights.push({ pt, bulbMat, phase: (x + z) * 0.5 });
  }

  function buildStudentDesk(scene, x, y, z, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const toonGrad = window.OMT_Textures.getToonGradientTexture();
    const woodMat = new THREE.MeshToonMaterial({ color: 0x7f5539, gradientMap: toonGrad });
    const metalMat = new THREE.MeshToonMaterial({ color: 0x3a4750, gradientMap: toonGrad });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.65), woodMat);
    top.position.set(0, 0.75, 0);
    addCelOutline(top, 1.04);
    g.add(top);

    [[-0.48, -0.26], [0.48, -0.26], [-0.48, 0.26], [0.48, 0.26]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), metalMat);
      leg.position.set(lx, 0.375, lz);
      g.add(leg);
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.44), woodMat);
    seat.position.set(0, 0.44, 0.55);
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.05), woodMat);
    back.position.set(0, 0.67, 0.75);
    g.add(back);

    scene.add(g);
    addCollider(x - 0.55, x + 0.55, z - 0.35, z + 0.75, y, y + 0.9);
    return g;
  }

  function buildLockerBank(scene, x, y, z, rotY, count = 4, specialLocker = null) {
    const toonGrad = window.OMT_Textures.getToonGradientTexture();
    const lockerMat = new THREE.MeshToonMaterial({ color: 0x3d5a80, gradientMap: toonGrad });
    const specialMat = new THREE.MeshToonMaterial({ color: 0x5c80bc, gradientMap: toonGrad });

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 0.68;
      const lx = x + (Math.abs(Math.sin(rotY)) < 0.5 ? offset : 0);
      const lz = z + (Math.abs(Math.sin(rotY)) >= 0.5 ? offset : 0);

      const isSpecial = specialLocker && specialLocker.index === i;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.64, 1.95, 0.52), isSpecial ? specialMat : lockerMat);
      mesh.position.set(lx, y + 0.975, lz);
      mesh.rotation.y = rotY;
      addCelOutline(mesh, 1.03);
      scene.add(mesh);

      if (isSpecial) {
        const badge = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.14, 0.04),
          new THREE.MeshBasicMaterial({ color: specialLocker.color || 0xffd166 })
        );
        badge.position.set(0, 0.45, 0.27);
        mesh.add(badge);
        registerInteractable(mesh, specialLocker.info);
      }
    }
    const span = count * 0.35;
    if (Math.abs(Math.sin(rotY)) < 0.5) {
      addCollider(x - span, x + span, z - 0.3, z + 0.3, y, y + 2.0);
    } else {
      addCollider(x - 0.3, x + 0.3, z - span, z + span, y, y + 2.0);
    }
  }

  // Stylized Genshin Sakura / Golden Ginkgo Tree for Open-World Courtyard
  function buildStylizedTree(scene, x, z, foliageColor = 0xff9ebb, trunkColor = 0x4a3228) {
    const toonGrad = window.OMT_Textures.getToonGradientTexture();
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.42, 3.2, 8),
      new THREE.MeshToonMaterial({ color: trunkColor, gradientMap: toonGrad })
    );
    trunk.position.y = 1.6;
    addCelOutline(trunk, 1.05);
    group.add(trunk);

    const canopyMat = new THREE.MeshToonMaterial({ color: foliageColor, gradientMap: toonGrad });
    [
      [0, 3.8, 0, 1.85],
      [-0.95, 3.3, 0.6, 1.35],
      [0.95, 3.4, -0.5, 1.4],
      [0, 4.6, 0.3, 1.25]
    ].forEach(([cx, cy, cz, r]) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), canopyMat);
      puff.position.set(cx, cy, cz);
      addCelOutline(puff, 1.04, 0x1b1026);
      group.add(puff);
    });

    // Subtle lantern hanging from branch
    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.36, 0.24),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    lantern.position.set(0.85, 2.5, 0);
    group.add(lantern);

    scene.add(group);
    addCollider(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 0, 3.5);
  }

  // Stealth Hiding Wardrobe / Sanctuary Booth (Hello Neighbor style hiding spot)
  function buildHidingWardrobe(scene, x, y, z, rotY, id, title) {
    const toonGrad = window.OMT_Textures.getToonGradientTexture();
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 2.25, 0.85),
      new THREE.MeshToonMaterial({ color: 0x3c2f5c, gradientMap: toonGrad })
    );
    cabinet.position.y = 1.125;
    addCelOutline(cabinet, 1.04);
    group.add(cabinet);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.85, 0.88),
      new THREE.MeshBasicMaterial({ color: 0x7bf1a8, wireframe: true })
    );
    trim.position.y = 1.125;
    group.add(trim);

    scene.add(group);
    registerInteractable(group, {
      id,
      type: 'hiding_spot',
      hidePos: { x, y: y + 1.5, z },
      title,
      subtitle: 'Press [E] to Hide / Exit Sanctuary Wardrobe (Invisible to Monsters)'
    });
  }

  function buildWorld(scene) {
    wallColliders.length = 0;
    interactables.length = 0;
    emergencyLights.length = 0;
    ceilingLights.length = 0;
    coreRings = [];
    fountainRings = [];
    pylonMeshes = {};

    const T = window.OMT_Textures;
    const toonGrad = T.getToonGradientTexture();
    const wallMat = new THREE.MeshToonMaterial({ map: T.getSchoolWallTexture(4, 1), gradientMap: toonGrad });
    const concreteMat = new THREE.MeshToonMaterial({ map: T.getConcreteTexture(4, 2), gradientMap: toonGrad });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1b2436, roughness: 0.85 });

    // ========================================================================
    // GENSHIN IMPACT CEL-SHADED SKYBOX, SHATTERED ECLIPSE MOON & LEY-LINE PARTICLES
    // ========================================================================
    const moonGroup = new THREE.Group();
    moonGroup.position.set(-18, 44, 98);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9.5, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfff1c1 })
    );
    const moonHalo = new THREE.Mesh(
      new THREE.RingGeometry(11.2, 13.5, 36),
      new THREE.MeshBasicMaterial({ color: 0x7bdff2, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    moonGroup.add(moonMesh);
    moonGroup.add(moonHalo);
    scene.add(moonGroup);

    // Directional Cel-Moonlight for crisp Genshin-style shadows
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 0.85);
    dirLight.position.set(-15, 38, 65);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Floating Ley-Line Stardust Particles across School & Open-World Courtyard
    const partGeo = new THREE.BufferGeometry();
    const partCount = 420;
    const posArr = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      posArr[i * 3] = (Math.random() - 0.5) * 72;
      posArr[i * 3 + 1] = Math.random() * 8.5 - 1.0;
      posArr[i * 3 + 2] = Math.random() * 135 - 62;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xffd166,
      size: 0.22,
      transparent: true,
      opacity: 0.8
    });
    particleSystem = new THREE.Points(partGeo, partMat);
    scene.add(particleSystem);

    // ========================================================================
    // FLOORS & CEILINGS (Main Level y = 0, Basement y = -5, Open-World Courtyard)
    // ========================================================================
    const hallFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 58),
      new THREE.MeshStandardMaterial({ map: T.getHallwayTileTexture(4, 28), roughness: 0.45 })
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(0, 0, 5);
    hallFloor.receiveShadow = true;
    scene.add(hallFloor);

    const westWoodFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 48),
      new THREE.MeshStandardMaterial({ map: T.getWoodFloorTexture(6, 20), roughness: 0.55 })
    );
    westWoodFloor.rotation.x = -Math.PI / 2;
    westWoodFloor.position.set(-10, 0, 0);
    westWoodFloor.receiveShadow = true;
    scene.add(westWoodFloor);

    const eastFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 48),
      new THREE.MeshStandardMaterial({ map: T.getWoodFloorTexture(6, 20), roughness: 0.55 })
    );
    eastFloor.rotation.x = -Math.PI / 2;
    eastFloor.position.set(10, 0, 0);
    eastFloor.receiveShadow = true;
    scene.add(eastFloor);

    const mainCeiling = new THREE.Mesh(new THREE.PlaneGeometry(34, 60), ceilingMat);
    mainCeiling.rotation.x = Math.PI / 2;
    mainCeiling.position.set(0, 3.6, 4);
    scene.add(mainCeiling);

    // Decorative Akademiya Golden-Fluted Columns along Main Hallway
    const pillarMat = new THREE.MeshToonMaterial({ color: 0xe5b968, gradientMap: toonGrad });
    [-18, -6, 6, 18, 28].forEach((pz) => {
      [-3.75, 3.75].forEach((px) => {
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.6, 12), pillarMat);
        pil.position.set(px, 1.8, pz);
        addCelOutline(pil, 1.05);
        scene.add(pil);
      });
    });

    // ========================================================================
    // SCHOOL PERIMETER & PARTITION WALLS
    // ========================================================================
    // South Entrance Wall (z = 34) — Now features the Open-World Courtyard Gate Door!
    buildWallWithDoor(scene, 'x', 34, -4, 4, 0, 2.5, 0, 3.6, wallMat, {
      id: 'door_courtyard',
      name: 'Open-World Starlight Courtyard Gate',
      signTitle: 'CAMPUS COURTYARD',
      signSub: 'NEIGHBOR GROUNDS',
      locked: false
    });
    buildWallSegment(scene, -4, 24, -4, 34, 0, 3.6, 0.3, wallMat, true);
    buildWallSegment(scene, 4, 24, 4, 34, 0, 3.6, 0.3, wallMat, true);

    buildWallSegment(scene, -16, -24, -16, 24, 0, 3.6, 0.3, wallMat, true);
    buildWallSegment(scene, 16, -24, 16, 24, 0, 3.6, 0.3, wallMat, true);
    buildWallSegment(scene, -16, 24, -4, 24, 0, 3.6, 0.3, wallMat, true);
    buildWallSegment(scene, 4, 24, 16, 24, 0, 3.6, 0.3, wallMat, true);
    buildWallSegment(scene, -16, -24, -4, -24, 0, 3.6, 0.3, wallMat, true);
    buildWallSegment(scene, 4, -24, 16, -24, 0, 3.6, 0.3, wallMat, true);

    buildWallSegment(scene, -16, 13.5, -4, 13.5, 0, 3.6, 0.28, wallMat, true);
    buildWallSegment(scene, -16, -0.5, -4, -0.5, 0, 3.6, 0.28, wallMat, true);
    buildWallSegment(scene, -16, -13.5, -4, -13.5, 0, 3.6, 0.28, wallMat, true);

    buildWallSegment(scene, 4, 11.5, 16, 11.5, 0, 3.6, 0.28, wallMat, true);
    buildWallSegment(scene, 4, -1.5, 16, -1.5, 0, 3.6, 0.28, wallMat, true);
    buildWallSegment(scene, 4, -14.5, 16, -14.5, 0, 3.6, 0.28, wallMat, true);

    buildWallWithDoor(scene, 'z', -4, 13.5, 24, 19, 2.3, 0, 3.6, wallMat, {
      id: 'door_reception', name: 'Reception Office Door', signTitle: 'RECEPTION', signSub: 'ADMINISTRATION', locked: false
    });
    buildWallWithDoor(scene, 'z', -4, -0.5, 13.5, 6.5, 2.3, 0, 3.6, wallMat, {
      id: 'door_library', name: 'Library Door', signTitle: 'LIBRARY', signSub: 'ARCHIVES & STUDY', locked: false
    });
    buildWallWithDoor(scene, 'z', -4, -13.5, -0.5, -7, 2.3, 0, 3.6, wallMat, {
      id: 'door_complab', name: 'Computer Lab Door', signTitle: 'COMPUTER LAB', signSub: 'NETWORK ROOM', locked: false
    });
    buildWallWithDoor(scene, 'z', -4, -24, -13.5, -19, 2.3, 0, 3.6, wallMat, {
      id: 'door_staff', name: 'Faculty Staff Room Door', signTitle: 'STAFF ROOM', signSub: 'PIN OR KEY REQUIRED',
      locked: true, keyRequired: 'staff_key', codeRequired: '7392',
      lockReason: 'Locked by Faculty Keypad (4-digit PIN) or Staff Room Key from Reception Safe.'
    });

    buildWallWithDoor(scene, 'z', 4, 11.5, 24, 18, 2.3, 0, 3.6, wallMat, {
      id: 'door_class101', name: 'Classroom 101 (Physics) Door', signTitle: 'CLASSROOM 101', signSub: 'PHYSICS & OPTICS', locked: false, openDir: -1
    });
    buildWallWithDoor(scene, 'z', 4, -1.5, 11.5, 5, 2.3, 0, 3.6, wallMat, {
      id: 'door_class102', name: 'Classroom 102 (History) Door', signTitle: 'CLASSROOM 102', signSub: 'ACADEMY HISTORY', locked: false, openDir: -1
    });
    buildWallWithDoor(scene, 'z', 4, -14.5, -1.5, -8, 2.3, 0, 3.6, wallMat, {
      id: 'door_scilab', name: 'Science Laboratory Door', signTitle: 'SCIENCE LAB', signSub: 'SPECTROMETRY', locked: false, openDir: -1
    });
    buildWallWithDoor(scene, 'z', 4, -24, -14.5, -19.5, 2.3, 0, 3.6, wallMat, {
      id: 'door_storage', name: 'Utility Storage Room Door', signTitle: 'STORAGE & POWER', signSub: 'UTILITY KEY REQUIRED',
      locked: true, keyRequired: 'storage_key', openDir: -1,
      lockReason: 'Locked. Requires the Storage Room Utility Key from the Faculty Staff Room.'
    });

    buildWallWithDoor(scene, 'x', -24, -4, 4, 0, 2.5, 0, 3.6, concreteMat, {
      id: 'door_staircase', name: 'Restricted Stairwell Security Door', signTitle: 'BASEMENT STAIRS', signSub: 'MAGNETIC SEAL',
      locked: true, metal: true, keyRequired: 'basement_unlocked',
      lockReason: 'Sealed by Electronic Magnetic Lock. Unlock via Admin Terminal #04 in the Computer Lab.'
    });

    // ========================================================================
    // AREAS 13, 14, 15: OPEN-WORLD STARLIGHT COURTYARD & HELLO NEIGHBOR GROUNDS
    // ========================================================================
    const courtFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(76, 46),
      new THREE.MeshStandardMaterial({ map: T.getCourtyardGrassTexture(18, 12), roughness: 0.75 })
    );
    courtFloor.rotation.x = -Math.PI / 2;
    courtFloor.position.set(0, -0.02, 56);
    courtFloor.receiveShadow = true;
    scene.add(courtFloor);

    // Stone Pathway from School Entrance Gate (z=34) to Central Ley-Line Fountain (z=52) & Neighbor House
    const pathMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 38),
      new THREE.MeshStandardMaterial({ map: T.getHallwayTileTexture(3, 14), roughness: 0.6 })
    );
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(0, 0.01, 53);
    scene.add(pathMesh);

    // Outer Courtyard Wrought-Iron & Stone Boundary Fence
    const fenceMat = new THREE.MeshToonMaterial({ color: 0x28364a, gradientMap: toonGrad });
    buildWallSegment(scene, -38, 34, -4, 34, 0, 2.8, 0.35, fenceMat, true);
    buildWallSegment(scene, 4, 34, 38, 34, 0, 2.8, 0.35, fenceMat, true);
    buildWallSegment(scene, -38, 34, -38, 78, 0, 2.8, 0.35, fenceMat, true);
    buildWallSegment(scene, 38, 34, 38, 78, 0, 2.8, 0.35, fenceMat, true);
    buildWallSegment(scene, -38, 78, 38, 78, 0, 2.8, 0.35, fenceMat, true);

    // Stylized Genshin Sakura & Golden Ginkgo Trees in Courtyard
    buildStylizedTree(scene, -10, 40, 0xff9ebb);
    buildStylizedTree(scene, 10, 40, 0xffd166);
    buildStylizedTree(scene, -11, 66, 0xffd166);
    buildStylizedTree(scene, 11, 66, 0xff9ebb);
    buildStylizedTree(scene, -6, 72, 0x7bf1a8);
    buildStylizedTree(scene, 6, 72, 0xff9ebb);

    // Central Astral Ley-Line Fountain at (0, 0, 54)
    const fountGroup = new THREE.Group();
    fountGroup.position.set(0, 0, 54);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.8, 0.75, 24),
      new THREE.MeshToonMaterial({ color: 0x455a75, gradientMap: toonGrad })
    );
    basin.position.y = 0.375;
    addCelOutline(basin, 1.03);
    fountGroup.add(basin);

    const waterPool = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.1, 0.65, 24),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.75 })
    );
    waterPool.position.y = 0.42;
    fountGroup.add(waterPool);

    const fountSpire = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      new THREE.MeshBasicMaterial({ color: 0x80ffdb })
    );
    fountSpire.position.y = 2.4;
    fountGroup.add(fountSpire);
    fountainRings.push(fountSpire);

    const fountLight = new THREE.PointLight(0x4cc9f0, 1.5, 24, 1.4);
    fountLight.position.set(0, 2.8, 0);
    fountGroup.add(fountLight);
    scene.add(fountGroup);
    addCollider(-3.5, 3.5, 50.5, 57.5, 0, 2.5);

    registerInteractable(fountGroup, {
      id: 'courtyard_fountain',
      type: 'document',
      title: 'Celestial Ley-Line Courtyard Fountain',
      subtitle: 'Press [E] to Inspect Ley-Line Inscription',
      description: 'INSCRIPTION ON THE ASTRAL FOUNTAIN:\n\n"Beneath the Shattered Moon of 11:57 PM, the Caretaker stalks the courtyard and the Abyssal Wraiths prowl the halls. Press [C] to Crouch silently, press [G] to toss an Acoustic Decoy chime, or duck inside a Sanctuary Wardrobe if pursued. Enter the Caretaker\'s Victorian House to the West (PIN: 1157) to claim the Golden Celestial Skeleton Key!"',
      clueId: 'clue_courtyard_fountain'
    });

    // --- AREA 14: THE CARETAKER'S VICTORIAN HOUSE ("HELLO NEIGHBOR" STYLE at x: -34..-16, z: 44..68) ---
    const neighborWallMat = new THREE.MeshToonMaterial({ map: T.getNeighborHouseWallTexture(3, 2), gradientMap: toonGrad });
    const neighborFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 24),
      new THREE.MeshStandardMaterial({ map: T.getWoodFloorTexture(6, 8), roughness: 0.6 })
    );
    neighborFloor.rotation.x = -Math.PI / 2;
    neighborFloor.position.set(-25, 0.02, 56);
    scene.add(neighborFloor);

    // Steep quirky Victorian pitched roof
    const roofMesh = new THREE.Mesh(
      new THREE.ConeGeometry(15.5, 5.5, 4),
      new THREE.MeshToonMaterial({ color: 0x6b2d5c, gradientMap: toonGrad })
    );
    roofMesh.position.set(-25, 6.8, 56);
    roofMesh.rotation.y = Math.PI / 4;
    addCelOutline(roofMesh, 1.03);
    scene.add(roofMesh);

    buildWallSegment(scene, -34, 44, -16, 44, 0, 4.2, 0.3, neighborWallMat, true);
    buildWallSegment(scene, -34, 68, -16, 68, 0, 4.2, 0.3, neighborWallMat, true);
    buildWallSegment(scene, -34, 44, -34, 68, 0, 4.2, 0.3, neighborWallMat, true);
    buildWallWithDoor(scene, 'z', -16, 44, 68, 56, 2.4, 0, 4.2, neighborWallMat, {
      id: 'door_neighbor_house',
      name: 'Caretaker\'s Victorian House Front Door',
      signTitle: 'CARETAKER HOUSE',
      signSub: 'KEEP OUT [PIN 1157]',
      locked: true,
      codeRequired: '1157',
      lockReason: 'Locked by the Caretaker\'s Padlock. Code is the frozen loop time: [ 1 1 5 7 ].'
    });

    addCeilingLight(scene, -25, 3.8, 56, 0xff9b85, 1.15, 18, true);

    // Caretaker's Surveillance Desk & Golden Celestial Skeleton Key inside Neighbor House
    const neighborDesk = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.9, 1.4),
      new THREE.MeshToonMaterial({ color: 0x4a2c2a, gradientMap: toonGrad })
    );
    neighborDesk.position.set(-28, 0.45, 52);
    addCelOutline(neighborDesk, 1.04);
    scene.add(neighborDesk);
    addCollider(-29.7, -26.3, 51.2, 52.8, 0, 1.0);

    const skeletonKeyMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38, 1),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    skeletonKeyMesh.position.set(-28, 1.25, 52);
    scene.add(skeletonKeyMesh);
    registerInteractable(skeletonKeyMesh, {
      id: 'item_skeleton_key',
      type: 'pickup',
      itemKey: 'skeleton_key',
      title: 'Golden Celestial Skeleton Key (Caretaker\'s Trophy)',
      subtitle: 'Press [E] to Claim Golden Master Key',
      description: 'You recovered the Caretaker\'s GOLDEN CELESTIAL SKELETON KEY! This master artifact automatically unlocks ANY locked door in Blackwood Academy (Staff Room, Storage Room, Stairwell, and Basement Blast Door) without needing individual keys or codes!',
      clueId: 'clue_skeleton_key'
    });

    const neighborTape = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.22, 0.38),
      new THREE.MeshToonMaterial({ color: 0xe63946, gradientMap: toonGrad })
    );
    neighborTape.position.set(-28, 1.05, 58);
    scene.add(neighborTape);
    registerInteractable(neighborTape, {
      id: 'doc_neighbor_tape',
      type: 'document',
      title: 'The Caretaker\'s Secret Surveillance Log',
      subtitle: 'Press [E] to Inspect Security Monitors',
      description: 'CARETAKER\'S SURVEILLANCE TAPE (11:57 PM):\n\n"Dr. Kaelen ordered me to board up my house and patrol the courtyard whenever the Chrono-Core resets. The tachyon leak has manifested two Abyssal Chrono-Wraiths inside the school corridors. If Arin gets caught by me or the Wraiths, his loop resets immediately—unless he uses the Decoy Bell [G] or hides inside the Sanctuary Wardrobes!"',
      clueId: 'clue_neighbor_tape'
    });

    // Courtyard Decoy Alarm Bell outside Neighbor House (Hello Neighbor distraction!)
    const bellPost = new THREE.Group();
    bellPost.position.set(-13.5, 0, 48.5);
    const postMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 2.4, 10),
      new THREE.MeshToonMaterial({ color: 0x2b2d42, gradientMap: toonGrad })
    );
    postMesh.position.y = 1.2;
    const bellDome = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.45, 14),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    bellDome.position.set(0, 2.35, 0);
    bellPost.add(postMesh);
    bellPost.add(bellDome);
    scene.add(bellPost);
    registerInteractable(bellPost, {
      id: 'interact_courtyard_bell',
      type: 'decoy_bell',
      bellPos: { x: -13.5, y: 0, z: 48.5 },
      title: 'Neighbor\'s Courtyard Alarm Bell (Distraction)',
      subtitle: 'Press [E] to Ring Decoy Bell (Lures All Stalkers Here!)'
    });

    // --- AREA 15: ASTRAL WINDMILL GENERATOR & OBSERVATORY (x: 16..34, z: 44..68) ---
    const windmillTower = new THREE.Group();
    windmillTower.position.set(25, 0, 56);
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.8, 9.5, 12),
      new THREE.MeshToonMaterial({ color: 0x3d5a80, gradientMap: toonGrad })
    );
    towerBase.position.y = 4.75;
    addCelOutline(towerBase, 1.03);
    windmillTower.add(towerBase);

    const towerRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.2, 3.0, 12),
      new THREE.MeshToonMaterial({ color: 0xe5b968, gradientMap: toonGrad })
    );
    towerRoof.position.y = 11.0;
    windmillTower.add(towerRoof);

    // Spinning Windmill Blades
    windmillBlades = new THREE.Group();
    windmillBlades.position.set(0, 7.8, -2.8);
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0xfff1c1, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 5.2, 0.08), bladeMat);
      b.rotation.z = (i * Math.PI) / 2;
      windmillBlades.add(b);
    }
    windmillTower.add(windmillBlades);
    scene.add(windmillTower);
    addCollider(21.5, 28.5, 52.5, 59.5, 0, 9.5);

    // Interactive Astral Ley-Line Beacon at base of Windmill
    const beaconMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 1.6, 12),
      new THREE.MeshBasicMaterial({ color: 0x7bf1a8 })
    );
    beaconMesh.position.set(20.2, 0.8, 56);
    scene.add(beaconMesh);
    registerInteractable(beaconMesh, {
      id: 'interact_leyline_beacon',
      type: 'beacon',
      title: 'Astral Windmill Ley-Line Overdrive Beacon',
      subtitle: 'Press [E] to Channel Windmill Ley-Line Surge (+Sprint Speed & Repel Stalkers)'
    });

    // Stealth Hiding Wardrobes (Courtyard + Main Hallway)
    buildHidingWardrobe(scene, -7.5, 0, 47.0, 0.4, 'hide_courtyard', 'Courtyard Sanctuary Wardrobe');
    buildHidingWardrobe(scene, -3.2, 0, -16.5, Math.PI / 2, 'hide_hallway', 'Hallway Sanctuary Wardrobe');

    // ========================================================================
    // AREA 10, 11, 12: STAIRCASE, RESTRICTED BASEMENT & UNDERGROUND LAB
    // ========================================================================
    buildWallSegment(scene, -4, -36, -4, -24, -5.2, 8.8, 0.3, concreteMat, true);
    buildWallSegment(scene, 4, -36, 4, -24, -5.2, 8.8, 0.3, concreteMat, true);
    const stepMat = new THREE.MeshToonMaterial({ color: 0x354259, gradientMap: toonGrad });
    for (let i = 0; i < 16; i++) {
      const sz = -24.4 - i * 0.72;
      const sy = -0.15 - i * 0.31;
      const step = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.32, 0.74), stepMat);
      step.position.set(0, sy, sz);
      scene.add(step);
    }
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.7, roughness: 0.35 });
    [-3.4, 3.4].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 12.2), railMat);
      rail.position.set(rx, -1.6, -30);
      rail.rotation.x = -0.39;
      scene.add(rail);
    });

    const baseFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), concreteMat);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.set(0, -5, -42);
    scene.add(baseFloor);
    const baseCeil = new THREE.Mesh(new THREE.PlaneGeometry(20, 24), ceilingMat);
    baseCeil.rotation.x = Math.PI / 2;
    baseCeil.position.set(0, -0.8, -36);
    scene.add(baseCeil);

    buildWallSegment(scene, -10, -36, -4, -36, -5, 4.4, 0.3, concreteMat, true);
    buildWallSegment(scene, 4, -36, 10, -36, -5, 4.4, 0.3, concreteMat, true);
    buildWallSegment(scene, -10, -48, -10, -36, -5, 4.4, 0.3, concreteMat, true);
    buildWallSegment(scene, 10, -48, 10, -36, -5, 4.4, 0.3, concreteMat, true);

    buildWallWithDoor(scene, 'x', -48, -14, 14, 0, 2.8, -5, 4.8, concreteMat, {
      id: 'door_blast', name: 'Underground Research Lab Blast Door', signTitle: 'PROJECT CHRONOS LAB', signSub: 'BLAST CODE [9104]',
      locked: true, metal: true, codeRequired: '9104',
      lockReason: 'Heavy Biometric / Keypad Blast Door. Enter 4-digit Override Code (Rowan knows this code).'
    });

    const labFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 20),
      new THREE.MeshStandardMaterial({ color: 0x162238, metalness: 0.45, roughness: 0.35 })
    );
    labFloor.rotation.x = -Math.PI / 2;
    labFloor.position.set(0, -5, -58);
    scene.add(labFloor);

    const labCeil = new THREE.Mesh(new THREE.PlaneGeometry(28, 20), ceilingMat);
    labCeil.rotation.x = Math.PI / 2;
    labCeil.position.set(0, 0.2, -58);
    scene.add(labCeil);

    buildWallSegment(scene, -14, -68, -14, -48, -5, 5.2, 0.35, concreteMat, true);
    buildWallSegment(scene, 14, -68, 14, -48, -5, 5.2, 0.35, concreteMat, true);
    buildWallSegment(scene, -14, -68, 14, -68, -5, 5.2, 0.35, concreteMat, true);

    // ========================================================================
    // DETAILED ROOM FURNISHINGS & INTERACTIVE PUZZLE OBJECTS
    // ========================================================================
    addCeilingLight(scene, 0, 3.5, 29, 0xffe8c2, 1.1, 16, true);
    const barrierMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.6),
      new THREE.MeshBasicMaterial({ color: 0x7b5cff, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
    );
    barrierMesh.position.set(2.8, 1.4, 33.75);
    scene.add(barrierMesh);
    registerInteractable(barrierMesh, {
      id: 'entrance_barrier',
      type: 'inspect',
      title: 'Temporal Anomaly Conduit (Main Exit)',
      subtitle: 'Press [E] to Examine',
      description: 'A shimmering violet Ley-Line conduit hums beside the Courtyard Gate. You can step outside through the Courtyard Gate into the Open-World Starlight Courtyard & Caretaker\'s Grounds, but the outer town beyond the fence remains frozen at 11:57 PM until the Underground Chrono-Core is stabilized.',
      clueId: 'clue_temporal_barrier'
    });

    const entranceBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.3, 2.2),
      new THREE.MeshBasicMaterial({ map: T.getChalkboardTexture('chronos') })
    );
    entranceBoard.position.set(-3.8, 1.75, 28.5);
    scene.add(entranceBoard);
    registerInteractable(entranceBoard, {
      id: 'doc_entrance_notice',
      type: 'document',
      title: 'Arin\'s Scrawled Loop & Stalker Notes (Entrance Board)',
      subtitle: 'Press [E] to Read Investigation & Stealth Checklist',
      description: 'SURVIVAL & INVESTIGATION DIRECTIVE:\n\n• Every 180 seconds, time resets to 11:57 PM.\n• NEW THREAT: The Caretaker ("The Warden") patrols the Open-World Courtyard & Main Hallway, and Abyssal Chrono-Wraiths prowl the East Wing & Basement!\n• Press [C] to Crouch silently, [G] to toss an Acoustic Decoy chime, or [E] on Sanctuary Wardrobes to hide.\n• Explore the Caretaker\'s Victorian House in the Courtyard (PIN: 1157) to claim the Golden Celestial Skeleton Key!',
      clueId: 'clue_entrance_board'
    });

    // --- 2. RECEPTION OFFICE ---
    addCeilingLight(scene, -10, 3.5, 19, 0xfff0d4, 1.0, 14, true);
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.05, 5.2),
      new THREE.MeshToonMaterial({ color: 0x5c3d2e, gradientMap: toonGrad })
    );
    counter.position.set(-8.5, 0.525, 19);
    addCelOutline(counter, 1.03);
    scene.add(counter);
    addCollider(-9.1, -7.9, 16.3, 21.7, 0, 1.2);

    const logbook = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.6),
      new THREE.MeshToonMaterial({ color: 0x9b2226, gradientMap: toonGrad })
    );
    logbook.position.set(-8.5, 1.1, 18.2);
    scene.add(logbook);
    registerInteractable(logbook, {
      id: 'doc_visitor_log',
      type: 'document',
      title: 'Reception Late-Night Sign-In Ledger',
      subtitle: 'Press [E] to Inspect Ledger',
      description: 'OFFICIAL LATE-NIGHT ACCESS LOG — NOV 10:\n\n• 11:15 PM — Rowan K. (Checked out Science Lab Spectrometer Key)\n• 11:22 PM — Maya L. (Requested Archive Key — Denied by Principal Vance)\n• 11:35 PM — The Caretaker ("Locked my Victorian house in the South Courtyard with PIN [ 1 1 5 7 ].")\n• 11:40 PM — Dr. E. Kaelen ("Staff Room keypad is [ 7 3 9 2 ] and Reception Safe is [ 0 4 1 8 ].")',
      clueId: 'clue_visitor_log'
    });

    const safeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.1, 0.85),
      new THREE.MeshToonMaterial({ color: 0x3d5a80, gradientMap: toonGrad })
    );
    safeMesh.position.set(-14.8, 0.55, 21.5);
    addCelOutline(safeMesh, 1.04);
    scene.add(safeMesh);
    addCollider(-15.3, -14.3, 21.0, 22.0, 0, 1.2);
    registerInteractable(safeMesh, {
      id: 'puzzle_reception_safe',
      type: 'keypad',
      title: 'Reception Security Safe',
      subtitle: 'Press [E] to Enter 4-Digit PIN',
      code: '0418',
      rewardItem: 'staff_key',
      rewardTitle: 'Faculty Staff Room Key & Security Memo',
      clueId: 'clue_safe_opened',
      hint: 'Hint: Blackwood Academy Founding Date (April 18 -> 0418), found in Classroom 102 & Reception Logbook.'
    });

    // --- 3. MAIN HALLWAY ---
    addCeilingLight(scene, 0, 3.5, 16, 0xe8f4f8, 1.0, 16, true);
    addCeilingLight(scene, 0, 3.5, 2, 0xe8f4f8, 1.0, 16, true);
    addCeilingLight(scene, 0, 3.5, -12, 0xe8f4f8, 1.0, 16, true);
    addEmergencyLight(scene, 0, 3.3, -23.5);

    buildLockerBank(scene, -3.55, 0, 15.2, Math.PI / 2, 3, {
      index: 1,
      color: 0xffd166,
      info: {
        id: 'puzzle_maya_locker',
        type: 'keypad',
        title: 'Maya\'s Locker #14 (Padlock)',
        subtitle: 'Press [E] to Enter 4-Digit Locker Combination',
        code: '0203',
        rewardItem: 'tachyon_book_and_vial',
        rewardTitle: 'Tachyon Harmonics Vol. III & Temporal Sample Vial',
        clueId: 'clue_maya_locker',
        hint: 'Hint: Sum of Physics Classroom (101) + History Classroom (102) = 0203 (written on Classroom 101 chalkboard).'
      }
    });

    buildLockerBank(scene, 3.55, 0, -1.2, -Math.PI / 2, 3, {
      index: 1,
      color: 0x7bdff2,
      info: {
        id: 'inspect_rowan_locker',
        type: 'document',
        title: 'Rowan\'s Locker #27',
        subtitle: 'Press [E] to Examine Slit Note',
        description: 'Tucked into the air vent of Rowan\'s locker is a crumpled message from Maya:\n\n"Rowan — You promised me the Chronos Core would only turn time back by ten minutes! Instead, the containment ring locked us into a 180-second loop and summoned Abyssal Wraiths from the Ley-Line rift! If anyone else stays conscious inside the loop, tell them our signal phrase: ECHO-11:57."',
        clueId: 'clue_rowan_locker_note'
      }
    });

    // --- 4A. CLASSROOM 101 — PHYSICS ---
    addCeilingLight(scene, 10, 3.5, 18, 0xfff3dc, 1.0, 15, true);
    buildStudentDesk(scene, 8.5, 0, 16.5, -Math.PI / 2);
    buildStudentDesk(scene, 8.5, 0, 19.5, -Math.PI / 2);
    buildStudentDesk(scene, 11.5, 0, 16.5, -Math.PI / 2);
    buildStudentDesk(scene, 11.5, 0, 19.5, -Math.PI / 2);

    const physBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.5, 3.4),
      new THREE.MeshBasicMaterial({ map: T.getChalkboardTexture('physics') })
    );
    physBoard.position.set(15.7, 1.85, 18);
    scene.add(physBoard);
    registerInteractable(physBoard, {
      id: 'doc_physics_chalkboard',
      type: 'document',
      title: 'Classroom 101 Physics Chalkboard',
      subtitle: 'Press [E] to Study Equations & Combination Clue',
      description: 'LECTURE NOTES — CLOSED TIMELIKE CURVES:\n\n• Temporal Harmonic Resonance Stability occurs at f₀ = 432 Hz.\n• Maya\'s Locker #14 Combination = Room 101 + Room 102 = [ 0 2 0 3 ].\n• Caretaker\'s Courtyard House Padlock = [ 1 1 5 7 ].',
      clueId: 'clue_physics_board'
    });

    const mayaNote = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.06, 0.48),
      new THREE.MeshToonMaterial({ color: 0xffd166, gradientMap: toonGrad })
    );
    mayaNote.position.set(8.5, 0.82, 16.5);
    scene.add(mayaNote);
    registerInteractable(mayaNote, {
      id: 'doc_maya_notebook',
      type: 'document',
      title: 'Maya\'s Personal Physics Journal',
      subtitle: 'Press [E] to Read Maya\'s Notes',
      description: 'MAYA\'S JOURNAL:\n\n"The time loop is getting more dangerous—dark Abyssal Chrono-Wraiths have started materializing in the East Wing and Basement, and the Caretaker is patrolling the Courtyard with a red lantern! If Arin is truly awake in the loop, tell me our passphrase: ECHO-11:57 so we can align the 3 Pylons (BETA -> ALPHA -> GAMMA)."',
      clueId: 'clue_maya_journal'
    });

    // --- 4B. CLASSROOM 102 — HISTORY ---
    addCeilingLight(scene, 10, 3.5, 5, 0xfff3dc, 1.0, 15, true);
    buildStudentDesk(scene, 8.5, 0, 3.5, -Math.PI / 2);
    buildStudentDesk(scene, 8.5, 0, 6.5, -Math.PI / 2);
    buildStudentDesk(scene, 11.5, 0, 3.5, -Math.PI / 2);
    buildStudentDesk(scene, 11.5, 0, 6.5, -Math.PI / 2);

    const histBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1.5, 3.4),
      new THREE.MeshBasicMaterial({ map: T.getChalkboardTexture('history') })
    );
    histBoard.position.set(15.7, 1.85, 5);
    scene.add(histBoard);
    registerInteractable(histBoard, {
      id: 'doc_history_chalkboard',
      type: 'document',
      title: 'Classroom 102 Academy History Board',
      subtitle: 'Press [E] to Read Historical Timeline',
      description: 'BLACKWOOD ACADEMY HISTORICAL TIMELINE:\n\n• April 18 (04/18): Blackwood Academy founded -> Reception Safe PIN: [ 0 4 1 8 ].\n• Faculty Staff Room Keypad Override: [ 7 3 9 2 ].\n• Caretaker\'s Courtyard House Padlock: [ 1 1 5 7 ].',
      clueId: 'clue_history_board'
    });

    // --- 5. SCHOOL LIBRARY ---
    addCeilingLight(scene, -10, 3.5, 6.5, 0xffe4b5, 1.0, 15, true);
    const shelfMat = new THREE.MeshStandardMaterial({ map: T.getBookshelfTexture(), roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.5, 3.4), shelfMat);
      shelf.position.set(-15.2, 1.25, 2.5 + i * 3.8);
      scene.add(shelf);
      addCollider(-15.6, -14.7, 0.8 + i * 3.8, 4.2 + i * 3.8, 0, 2.5);
    }

    const puzzleShelf = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.5, 0.75), shelfMat);
    puzzleShelf.position.set(-10, 1.25, 12.6);
    scene.add(puzzleShelf);
    addCollider(-11.7, -8.3, 12.1, 13.0, 0, 2.5);
    registerInteractable(puzzleShelf, {
      id: 'puzzle_library_books',
      type: 'library_shelf',
      title: 'Restricted Physics & Acoustics Archive Shelf',
      subtitle: 'Press [E] to Inspect Missing Volume Slot',
      clueId: 'clue_library_compartment'
    });

    // --- 6. SCIENCE LABORATORY ---
    addCeilingLight(scene, 10, 3.5, -8, 0xd8f3dc, 1.0, 15, true);
    const labBench = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.95, 1.3),
      new THREE.MeshToonMaterial({ color: 0x263238, gradientMap: toonGrad })
    );
    labBench.position.set(11, 0.475, -8);
    addCelOutline(labBench, 1.03);
    scene.add(labBench);
    addCollider(8.1, 13.9, -8.75, -7.25, 0, 1.1);

    const spectroGroup = new THREE.Group();
    spectroGroup.position.set(10.5, 1.25, -8);
    const spectroBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.65, 0.75),
      new THREE.MeshToonMaterial({ color: 0x3a506b, gradientMap: toonGrad })
    );
    const spectroVial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
      new THREE.MeshBasicMaterial({ color: 0x5bc0be })
    );
    spectroVial.position.set(0.3, 0.25, 0);
    spectroGroup.add(spectroBody);
    spectroGroup.add(spectroVial);
    scene.add(spectroGroup);

    registerInteractable(spectroGroup, {
      id: 'puzzle_spectrometer',
      type: 'spectrometer',
      title: 'Harmonic Resonance Spectrometer',
      subtitle: 'Press [E] to Calibrate Temporal Sample',
      clueId: 'clue_spectrometer_432'
    });

    const kaelenDoc = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.06, 0.55),
      new THREE.MeshToonMaterial({ color: 0xeae2b7, gradientMap: toonGrad })
    );
    kaelenDoc.position.set(12.6, 1.0, -8);
    scene.add(kaelenDoc);
    registerInteractable(kaelenDoc, {
      id: 'doc_kaelen_notes',
      type: 'document',
      title: 'Dr. Kaelen\'s Containment Protocol (Sci-Lab)',
      subtitle: 'Press [E] to Read Containment Log',
      description: 'PROJECT CHRONOS — EMERGENCY CONTAINMENT PROTOCOL:\n\n1. The Chrono-Core in the Underground Lab oscillates wildly unless tuned to its exact harmonic eigenvalue: 432 Hz.\n2. Before locking the frequency at the central console, the three surrounding Phase Pylons must be energized in exact sequence: BETA (East) -> ALPHA (West) -> GAMMA (North).\n3. Observer Passphrase for Maya: "ECHO-11:57".',
      clueId: 'clue_kaelen_protocol'
    });

    // --- 7. COMPUTER LABORATORY ---
    addCeilingLight(scene, -10, 3.5, -7, 0xd0e8f2, 1.0, 15, true);
    const compDesk = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.85, 1.2),
      new THREE.MeshToonMaterial({ color: 0x2b2d42, gradientMap: toonGrad })
    );
    compDesk.position.set(-10.5, 0.425, -7);
    scene.add(compDesk);
    addCollider(-13.4, -7.6, -7.7, -6.3, 0, 1.0);

    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(-10.5, 1.25, -7);
    const monitorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.68, 0.12),
      new THREE.MeshToonMaterial({ color: 0x1a1a1d, gradientMap: toonGrad })
    );
    const monitorScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.84, 0.56),
      new THREE.MeshBasicMaterial({ color: 0x34c759 })
    );
    monitorScreen.position.z = 0.07;
    monitorGroup.add(monitorFrame);
    monitorGroup.add(monitorScreen);
    scene.add(monitorGroup);

    registerInteractable(monitorGroup, {
      id: 'puzzle_admin_terminal',
      type: 'terminal',
      title: 'Admin Terminal #04 (Security & Chronos Logs)',
      subtitle: 'Press [E] to Access Terminal Interface',
      clueId: 'clue_terminal_logs'
    });

    // --- 8. FACULTY STAFF ROOM ---
    addCeilingLight(scene, -10, 3.5, -19, 0xffe5b4, 1.0, 14, true);
    const staffTable = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 1.6),
      new THREE.MeshToonMaterial({ color: 0x5c3d2e, gradientMap: toonGrad })
    );
    staffTable.position.set(-10, 0.4, -19);
    scene.add(staffTable);
    addCollider(-11.7, -8.3, -19.9, -18.1, 0, 0.9);

    const keyBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.55, 0.55),
      new THREE.MeshToonMaterial({ color: 0xffd166, gradientMap: toonGrad })
    );
    keyBox.position.set(-15.5, 1.5, -19);
    scene.add(keyBox);
    registerInteractable(keyBox, {
      id: 'item_storage_key',
      type: 'pickup',
      itemKey: 'storage_key',
      title: 'Faculty Utility Key Cabinet (Storage Room Key)',
      subtitle: 'Press [E] to Take Storage Room Utility Key',
      description: 'You collected the Heavy Brass Utility Key for the Storage & Power Room across the hall, along with a maintenance tag: "To restore 120V Auxiliary Power, switch ON Breakers A (45V), C (60V), and D (15V) = 120V."',
      clueId: 'clue_storage_key'
    });

    const dossier = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.07, 0.4),
      new THREE.MeshToonMaterial({ color: 0x9b2226, gradientMap: toonGrad })
    );
    dossier.position.set(-10, 0.85, -19);
    scene.add(dossier);
    registerInteractable(dossier, {
      id: 'doc_vance_dossier',
      type: 'document',
      title: 'Principal Vance\'s Incident Report (Rowan & Maya)',
      subtitle: 'Press [E] to Read Confidential Dossier',
      description: 'CONFIDENTIAL DISCIPLINARY & INCIDENT FILE:\n\n"Honors students Rowan K. and Maya L. gained unauthorized entry into the subterranean Project Chronos laboratory at 11:45 PM. Rowan used the Blast Door override code [ 9 1 0 4 ] hoping to reverse a tragic lab accident from last semester. Confront Rowan with this file to make him realize the loop is destabilizing."',
      clueId: 'clue_incident_report'
    });

    // --- 9. UTILITY STORAGE ROOM ---
    addEmergencyLight(scene, 10, 3.3, -19.5);
    const breakerBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 1.35, 1.1),
      new THREE.MeshToonMaterial({ color: 0x3d5a80, gradientMap: toonGrad })
    );
    breakerBox.position.set(15.6, 1.6, -19.5);
    scene.add(breakerBox);
    registerInteractable(breakerBox, {
      id: 'puzzle_breaker_panel',
      type: 'breaker',
      title: 'Main Electrical Breaker Panel (120V Grid)',
      subtitle: 'Press [E] to Configure Circuit Breakers',
      clueId: 'clue_power_restored'
    });

    // --- 11. RESTRICTED BASEMENT ---
    addEmergencyLight(scene, -4, -1.2, -41);
    addEmergencyLight(scene, 4, -1.2, -41);
    const workbench = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.9, 1.1),
      new THREE.MeshToonMaterial({ color: 0x353b40, gradientMap: toonGrad })
    );
    workbench.position.set(-6, -4.55, -42);
    scene.add(workbench);
    addCollider(-7.4, -4.6, -42.6, -41.4, -5, -3.5);

    const recorder = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.2, 0.32),
      new THREE.MeshToonMaterial({ color: 0xe63946, gradientMap: toonGrad })
    );
    recorder.position.set(-6, -4.0, -42);
    scene.add(recorder);
    registerInteractable(recorder, {
      id: 'doc_rowan_recorder',
      type: 'document',
      title: 'Rowan\'s Basement Voice Recorder',
      subtitle: 'Press [E] to Play Recorded Tape',
      description: 'VOICE RECORDING — ROWAN (11:54 PM):\n\n"If the loop wipes my short-term memory again, listen closely: The Blast Door right ahead uses override code [ 9 1 0 4 ]. Watch out for the Abyssal Chrono-Wraith patrolling the basement! Inside the Underground Lab, energize BETA (East), then ALPHA (West), then GAMMA (North), and tune the Central Stabilizer Console to 432 Hz!"',
      clueId: 'clue_basement_recorder'
    });

    // --- 12. SECRET UNDERGROUND RESEARCH LABORATORY ---
    addCeilingLight(scene, 0, -0.1, -54, 0x7bdff2, 1.35, 24, true);
    addCeilingLight(scene, 0, -0.1, -62, 0x7b5cff, 1.45, 26, true);

    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, -2.3, -59);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 2.3, 0.7, 24),
      new THREE.MeshToonMaterial({ color: 0x1f2833, gradientMap: toonGrad })
    );
    pedestal.position.y = -2.35;
    coreGroup.add(pedestal);
    addCollider(-2.1, 2.1, -61.1, -56.9, -5, -1);

    const ringColors = [0x4cc9f0, 0xffd166, 0xf72585];
    [2.2, 1.7, 1.25].forEach((radius, idx) => {
      const rGeo = new THREE.TorusGeometry(radius, 0.09, 14, 48);
      const rMat = new THREE.MeshStandardMaterial({
        color: ringColors[idx],
        emissive: ringColors[idx],
        emissiveIntensity: 0.85,
        metalness: 0.8,
        roughness: 0.2
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      coreGroup.add(rMesh);
      coreRings.push(rMesh);
    });

    coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({
        color: 0x80ffdb,
        emissive: 0x48bfe3,
        emissiveIntensity: 1.0,
        roughness: 0.1
      })
    );
    coreGroup.add(coreCrystal);
    scene.add(coreGroup);

    const pylonDefs = [
      { id: 'ALPHA', title: 'Phase Pylon ALPHA (West)', x: -7.5, z: -56 },
      { id: 'BETA', title: 'Phase Pylon BETA (East)', x: 7.5, z: -56 },
      { id: 'GAMMA', title: 'Phase Pylon GAMMA (North)', x: 0, z: -65 }
    ];

    pylonDefs.forEach((p) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(p.x, -5, p.z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.7, 3.2, 16),
        new THREE.MeshToonMaterial({ color: 0x2b3440, gradientMap: toonGrad })
      );
      base.position.y = 1.6;
      addCelOutline(base, 1.04);
      pGroup.add(base);

      const orbMat = new THREE.MeshBasicMaterial({ color: 0xff4d6d });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), orbMat);
      orb.position.y = 3.45;
      pGroup.add(orb);

      scene.add(pGroup);
      addCollider(p.x - 0.7, p.x + 0.7, p.z - 0.7, p.z + 0.7, -5, -1.5);
      pylonMeshes[p.id] = { orbMat, group: pGroup };

      registerInteractable(pGroup, {
        id: `pylon_${p.id}`,
        type: 'pylon',
        pylonId: p.id,
        title: p.title,
        subtitle: 'Press [E] to Energize Phase Pylon'
      });
    });

    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(0, -5, -52.2);
    const consoleStand = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.15, 0.95),
      new THREE.MeshToonMaterial({ color: 0x1d3557, gradientMap: toonGrad })
    );
    consoleStand.position.y = 0.575;
    const consoleScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.45, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x4cc9f0 })
    );
    consoleScreen.position.set(0, 1.2, 0);
    consoleScreen.rotation.x = -0.35;
    consoleGroup.add(consoleStand);
    consoleGroup.add(consoleScreen);
    scene.add(consoleGroup);
    addCollider(-1.0, 1.0, -52.8, -51.6, -5, -3.6);

    registerInteractable(consoleGroup, {
      id: 'puzzle_core_console',
      type: 'core_console',
      title: 'Central Temporal Stabilizer Console',
      subtitle: 'Press [E] to Access Chrono-Core Controls'
    });
  }

  function update(dt, elapsedLoopTime, pylonState) {
    Object.values(doors).forEach((d) => {
      d.targetAngle = d.isOpen ? d.openAngle : 0;
      d.currentAngle += (d.targetAngle - d.currentAngle) * Math.min(1, dt * 8);
      d.pivot.rotation.y = d.currentAngle;
      d.collider.disabled = d.isOpen;
      d.ledMat.color.setHex(d.locked ? 0xff3b30 : d.isOpen ? 0x4cc9f0 : 0x34c759);
    });

    emergencyLights.forEach((el) => {
      const pulse = 0.55 + 0.45 * Math.sin(elapsedLoopTime * 4.5 + el.phase);
      el.pt.intensity = pulse * 0.9;
    });

    if (coreRings.length === 3) {
      coreRings[0].rotation.x += dt * 1.1;
      coreRings[0].rotation.y += dt * 0.7;
      coreRings[1].rotation.y -= dt * 1.4;
      coreRings[1].rotation.z += dt * 0.9;
      coreRings[2].rotation.x -= dt * 0.8;
      coreRings[2].rotation.z -= dt * 1.6;
    }
    if (coreCrystal) {
      coreCrystal.rotation.y += dt * 2.0;
      coreCrystal.position.y = Math.sin(elapsedLoopTime * 3.0) * 0.18;
    }

    // Rotate Open-World Windmill Blades & Fountain Spire
    if (windmillBlades) {
      windmillBlades.rotation.z += dt * 0.85;
    }
    fountainRings.forEach((sp) => {
      sp.rotation.y += dt * 1.6;
      sp.position.y = 2.4 + Math.sin(elapsedLoopTime * 2.5) * 0.15;
    });

    // Drift Ley-Line Stardust Particles upward
    if (particleSystem) {
      const posAttr = particleSystem.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let py = posAttr.getY(i) + dt * 0.42;
        if (py > 7.5) py = -1.0;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
    }

    if (pylonState) {
      ['ALPHA', 'BETA', 'GAMMA'].forEach((pid) => {
        if (pylonMeshes[pid]) {
          const active = pylonState.includes(pid);
          pylonMeshes[pid].orbMat.color.setHex(active ? 0x34c759 : 0xff4d6d);
        }
      });
    }
  }

  function resetForNewLoop(persistentUnlocks = {}) {
    Object.values(doors).forEach((d) => {
      d.isOpen = false;
      d.locked = d.initialLocked;
      d.collider.disabled = false;
    });
  }

  function getRoomAt(x, z) {
    for (const r of ROOMS) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        let floorY = r.floorY;
        if (r.id === 'staircase') {
          const t = Math.max(0, Math.min(1, (-24 - z) / 12));
          floorY = -5.0 * t;
        }
        return { ...r, floorY };
      }
    }
    return { id: 'courtyard', name: 'Blackwood Campus Grounds', floorY: z < -35 ? -5 : 0, surface: z > 34 ? 'grass' : 'tile' };
  }

  return {
    ROOMS,
    wallColliders,
    doors,
    interactables,
    ceilingLights,
    buildWorld,
    update,
    resetForNewLoop,
    getRoomAt
  };
})();
