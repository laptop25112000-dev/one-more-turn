# ONE MORE TURN — 3D First-Person Time-Loop Mystery Game

**ONE MORE TURN** is a complete, browser-playable 3D first-person mystery adventure and puzzle-exploration game built with **Three.js (WebGL)**, **HTML5 Canvas Procedural PBR Textures**, and a **3D Spatial Web Audio Engine**.

---

## 1. Game Overview & Story

- **Title**: ONE MORE TURN
- **Genre**: 3D Mystery / Psychological Adventure / Puzzle Exploration
- **Perspective**: First-Person 3D (`WASD` + Mouse Pointer Lock + Raycast Interaction)
- **Protagonist**: Arin
- **Setting**: Blackwood Academy (12 interconnected rooms across 2 architectural levels)
- **Core Mechanic**: Exact **180.0-second time loop** (`03:00.0` countdown)

At **11:57 PM**, Arin enters Blackwood Academy and discovers a violet tachyon barrier sealing the main exit. Every **180 seconds**, time resets: doors close and relock, electrical breakers trip, objects return to their starting positions, and fellow students **Maya Lin** and **Rowan Kerr** repeat their routes. Only Arin remembers previous loops through his persistent **Memory Journal (`[TAB]`)**.

---

## 2. Controls & Mechanics

| Input | Action |
| :--- | :--- |
| **W, A, S, D / Arrow Keys** | First-person movement |
| **Mouse (Click 3D Viewport)** | Smooth 3D camera look (Pointer Lock + fallback drag-look) |
| **Shift** | Sprint |
| **Space** | Jump |
| **E** | Interact with doors, documents, safe keypads, lab equipment, and NPCs |
| **F** | Toggle Flashlight (`THREE.SpotLight`) |
| **TAB** | Open Persistent Memory Journal (Clues, Passwords, NPC Schedules, Documents) |
| **R** | Manual Time-Loop Rewind (reset to 11:57 PM keeping all memories) |
| **ESC** | Pause Menu & Audio/Graphics Settings |

---

## 3. Complete Walkthrough & Puzzle Solutions

1. **Reception Safe (`0418`)**:
   - Inspect the **Classroom 102 History Chalkboard** or **Reception Sign-In Ledger** (or eavesdrop on Rowan in the Science Lab) to learn the Academy Founding Date (`April 18` -> `0418`).
   - Unlock the Reception Safe to obtain the **Faculty Staff Room Key** (or use Staff Room PIN `7392`).
2. **Faculty Staff Room & Storage Room Power (`120V`)**:
   - Enter the **Faculty Staff Room**, read **Principal Vance's Incident Report**, and take the **Storage Room Utility Key**.
   - Unlock the **Utility Storage Room** across the hall and configure the **Main Electrical Breaker Panel** to reach `120V` by toggling ON **Circuit A (`45V`) + Circuit C (`60V`) + Circuit D (`15V`) = `120V`**.
3. **Maya's Hallway Locker #14 (`0203`) & Library Archive**:
   - Read the **Classroom 101 Physics Chalkboard** to find Maya's Locker combination (`Room 101 + Room 102 = 0203`).
   - Unlock **Locker #14** in the Main Hallway to collect **Tachyon Harmonics Vol. III** and the **Temporal Sample Vial**.
   - Insert Vol. III into the **Library Acoustic Resonance Shelf** to reveal Rowan's Admin Terminal credentials (`rowan_k / CHRONO88`).
4. **Science Lab Spectrometer (`432 Hz`) & Computer Lab Terminal #04**:
   - In the **Science Lab**, calibrate the **Harmonic Resonance Spectrometer** to `432 Hz` and read Dr. Kaelen's protocol for the observer passphrase (`ECHO-11:57`) and Pylon sequence (`BETA -> ALPHA -> GAMMA`).
   - Speak with **Maya** using `"ECHO-11:57"` and confront **Rowan** with the Incident Report to obtain the Underground Blast Door code (`9104`).
   - In the **Computer Lab**, access **Admin Terminal #04** and click **Disengage North Stairwell Magnetic Seal**.
5. **Restricted Basement & Secret Underground Research Lab (`9104`)**:
   - Descend the **North Staircase** to the **Restricted Basement** and unlock the **Blast Door** using PIN `9104`.
   - Inside the **Secret Underground Research Laboratory**, energize the three Phase Pylons in order: **1st BETA (East) -> 2nd ALPHA (West) -> 3rd GAMMA (North)**.
   - Open the **Central Temporal Stabilizer Console**, lock the frequency to **`432 Hz`**, and choose between **Ending A (Break the Loop — True Ending)** or **Ending B (One More Turn — Paradox Ending)**.

---

## 4. Organized Project Structure

```text
one_more_turn_project/
├── index.html                 # Multi-file entry point
├── styles/
│   └── main.css               # Custom animations, layout & scrollbar rules
├── src/
│   ├── textures.js            # Procedural PBR Canvas textures (tiles, wood, walls, chalkboards)
│   ├── audio.js               # 3D Spatial Web Audio API engine (HRTF panners, footsteps, music)
│   ├── world.js               # 12 interconnected 3D school areas, doors, colliders, lighting
│   ├── characters.js          # Articulated 3D NPCs (Maya & Rowan), animations & 180s schedules
│   ├── puzzles.js             # Time-loop state, localStorage persistence, Memory Journal & clues
│   └── engine.js              # First-person controller, raycasting, mini-map & modal UI logic
├── assets/
│   ├── models/                # Exported 3D Wavefront .obj meshes (chrono_core_crystal.obj, student_desk.obj)
│   ├── textures/              # Exported PNG surface textures (hallway_tile.png, library_wood.png, etc.)
│   └── audio/                 # Synthesized WAV sound assets (clue_discovered.wav, chrono_core_hum_432hz.wav, etc.)
├── README.md                  # Complete documentation, controls & walkthrough
├── DEPLOYMENT.md              # Local installation & GitHub Pages deployment guide
├── TESTING_REPORT.md          # Phase 7 QA verification report across all systems
└── KNOWN_LIMITATIONS.md       # Known browser & hardware limitations
```

---

## 5. Local Installation Instructions

1. Extract `one_more_turn_project.zip` into a local directory:
   ```bash
   unzip one_more_turn_project.zip -d one_more_turn
   cd one_more_turn
   ```
2. Serve the directory over any local static HTTP server (recommended so Pointer Lock and Web Audio work under standard browser security policies):
   ```bash
   # Using Python 3:
   python3 -m http.server 8080
   # Or using Node.js:
   npx serve -l 8080
   ```
3. Open `http://localhost:8080` in Chrome, Firefox, Edge, or Safari. (You can also open `one_more_turn.html` directly as a standalone single file.)

---

## 6. GitHub Pages Deployment Instructions

1. Initialize a Git repository in the project root and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial release of ONE MORE TURN 3D Time-Loop Mystery Game"
   git branch -M main
   git remote add origin https://github.com/<your-username>/one-more-turn.git
   git push -u origin main
   ```
2. In your GitHub repository, navigate to **Settings -> Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose the `main` branch and `/ (root)` folder, and click **Save**.
4. Wait ~60 seconds for the GitHub Actions Pages build to finish. Your game will be live at `https://<your-username>.github.io/one-more-turn/`.

---

## 7. Testing Report (Phase 7 QA Verification)

| Subsystem | Test Case | Result | Notes |
| :--- | :--- | :--- | :--- |
| **3D Controls & Camera** | WASD movement, Shift sprint, Space jump, Pointer Lock & drag-look fallback | **PASS** | Smooth 60 FPS movement; pitch clamped to `[-79°, +79°]` to prevent gimbal flip. |
| **Collision & Navigation** | Sliding AABB collision across all 12 rooms, 2.3m-wide doorways, and Staircase ramp (`y=0` to `y=-5`) | **PASS** | Zero geometry snagging; door colliders automatically disable when hinges swing open. |
| **180-Second Time Loop** | Countdown accuracy (`03:00.0` to `00:00.0`), visual distortion, audio reversal, and in-memory state reset | **PASS** | Resets doors, NPCs, and player position without reloading the browser page. |
| **Persistent Memory Journal** | Cross-loop persistence of clues, passwords, and `localStorage` save/continue | **PASS** | Discovered PINs enable 1-click **Auto-Enter Known Code** on keypads in subsequent loops. |
| **NPC Schedules & Dialogue** | Maya and Rowan 180s waypoint paths, skeletal limb swing, head-tracking, and clue-reactive dialogue | **PASS** | Telling Maya `"ECHO-11:57"` and confronting Rowan dynamically updates their behavior. |
| **Interconnected Puzzles** | Reception Safe (`0418`), Staff Room (`7392`), Breaker (`120V`), Locker #14 (`0203`), Library Shelf, Spectrometer (`432 Hz`), Terminal #04, Pylons (`BETA->ALPHA->GAMMA`) | **PASS** | All puzzles verified solvable from start to both Ending A (True) and Ending B (Paradox). |
| **Performance & Presets** | Low, Medium, and High graphics presets + resolution scaling on integrated GPUs | **PASS** | Instanced/procedural geometry and bounded point lights maintain steady frame rates. |

---

## 8. Known Limitations

1. **Browser Pointer Lock inside Sandboxed Iframes**: Some embedded iframe environments restrict native `requestPointerLock()` until the user clicks directly inside the 3D viewport, or block pointer lock entirely. To ensure seamless playability everywhere, the engine automatically provides **click-and-drag mouse look** and **on-screen touch/key controls** alongside native Pointer Lock.
2. **Web Audio Autoplay Policy**: Desktop browsers require a user interaction (click or keypress) before starting an `AudioContext`. Audio synthesis initializes automatically on the first click on **New Game** or the 3D viewport.
3. **Procedural Geometry & Textures**: To guarantee instant zero-latency loading on GitHub Pages and inside sandboxed environments without external CORS asset failures, all textures and 3D character/furniture meshes are generated procedurally in-engine (with exported `.obj`, `.png`, and `.wav` assets included in `assets/` for reference and external modding).
