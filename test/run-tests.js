#!/usr/bin/env node
/* Runs every level's reference solution through the simulator and checks it clears.
   Also checks that a few classic wrong answers fail. Usage: node test/run-tests.js */
const P = require('../js/physics.js');
const L = require('../js/levels.js');

let pass = 0, failN = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name + (detail ? '  — ' + detail : '')); }
  else { failN++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

function fly(level, valuesPerStage, override) {
  const sim = new P.Sim(level);
  let guard = 0;
  while (sim.status === 'paused' && guard++ < 10) {
    const k = sim.pendingStage;
    const vals = valuesPerStage ? valuesPerStage[k] : L.referenceValues(level, k, sim);
    if (override && override[k]) Object.assign(vals, override[k](sim));
    sim.beginStage(vals);
    sim.runUntilPause();
  }
  return sim;
}

console.log('Reference solutions');
for (const level of L.LEVELS) {
  const sim = fly(level);
  const t = sim.t.toFixed(1), fuel = Math.round(sim.fuelUsed);
  check('L' + level.num + ' ' + level.title, sim.status === 'success',
    'status=' + sim.status + ' t=' + t + 's fuel=' + fuel + (level.fuel.par ? '/' + level.fuel.par + ' par' : '') + ' maxDrift=' + sim.maxDrift.toFixed(1) + 'm' + (sim.fail ? ' :: ' + sim.fail.msg : ''));
  if (level.fuel.par) check('L' + level.num + ' solution within fuel par', sim.fuelUsed <= level.fuel.par, fuel + ' <= ' + level.fuel.par);
  if (level.fuel.budget) check('L' + level.num + ' solution never ran dry', !sim.fuelOut);
}

console.log('\nWrong answers fail');
const lv = n => L.LEVELS.find(l => l.num === n);
const wrong = [
  ['L1 acceleration typed as thrust', 1, { 0: () => ({ F: 1.25 }) }, 'timeout'],
  ['L1 thrust too high (1800 N)', 1, { 0: () => ({ F: 1800 }) }, 'early'],
  ['L2 burn too short', 2, { 0: () => ({ t: 40 }) }, 'dock-fast'],
  ['L2 braking too hard', 2, { 0: () => ({ F: 800 }) }, 'dock-short'],
  ['L3 impulse typed as thrust', 3, { 0: () => ({ F: 14400 }) }, 'early'],
  ['L4 components swapped', 4, { 0: () => ({ Fx: 360, Fy: 480 }) }, 'rocks'],
  ['L5 ignores drone motion (60 s)', 5, { 0: () => ({ t: 60 }) }, 'clamp'],
  ['L6 acceleration typed as force', 6, { 0: () => ({ F: 0.133 }) }, 'rocks'],
  ['L6 thrust toward asteroid', 6, { 0: () => ({ h: 270 }) }, 'rocks'],
  ['L7 magnitudes added, heading up', 7, { 0: () => ({ F: 448, h: 90 }) }, 'rocks'],
  ['L8 pod speed = ship speed gain', 8, { 1: () => ({ u: 1.25 }) }, 'late'],
  ['L9 no burn', 9, { 0: () => ({ t: 0 }) }, 'band-low'],
  ['L9 burn for full orbital speed', 9, { 0: () => ({ t: 10.7 }) }, 'band-high'],
];
for (const [name, num, ov, code] of wrong) {
  const level = lv(num);
  const sim = fly(level, null, ov);
  const okStatus = sim.status === 'fail';
  const okCode = !code || (sim.fail && sim.fail.code === code);
  check(name, okStatus && okCode, 'status=' + sim.status + (sim.fail ? ' code=' + sim.fail.code + ' :: ' + sim.fail.msg : ''));
}

console.log('\nGrading & hints');
{
  const level = lv(6); const sim = new P.Sim(level);
  const rows = L.gradeStage(level, 0, { Fg: 0.133, F: 0.133, h: 90, t: 120 }, sim);
  check('L6 grade flags Fg and F, accepts h and t', !rows[0].ok && !rows[1].ok && rows[2].ok && rows[3].ok);
  check('L6 acceleration hint fires', /acceleration/.test(rows[0].hint || ''), rows[0].hint);
}
{
  const level = lv(10); const sim = fly(level);
  check('L10 three stages recorded', sim.stageValues.filter(Boolean).length === 3);
  check('L10 gate times increasing', sim.gateTimes[0] < sim.gateTimes[1] && sim.gateTimes[1] < sim.t, sim.gateTimes.map(t => t.toFixed(1)).join(' < '));
}
{
  // Replay to a later stage must reproduce the same state
  const level = lv(8); const full = fly(level);
  const s2 = P.simAtStage(level, full.stageValues, 1);
  check('L8 simAtStage(1) is paused at stage 1', s2.status === 'paused' && s2.pendingStage === 1, 'x=' + s2.x.toFixed(1));
}

console.log('\n' + pass + ' passed, ' + failN + ' failed');
process.exit(failN ? 1 : 0);
