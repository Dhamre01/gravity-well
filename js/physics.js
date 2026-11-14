/* Gravity Well — flight simulator.
   Pure physics: no DOM. Works in the browser (window.GWPhysics) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GWPhysics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const G = 6.67e-11;          // N·m²/kg² — the value shown to the player
  const DT = 0.01;             // integration step, seconds
  const DEG = Math.PI / 180;

  function legGeom(leg) {
    const ax = leg.a[0], ay = leg.a[1], bx = leg.b[0], by = leg.b[1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    return { ax, ay, bx, by, ux: dx / len, uy: dy / len, len, nx: -dy / len, ny: dx / len };
  }
  function project(g, x, y) {
    const rx = x - g.ax, ry = y - g.ay;
    return { s: rx * g.ux + ry * g.uy, d: rx * g.nx + ry * g.ny };
  }

  class Sim {
    constructor(level) {
      this.level = level;
      const s = level.ship;
      this.t = 0; this.x = s.x; this.y = s.y; this.vx = s.vx; this.vy = s.vy;
      this.mass = s.mass; this.maxThrust = s.maxThrust;
      this.legIndex = 0; this.legStartT = 0;
      this.stageIndex = -1; this.pendingStage = 0; this.stageStartT = 0;
      this.burns = []; this.events = []; this.stageValues = [];
      this.fuelUsed = 0; this.fuelOut = false;
      this.status = 'paused'; this.fail = null;
      this.path = [[this.x, this.y]]; this.pathCounter = 0;
      this.agents = (level.agents || []).map(a => Object.assign({}, a));
      this.legSwept = 0; this.prevAngle = null; this.prevS = undefined;
      this.gateTimes = []; this.maxDrift = 0; this.extra = {};
    }

    get stage() { return this.pendingStage == null ? null : this.level.stages[this.pendingStage]; }
    get speed() { return Math.hypot(this.vx, this.vy); }
    get heading() { return this.speed < 1e-6 ? 0 : ((Math.atan2(this.vy, this.vx) / DEG) + 360) % 360; }
    get currentLeg() { return this.level.legs[this.legIndex]; }

    /** Apply the player's values for the pending stage and resume flight. */
    beginStage(values) {
      const st = this.level.stages[this.pendingStage];
      this.stageValues[this.pendingStage] = Object.assign({}, values);
      const prog = st.program ? st.program(values, this) : {};
      for (const b of (prog.burns || [])) {
        let fx = b.fx || 0, fy = b.fy || 0;
        if (b.force !== undefined) {
          const f = Math.max(0, Math.min(num(b.force), this.maxThrust));
          const h = num(b.heading) * DEG;
          fx = f * Math.cos(h); fy = f * Math.sin(h);
        } else {
          fx = num(fx); fy = num(fy);
          const f = Math.hypot(fx, fy);
          if (f > this.maxThrust) { fx *= this.maxThrust / f; fy *= this.maxThrust / f; }
        }
        const t0 = this.t + Math.max(0, num(b.t0));
        this.burns.push({ t0, t1: t0 + Math.max(0, num(b.dur)), fx, fy, label: b.label || 'Thrust' });
      }
      for (const e of (prog.events || [])) {
        this.events.push({ t: this.t + Math.max(0, num(e.t)), run: e.run, done: false, label: e.label });
      }
      this.stageIndex = this.pendingStage; this.pendingStage = null;
      this.stageStartT = this.t; this.status = 'flying';
    }

    /** Forces acting on the ship right now. */
    forces() {
      const out = []; const L = this.level;
      for (const b of (L.bodies || [])) {
        if (!b.mass) continue;
        if (b.legs && b.legs.indexOf(this.legIndex) < 0) continue;
        let fx, fy;
        if (b.field === 'uniform') {
          const F = G * b.mass * this.mass / (b.uniformR * b.uniformR);
          fx = F * Math.cos(b.uniformDir * DEG); fy = F * Math.sin(b.uniformDir * DEG);
        } else {
          const dx = b.x - this.x, dy = b.y - this.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2);
          const F = G * b.mass * this.mass / r2;
          fx = F * dx / r; fy = F * dy / r;
        }
        out.push({ name: 'Gravity (' + b.name + ')', short: b.name, fx, fy, kind: 'gravity' });
      }
      for (const ext of (L.externalForces || [])) out.push({ name: ext.name, short: ext.name, fx: ext.fx, fy: ext.fy, kind: 'external' });
      let tx = 0, ty = 0, active = false;
      for (const b of this.burns) if (this.t >= b.t0 && this.t < b.t1) { tx += b.fx; ty += b.fy; active = true; }
      if (active) {
        const mag = Math.hypot(tx, ty);
        if (L.fuel && L.fuel.budget > 0 && this.fuelUsed >= L.fuel.budget) { tx = 0; ty = 0; this.fuelOut = true; }
        else if (mag > this.maxThrust) { tx *= this.maxThrust / mag; ty *= this.maxThrust / mag; }
        out.push({ name: 'Thrust', short: 'Thrust', fx: tx, fy: ty, kind: 'thrust' });
      }
      return out;
    }

    netForce() {
      let fx = 0, fy = 0;
      for (const f of this.forces()) { fx += f.fx; fy += f.fy; }
      return { fx, fy, mag: Math.hypot(fx, fy) };
    }

    step(dt) {
      dt = dt || DT;
      if (this.status !== 'flying') return;
      for (const e of this.events) {
        if (!e.done && this.t >= e.t) { e.done = true; e.run(this); if (this.status !== 'flying') return; }
      }
      const fs = this.forces();
      let fx = 0, fy = 0;
      for (const f of fs) { fx += f.fx; fy += f.fy; if (f.kind === 'thrust') this.fuelUsed += Math.hypot(f.fx, f.fy) * dt; }
      this.vx += fx / this.mass * dt; this.vy += fy / this.mass * dt;
      this.x += this.vx * dt; this.y += this.vy * dt; this.t += dt;
      for (const a of this.agents) { a.x += (a.vx || 0) * dt; a.y += (a.vy || 0) * dt; }
      if ((++this.pathCounter) % 10 === 0) this.path.push([this.x, this.y]);
      this.checkRules();
      if (this.status !== 'flying') return;
      // time-triggered checkpoints
      const L = this.level;
      for (let i = this.stageIndex + 1; i < L.stages.length; i++) {
        const tr = L.stages[i].trigger;
        if (tr.type === 'time' && this.t - this.stageStartT >= tr.t) { this.pendingStage = i; this.status = 'paused'; break; }
      }
    }

    /** Run without animation until the sim pauses or ends. */
    runUntilPause(maxSeconds) {
      const limit = Math.round(((maxSeconds || this.level.timeLimit || 600) + 5) / DT);
      let n = 0;
      while (this.status === 'flying' && n++ < limit) this.step(DT);
    }

    checkRules() {
      const L = this.level; const leg = L.legs[this.legIndex];
      for (const b of (L.bodies || [])) {
        if (b.radius && b.field !== 'uniform' && Math.hypot(b.x - this.x, b.y - this.y) < b.radius)
          return this.end('fail', 'Impact with ' + b.name + '.', 'impact');
      }
      if (L.timeLimit && this.t > L.timeLimit) return this.end('fail', 'Mission clock expired before you reached the gate.', 'timeout');

      if (leg.type === 'orbit') {
        const b = L.bodies[leg.body];
        const dx = this.x - b.x, dy = this.y - b.y, r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        this.maxDrift = Math.max(this.maxDrift, Math.abs(r - leg.r));
        if (r < leg.rmin) return this.end('fail', 'Dropped below the safe band — too slow for a circular orbit at this radius.', 'band-low');
        if (r > leg.rmax) return this.end('fail', 'Climbed out of the safe band — too fast for a circular orbit at this radius.', 'band-high');
        if (this.prevAngle !== null) {
          let d = ang - this.prevAngle; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
          this.legSwept += d * (leg.dir || 1);
        }
        this.prevAngle = ang;
        if (this.legSwept >= leg.sweep) return this.completeLeg();
        return;
      }

      const g = legGeom(leg); const p = project(g, this.x, this.y);
      const prev = this.prevS === undefined ? p.s : this.prevS; this.prevS = p.s;
      this.maxDrift = Math.max(this.maxDrift, Math.abs(p.d));
      if (Math.abs(p.d) > leg.hw) return this.end('fail', 'Hull breach — the ship drifted out of the corridor into the rocks.', 'rocks', { s: p.s, d: p.d });
      if (p.s < -(leg.back || 60)) return this.end('fail', 'Drifted backward out of the corridor.', 'back');
      const gate = leg.gate || { type: 'cross' };
      const speed = this.speed;

      if (gate.type === 'dock') {
        const dist = g.len - p.s;
        if (Math.abs(dist) <= gate.tol && speed <= gate.maxSpeed) return this.completeLeg();
        if (p.s >= g.len && speed > gate.maxSpeed) return this.end('fail', 'Hit the dock at ' + speed.toFixed(1) + ' m/s — the limit is ' + gate.maxSpeed + ' m/s.', 'dock-fast');
        if (dist < -gate.tol) return this.end('fail', 'Overshot the dock.', 'dock-over');
        const along = this.vx * g.ux + this.vy * g.uy;
        if (along < -0.3) return this.end('fail', 'Braked too hard — the ship is now drifting away from the dock.', 'dock-reverse');
        if (speed < 0.05 && dist > gate.tol) return this.end('fail', 'Came to a stop ' + dist.toFixed(0) + ' m short of the dock.', 'dock-short');
        return;
      }
      if (prev < g.len && p.s >= g.len) {
        if (gate.type === 'none') return this.end('fail', gate.failMsg || 'Flew out of the end of the corridor.', 'overrun');
        const tl = this.t - this.legStartT;
        if (gate.window) {
          if (tl < gate.window[0]) return this.end('fail', 'Reached the gate at T+' + tl.toFixed(1) + ' s, but it does not open until T+' + gate.window[0] + ' s. Too fast.', 'early', { tl });
          if (tl > gate.window[1]) return this.end('fail', 'Reached the gate at T+' + tl.toFixed(1) + ' s — it closed at T+' + gate.window[1] + ' s. Too slow.', 'late', { tl });
        }
        if (gate.maxSpeed && speed > gate.maxSpeed) return this.end('fail', 'Crossed the gate at ' + speed.toFixed(1) + ' m/s; the limit is ' + gate.maxSpeed + ' m/s.', 'fast');
        return this.completeLeg();
      }
    }

    completeLeg() {
      const L = this.level; const k = this.legIndex;
      this.gateTimes[k] = this.t;
      let next = -1;
      for (let i = this.stageIndex + 1; i < L.stages.length; i++) {
        const tr = L.stages[i].trigger;
        if (tr.type === 'gate' && tr.leg === k) { next = i; break; }
      }
      if (k >= L.legs.length - 1 && next < 0) return this.end('success');
      this.legIndex = Math.min(k + 1, L.legs.length - 1); this.legStartT = this.t;
      this.prevS = undefined; this.legSwept = 0; this.prevAngle = null;
      if (next >= 0) { this.pendingStage = next; this.status = 'paused'; }
    }

    end(status, msg, code, extra) {
      this.status = status;
      this.fail = msg ? Object.assign({ msg, code, t: this.t, x: this.x, y: this.y }, extra || {}) : null;
    }
  }

  function num(v) { const n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : 0; }

  /** Build a fresh sim and replay earlier stages' values so the sim sits at stage `k` ready for input. */
  function simAtStage(level, stageValues, k) {
    const sim = new Sim(level);
    for (let i = 0; i < k; i++) {
      if (sim.status !== 'paused' || sim.pendingStage !== i) break;
      sim.beginStage(stageValues[i] || {});
      sim.runUntilPause();
    }
    return sim;
  }

  return { G, DT, DEG, Sim, simAtStage, legGeom, project, num };
});
