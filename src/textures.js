// ============================================================================
// ONE MORE TURN — High-Resolution Stylized Cel-Shaded Texture Library (textures.js)
// Generates 512x512 / 1024x512 Genshin Impact-inspired stylized hand-painted
// textures, 4-band Toon gradient maps, Ley-Line runes, courtyard grass, and
// Hello Neighbor-inspired Victorian clapboard siding.
// ============================================================================

window.OMT_Textures = (function () {
  const cache = {};

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toThreeTexture(canvas, repeatX = 1, repeatY = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  // 4-step Toon Shading Gradient Map for Genshin-style cel-shaded materials
  function getToonGradientTexture() {
    if (cache.toonGrad) return cache.toonGrad;
    const c = createCanvas(4, 1);
    const ctx = c.getContext('2d');
    const shades = ['#384259', '#667696', '#b8c7e0', '#ffffff'];
    shades.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(i, 0, 1, 1);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return (cache.toonGrad = tex);
  }

  function getHallwayTileTexture(repeatX = 8, repeatY = 8) {
    const key = `tile_${repeatX}_${repeatY}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');

    // Stylized Akademiya-inspired astral slate & warm alabaster marble with gold filigree
    ctx.fillStyle = '#1e2638';
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const isAlt = (x + y) % 2 === 0;
        const grad = ctx.createLinearGradient(x * 128, y * 128, (x + 1) * 128, (y + 1) * 128);
        if (isAlt) {
          grad.addColorStop(0, '#3a4963');
          grad.addColorStop(1, '#2d394f');
        } else {
          grad.addColorStop(0, '#242e42');
          grad.addColorStop(1, '#1b2333');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);

        // Golden celestial diamond inlay at tile intersections
        ctx.strokeStyle = 'rgba(243, 208, 120, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * 128 + 10, y * 128 + 10, 108, 108);
      }
    }
    return (cache[key] = toThreeTexture(c, repeatX, repeatY));
  }

  function getWoodFloorTexture(repeatX = 6, repeatY = 6) {
    const key = `wood_${repeatX}_${repeatY}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a3225';
    ctx.fillRect(0, 0, 512, 512);

    const tones = ['#634332', '#543829', '#6e4b38', '#493023'];
    for (let row = 0; row < 8; row++) {
      const y = row * 64;
      const offset = (row % 2) * 128;
      for (let col = -1; col < 3; col++) {
        const x = col * 256 + offset;
        ctx.fillStyle = tones[(row + col + 4) % tones.length];
        ctx.fillRect(x + 2, y + 2, 252, 60);
        // Cel-shaded hand-painted wood highlight & grain
        ctx.fillStyle = 'rgba(255, 224, 178, 0.08)';
        ctx.fillRect(x + 8, y + 6, 236, 8);
        ctx.fillStyle = 'rgba(28, 16, 10, 0.28)';
        ctx.fillRect(x + 14, y + 28, 220, 3);
      }
    }
    return (cache[key] = toThreeTexture(c, repeatX, repeatY));
  }

  function getConcreteTexture(repeatX = 6, repeatY = 6) {
    const key = `concrete_${repeatX}_${repeatY}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 360);
    grad.addColorStop(0, '#2e384d');
    grad.addColorStop(1, '#1e2536');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle glowing cyan Ley-Line rune veins in subterranean stone
    ctx.strokeStyle = 'rgba(76, 201, 240, 0.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 488, 488);
    ctx.beginPath();
    ctx.arc(256, 256, 96, 0, Math.PI * 2);
    ctx.stroke();

    return (cache[key] = toThreeTexture(c, repeatX, repeatY));
  }

  function getSchoolWallTexture(repeatX = 4, repeatY = 1) {
    const key = `wall_${repeatX}_${repeatY}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');

    // Upper stylized anime academy cream-slate plaster
    const upperGrad = ctx.createLinearGradient(0, 0, 0, 310);
    upperGrad.addColorStop(0, '#526178');
    upperGrad.addColorStop(1, '#3e4c63');
    ctx.fillStyle = upperGrad;
    ctx.fillRect(0, 0, 512, 310);

    // Golden filigree frieze border
    ctx.fillStyle = '#e5b968';
    ctx.fillRect(0, 310, 512, 12);
    ctx.fillStyle = '#3d291e';
    ctx.fillRect(0, 322, 512, 12);

    // Lower rich wainscoting panels
    ctx.fillStyle = '#2d384c';
    ctx.fillRect(0, 334, 512, 178);

    ctx.strokeStyle = 'rgba(229, 185, 104, 0.35)';
    ctx.lineWidth = 3;
    for (let x = 20; x < 512; x += 64) {
      ctx.strokeRect(x, 348, 44, 136);
    }
    // Baseboard
    ctx.fillStyle = '#181e29';
    ctx.fillRect(0, 492, 512, 20);

    return (cache[key] = toThreeTexture(c, repeatX, repeatY));
  }

  // Open-World Courtyard Stylized Genshin Grass & Starlight Clover Texture
  function getCourtyardGrassTexture(repeatX = 14, repeatY = 14) {
    const key = `grass_${repeatX}_${repeatY}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1f4e48');
    grad.addColorStop(0.5, '#286156');
    grad.addColorStop(1, '#1b433c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Stylized hand-painted grass blades and glowing starlight petals
    for (let i = 0; i < 420; i++) {
      const gx = (i * 97) % 500;
      const gy = (i * 151) % 500;
      ctx.fillStyle = i % 9 === 0 ? '#7bf1a8' : i % 3 === 0 ? '#368272' : '#21544a';
      ctx.fillRect(gx, gy, 4, 14);
      if (i % 28 === 0) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(gx + 3, gy + 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return (cache[key] = toThreeTexture(c, repeatX, repeatY));
  }

  // Hello Neighbor-inspired Quirky Victorian Siding Texture
  function getNeighborHouseWallTexture(repeatX = 3, repeatY = 2) {
    const key = `neighbor_${repeatX}_${repeatY}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a2d54';
    ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row++) {
      const y = row * 32;
      ctx.fillStyle = row % 2 === 0 ? '#453563' : '#36294f';
      ctx.fillRect(0, y, 512, 29);
      ctx.fillStyle = 'rgba(255, 209, 102, 0.14)';
      ctx.fillRect(0, y, 512, 3);
    }
    return (cache[key] = toThreeTexture(c, repeatX, repeatY));
  }

  function getBookshelfTexture() {
    if (cache.bookshelf) return cache.bookshelf;
    const c = createCanvas(512, 512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2d1e17';
    ctx.fillRect(0, 0, 512, 512);

    const bookColors = ['#8c2f39', '#2b6e58', '#2f5280', '#946e2f', '#5a3b7c', '#7a4928', '#2b7278'];
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = shelf * 128;
      ctx.fillStyle = '#5c3d2e';
      ctx.fillRect(0, sy + 112, 512, 16);
      let bx = 14;
      let idx = shelf * 13;
      while (bx < 484) {
        const bw = 24 + ((idx * 11) % 18);
        const bh = 86 + ((idx * 19) % 22);
        ctx.fillStyle = bookColors[idx % bookColors.length];
        ctx.fillRect(bx, sy + 112 - bh, bw - 3, bh);
        ctx.fillStyle = '#f3d078';
        ctx.fillRect(bx + 4, sy + 112 - bh + 12, bw - 11, 5);
        bx += bw;
        idx++;
      }
    }
    return (cache.bookshelf = toThreeTexture(c, 1, 1));
  }

  function getChalkboardTexture(type) {
    const key = `chalk_${type}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(1024, 512);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#142923';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = '#d4a359';
    ctx.lineWidth = 18;
    ctx.strokeRect(10, 10, 1004, 492);

    ctx.fillStyle = '#f1faee';
    ctx.font = 'bold 36px monospace';
    if (type === 'physics') {
      ctx.fillText('ROOM 101 — LEY-LINE TEMPORAL HARMONICS', 52, 82);
      ctx.font = '28px monospace';
      ctx.fillStyle = '#a8dadc';
      ctx.fillText('Δt\' = Δt / √(1 - v²/c²)   [Closed Timelike Curve]', 52, 154);
      ctx.fillText('Resonance Stability: f₀ = 432 Hz (Calibrate in Sci-Lab)', 52, 216);
      ctx.fillStyle = '#ffd166';
      ctx.fillText('★ Maya\'s Locker #14 Combination = [ 0 2 0 3 ]', 52, 294);
      ctx.fillText('★ Courtyard Caretaker House Code = [ 1 1 5 7 ]', 52, 354);
      ctx.fillStyle = '#ff758f';
      ctx.fillText('WARNING: Crouch [C] or hide in Wardrobes when Stalkers patrol!', 52, 434);
    } else if (type === 'history') {
      ctx.fillText('ROOM 102 — BLACKWOOD ACADEMY & NEIGHBOR LORE', 52, 82);
      ctx.font = '28px monospace';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('• Reception Safe PIN (Founding Date April 18): [ 0 4 1 8 ]', 52, 156);
      ctx.fillStyle = '#a8dadc';
      ctx.fillText('• Staff Room Keypad Override: [ 7 3 9 2 ]', 52, 224);
      ctx.fillText('• Open-World Courtyard & Caretaker House open South of Entrance!', 52, 292);
      ctx.fillStyle = '#7bf1a8';
      ctx.fillText('• Ring the Courtyard Bell or press [G] to lure Stalkers away!', 52, 360);
      ctx.fillStyle = '#ff9b85';
      ctx.fillText('• Caretaker\'s Attic holds the Golden Celestial Skeleton Key!', 52, 430);
    } else {
      ctx.fillText('PROJECT CHRONOS — SURVIVAL & ESCAPE DIRECTIVE', 52, 82);
      ctx.font = '28px monospace';
      ctx.fillStyle = '#ffd166';
      ctx.fillText('1. Safe [0418] -> Staff Room [7392] -> Storage 120V (A+C+D)', 52, 156);
      ctx.fillText('2. Locker #14 [0203] -> Library Shelf -> Sci-Lab [432 Hz]', 52, 222);
      ctx.fillStyle = '#7bf1a8';
      ctx.fillText('3. Explore Open-World Courtyard & Neighbor House (South)!', 52, 290);
      ctx.fillText('4. Pylon Order: BETA (1st) -> ALPHA (2nd) -> GAMMA (3rd)', 52, 356);
      ctx.fillStyle = '#ff758f';
      ctx.fillText('5. Avoid the Warden & Abyssal Wraiths! [C] Crouch • [G] Decoy', 52, 428);
    }
    return (cache[key] = toThreeTexture(c, 1, 1));
  }

  function getSignTexture(title, subtitle, bgColor = '#192233', accent = '#ffd166') {
    const key = `sign_${title}_${subtitle}`;
    if (cache[key]) return cache[key];
    const c = createCanvas(512, 192);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 88);

    if (subtitle) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 28px monospace';
      ctx.fillText(subtitle, 256, 144);
    }
    return (cache[key] = toThreeTexture(c, 1, 1));
  }

  return {
    getToonGradientTexture,
    getHallwayTileTexture,
    getWoodFloorTexture,
    getConcreteTexture,
    getSchoolWallTexture,
    getCourtyardGrassTexture,
    getNeighborHouseWallTexture,
    getBookshelfTexture,
    getChalkboardTexture,
    getSignTexture
  };
})();
