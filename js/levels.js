/* Gravity Well — Belt Alpha level data.
   Every number the player must find is derived here from the same constants the simulator uses,
   so the worked solutions always match the flight. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./physics.js'));
  else root.GWLevels = factory(root.GWPhysics);
})(typeof self !== 'undefined' ? self : this, function (P) {
  'use strict';
  const G = P.G, DEG = P.DEG;
  const n = v => P.num(v);
  const f1 = v => (Math.round(v * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const f2 = v => (Math.round(v * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const f0 = v => Math.round(v).toLocaleString('en-US');
  const sci = v => { const e = Math.floor(Math.log10(Math.abs(v))); const m = v / Math.pow(10, e); return f2(m) + ' × 10' + sup(e); };
  const sup = e => String(e).replace(/-/g, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const near = (v, target, rel) => Math.abs(n(v) - target) <= Math.abs(target) * (rel || 0.03) + 1e-9;
  const grav = (M, m, r) => G * M * m / (r * r);
  const SHIP_M = 1200;

  // ---------- Formula reference, unlocked progressively ----------
  const FORMULAS = [
    { level: 1, f: 'F = m·a', d: "Newton's 2nd law" },
    { level: 1, f: 'v = v₀ + a·t', d: 'Velocity after accelerating' },
    { level: 1, f: 'd = v₀·t + ½·a·t²', d: 'Distance while accelerating' },
    { level: 1, f: 'd = v·t', d: 'Distance at constant speed' },
    { level: 2, f: 'v² = v₀² + 2·a·d', d: 'Speed change over a distance' },
    { level: 3, f: 'J = F·Δt = m·Δv', d: 'Impulse changes momentum' },
    { level: 3, f: 'p = m·v', d: 'Momentum' },
    { level: 4, f: 'Fx = F·cos θ,  Fy = F·sin θ', d: 'Vector components (θ from +x)' },
    { level: 4, f: '|F| = √(Fx² + Fy²),  θ = atan2(Fy, Fx)', d: 'Magnitude and direction' },
    { level: 5, f: 'v_rel = v₁ − v₂', d: 'Relative velocity, same direction' },
    { level: 5, f: 't = d / v_rel', d: 'Time to close a gap' },
    { level: 6, f: 'F = G·M·m / r²', d: 'Universal gravitation' },
    { level: 6, f: 'G = 6.67 × 10⁻¹¹ N·m²/kg²', d: 'Gravitational constant' },
    { level: 7, f: 'ΣF = F₁ + F₂ (add x parts, add y parts)', d: 'Net force is a vector sum' },
    { level: 8, f: 'M·v = m₁·v₁ + m₂·v₂', d: 'Conservation of momentum' },
    { level: 9, f: 'v = √(G·M / r)', d: 'Circular orbit speed' },
    { level: 9, f: 'T = 2π·r / v', d: 'Orbital period' },
  ];

  const KNOWN_LIVE = s => [
    ['Current speed', f2(s.speed) + ' m/s', s.speed],
    ['Current heading', f1(s.heading) + '°', s.heading],
    ['Ship mass now', f0(s.mass) + ' kg', s.mass],
    ['Mission clock', 'T+' + f1(s.t) + ' s', s.t],
  ];

  const LEVELS = [];

  // ================= LEVEL 1 — Launch Window =================
  {
    const m = SHIP_M, burnT = 16, vTarget = 20, a = vTarget / burnT, F = m * a;
    LEVELS.push({
      num: 1, id: 'launch-window', title: 'Launch Window', subtitle: "Newton's 2nd law, one direction", formula: 'F = m·a',
      concept: 'FORCE AND ACCELERATION',
      ship: { mass: m, x: 0, y: 0, vx: 0, vy: 0, maxThrust: 3000 },
      legs: [{ a: [0, 0], b: [2000, 0], hw: 120, gate: { type: 'cross', window: [100, 115] } }],
      bodies: [], timeLimit: 160, fuel: { budget: 40000, par: 26400 },
      intro: 'The exit gate ahead only opens for a short window. Control has cleared you for a single 16-second main-engine burn from a standing start, then a coast. Pick the thrust that gets you there while the gate is open.',
      assumptions: 'Straight-line flight, no other forces. Headings: 0° = right (toward the gate).',
      stages: [{
        trigger: { type: 'start' }, title: 'Plan the launch burn',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['Starting speed', '0 m/s', 0],
          ['Burn duration (fixed)', burnT + ' s', burnT], ['Target cruise speed', vTarget + ' m/s', vTarget],
          ['Distance to gate', '2,000 m', 2000], ['Gate open', 'T+100 s to T+115 s', null],
        ],
        inputs: [
          { id: 'a', label: 'Acceleration needed during the burn', unit: 'm/s²', answer: () => a, hints: [
            { when: v => near(v, vTarget, 0.05), text: 'That is the target speed, not the acceleration. Acceleration is the change in speed divided by the time it takes: a = Δv / Δt.' },
            { when: v => near(v, vTarget * burnT, 0.05), text: 'You multiplied speed by time, which gives a distance. Divide instead: a = Δv / Δt.' }] },
          { id: 'F', label: 'Main-engine thrust', unit: 'N', answer: () => F, drives: true, hints: [
            { when: v => near(v, a, 0.05), text: 'You entered the acceleration in the thrust field. The engine needs a force: F = m·a.' },
            { when: v => near(v, m * vTarget, 0.05), text: 'm·v is momentum, not force. Use the acceleration you found: F = m·a.' },
            { when: v => n(v) > 3000, text: 'That exceeds the engine maximum of 3,000 N; the computer clamps it. Re-check the arithmetic.' }] },
        ],
        program: v => ({ burns: [{ force: n(v.F), heading: 0, t0: 0, dur: burnT, label: 'Main burn' }] }),
        solution: () => [
          { title: 'Step 1 · Acceleration', lines: ['a = Δv / Δt = ' + vTarget + ' / ' + burnT + ' = ' + f2(a) + ' m/s²'] },
          { title: 'Step 2 · Thrust', lines: ['F = m·a = ' + f0(m) + ' × ' + f2(a) + ' = ' + f0(F) + ' N'] },
          { title: 'Check · Arrival time', lines: ['Burn covers d = ½·a·t² = ' + f0(0.5 * a * burnT * burnT) + ' m in 16 s, leaving ' + f0(2000 - 0.5 * a * burnT * burnT) + ' m at 20 m/s = ' + f1((2000 - 0.5 * a * burnT * burnT) / vTarget) + ' s. Total ≈ ' + f1(16 + (2000 - 0.5 * a * burnT * burnT) / vTarget) + ' s, inside the window.'] },
        ],
      }],
    });
  }

  // ================= LEVEL 2 — Docking Burn =================
  {
    const m = SHIP_M, v0 = 30, d = 900, a = v0 * v0 / (2 * d), F = m * a, tB = v0 / a;
    LEVELS.push({
      num: 2, id: 'docking-burn', title: 'Docking Burn', subtitle: 'Braking to a stop at the dock', formula: 'v² = v₀² + 2·a·d',
      concept: 'KINEMATICS · STOPPING DISTANCE',
      ship: { mass: m, x: 0, y: 0, vx: v0, vy: 0, maxThrust: 2000 },
      legs: [{ a: [0, 0], b: [d, 0], hw: 100, gate: { type: 'dock', tol: 40, maxSpeed: 3 } }],
      bodies: [], timeLimit: 150, fuel: { budget: 60000, par: 40000 },
      intro: 'You are coming in hot toward the refuelling dock. Fire the engine backward (heading 180°) so the ship arrives at the dock almost stopped. The dock tolerates 3 m/s; anything faster is a collision.',
      assumptions: 'The retro-burn starts immediately and runs for the duration you enter. Arrive within 40 m of the dock at 3 m/s or less.',
      stages: [{
        trigger: { type: 'start' }, title: 'Plan the retro-burn',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['Current speed, v₀', v0 + ' m/s', v0],
          ['Distance to dock, d', f0(d) + ' m', d], ['Dock speed limit', '3 m/s', 3], ['Engine max thrust', '2,000 N', 2000],
        ],
        inputs: [
          { id: 'a', label: 'Deceleration needed to stop at the dock', unit: 'm/s²', answer: () => a, hints: [
            { when: v => near(v, v0 / d, 0.05), text: 'v / d is not an acceleration. Use v² = v₀² + 2·a·d with v = 0 and solve for a.' },
            { when: v => near(v, 2 * a, 0.05), text: 'Close — you dropped the factor of 2 in the denominator: a = v₀² / (2·d).' }] },
          { id: 'F', label: 'Retro-thrust (fired at 180°)', unit: 'N', answer: () => F, drives: true, hints: [
            { when: v => near(v, a, 0.05), text: 'That is the acceleration. Multiply by the mass to get the braking force.' }] },
          { id: 't', label: 'Burn duration', unit: 's', answer: () => tB, drives: true, hints: [
            { when: v => near(v, d / v0, 0.05), text: 'd / v₀ assumes constant speed, but you are slowing down the whole way. Use t = v₀ / a.' },
            { when: v => n(v) < tB * 0.9, text: 'The burn ends while the ship is still moving. It needs to run until v reaches 0: t = v₀ / a.' }] },
        ],
        program: v => ({ burns: [{ force: n(v.F), heading: 180, t0: 0, dur: n(v.t), label: 'Retro-burn' }] }),
        solution: () => [
          { title: 'Step 1 · Deceleration', lines: ['v² = v₀² + 2·a·d with v = 0  →  a = v₀² / (2·d) = ' + v0 + '² / (2 × ' + d + ') = ' + f2(a) + ' m/s²'] },
          { title: 'Step 2 · Braking force', lines: ['F = m·a = ' + f0(m) + ' × ' + f2(a) + ' = ' + f0(F) + ' N, fired at 180° (opposite to motion)'] },
          { title: 'Step 3 · Burn time', lines: ['t = v₀ / a = ' + v0 + ' / ' + f2(a) + ' = ' + f0(tB) + ' s'] },
        ],
      }],
    });
  }

  // ================= LEVEL 3 — Short Burst =================
  {
    const m = SHIP_M, v0 = 8, vT = 20, burst = 4, dv = vT - v0, J = m * dv, F = J / burst;
    LEVELS.push({
      num: 3, id: 'short-burst', title: 'Short Burst', subtitle: 'Impulse and momentum', formula: 'J = F·Δt = m·Δv',
      concept: 'IMPULSE',
      ship: { mass: m, x: 0, y: 0, vx: v0, vy: 0, maxThrust: 5000 },
      legs: [{ a: [0, 0], b: [1200, 0], hw: 100, gate: { type: 'cross', window: [58, 66] } }],
      bodies: [], timeLimit: 120, fuel: { budget: 25000, par: 16000 },
      intro: 'The main engine is overheating: the computer will allow exactly one 4.0-second burst, starting now. The gate 1,200 m ahead opens at T+58 s and closes at T+66 s. Control wants you cruising at 20 m/s after the burst.',
      assumptions: 'Burst duration is fixed at 4.0 s. Heading 0°.',
      stages: [{
        trigger: { type: 'start' }, title: 'Size the burst',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['Current speed', v0 + ' m/s', v0], ['Target speed after burst', vT + ' m/s', vT],
          ['Burst duration (fixed)', burst.toFixed(1) + ' s', burst], ['Distance to gate', '1,200 m', 1200], ['Gate open', 'T+58 s to T+66 s', null],
        ],
        inputs: [
          { id: 'dv', label: 'Speed change needed, Δv', unit: 'm/s', answer: () => dv, hints: [
            { when: v => near(v, vT, 0.05), text: 'You already move at 8 m/s. Δv is the difference between the target and the current speed.' }] },
          { id: 'J', label: 'Impulse needed, J', unit: 'N·s', answer: () => J, hints: [
            { when: v => near(v, m * vT, 0.05), text: 'That is the final momentum. Impulse is the change in momentum: J = m·Δv.' },
            { when: v => near(v, dv, 0.05), text: 'Impulse has units of N·s (or kg·m/s). Multiply Δv by the ship mass.' }] },
          { id: 'F', label: 'Burst thrust', unit: 'N', answer: () => F, drives: true, hints: [
            { when: v => near(v, J, 0.05), text: 'That is the impulse. Spread it over the 4-second burst: F = J / Δt.' },
            { when: v => near(v, J * burst, 0.05), text: 'You multiplied by the burst time; divide instead: F = J / Δt.' }] },
        ],
        program: v => ({ burns: [{ force: n(v.F), heading: 0, t0: 0, dur: burst, label: 'Burst' }] }),
        solution: () => [
          { title: 'Step 1 · Speed change', lines: ['Δv = ' + vT + ' − ' + v0 + ' = ' + dv + ' m/s'] },
          { title: 'Step 2 · Impulse', lines: ['J = m·Δv = ' + f0(m) + ' × ' + dv + ' = ' + f0(J) + ' N·s'] },
          { title: 'Step 3 · Thrust', lines: ['F = J / Δt = ' + f0(J) + ' / ' + burst + ' = ' + f0(F) + ' N'] },
          { title: 'Check', lines: ['Burst covers ' + f0(v0 * burst + 0.5 * (F / m) * burst * burst) + ' m; the remaining ' + f0(1200 - (v0 * burst + 0.5 * (F / m) * burst * burst)) + ' m at 20 m/s takes ' + f1((1200 - (v0 * burst + 0.5 * (F / m) * burst * burst)) / vT) + ' s. Arrival ≈ T+' + f1(burst + (1200 - (v0 * burst + 0.5 * (F / m) * burst * burst)) / vT) + ' s.'] },
        ],
      }],
    });
  }

  // ================= LEVEL 4 — Crosscurrent =================
  {
    const m = SHIP_M, Fmag = 600, burnT = 30, gx = 1600, gy = 1200;
    const theta = Math.atan2(gy, gx) / DEG, Fx = Fmag * Math.cos(theta * DEG), Fy = Fmag * Math.sin(theta * DEG);
    LEVELS.push({
      num: 4, id: 'crosscurrent', title: 'Crosscurrent', subtitle: 'Vector components, thrust angle', formula: 'Fx = F·cos θ',
      concept: 'VECTORS · COMPONENTS',
      ship: { mass: m, x: 0, y: 0, vx: 0, vy: 0, maxThrust: Fmag },
      legs: [{ a: [0, 0], b: [gx, gy], hw: 150, gate: { type: 'cross' } }],
      bodies: [], timeLimit: 220, fuel: { budget: 30000, par: 20000 },
      intro: 'The corridor runs diagonally: the gate is 1,600 m right and 1,200 m up from you. The manoeuvring computer takes thrust as x and y components. The engine delivers 600 N for a fixed 30-second burn from rest; aim it exactly along the corridor or you will clip the rocks.',
      assumptions: 'Burn runs 30 s from T+0, then coast. Component magnitudes above 600 N total are clamped.',
      stages: [{
        trigger: { type: 'start' }, title: 'Aim the burn',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['Engine thrust, F', Fmag + ' N', Fmag], ['Burn duration (fixed)', burnT + ' s', burnT],
          ['Gate offset, x', f0(gx) + ' m', gx], ['Gate offset, y', f0(gy) + ' m', gy], ['Corridor half-width', '150 m', 150],
        ],
        inputs: [
          { id: 'theta', label: 'Thrust heading θ (from +x)', unit: 'deg', answer: () => theta, hints: [
            { when: v => near(v, 90 - theta, 0.03), text: 'That is the angle measured from the y-axis. Headings are measured from +x: θ = atan2(y, x).' },
            { when: v => near(v, gy / gx, 0.05), text: 'y / x is the tangent of the angle, not the angle. Take atan.' }] },
          { id: 'Fx', label: 'Thrust x-component', unit: 'N', answer: () => Fx, drives: true, hints: [
            { when: v => near(v, Fy, 0.03), text: 'The components look swapped: the x part goes with cos θ and is the larger one here.' }] },
          { id: 'Fy', label: 'Thrust y-component', unit: 'N', answer: () => Fy, drives: true, hints: [
            { when: v => near(v, Fx, 0.03), text: 'The components look swapped: the y part goes with sin θ.' },
            { when: v => Math.abs(n(v)) < 1, text: 'With no y-thrust the ship flies straight along x and misses the diagonal corridor.' }] },
        ],
        program: v => ({ burns: [{ fx: n(v.Fx), fy: n(v.Fy), t0: 0, dur: burnT, label: 'Burn' }] }),
        solution: () => [
          { title: 'Step 1 · Heading', lines: ['θ = atan2(' + gy + ', ' + gx + ') = ' + f2(theta) + '°  (a 3-4-5 triangle)'] },
          { title: 'Step 2 · Components', lines: ['Fx = F·cos θ = 600 × ' + f2(Math.cos(theta * DEG)) + ' = ' + f0(Fx) + ' N', 'Fy = F·sin θ = 600 × ' + f2(Math.sin(theta * DEG)) + ' = ' + f0(Fy) + ' N'] },
          { title: 'Check', lines: ['√(480² + 360²) = 600 N, and 360/480 = 1200/1600, so the thrust points straight down the corridor.'] },
        ],
      }],
    });
  }

  // ================= LEVEL 5 — Closing Gap =================
  {
    const m = SHIP_M, v1 = 10, v2 = 4, gap = 600, vRel = v1 - v2, tCap = gap / vRel, R = 30;
    LEVELS.push({
      num: 5, id: 'closing-gap', title: 'Closing Gap', subtitle: 'Relative velocity and timing', formula: 'v_rel = v₁ − v₂',
      concept: 'RELATIVE MOTION',
      ship: { mass: m, x: 0, y: 0, vx: v1, vy: 0, maxThrust: 500 },
      legs: [{ a: [0, 0], b: [1500, 0], hw: 100, gate: { type: 'none', failMsg: 'Flew out of the end of the corridor without capturing the drone.' } }],
      agents: [{ kind: 'drone', name: 'Supply drone', x: gap, y: 0, vx: v2, vy: 0 }],
      bodies: [], timeLimit: 200, fuel: { budget: 0, par: 0 },
      intro: 'A supply drone is drifting ahead of you in the corridor. No burns this time: arm the docking clamp to fire at the exact moment you draw level with it. The clamp reaches 30 m.',
      assumptions: 'Both craft keep constant speed. The clamp fires once, at the time you enter.',
      stages: [{
        trigger: { type: 'start' }, title: 'Arm the clamp',
        known: () => [
          ['Your speed, v₁', v1 + ' m/s', v1], ['Drone speed, v₂', v2 + ' m/s (same direction)', v2],
          ['Gap to drone', f0(gap) + ' m', gap], ['Clamp reach', R + ' m', R],
        ],
        inputs: [
          { id: 'vrel', label: 'Closing speed, v_rel', unit: 'm/s', answer: () => vRel, hints: [
            { when: v => near(v, v1 + v2, 0.03), text: 'Both craft move the same way, so their speeds subtract rather than add.' },
            { when: v => near(v, v1, 0.03), text: 'The drone is moving too. Closing speed is your speed minus the drone\'s.' }] },
          { id: 't', label: 'Fire the clamp at T+', unit: 's', answer: () => tCap, drives: true, hints: [
            { when: v => near(v, gap / v1, 0.03), text: 'That ignores the drone\'s own motion: it keeps moving away while you close in. Divide the gap by the closing speed.' },
            { when: v => near(v, gap / v2, 0.03), text: 'You divided by the drone\'s speed. Use the closing speed, v₁ − v₂.' }] },
        ],
        program: v => ({ events: [{ t: n(v.t), label: 'Clamp', run: sim => {
          const d = sim.agents[0]; const dist = Math.hypot(d.x - sim.x, d.y - sim.y);
          sim.extra.clampDist = dist; sim.extra.clampT = sim.t;
          if (dist <= R) sim.end('success');
          else sim.end('fail', 'Clamp fired at T+' + f1(sim.t) + ' s, but the drone was ' + f0(dist) + ' m ' + (d.x > sim.x ? 'ahead' : 'behind') + ' — out of reach.', 'clamp');
        } }] }),
        solution: () => [
          { title: 'Step 1 · Closing speed', lines: ['v_rel = v₁ − v₂ = ' + v1 + ' − ' + v2 + ' = ' + vRel + ' m/s'] },
          { title: 'Step 2 · Time to close the gap', lines: ['t = d / v_rel = ' + gap + ' / ' + vRel + ' = ' + f0(tCap) + ' s'] },
          { title: 'Check', lines: ['At T+100 s you are at 1,000 m and the drone is at 600 + 4 × 100 = 1,000 m.'] },
        ],
      }],
    });
  }

  // ================= LEVEL 6 — Pull of KR-6 =================
  {
    const m = SHIP_M, M = 4.5e15, r = 1500, v = 25, len = 3000, Fg = grav(M, m, r), tLeg = len / v;
    LEVELS.push({
      num: 6, id: 'pull-of-kr6', title: 'Pull of KR-6', subtitle: 'Universal gravitation', formula: 'F = G·M·m / r²',
      concept: 'UNIVERSAL GRAVITATION',
      ship: { mass: m, x: 0, y: 0, vx: v, vy: 0, maxThrust: 500 },
      legs: [{ a: [0, 0], b: [len, 0], hw: 200, gate: { type: 'cross' } }],
      bodies: [{ name: 'KR-6', x: 1500, y: -1500, mass: M, radius: 300, field: 'uniform', uniformR: r, uniformDir: 270, kind: 'k' }],
      timeLimit: 180, fuel: { budget: 30000, par: 21000 },
      intro: 'A heavy asteroid, KR-6, sits below the safe corridor. Its gravity will drag your ship sideways into the rocks. Fire the thruster to cancel that pull exactly, and hold a straight line all the way to the gate.',
      assumptions: 'For this level the pull is treated as constant: distance to KR-6 stays 1,500 m during the pass and the force points straight down (270°). Headings: 0° = right, 90° = up.',
      stages: [{
        trigger: { type: 'start' }, title: 'Cancel the pull',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['Ship velocity, v', v + ' m/s at 0°', v],
          ['Asteroid mass, M', sci(M) + ' kg', M], ['Distance to asteroid, r', f0(r) + ' m', r],
          ['Gravitational constant, G', '6.67 × 10⁻¹¹ N·m²/kg²', G], ['Corridor length', f0(len) + ' m', len],
        ],
        inputs: [
          { id: 'Fg', label: 'Gravitational force on ship from KR-6', unit: 'N', answer: () => Fg, hints: [
            { when: val => near(val, Fg / m, 0.05), text: 'That is G·M / r², an acceleration (m/s²), not a force. A force in newtons needs the ship\'s mass in it too.' },
            { when: val => near(val, G * M * m / r, 0.05), text: 'Check the denominator: the distance is squared, r².' },
            { when: val => near(val, Fg * r, 0.05) || n(val) > 1e5, text: 'Far too large. Re-check the powers of ten: G is 6.67 × 10⁻¹¹.' }] },
          { id: 'F', label: 'Thrust force', unit: 'N', answer: () => Fg, drives: true, hints: [
            { when: (val, s, vals) => near(val, n(vals.Fg), 0.01) && !near(n(vals.Fg), Fg, 0.03), text: 'Thrust follows from the gravity value, which is off. Fix that first.' },
            { when: val => Math.abs(n(val)) < 1, text: 'With no thrust, nothing opposes the pull and the ship accelerates into the rocks.' }] },
          { id: 'h', label: 'Thrust heading', unit: 'deg', answer: () => 90, drives: true, hints: [
            { when: val => near(val, 270, 0.02), text: '270° points toward KR-6 — that doubles the pull. Thrust must point away from it: 90°.' },
            { when: val => near(val, 0, 0.02) || near(val, 180, 0.02), text: 'Thrust along the corridor does nothing about a sideways pull. Point it straight away from the asteroid.' }] },
          { id: 't', label: 'Burn duration', unit: 's', answer: () => tLeg, drives: true, hints: [
            { when: val => n(val) < tLeg * 0.85, text: 'The burn cuts out before the corridor ends, and gravity keeps pulling after cutoff. Burn for the whole pass: t = d / v.' }] },
        ],
        program: vals => ({ burns: [{ force: n(vals.F), heading: n(vals.h), t0: 0, dur: n(vals.t), label: 'Thrust' }] }),
        solution: () => [
          { title: 'Step 1 · Gravity on the ship', lines: ['F = G·M·m / r² = (6.67×10⁻¹¹)(' + sci(M) + ')(' + f0(m) + ') / (' + f0(r) + ')²', '= ' + sci(G * M * m) + ' / ' + sci(r * r) + ' = ' + f1(Fg) + ' N, toward KR-6 (270°)'] },
          { title: 'Step 2 · Cancel it', lines: ['Net force must be zero to fly straight, so thrust = ' + f1(Fg) + ' N pointing the opposite way, 90°.'] },
          { title: 'Step 3 · Burn time', lines: ['t = d / v = ' + f0(len) + ' / ' + v + ' = ' + f0(tLeg) + ' s'] },
          { title: 'If left uncorrected', lines: ['a = F / m = ' + f2(Fg / m) + ' m/s² toward KR-6; drift = ½·a·t² reaches the 200 m corridor edge at t = √(2·200 / ' + f2(Fg / m) + ') ≈ ' + f1(Math.sqrt(400 / (Fg / m))) + ' s.'] },
        ],
      }],
    });
  }

  // ================= LEVEL 7 — Crossfire =================
  {
    const m = SHIP_M, v = 25, len = 2500, tLeg = len / v;
    const A = { M: 3.6e15, r: 1000, dir: 270 }, B = { M: 2.0e15, r: 1000, dir: 30 };
    const F1 = grav(A.M, m, A.r), F2 = grav(B.M, m, B.r);
    const SFx = F1 * Math.cos(A.dir * DEG) + F2 * Math.cos(B.dir * DEG), SFy = F1 * Math.sin(A.dir * DEG) + F2 * Math.sin(B.dir * DEG);
    const SF = Math.hypot(SFx, SFy), hThrust = ((Math.atan2(-SFy, -SFx) / DEG) + 360) % 360, hNet = ((Math.atan2(SFy, SFx) / DEG) + 360) % 360;
    LEVELS.push({
      num: 7, id: 'crossfire', title: 'Crossfire', subtitle: 'Net force from two asteroids', formula: 'ΣF = F₁ + F₂',
      concept: 'VECTOR SUM OF FORCES',
      ship: { mass: m, x: 0, y: 0, vx: v, vy: 0, maxThrust: 500 },
      legs: [{ a: [0, 0], b: [len, 0], hw: 200, gate: { type: 'cross' } }],
      bodies: [
        { name: 'KR-7A', x: 1250, y: -1000, mass: A.M, radius: 230, field: 'uniform', uniformR: A.r, uniformDir: A.dir, kind: 'k' },
        { name: 'KR-7B', x: 1250 + 1000 * Math.cos(30 * DEG), y: 1000 * Math.sin(30 * DEG), mass: B.M, radius: 180, field: 'uniform', uniformR: B.r, uniformDir: B.dir, kind: 's' },
      ],
      timeLimit: 160, fuel: { budget: 36000, par: 28000 },
      intro: 'Two asteroids flank the corridor and pull in different directions. Work out each pull, add them as vectors, then fire one thrust that cancels the total for the whole 100-second pass.',
      assumptions: 'Each pull is treated as constant in size and direction during the pass (bearings and distances as listed). The burn lasts the full corridor time of 100 s.',
      stages: [{
        trigger: { type: 'start' }, title: 'Cancel the net pull',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['Ship velocity', v + ' m/s at 0°', v], ['Pass duration (fixed burn)', f0(tLeg) + ' s', tLeg],
          ['KR-7A mass', sci(A.M) + ' kg', A.M], ['KR-7A distance / bearing', f0(A.r) + ' m at ' + A.dir + '°', A.r],
          ['KR-7B mass', sci(B.M) + ' kg', B.M], ['KR-7B distance / bearing', f0(B.r) + ' m at ' + B.dir + '°', B.r],
          ['Gravitational constant, G', '6.67 × 10⁻¹¹', G],
        ],
        inputs: [
          { id: 'F1', label: 'Pull from KR-7A', unit: 'N', answer: () => F1, hints: [{ when: val => near(val, F1 / m, 0.05), text: 'G·M/r² is an acceleration; multiply by the ship mass for a force.' }] },
          { id: 'F2', label: 'Pull from KR-7B', unit: 'N', answer: () => F2, hints: [{ when: val => near(val, F2 / m, 0.05), text: 'G·M/r² is an acceleration; multiply by the ship mass for a force.' }] },
          { id: 'SFx', label: 'Net pull, x-component ΣFx', unit: 'N', answer: () => SFx, hints: [
            { when: val => near(val, F1 + F2, 0.03), text: 'You added magnitudes. Forces are vectors: ΣFx = F₁·cos 270° + F₂·cos 30°.' }] },
          { id: 'SFy', label: 'Net pull, y-component ΣFy', unit: 'N', answer: () => SFy, hints: [
            { when: val => near(val, -SFy, 0.03), text: 'Sign is flipped: KR-7A pulls down (sin 270° = −1), so ΣFy is negative.' },
            { when: val => near(val, -(F1 + F2 * Math.sin(30 * DEG)), 0.03) === false && near(val, -F1 - F2, 0.03), text: 'KR-7B pulls up-and-right, so its y part is +F₂·sin 30°, not −F₂.' }] },
          { id: 'F', label: 'Thrust magnitude', unit: 'N', answer: () => SF, drives: true, hints: [
            { when: val => near(val, F1 + F2, 0.03), text: 'Forces are vectors: add components, not magnitudes, then take √(ΣFx² + ΣFy²).' }] },
          { id: 'h', label: 'Thrust heading', unit: 'deg', answer: () => hThrust, drives: true, hints: [
            { when: val => near(((n(val) % 360) + 360) % 360, hNet, 0.02), text: 'That is the direction of the net pull. Thrust must point the opposite way: add 180°.' },
            { when: val => near(((n(val) % 360) + 360) % 360, 90, 0.03), text: 'Straight up only cancels a straight-down pull. The net pull here also has an x part.' }] },
        ],
        program: vals => ({ burns: [{ force: n(vals.F), heading: n(vals.h), t0: 0, dur: tLeg, label: 'Thrust' }] }),
        solution: () => [
          { title: 'Step 1 · Each pull', lines: ['F₁ = G·M₁·m / r₁² = ' + f1(F1) + ' N at 270°', 'F₂ = G·M₂·m / r₂² = ' + f1(F2) + ' N at 30°'] },
          { title: 'Step 2 · Components', lines: ['ΣFx = ' + f1(F1) + '·cos 270° + ' + f1(F2) + '·cos 30° = 0 + ' + f1(F2 * Math.cos(30 * DEG)) + ' = ' + f1(SFx) + ' N', 'ΣFy = ' + f1(F1) + '·sin 270° + ' + f1(F2) + '·sin 30° = −' + f1(F1) + ' + ' + f1(F2 * 0.5) + ' = ' + f1(SFy) + ' N'] },
          { title: 'Step 3 · Net pull', lines: ['|ΣF| = √(' + f1(SFx) + '² + ' + f1(SFy) + '²) = ' + f1(SF) + ' N, direction atan2(' + f1(SFy) + ', ' + f1(SFx) + ') = ' + f1(hNet) + '°'] },
          { title: 'Step 4 · Thrust', lines: ['Same size, opposite direction: ' + f1(SF) + ' N at ' + f1(hNet) + '° + 180° = ' + f1(hThrust) + '°'] },
        ],
      }],
    });
  }

  // ================= LEVEL 8 — Cargo Drop =================
  {
    const mShip = SHIP_M, mPod = 300, Mtot = mShip + mPod, v = 20, d1 = 1000, d2 = 1575, tWin = 60;
    const vNeed = d2 / tWin, u = (mShip * vNeed - Mtot * v) / mPod;  // pod ground speed backward
    LEVELS.push({
      num: 8, id: 'cargo-drop', title: 'Cargo Drop', subtitle: 'Conservation of momentum', formula: 'M·v = m₁v₁ + m₂v₂',
      concept: 'CONSERVATION OF MOMENTUM',
      ship: { mass: Mtot, x: 0, y: 0, vx: v, vy: 0, maxThrust: 500 },
      legs: [
        { a: [0, 0], b: [d1, 0], hw: 120, gate: { type: 'cross' } },
        { a: [d1, 0], b: [d1 + d2, 0], hw: 120, gate: { type: 'cross', window: [58.5, 61.5] } },
      ],
      bodies: [], timeLimit: 200, fuel: { budget: 0, par: 0 },
      intro: 'You are hauling a 300 kg cargo pod and coasting with the engine cold. At the drop zone you will eject the pod backward to a recovery tug. The recoil speeds the ship up: use it to hit the timed gate beyond.',
      assumptions: 'Leg 1 is a plain coast. At the drop zone the sim pauses for the release calculation. The pod is ejected straight backward (heading 180°) at the speed you enter, measured against the corridor.',
      stages: [
        { trigger: { type: 'start' }, title: 'Coast to the drop zone',
          known: () => [['Ship + pod mass', f0(Mtot) + ' kg', Mtot], ['Speed', v + ' m/s', v], ['Distance to drop zone', f0(d1) + ' m', d1]],
          inputs: [], program: () => ({}), note: 'No burn on this leg. The flight pauses at the drop zone for the release calculation.',
          solution: () => [{ title: 'Leg 1', lines: ['Nothing to compute: coast ' + f0(d1) + ' m at ' + v + ' m/s (' + f0(d1 / v) + ' s).'] }] },
        { trigger: { type: 'gate', leg: 0 }, title: 'Checkpoint · release the pod', checkpoint: true,
          known: s => KNOWN_LIVE(s).concat([
            ['Pod mass', f0(mPod) + ' kg', mPod], ['Ship mass without pod', f0(mShip) + ' kg', mShip],
            ['Gate 2 distance', f0(d2) + ' m', d2], ['Gate 2 opens', tWin + ' s after release (±1.5 s)', tWin],
          ]),
          inputs: [
            { id: 'vneed', label: 'Ship speed needed after release', unit: 'm/s', answer: () => vNeed, hints: [
              { when: val => near(val, v, 0.02), text: 'At the current speed you arrive late. The gate is 1,575 m away and opens in 60 s: v = d / t.' }] },
            { id: 'u', label: 'Pod ejection speed (backward, heading 180°)', unit: 'm/s', answer: () => u, drives: true, hints: [
              { when: val => near(val, vNeed - v, 0.05), text: 'The ship\'s speed gain is not the pod\'s speed. Momentum is conserved: m_pod·u = m_ship·Δv, and the pod is much lighter than the ship.' },
              { when: val => near(val, vNeed + u, 0.03), text: 'That looks like the pod\'s speed relative to the ship. The computer wants its speed against the corridor.' },
              { when: val => near(val, Mtot * (vNeed - v) / mPod, 0.03), text: 'After release the ship is 1,200 kg, not 1,500. Use m_ship·v\' on the right-hand side.' },
              { when: val => n(val) < 0, text: 'A negative value would push the pod forward and slow the ship down.' }] },
          ],
          program: (vals, sim) => ({ events: [{ t: 0, label: 'Release', run: s => {
            const uu = n(vals.u); const ux = Math.cos(s.heading * DEG), uy = Math.sin(s.heading * DEG);
            const podVx = -uu * ux, podVy = -uu * uy;
            const vx2 = (Mtot * s.vx - mPod * podVx) / mShip, vy2 = (Mtot * s.vy - mPod * podVy) / mShip;
            s.vx = vx2; s.vy = vy2; s.mass = mShip;
            s.agents.push({ kind: 'pod', name: 'Cargo pod', x: s.x - 20, y: s.y, vx: podVx, vy: podVy });
            s.extra.released = { u: uu, vAfter: Math.hypot(vx2, vy2) };
          } }] }),
          solution: s => [
            { title: 'Step 1 · Speed needed', lines: ['v\' = d / t = ' + f0(d2) + ' / ' + tWin + ' = ' + f2(vNeed) + ' m/s'] },
            { title: 'Step 2 · Conserve momentum', lines: ['Before: M·v = ' + f0(Mtot) + ' × ' + f2(s.speed) + ' = ' + f0(Mtot * s.speed) + ' kg·m/s', 'After: m_ship·v\' + m_pod·(−u) = ' + f0(mShip) + ' × ' + f2(vNeed) + ' − ' + f0(mPod) + '·u', 'u = (' + f0(mShip) + ' × ' + f2(vNeed) + ' − ' + f0(Mtot * s.speed) + ') / ' + f0(mPod) + ' = ' + f2((mShip * vNeed - Mtot * s.speed) / mPod) + ' m/s backward'] },
          ] },
      ],
    });
  }

  // ================= LEVEL 9 — Holding Pattern =================
  {
    const m = SHIP_M, M = 6.0e16, r = 2000, v0 = 30, Fb = 5000, vOrb = Math.sqrt(G * M / r), dv = vOrb - v0, tBurn = dv * m / Fb;
    LEVELS.push({
      num: 9, id: 'holding-pattern', title: 'Holding Pattern', subtitle: 'Circular orbit around a big rock', formula: 'v = √(G·M / r)',
      concept: 'CIRCULAR ORBIT',
      ship: { mass: m, x: r, y: 0, vx: 0, vy: v0, maxThrust: Fb },
      legs: [{ type: 'orbit', body: 0, r, rmin: 1800, rmax: 2200, dir: 1, sweep: Math.PI, gate: { type: 'cross' } }],
      bodies: [{ name: 'KR-9', x: 0, y: 0, mass: M, radius: 420, field: 'true', kind: 'c' }],
      timeLimit: 320, fuel: { budget: 30000, par: 20000 },
      intro: 'KR-9 is big enough to orbit. You are 2,000 m out, moving sideways at 30 m/s — too slow to stay up. Fire a short prograde burn (5,000 N, heading 90°) to reach circular-orbit speed, then coast half an orbit to the pickup gate on the far side without leaving the safe band.',
      assumptions: 'Gravity here is the real inverse-square pull. The burn starts at T+0 at full 5,000 N; keep it short so the orbit assumption holds. Safe band: 1,800 m to 2,200 m from the centre.',
      stages: [{
        trigger: { type: 'start' }, title: 'Circularise',
        known: () => [
          ['Ship mass, m', f0(m) + ' kg', m], ['KR-9 mass, M', sci(M) + ' kg', M], ['Orbit radius, r', f0(r) + ' m', r],
          ['Current speed (tangential)', v0 + ' m/s', v0], ['Burn thrust (fixed)', f0(Fb) + ' N at 90°', Fb], ['G', '6.67 × 10⁻¹¹', G],
        ],
        inputs: [
          { id: 'v', label: 'Circular-orbit speed at r', unit: 'm/s', answer: () => vOrb, hints: [
            { when: val => near(val, G * M / r, 0.03), text: 'That is G·M / r itself. Orbital speed is its square root.' },
            { when: val => near(val, Math.sqrt(G * M / (r * r)), 0.05), text: 'You squared the radius: that gives √g, not orbital speed. v = √(G·M / r), with r to the first power.' }] },
          { id: 'dv', label: 'Speed change needed, Δv', unit: 'm/s', answer: () => dv, hints: [
            { when: val => near(val, vOrb, 0.03), text: 'You already have 30 m/s. Δv is the difference to the orbital speed.' }] },
          { id: 't', label: 'Burn duration', unit: 's', answer: () => tBurn, drives: true, hints: [
            { when: val => near(val, vOrb * m / Fb, 0.03), text: 'That burns for the full orbital speed; you only need the extra 14.7 m/s. t = m·Δv / F.' },
            { when: val => near(val, dv / Fb, 0.05) || near(val, dv, 0.03), text: 't = m·Δv / F — the mass is missing.' },
            { when: val => near(val, Fb / (m * dv), 0.05), text: 'Inverted: t = m·Δv / F.' }] },
        ],
        program: vals => ({ burns: [{ force: Fb, heading: 90, t0: 0, dur: n(vals.t), label: 'Prograde burn' }] }),
        solution: () => [
          { title: 'Step 1 · Orbital speed', lines: ['v = √(G·M / r) = √(6.67×10⁻¹¹ × ' + sci(M) + ' / ' + f0(r) + ') = √' + f0(G * M / r) + ' = ' + f2(vOrb) + ' m/s'] },
          { title: 'Step 2 · Speed to add', lines: ['Δv = ' + f2(vOrb) + ' − ' + v0 + ' = ' + f2(dv) + ' m/s'] },
          { title: 'Step 3 · Burn time', lines: ['J = m·Δv = ' + f0(m) + ' × ' + f2(dv) + ' = ' + f0(m * dv) + ' N·s;  t = J / F = ' + f0(m * dv) + ' / ' + f0(Fb) + ' = ' + f2(tBurn) + ' s'] },
          { title: 'Check · Half orbit', lines: ['T/2 = π·r / v = π × ' + f0(r) + ' / ' + f2(vOrb) + ' ≈ ' + f0(Math.PI * r / vOrb) + ' s to the far-side gate.'] },
        ],
      }],
    });
  }

  // ================= LEVEL 10 — The Gauntlet =================
  {
    const m = SHIP_M, v0 = 20;
    const A = { M: 3.0e15, r: 1200, dir: 270 }, FA = grav(A.M, m, A.r), len1 = 2000;
    const len2 = 1500, win = [50, 54], burst = 4, tAim = (win[0] + win[1]) / 2, vAim = len2 / tAim;
    const B = { M: 2.5e15, r: 1000, dir: 300 }, C = { M: 1.5e15, r: 1000, dir: 60 }, len3 = 2000;
    const FB = grav(B.M, m, B.r), FC = grav(C.M, m, C.r);
    const SFx = FB * Math.cos(B.dir * DEG) + FC * Math.cos(C.dir * DEG), SFy = FB * Math.sin(B.dir * DEG) + FC * Math.sin(C.dir * DEG);
    const SF = Math.hypot(SFx, SFy), hThrust = ((Math.atan2(-SFy, -SFx) / DEG) + 360) % 360, hNet = ((Math.atan2(SFy, SFx) / DEG) + 360) % 360;
    const x1 = len1, x2 = len1 + len2, x3 = x2 + len3;
    LEVELS.push({
      num: 10, id: 'gauntlet', title: 'The Gauntlet', subtitle: 'Three legs, every force so far', formula: 'all of the above',
      concept: 'FINAL · THREE LEGS · SHARED FUEL',
      ship: { mass: m, x: 0, y: 0, vx: v0, vy: 0, maxThrust: 3000 },
      legs: [
        { a: [0, 0], b: [x1, 0], hw: 200, gate: { type: 'cross' } },
        { a: [x1, 0], b: [x2, 0], hw: 150, gate: { type: 'cross', window: win } },
        { a: [x2, 0], b: [x3, 0], hw: 200, gate: { type: 'cross' } },
      ],
      bodies: [
        { name: 'KR-10A', x: 1000, y: -1200, mass: A.M, radius: 250, field: 'uniform', uniformR: A.r, uniformDir: A.dir, legs: [0], kind: 'k' },
        { name: 'KR-10B', x: x2 + 1000 + 1000 * Math.cos(B.dir * DEG), y: 1000 * Math.sin(B.dir * DEG), mass: B.M, radius: 210, field: 'uniform', uniformR: B.r, uniformDir: B.dir, legs: [2], kind: 'k' },
        { name: 'KR-10C', x: x2 + 1000 + 1000 * Math.cos(C.dir * DEG), y: 1000 * Math.sin(C.dir * DEG), mass: C.M, radius: 170, field: 'uniform', uniformR: C.r, uniformDir: C.dir, legs: [2], kind: 's' },
      ],
      timeLimit: 400, fuel: { budget: 48000, par: 42000 },
      intro: 'Three legs, one fuel tank. Leg 1: cancel the pull of KR-10A. Leg 2: a timed gate — burst to the right speed. Leg 3: cancel the crossfire of two more asteroids. The sim pauses at each gate so you can plan from live telemetry; errors carry forward.',
      assumptions: 'Uniform-pull approximation on legs 1 and 3 (bearings and distances as listed). Fuel is shared across all three legs: 48,000 N·s total.',
      stages: [
        { trigger: { type: 'start' }, title: 'Leg 1 · cancel KR-10A',
          known: () => [
            ['Ship mass, m', f0(m) + ' kg', m], ['Speed', v0 + ' m/s at 0°', v0], ['Leg 1 length', f0(len1) + ' m', len1],
            ['KR-10A mass', sci(A.M) + ' kg', A.M], ['KR-10A distance / bearing', f0(A.r) + ' m at ' + A.dir + '°', A.r], ['G', '6.67 × 10⁻¹¹', G],
          ],
          inputs: [
            { id: 'Fg', label: 'Pull from KR-10A', unit: 'N', answer: () => FA, hints: [{ when: val => near(val, FA / m, 0.05), text: 'That is an acceleration. Multiply by the ship mass.' }] },
            { id: 'F', label: 'Thrust force', unit: 'N', answer: () => FA, drives: true, hints: [] },
            { id: 'h', label: 'Thrust heading', unit: 'deg', answer: () => 90, drives: true, hints: [{ when: val => near(val, 270, 0.02), text: '270° points at the asteroid. Push away from it: 90°.' }] },
            { id: 't', label: 'Burn duration', unit: 's', answer: () => len1 / v0, drives: true, hints: [{ when: val => n(val) < len1 / v0 * 0.85, text: 'Burn for the whole leg: t = d / v.' }] },
          ],
          program: vals => ({ burns: [{ force: n(vals.F), heading: n(vals.h), t0: 0, dur: n(vals.t), label: 'Thrust' }] }),
          solution: () => [
            { title: 'Pull', lines: ['F = G·M·m / r² = ' + f1(FA) + ' N at 270°'] },
            { title: 'Thrust', lines: [f1(FA) + ' N at 90° for d / v = ' + f0(len1) + ' / ' + v0 + ' = ' + f0(len1 / v0) + ' s'] },
          ] },
        { trigger: { type: 'gate', leg: 0 }, title: 'Checkpoint · Leg 2 · timed gate', checkpoint: true,
          known: s => KNOWN_LIVE(s).concat([
            ['Leg 2 length', f0(len2) + ' m', len2], ['Gate 2 open', 'T+' + win[0] + ' s to T+' + win[1] + ' s from now', null],
            ['Burst duration (fixed)', burst.toFixed(1) + ' s, starting now', burst], ['Engine max thrust', '3,000 N', 3000],
          ]),
          inputs: [
            { id: 'vt', label: 'Cruise speed to aim for', unit: 'm/s', answer: () => vAim, tol: 0.04, hints: [
              { when: val => near(val, len2 / win[0], 0.01) || near(val, len2 / win[1], 0.01), text: 'Aiming at the very edge of the window leaves no margin. Aim for the middle: T+52 s.' }] },
            { id: 'dv', label: 'Speed change, Δv', unit: 'm/s', answer: s => vAim - s.speed, tol: 0.08, hints: [
              { when: (val, s) => near(val, vAim, 0.03), text: 'You are already moving at about ' + '20 m/s. Δv is the difference.' }] },
            { id: 'J', label: 'Impulse, J', unit: 'N·s', answer: s => m * (vAim - s.speed), tol: 0.08, hints: [] },
            { id: 'F', label: 'Burst thrust', unit: 'N', answer: s => m * (vAim - s.speed) / burst, tol: 0.08, drives: true, hints: [
              { when: (val, s) => near(val, m * (vAim - s.speed), 0.05), text: 'That is the impulse. Divide by the 4-second burst: F = J / Δt.' }] },
          ],
          program: vals => ({ burns: [{ force: n(vals.F), heading: 0, t0: 0, dur: burst, label: 'Burst' }] }),
          solution: s => [
            { title: 'Speed to aim for', lines: ['Middle of the window: v = ' + f0(len2) + ' / ' + tAim + ' = ' + f2(vAim) + ' m/s'] },
            { title: 'Impulse', lines: ['Δv = ' + f2(vAim) + ' − ' + f2(s.speed) + ' = ' + f2(vAim - s.speed) + ' m/s;  J = m·Δv = ' + f0(m * (vAim - s.speed)) + ' N·s'] },
            { title: 'Thrust', lines: ['F = J / Δt = ' + f0(m * (vAim - s.speed)) + ' / ' + burst + ' = ' + f0(m * (vAim - s.speed) / burst) + ' N at 0°'] },
          ] },
        { trigger: { type: 'gate', leg: 1 }, title: 'Checkpoint · Leg 3 · crossfire', checkpoint: true,
          known: s => KNOWN_LIVE(s).concat([
            ['Leg 3 length', f0(len3) + ' m', len3],
            ['KR-10B mass', sci(B.M) + ' kg', B.M], ['KR-10B distance / bearing', f0(B.r) + ' m at ' + B.dir + '°', B.r],
            ['KR-10C mass', sci(C.M) + ' kg', C.M], ['KR-10C distance / bearing', f0(C.r) + ' m at ' + C.dir + '°', C.r],
          ]),
          inputs: [
            { id: 'SFx', label: 'Net pull, ΣFx', unit: 'N', answer: () => SFx, hints: [{ when: val => near(val, FB + FC, 0.03), text: 'Add components, not magnitudes.' }] },
            { id: 'SFy', label: 'Net pull, ΣFy', unit: 'N', answer: () => SFy, hints: [{ when: val => near(val, -SFy, 0.03), text: 'Sign flipped: KR-10B at 300° pulls downward more than KR-10C at 60° pulls up.' }] },
            { id: 'F', label: 'Thrust magnitude', unit: 'N', answer: () => SF, drives: true, hints: [{ when: val => near(val, FB + FC, 0.03), text: 'Forces are vectors: |ΣF| = √(ΣFx² + ΣFy²).' }] },
            { id: 'h', label: 'Thrust heading', unit: 'deg', answer: () => hThrust, drives: true, hints: [{ when: val => near(((n(val) % 360) + 360) % 360, hNet, 0.02), text: 'That is the net pull\'s direction. Thrust is opposite: add 180°.' }] },
            { id: 't', label: 'Burn duration', unit: 's', answer: s => len3 / s.speed, tol: 0.08, drives: true, hints: [
              { when: val => near(val, len3 / v0, 0.02), text: 'You are no longer at 20 m/s after the burst. Use the live speed from telemetry: t = d / v.' }] },
          ],
          program: vals => ({ burns: [{ force: n(vals.F), heading: n(vals.h), t0: 0, dur: n(vals.t), label: 'Thrust' }] }),
          solution: s => [
            { title: 'Each pull', lines: ['KR-10B: ' + f1(FB) + ' N at 300°;  KR-10C: ' + f1(FC) + ' N at 60°'] },
            { title: 'Components', lines: ['ΣFx = ' + f1(FB) + '·cos 300° + ' + f1(FC) + '·cos 60° = ' + f1(SFx) + ' N', 'ΣFy = ' + f1(FB) + '·sin 300° + ' + f1(FC) + '·sin 60° = ' + f1(SFy) + ' N'] },
            { title: 'Thrust', lines: ['|ΣF| = ' + f1(SF) + ' N at ' + f1(hNet) + '°  →  thrust ' + f1(SF) + ' N at ' + f1(hThrust) + '°', 'Duration = ' + f0(len3) + ' / ' + f2(s.speed) + ' = ' + f1(len3 / s.speed) + ' s'] },
          ] },
      ],
    });
  }

  /** Reference solution values for every stage (used by tests and the worked solution). */
  function referenceValues(level, stageIndex, sim) {
    const out = {};
    for (const inp of level.stages[stageIndex].inputs) out[inp.id] = inp.answer(sim);
    return out;
  }

  /** Grade a stage's entries against the reference: returns [{id,label,unit,entered,expected,ok,hint}] */
  function gradeStage(level, stageIndex, values, sim) {
    const rows = [];
    for (const inp of level.stages[stageIndex].inputs) {
      const expected = inp.answer(sim), entered = values ? n(values[inp.id]) : NaN;
      const tol = inp.tol || 0.03;
      let ok = Math.abs(entered - expected) <= Math.abs(expected) * tol + 1e-6;
      if (inp.unit === 'deg') { let d = Math.abs(((entered - expected) % 360 + 540) % 360 - 180); ok = d <= 2.5; }
      let hint = null;
      if (!ok) for (const h of (inp.hints || [])) { try { if (h.when(entered, sim, values || {})) { hint = h.text; break; } } catch (e) { /* ignore */ } }
      rows.push({ id: inp.id, label: inp.label, unit: inp.unit, entered, expected, ok, hint, drives: !!inp.drives });
    }
    return rows;
  }

  return { LEVELS, FORMULAS, referenceValues, gradeStage, fmt: { f0, f1, f2, sci } };
});
