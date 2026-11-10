// ============================================================================
// ONE MORE TURN — Time-Loop Engine, Memory Journal & Puzzle Logic (puzzles.js)
// Manages the 180-second loop countdown, persistent cross-loop Memory Journal,
// world-state reset snapshots, inventory, branching NPC dialogues, and all
// interconnected puzzle interfaces (Keypads, Breaker Panel, Spectrometer,
// Admin Terminal #04, Caretaker's Victorian House, and Chrono-Core Stabilizer).
// ============================================================================

window.OMT_Systems = (function () {
  const STORAGE_KEY = 'one_more_turn_save_v1';

  const CLUE_CATALOG = {
    clue_entrance_board: {
      id: 'clue_entrance_board',
      category: 'clues',
      title: 'Temporal Loop Baseline & Stalker Warning (11:57 PM)',
      loopNote: 'Every 180 seconds, Blackwood Academy snaps back to 11:57 PM. Watch out for the Caretaker and Abyssal Chrono-Wraiths!',
      detail: 'Press [C] to Crouch silently, [G] to toss an Acoustic Decoy chime, or [E] on Sanctuary Wardrobes to hide. Explore both the 12 School Rooms and the Open-World Courtyard South of the Entrance!'
    },
    clue_temporal_barrier: {
      id: 'clue_temporal_barrier',
      category: 'mysteries',
      title: 'Shattered Moon & Courtyard Boundary',
      loopNote: 'The Courtyard Gate opens South into the Starlight Gardens & Caretaker\'s House, while the outer town is frozen.',
      detail: 'Step through the South Entrance Gate into the Open-World Starlight Courtyard to explore the Caretaker\'s Victorian House (PIN: 1157) and the Astral Windmill.'
    },
    clue_courtyard_fountain: {
      id: 'clue_courtyard_fountain',
      category: 'mysteries',
      title: 'Celestial Ley-Line Courtyard Fountain',
      loopNote: 'Inscription reveals the Caretaker\'s Victorian House PIN [1157] and stealth tips.',
      detail: 'Ring the Neighbor\'s Alarm Bell or press [G] to lure the Caretaker out of his house, then unlock his front door with [ 1 1 5 7 ] to claim the Golden Celestial Skeleton Key!',
      password: { label: 'Caretaker\'s Victorian House Padlock', code: '1157', target: 'door_neighbor_house' }
    },
    clue_neighbor_tape: {
      id: 'clue_neighbor_tape',
      category: 'documents',
      title: 'The Caretaker\'s Secret Surveillance Log',
      loopNote: 'Dr. Kaelen hired the Caretaker to guard the courtyard while Abyssal Wraiths prowl the halls.',
      detail: 'The Caretaker\'s red VHS tape confirms that his Golden Celestial Skeleton Key can bypass any lock in Blackwood Academy and channel Ley-Line light.'
    },
    clue_skeleton_key: {
      id: 'clue_skeleton_key',
      category: 'clues',
      title: 'Golden Celestial Skeleton Key (Master Artifact)',
      loopNote: 'Claimed the Caretaker\'s Golden Master Key! Unlocks any door in the current loop.',
      detail: 'Recovered from the Caretaker\'s Victorian House in the Open-World Courtyard. While holding it, pressing [E] on any locked door immediately unlocks it!'
    },
    clue_visitor_log: {
      id: 'clue_visitor_log',
      category: 'documents',
      title: 'Reception Late-Night Sign-In Ledger',
      loopNote: 'Lists Staff Room PIN [7392], Reception Safe PIN [0418], and Caretaker House PIN [1157].',
      detail: 'Rowan checked out the Science Lab Spectrometer Key at 11:15 PM; Maya requested Archive access at 11:22 PM. Staff Room = 7392; Safe = 0418; Caretaker House = 1157.',
      password: { label: 'Faculty Staff Room Keypad', code: '7392', target: 'door_staff' }
    },
    clue_history_board: {
      id: 'clue_history_board',
      category: 'passwords',
      title: 'Academy Founding Date & Safe PIN (0418)',
      loopNote: 'Blackwood Academy was founded on April 18 -> Reception Safe PIN: 0418.',
      detail: 'Recorded on the Classroom 102 History Chalkboard: Reception Safe PIN is [ 0 4 1 8 ]. Faculty Staff Room Keypad is [ 7 3 9 2 ].',
      password: { label: 'Reception Security Safe PIN', code: '0418', target: 'puzzle_reception_safe' }
    },
    clue_safe_opened: {
      id: 'clue_safe_opened',
      category: 'clues',
      title: 'Reception Safe Contents & Security Memo',
      loopNote: 'Opened the Reception Safe (0418) and retrieved the Faculty Staff Room Key.',
      detail: 'Security Memo inside warns that the Auxiliary Power Breaker in the Storage Room trips whenever the Underground Chrono-Core surges.'
    },
    clue_physics_board: {
      id: 'clue_physics_board',
      category: 'passwords',
      title: 'Maya\'s Hallway Locker #14 Code (0203)',
      loopNote: 'Classroom 101 chalkboard reveals Maya\'s Locker #14 code: 0203.',
      detail: 'Maya hid "Tachyon Harmonics Vol. III" and the Temporal Sample Vial inside Hallway Locker #14 (Code: 101 + 102 = 0203). Also notes Core resonance stability at 432 Hz.',
      password: { label: 'Maya\'s Hallway Locker #14', code: '0203', target: 'puzzle_maya_locker' }
    },
    clue_maya_journal: {
      id: 'clue_maya_journal',
      category: 'characters',
      title: 'Maya\'s Loop Signal Phrase ("ECHO-11:57")',
      loopNote: 'Maya is also trying to survive the loop and the Abyssal Wraiths! Passphrase: "ECHO-11:57".',
      detail: 'Speaking the phrase "ECHO-11:57" to Maya convinces her that Arin retains memories across loops, prompting her to reveal the 3-Pylon sequence: BETA -> ALPHA -> GAMMA.'
    },
    clue_rowan_locker_note: {
      id: 'clue_rowan_locker_note',
      category: 'characters',
      title: 'Note in Rowan\'s Locker #27',
      loopNote: 'Maya & Rowan activated the Core to undo a lab fire, accidentally tearing open a Ley-Line rift.',
      detail: 'Confirms the loop passphrase "ECHO-11:57" and warns that Abyssal Chrono-Wraiths are drawn to running footsteps unless you crouch [C].'
    },
    clue_maya_locker: {
      id: 'clue_maya_locker',
      category: 'clues',
      title: 'Retrieved Tachyon Vol. III & Temporal Vial',
      loopNote: 'Locker #14 contains the missing Library treatise and the Science Lab Temporal Sample Vial.',
      detail: 'Place Vol. III on the Library Resonance Shelf to reveal Rowan\'s terminal login, and insert the Temporal Vial into the Science Lab Spectrometer.'
    },
    clue_library_compartment: {
      id: 'clue_library_compartment',
      category: 'passwords',
      title: 'Rowan\'s Admin Terminal Credentials (CHRONO88)',
      loopNote: 'Secret Library shelf compartment revealed Rowan\'s login: rowan_k / CHRONO88.',
      detail: 'Placing Tachyon Harmonics Vol. III on the Library Archive shelf slid open a hidden recess containing Rowan\'s Computer Lab Admin Terminal #04 password: CHRONO88.',
      password: { label: 'Computer Lab Admin Terminal #04', code: 'CHRONO88', target: 'puzzle_admin_terminal' }
    },
    clue_storage_key: {
      id: 'clue_storage_key',
      category: 'clues',
      title: 'Storage Room Utility Key & 120V Breaker Formula',
      loopNote: 'Breaker Panel target is 120V: toggle ON Breakers A (45V) + C (60V) + D (15V).',
      detail: 'Collected the Storage Room Key from the Faculty Staff Room cabinet. The maintenance tag specifies switching ON Breakers A, C, and D to supply exactly 120V.'
    },
    clue_incident_report: {
      id: 'clue_incident_report',
      category: 'documents',
      title: 'Principal Vance\'s Chronos Incident Report',
      loopNote: 'Official dossier on Rowan & Maya\'s unauthorized entry into the Underground Lab (Code: 9104).',
      detail: 'Presenting this Incident Report to Rowan convinces him to stop hiding the truth and give you the Underground Lab Blast Door override code: [ 9 1 0 4 ].',
      password: { label: 'Underground Lab Blast Door PIN', code: '9104', target: 'door_blast' }
    },
    clue_power_restored: {
      id: 'clue_power_restored',
      category: 'clues',
      title: '120V Auxiliary Power Grid Balanced',
      loopNote: 'Restored 120V auxiliary power via Breakers A (45V) + C (60V) + D (15V).',
      detail: 'With auxiliary power online, Computer Lab Admin Terminal #04 and the Science Lab Resonance Spectrometer are fully operational.'
    },
    clue_spectrometer_432: {
      id: 'clue_spectrometer_432',
      category: 'passwords',
      title: 'Chrono-Core Stabilization Frequency (432 Hz)',
      loopNote: 'Science Lab Spectrometer confirmed the Core harmonic eigenvalue: 432 Hz.',
      detail: 'Calibrating the Temporal Sample Vial in the Science Lab confirmed that the Underground Chrono-Core must be tuned to exactly 432 Hz.',
      password: { label: 'Chrono-Core Target Frequency', code: '432 Hz', target: 'puzzle_core_console' }
    },
    clue_kaelen_protocol: {
      id: 'clue_kaelen_protocol',
      category: 'documents',
      title: 'Dr. Kaelen\'s Phase Pylon Sequence (BETA -> ALPHA -> GAMMA)',
      loopNote: 'Energize Underground Pylons in order: 1st BETA (East), 2nd ALPHA (West), 3rd GAMMA (North).',
      detail: 'Emergency Containment Protocol in Science Lab specifies energizing Pylon BETA first, Pylon ALPHA second, and Pylon GAMMA third before locking 432 Hz at the Core Console.'
    },
    clue_terminal_logs: {
      id: 'clue_terminal_logs',
      category: 'documents',
      title: 'Admin Terminal #04 — Basement Seal & Chronos Logs',
      loopNote: 'Unlocked the North Stairwell Magnetic Door from Computer Lab Terminal #04.',
      detail: 'Dr. Kaelen\'s encrypted logs confirm the Chrono-Core can either be safely stabilized at 432 Hz (True Ending) or overloaded into a paradox collapse.'
    },
    clue_basement_recorder: {
      id: 'clue_basement_recorder',
      category: 'characters',
      title: 'Rowan\'s Basement Voice Recorder (Code 9104)',
      loopNote: 'Rowan\'s voice memo repeats Blast Door Code [9104] and Pylon Order [BETA -> ALPHA -> GAMMA].',
      detail: 'Rowan recorded this tape for himself in case the loop wiped his memory. Blast Door PIN: 9104.',
      password: { label: 'Underground Lab Blast Door PIN', code: '9104', target: 'door_blast' }
    },
    clue_maya_alliance: {
      id: 'clue_maya_alliance',
      category: 'conversations',
      title: 'Maya Awakened in the Loop ("ECHO-11:57")',
      loopNote: 'Maya now trusts Arin across loops and confirmed Pylon sequence: BETA -> ALPHA -> GAMMA.',
      detail: 'Maya explained how she and Rowan tried to turn back time by 10 minutes after a lab accident, inadvertently trapping Blackwood Academy and awakening the Abyssal Wraiths.'
    },
    clue_rowan_confession: {
      id: 'clue_rowan_confession',
      category: 'conversations',
      title: 'Rowan\'s Confession & Blast Door Override (9104)',
      loopNote: 'Rowan confessed the truth and handed over the Underground Lab Blast Door code: 9104.',
      detail: 'Rowan urged Arin to descend the North Stairwell, slip past the Basement Wraith using Crouch [C] or Decoy [G], open the Blast Door with 9104, and stabilize the Core at 432 Hz.'
    }
  };

  const state = {
    loopNumber: 1,
    timeRemaining: 180.0,
    isPaused: true,
    inMenu: true,
    activeModal: null,
    gameCompleted: false,

    discoveredClues: ['clue_entrance_board'],
    knownCodes: {},
    flags: {
      knowsPassphrase: false,
      mayaTrustsArin: false,
      hasIncidentReportKnowledge: false,
      rowanConfessed: false,
      knowsPylonSequence: false,
      knowsCoreFrequency: false,
      fastUnlockEnabled: false
    },

    loopState: {
      inventory: [],
      powerRestored: false,
      breakers: { A: false, B: false, C: false, D: false, E: false },
      librarySolved: false,
      spectrometerSolved: false,
      basementUnlocked: false,
      blastDoorOpen: false,
      leylineSurgeActive: false,
      pylonsAligned: [],
      coreFrequency: 380
    }
  };

  function savePersistentState() {
    try {
      const payload = {
        loopNumber: state.loopNumber,
        discoveredClues: state.discoveredClues,
        knownCodes: state.knownCodes,
        flags: state.flags
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function loadPersistentState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.discoveredClues)) {
        state.loopNumber = data.loopNumber || 1;
        state.discoveredClues = data.discoveredClues;
        state.knownCodes = data.knownCodes || {};
        state.flags = { ...state.flags, ...(data.flags || {}) };
        return true;
      }
    } catch (e) {}
    return false;
  }

  function hasSavedGame() {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return false;
    }
  }

  function resetAllForNewGame() {
    state.loopNumber = 1;
    state.timeRemaining = 180.0;
    state.gameCompleted = false;
    state.discoveredClues = ['clue_entrance_board'];
    state.knownCodes = {};
    state.flags = {
      knowsPassphrase: false,
      mayaTrustsArin: false,
      hasIncidentReportKnowledge: false,
      rowanConfessed: false,
      knowsPylonSequence: false,
      knowsCoreFrequency: false,
      fastUnlockEnabled: false
    };
    resetLoopStateOnly();
    savePersistentState();
  }

  function resetLoopStateOnly() {
    state.timeRemaining = 180.0;
    state.loopState = {
      inventory: [],
      powerRestored: false,
      breakers: { A: false, B: false, C: false, D: false, E: false },
      librarySolved: false,
      spectrometerSolved: false,
      basementUnlocked: false,
      blastDoorOpen: false,
      leylineSurgeActive: false,
      pylonsAligned: [],
      coreFrequency: state.flags.knowsCoreFrequency ? 432 : 380
    };
  }

  function unlockClue(clueId, notifyFn) {
    if (!clueId || !CLUE_CATALOG[clueId]) return;
    const entry = CLUE_CATALOG[clueId];
    const isNew = !state.discoveredClues.includes(clueId);
    if (isNew) {
      state.discoveredClues.push(clueId);
    }
    if (entry.password) {
      state.knownCodes[entry.password.code] = entry.password.label;
    }

    if (clueId === 'clue_maya_journal' || clueId === 'clue_rowan_locker_note' || clueId === 'clue_kaelen_protocol') {
      state.flags.knowsPassphrase = true;
    }
    if (clueId === 'clue_incident_report' || clueId === 'clue_terminal_logs') {
      state.flags.hasIncidentReportKnowledge = true;
    }
    if (clueId === 'clue_kaelen_protocol' || clueId === 'clue_basement_recorder' || clueId === 'clue_maya_alliance') {
      state.flags.knowsPylonSequence = true;
    }
    if (clueId === 'clue_spectrometer_432' || clueId === 'clue_physics_board' || clueId === 'clue_kaelen_protocol') {
      state.flags.knowsCoreFrequency = true;
    }

    savePersistentState();
    if (isNew && notifyFn) {
      window.OMT_Audio.playClueChime();
      notifyFn(`MEMORY RECORDED: ${entry.title}`);
    }
  }

  function addItem(itemId, label) {
    if (!state.loopState.inventory.some((i) => i.id === itemId)) {
      state.loopState.inventory.push({ id: itemId, label });
    }
  }

  function hasItem(itemId) {
    return state.loopState.inventory.some((i) => i.id === itemId);
  }

  function getNPCDialogue(npcKey, elapsedLoopTime) {
    if (npcKey === 'maya') {
      const options = [
        {
          id: 'maya_intro',
          label: '"Maya! Why are there Abyssal Wraiths in the halls and the Caretaker prowling the Courtyard?"',
          reply: state.flags.mayaTrustsArin
            ? '"The Chrono-Core rift is tearing deeper with every reset! Stay crouched [C] or toss a Decoy chime [G] if a Wraith spots you, then get down to the Underground Lab and align BETA → ALPHA → GAMMA at 432 Hz!"'
            : '"Arin, stay back from the East corridor! Dark shapes keep flickering beneath the lights, and the Caretaker locked himself inside his Victorian house in the South Courtyard (PIN: 1157). Something terrible happened at 11:57 PM..."'
        },
        {
          id: 'maya_locker',
          label: '"Tell me about your Hallway Locker #14 and the Courtyard Caretaker\'s House."',
          reply: '"I hid Volume III of the Tachyon Harmonics treatise and the Temporal Vial in Locker #14 (code 0203). And if you sneak into the Caretaker\'s House in the Open-World Courtyard (code 1157), his Golden Skeleton Key can open every locked door in the school!"',
          onSelect: (notifyFn) => {
            unlockClue('clue_courtyard_fountain', notifyFn);
          }
        }
      ];

      if (state.flags.knowsPassphrase || state.loopNumber > 1) {
        options.unshift({
          id: 'maya_passphrase',
          label: '★ [LOOP MEMORY] "ECHO-11:57. Maya, I remember the previous 180-second loops too!"',
          reply: '"ECHO-11:57... You DO remember! Thank goodness! Listen carefully, Arin: Rowan and I tried to reverse a lab fire by ten minutes, but the Chronos Core ruptured a Ley-Line rift, summoning those Abyssal Wraiths! Align the three Underground Lab Pylons in order: 1st BETA (East), 2nd ALPHA (West), 3rd GAMMA (North), then lock the Core Console to 432 Hz!"',
          onSelect: (notifyFn) => {
            state.flags.mayaTrustsArin = true;
            state.flags.knowsPylonSequence = true;
            unlockClue('clue_maya_alliance', notifyFn);
          }
        });
      }
      return {
        speaker: 'MAYA LIN',
        role: state.flags.mayaTrustsArin ? 'AWAKE IN THE LOOP • ALLY' : `LOOP #${state.loopNumber} • PHYSICS HONORS`,
        greeting: state.flags.mayaTrustsArin
          ? '"Arin! Watch your Tension Meter—the Wraiths and the Caretaker are hunting harder this cycle. Are we ready to reach the Underground Core?"'
          : '"Keep your voice down, Arin! Something with glowing crimson eyes just glided past the Science Lab..."',
        options
      };
    }

    const options = [
      {
        id: 'rowan_intro',
        label: '"Rowan, what are those void monsters in the corridor—and what is the Caretaker hiding?"',
        reply: state.flags.rowanConfessed
          ? '"Use override code [ 9 1 0 4 ] on the Restricted Basement Blast Door! If the Basement Wraith gets close, press [G] to throw an Acoustic Decoy chime or crouch [C]!"'
          : '"Keep quiet! When the power grid tripped in the Storage Room, the containment field failed. Don\'t go near the Abyssal Wraiths—if they touch you, time violently snaps back to 11:57 PM!"'
      },
      {
        id: 'rowan_safe_overhear',
        label: '"Listen closely to what Rowan is muttering under his breath..."',
        reply: '(Rowan stares nervously at his clipboard): "...Founding date April 18... 0-4-1-8 for the Reception Safe... Staff Room keypad 7-3-9-2... Caretaker\'s Courtyard House 1-1-5-7..."',
        onSelect: (notifyFn) => {
          unlockClue('clue_history_board', notifyFn);
          unlockClue('clue_visitor_log', notifyFn);
          unlockClue('clue_courtyard_fountain', notifyFn);
        }
      }
    ];

    if (state.flags.hasIncidentReportKnowledge || state.flags.mayaTrustsArin) {
      options.unshift({
        id: 'rowan_confront',
        label: '★ [CONFRONT WITH EVIDENCE] "I read Vance\'s Incident Report. Help me stop the Wraiths and break the loop!"',
        reply: '"You found the dossier—and you remember the resets?! Okay, I\'ll tell you everything! The Underground Lab Blast Door override code is [ 9 1 0 4 ], and my Computer Lab Admin Terminal #04 password is [ CHRONO88 ]. Slip past the Basement Wraith, align the Pylons, and end this nightmare!"',
        onSelect: (notifyFn) => {
          state.flags.rowanConfessed = true;
          state.knownCodes['9104'] = 'Underground Lab Blast Door PIN';
          state.knownCodes['CHRONO88'] = 'Admin Terminal #04 Password';
          unlockClue('clue_rowan_confession', notifyFn);
          unlockClue('clue_library_compartment', notifyFn);
          unlockClue('clue_incident_report', notifyFn);
        }
      });
    }

    return {
      speaker: 'ROWAN KERR',
      role: state.flags.rowanConfessed ? 'CONFESSED • LAB ASSISTANT' : `LOOP #${state.loopNumber} • LAB ASSISTANT`,
      greeting: state.flags.rowanConfessed
        ? '"Arin! Use [ CHRONO88 ] in the Computer Lab to open the North Stairwell, then punch [ 9 1 0 4 ] into the Basement Blast Door!"'
        : '"Shh—Arin! Did you hear that low growl coming from the East Wing?"',
      options
    };
  }

  return {
    CLUE_CATALOG,
    state,
    savePersistentState,
    loadPersistentState,
    hasSavedGame,
    resetAllForNewGame,
    resetLoopStateOnly,
    unlockClue,
    addItem,
    hasItem,
    getNPCDialogue
  };
})();
