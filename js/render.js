/* Gravity Well — canvas renderer: procedural starfield, shaded asteroids, ship, HUD overlays. */
(function (root) {
  'use strict';
  const DEG = Math.PI / 180;
  const C = {
    cyan: '#4FD1E8', amber: '#F5B63E', violet: '#B794F6', green: '#5BD69A', red: '#F09A88', text: '#E6EDF7', dim: '#A9BBD3',
  };

  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const PALETTE = {
    c: ['#8d8a86', '#5b5955', '#2b2a28'],
    s: ['#b59a7c', '#7a6350', '#3a2e24'],
    m: ['#9ea3ab', '#5e636b', '#2a2d33'],
    k: ['#8a7764', '#4f4237', '#231d18'],
  };

  // ---------- Asteroid sprite ----------
  function makeAsteroid(px, seed, kind) {
    const r = rng(seed); const pal = PALETTE[kind] || PALETTE.c;
    const S = Math.max(24, Math.min(640, Math.round(px * 2))); const R = S * 0.42, cx = S / 2, cy = S / 2;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S; const g = cv.getContext('2d');
    const harm = []; for (let k = 2; k < 8; k++) harm.push([0.09 / Math.pow(k, 0.7) * (0.5 + r()), r() * 6.283]);
    const elong = 1 + r() * 0.22, rot = r() * 3.14;
    const pts = []; const N = 90;
    for (let i = 0; i < N; i++) {
      const th = i / N * 6.283; let f = 1; harm.forEach(([a, ph], j) => { f += a * Math.cos((j + 2) * th + ph); });
      let fx = Math.cos(th) * elong, fy = Math.sin(th);
      const x = (fx * Math.cos(rot) - fy * Math.sin(rot)) * R * f / elong * 1.05, y = (fx * Math.sin(rot) + fy * Math.cos(rot)) * R * f;
      pts[i] = [cx + x, cy + y];
    }
    g.save();
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
    // base shading: light from upper-left
    const lx = -0.68, ly = -0.6;
    const grad = g.createRadialGradient(cx + lx * R * 0.55, cy + ly * R * 0.55, R * 0.1, cx, cy, R * 1.25);
    grad.addColorStop(0, pal[0]); grad.addColorStop(0.55, pal[1]); grad.addColorStop(1, pal[2]);
    g.fillStyle = grad; g.fillRect(0, 0, S, S);
    // surface mottling
    for (let i = 0; i < S * 1.5; i++) {
      const x = r() * S, y = r() * S, rad = 1 + r() * S * 0.03;
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,' + (0.04 + r() * 0.08) + ')' : 'rgba(255,255,255,' + (0.02 + r() * 0.05) + ')';
      g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
    }
    // craters
    const nc = Math.round(6 + S / 14);
    for (let i = 0; i < nc; i++) {
      const a = r() * 6.283, d = Math.sqrt(r()) * R * 0.85, crx = cx + Math.cos(a) * d, cry = cy + Math.sin(a) * d;
      const cr = R * (0.04 + Math.pow(r(), 2.2) * 0.22);
      g.save(); g.beginPath(); g.arc(crx, cry, cr, 0, 6.283); g.clip();
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(crx - cr, cry - cr, 2 * cr, 2 * cr);
      // shadowed wall (toward light) and lit wall (away from light)
      g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.arc(crx + lx * cr * 0.28, cry + ly * cr * 0.28, cr * 0.95, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(crx - lx * cr * 0.45, cry - ly * cr * 0.45, cr * 0.72, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.30)'; g.beginPath(); g.arc(crx - lx * cr * 0.1, cry - ly * cr * 0.1, cr * 0.5, 0, 6.283); g.fill();
      g.restore();
      // rim highlight on the lit side
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = Math.max(1, cr * 0.12);
      g.beginPath(); g.arc(crx, cry, cr, Math.atan2(ly, lx) + 2.4, Math.atan2(ly, lx) + 3.9); g.stroke();
    }
    // terminator darkening
    const term = g.createLinearGradient(cx + lx * R, cy + ly * R, cx - lx * R * 1.1, cy - ly * R * 1.1);
    term.addColorStop(0, 'rgba(0,0,0,0)'); term.addColorStop(0.55, 'rgba(0,0,0,0.05)'); term.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = term; g.fillRect(0, 0, S, S);
    g.restore();
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.stroke();
    return cv;
  }

  // ---------- Starfield ----------
  function makeStarfield(W, H, seed) {
    const r = rng(seed); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#05080f'; g.fillRect(0, 0, W, H);
    // nebula
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = r() * H, rad = (0.25 + r() * 0.5) * Math.max(W, H);
      const hue = [[40, 90, 170], [110, 60, 160], [30, 110, 130], [80, 50, 140]][i % 4];
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(' + hue.join(',') + ',' + (0.10 + r() * 0.08) + ')'); gr.addColorStop(1, 'rgba(' + hue.join(',') + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    // dark dust
    for (let i = 0; i < 6; i++) {
      const x = r() * W, y = r() * H, rad = (0.2 + r() * 0.4) * Math.max(W, H);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(3,5,10,0.55)'); gr.addColorStop(1, 'rgba(3,5,10,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    const n = Math.round(W * H / 900);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, m = Math.pow(r(), 3), rad = 0.4 + m * 1.6;
      const t = r(); const col = t < 0.6 ? '255,255,255' : t < 0.8 ? '200,220,255' : t < 0.93 ? '255,228,190' : '255,200,160';
      g.fillStyle = 'rgba(' + col + ',' + (0.35 + m * 0.65) + ')'; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
      if (m > 0.75) {
        const gr = g.createRadialGradient(x, y, 0, x, y, rad * 7); gr.addColorStop(0, 'rgba(' + col + ',0.35)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gr; g.fillRect(x - rad * 7, y - rad * 7, rad * 14, rad * 14);
      }
      if (m > 0.93) {
        g.strokeStyle = 'rgba(' + col + ',0.35)'; g.lineWidth = 1; const L = rad * 9;
        g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke();
      }
    }
    return cv;
  }

  // ---------- Scene (per level) ----------
  class Scene {
    constructor(level) {
      this.level = level; this.seed = level.num * 7919 + 17;
      this.bounds = computeBounds(level);
      this.bigSprites = (level.bodies || []).map((b, i) => ({ body: b, sprite: null }));
      this.rocks = this.makeRocks();
      this.stars = null; this.starsKey = '';
    }
    makeRocks() {
      const r = rng(this.seed + 3); const L = this.level; const b = this.bounds; const out = [];
      const tries = 400;
      for (let i = 0; i < tries && out.length < 70; i++) {
        const rad = 8 + Math.pow(r(), 2.5) * 70;
        const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0);
        let ok = true;
        for (const leg of L.legs) {
          if (leg.type === 'orbit') { const bd = L.bodies[leg.body]; const d = Math.hypot(x - bd.x, y - bd.y); if (d < leg.rmax + rad + 120) ok = false; continue; }
          const g = root.GWPhysics.legGeom(leg), p = root.GWPhysics.project(g, x, y);
          if (p.s > -200 - rad && p.s < g.len + 200 + rad && Math.abs(p.d) < leg.hw + rad + 25) ok = false;
        }
        for (const bd of (L.bodies || [])) if (Math.hypot(x - bd.x, y - bd.y) < (bd.radius || 0) + rad + 40) ok = false;
        for (const o of out) if (Math.hypot(x - o.x, y - o.y) < o.rad + rad + 10) ok = false;
        if (ok) out.push({ x, y, rad, seed: Math.floor(r() * 1e6), kind: 'csmk'[Math.floor(r() * 4)], sprite: null, dim: 0.55 + 0.45 * Math.min(1, rad / 60) });
      }
      // rocks hugging the corridor edges (what you crash into)
      for (const leg of L.legs) {
        if (leg.type === 'orbit') continue;
        const g = root.GWPhysics.legGeom(leg);
        for (let side = -1; side <= 1; side += 2) {
          for (let s = 60; s < g.len; s += 90 + r() * 160) {
            const rad = 10 + Math.pow(r(), 2) * 40; const d = side * (leg.hw + rad + 10 + r() * 60);
            const x = g.ax + g.ux * s + g.nx * d, y = g.ay + g.uy * s + g.ny * d;
            let ok = true; for (const bd of (L.bodies || [])) if (Math.hypot(x - bd.x, y - bd.y) < (bd.radius || 0) + rad + 30) ok = false;
            for (const o of out) if (Math.hypot(x - o.x, y - o.y) < o.rad + rad + 6) ok = false;
            if (ok) out.push({ x, y, rad, seed: Math.floor(r() * 1e6), kind: 'csmk'[Math.floor(r() * 4)], sprite: null, dim: 0.6 + 0.4 * Math.min(1, rad / 40) });
          }
        }
      }
      return out;
    }
  }

  function computeBounds(L) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const leg of L.legs) {
      if (leg.type === 'orbit') { const b = L.bodies[leg.body]; add(b.x - leg.rmax, b.y - leg.rmax); add(b.x + leg.rmax, b.y + leg.rmax); continue; }
      const g = root.GWPhysics.legGeom(leg);
      for (const [px, py] of [[g.ax, g.ay], [g.bx, g.by]]) { add(px + g.nx * leg.hw, py + g.ny * leg.hw); add(px - g.nx * leg.hw, py - g.ny * leg.hw); }
    }
    for (const b of (L.bodies || [])) add(b.x - (b.radius || 0) * 0.6, b.y - (b.radius || 0) * 0.6), add(b.x + (b.radius || 0) * 0.6, b.y + (b.radius || 0) * 0.6);
    const padX = (x1 - x0) * 0.08 + 150, padY = (y1 - y0) * 0.08 + 150;
    return { x0: x0 - padX, x1: x1 + padX, y0: y0 - padY, y1: y1 + padY };
  }

  // ---------- Renderer ----------
  class Renderer {
    constructor() { this.scene = null; this.sprites = new Map(); this.zoom = 1; this.panX = 0; this.panY = 0; }
    setLevel(level) { this.scene = new Scene(level); this.zoom = 1; this.panX = 0; this.panY = 0; }

    camera(W, H) {
      const b = this.scene.bounds; const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
      const scale = Math.min(W / bw, H / bh) * this.zoom;
      const cx = (b.x0 + b.x1) / 2 + this.panX, cy = (b.y0 + b.y1) / 2 + this.panY;
      return { scale, toX: x => W / 2 + (x - cx) * scale, toY: y => H / 2 - (y - cy) * scale };
    }

    sprite(key, px, seed, kind) {
      const k = key + ':' + Math.round(px / 8) * 8;
      if (!this.sprites.has(k)) this.sprites.set(k, makeAsteroid(px, seed, kind));
      return this.sprites.get(k);
    }

    /** opts: { sim, mode:'plan'|'flight'|'debrief', previewBurns:[{fx,fy}], showNeeded, showLabels, time } */
    draw(canvas, opts) {
      const sim = opts.sim, L = sim.level; const sc = this.scene;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const key = W + 'x' + H; if (sc.starsKey !== key) { sc.stars = makeStarfield(W, H, sc.seed); sc.starsKey = key; }
      g.drawImage(sc.stars, 0, 0, W, H);
      const cam = this.camera(W, H); const S = cam.scale;

      // distant rocks
      for (const rk of sc.rocks) {
        const px = rk.rad * S * 2; if (px < 3) continue;
        const sp = this.sprite('r' + rk.seed, px, rk.seed, rk.kind);
        g.globalAlpha = rk.dim; g.drawImage(sp, cam.toX(rk.x) - px * 0.6, cam.toY(rk.y) - px * 0.6, px * 1.2, px * 1.2); g.globalAlpha = 1;
      }
      // corridors
      for (let i = 0; i < L.legs.length; i++) this.drawLeg(g, cam, L, i, sim, opts);
      // bodies
      for (const b of (L.bodies || [])) {
        const px = (b.radius || 200) * S * 2; const sp = this.sprite('b' + b.name, px, b.name.length * 977 + b.x, b.kind || 'c');
        g.drawImage(sp, cam.toX(b.x) - px * 0.6, cam.toY(b.y) - px * 0.6, px * 1.2, px * 1.2);
        if (opts.mode !== 'teaser') label(g, b.name + (b.mass ? '  ' + fmtSci(b.mass) + ' kg' : ''), cam.toX(b.x), cam.toY(b.y) + px * 0.6 + 16, C.dim, 'center');
      }
      // agents
      for (const a of sim.agents) this.drawAgent(g, cam, a, opts.time || 0);
      // path
      if (sim.path.length > 1) {
        g.lineWidth = 2.5; g.lineJoin = 'round';
        const failed = sim.status === 'fail';
        g.strokeStyle = failed ? 'rgba(240,154,136,0.9)' : 'rgba(79,209,232,0.75)';
        g.shadowColor = failed ? C.red : C.cyan; g.shadowBlur = 8;
        g.beginPath(); sim.path.forEach((p, i) => i ? g.lineTo(cam.toX(p[0]), cam.toY(p[1])) : g.moveTo(cam.toX(p[0]), cam.toY(p[1]))); g.lineTo(cam.toX(sim.x), cam.toY(sim.y)); g.stroke();
        g.shadowBlur = 0;
      }
      // ship + forces
      const sx = cam.toX(sim.x), sy = cam.toY(sim.y);
      const forces = sim.forces();
      const thrust = forces.find(f => f.kind === 'thrust');
      if (sim.status === 'fail') this.drawBoom(g, sx, sy, opts.time || 0);
      else this.drawShip(g, sx, sy, sim, thrust, opts.previewBurns);
      if (opts.mode === 'teaser') { /* no overlays */ }
      else if (opts.mode === 'plan') {
        for (const f of forces) if (f.kind !== 'thrust') arrow(g, sx, sy, f.fx, f.fy, C.amber, 70, f.short + ' pull = ?', true);
        for (const pb of (opts.previewBurns || [])) if (Math.hypot(pb.fx, pb.fy) > 0.01) arrow(g, sx, sy, pb.fx, pb.fy, C.violet, null, 'thrust ' + fmtN(Math.hypot(pb.fx, pb.fy)) + ' N @ ' + Math.round(((Math.atan2(pb.fy, pb.fx) / DEG) + 360) % 360) + '°');
        arrowVel(g, sx, sy, sim);
      } else if (opts.mode === 'flight' || sim.status === 'success') {
        for (const f of forces) arrow(g, sx, sy, f.fx, f.fy, f.kind === 'thrust' ? C.violet : C.amber, null, f.short + ' ' + fmtN(Math.hypot(f.fx, f.fy)) + ' N');
      }
    }

    drawLeg(g, cam, L, i, sim, opts) {
      const leg = L.legs[i]; const S = cam.scale; const active = i === sim.legIndex;
      if (leg.type === 'orbit') {
        const b = L.bodies[leg.body]; const cx = cam.toX(b.x), cy = cam.toY(b.y);
        g.setLineDash([10, 8]); g.strokeStyle = 'rgba(79,209,232,0.55)'; g.lineWidth = 1.2;
        g.beginPath(); g.arc(cx, cy, leg.rmin * S, 0, 6.283); g.stroke(); g.beginPath(); g.arc(cx, cy, leg.rmax * S, 0, 6.283); g.stroke();
        g.setLineDash([]);
        g.fillStyle = 'rgba(79,209,232,0.05)'; g.beginPath(); g.arc(cx, cy, leg.rmax * S, 0, 6.283); g.arc(cx, cy, leg.rmin * S, 0, 6.283, true); g.fill();
        if (opts.showNeeded) { g.setLineDash([9, 7]); g.strokeStyle = C.green; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, leg.r * S, 0, 6.283); g.stroke(); g.setLineDash([]); }
        // gate on far side
        const ang = Math.atan2(sim.level.ship.y - b.y, sim.level.ship.x - b.x) + leg.sweep * (leg.dir || 1);
        const gx = b.x + Math.cos(ang) * leg.r, gy = b.y + Math.sin(ang) * leg.r;
        gate(g, cam.toX(b.x + Math.cos(ang) * leg.rmin), cam.toY(b.y + Math.sin(ang) * leg.rmin), cam.toX(b.x + Math.cos(ang) * leg.rmax), cam.toY(b.y + Math.sin(ang) * leg.rmax));
        label(g, 'PICKUP GATE', cam.toX(gx) - 14, cam.toY(gy) - 18, C.green, 'right');
        label(g, 'safe band ' + leg.rmin + '–' + leg.rmax + ' m', cx, cy - leg.rmax * S - 10, C.cyan, 'center');
        return;
      }
      const geo = root.GWPhysics.legGeom(leg);
      const corners = [[geo.ax + geo.nx * leg.hw, geo.ay + geo.ny * leg.hw], [geo.bx + geo.nx * leg.hw, geo.by + geo.ny * leg.hw], [geo.bx - geo.nx * leg.hw, geo.by - geo.ny * leg.hw], [geo.ax - geo.nx * leg.hw, geo.ay - geo.ny * leg.hw]];
      g.fillStyle = active ? 'rgba(79,209,232,0.06)' : 'rgba(79,209,232,0.03)';
      g.beginPath(); corners.forEach((p, k) => k ? g.lineTo(cam.toX(p[0]), cam.toY(p[1])) : g.moveTo(cam.toX(p[0]), cam.toY(p[1]))); g.closePath(); g.fill();
      g.setLineDash([10, 8]); g.strokeStyle = 'rgba(79,209,232,' + (active ? 0.6 : 0.3) + ')'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(cam.toX(corners[0][0]), cam.toY(corners[0][1])); g.lineTo(cam.toX(corners[1][0]), cam.toY(corners[1][1]));
      g.moveTo(cam.toX(corners[3][0]), cam.toY(corners[3][1])); g.lineTo(cam.toX(corners[2][0]), cam.toY(corners[2][1])); g.stroke();
      g.setLineDash([]);
      if (opts.showNeeded) { g.setLineDash([9, 7]); g.strokeStyle = C.green; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cam.toX(geo.ax), cam.toY(geo.ay)); g.lineTo(cam.toX(geo.bx), cam.toY(geo.by)); g.stroke(); g.setLineDash([]); }
      const gt = leg.gate || {};
      if (gt.type === 'dock') dock(g, cam, geo, leg);
      else if (gt.type !== 'none') {
        gate(g, cam.toX(corners[1][0]), cam.toY(corners[1][1]), cam.toX(corners[2][0]), cam.toY(corners[2][1]));
        const name = L.legs.length > 1 ? 'GATE ' + (i + 1) : 'GATE';
        if (opts.mode !== 'teaser') label(g, name + (gt.window ? '  opens T+' + gt.window[0] + '–' + gt.window[1] + ' s' : ''), cam.toX(geo.bx), cam.toY(corners[1][1]) - 26, C.green, 'center');
      }
      // length / width ticks on the active leg
      if (active && i === 0 && opts.mode !== 'teaser') {
        const y = cam.toY(corners[0][1]) - 12; label(g, fmtN(geo.len) + ' m long · ' + fmtN(2 * leg.hw) + ' m wide', (cam.toX(geo.ax) + cam.toX(geo.bx)) / 2, y - 2, C.dim, 'center');
      }
    }

    drawShip(g, x, y, sim, thrust, previewBurns) {
      const sp = sim.speed; const head = sp > 1e-3 ? Math.atan2(sim.vy, sim.vx) : (sim.level.ship.vx === 0 && sim.level.ship.vy === 0 ? (sim.level.legs[0].type === 'orbit' ? Math.PI / 2 : Math.atan2(sim.level.legs[0].b[1] - sim.level.legs[0].a[1], sim.level.legs[0].b[0] - sim.level.legs[0].a[0])) : 0);
      const s = 1.0;
      g.save(); g.translate(x, y);
      // plume (opposite to thrust direction), drawn before the hull in ship-local space
      const T = thrust && Math.hypot(thrust.fx, thrust.fy) > 0.01 ? thrust : (previewBurns && previewBurns[0] && Math.hypot(previewBurns[0].fx, previewBurns[0].fy) > 0.01 ? previewBurns[0] : null);
      if (T) {
        const ang = Math.atan2(-T.fy, T.fx); // screen angle of thrust (y flipped)
        const back = ang + Math.PI; const mag = Math.hypot(T.fx, T.fy); const len = 14 + Math.min(40, mag / 60);
        g.save(); g.rotate(back);
        const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(243,234,255,0.95)'); gr.addColorStop(0.35, 'rgba(183,148,246,0.8)'); gr.addColorStop(1, 'rgba(183,148,246,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(8, -4); g.lineTo(8 + len, 0); g.lineTo(8, 4); g.closePath(); g.fill();
        g.shadowColor = C.violet; g.shadowBlur = 14; g.fillStyle = 'rgba(183,148,246,0.35)'; g.beginPath(); g.ellipse(10 + len * 0.3, 0, len * 0.35, 5, 0, 0, 6.283); g.fill();
        g.restore();
      }
      g.rotate(-head); g.scale(s, s);
      // engine glow
      const eg = g.createRadialGradient(-24, 0, 0, -24, 0, 12); eg.addColorStop(0, 'rgba(232,251,255,0.9)'); eg.addColorStop(0.35, 'rgba(79,209,232,0.6)'); eg.addColorStop(1, 'rgba(79,209,232,0)');
      g.fillStyle = eg; g.beginPath(); g.ellipse(-24, 0, 12, 5, 0, 0, 6.283); g.fill();
      // wings
      const wg = g.createLinearGradient(0, -20, 0, 0); wg.addColorStop(0, '#9AA6B8'); wg.addColorStop(1, '#394357');
      g.fillStyle = wg; g.strokeStyle = '#161D2A'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(-12, -5); g.lineTo(-23, -19); g.lineTo(-15, -20.5); g.lineTo(3, -6); g.closePath(); g.fill(); g.stroke();
      const wg2 = g.createLinearGradient(0, 0, 0, 20); wg2.addColorStop(0, '#5A6578'); wg2.addColorStop(1, '#262E3D');
      g.fillStyle = wg2; g.beginPath(); g.moveTo(-12, 5); g.lineTo(-23, 19); g.lineTo(-15, 20.5); g.lineTo(3, 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#252C39'; g.fillRect(-26, -4, 5, 8);
      // hull
      const hg = g.createLinearGradient(0, -8, 0, 8); hg.addColorStop(0, '#F5F8FC'); hg.addColorStop(0.42, '#B8C2D0'); hg.addColorStop(1, '#3F4A5C');
      g.fillStyle = hg; g.beginPath(); g.moveTo(27, 0); g.bezierCurveTo(19, -6.8, 3, -8.2, -14, -7.2); g.lineTo(-22, -5.2); g.lineTo(-22, 5.2); g.lineTo(-14, 7.2); g.bezierCurveTo(3, 8.2, 19, 6.8, 27, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(45,55,72,0.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-8, -6.8); g.lineTo(-8, 6.8); g.moveTo(5, -7.6); g.lineTo(5, 7.6); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(20, -2.6); g.bezierCurveTo(12, -4.6, -2, -5.4, -16, -5); g.stroke();
      const cg = g.createRadialGradient(9, -2.5, 0, 11, -1.3, 8); cg.addColorStop(0, '#C8F6FF'); cg.addColorStop(0.45, '#2C93B4'); cg.addColorStop(1, '#08263A');
      g.fillStyle = cg; g.beginPath(); g.ellipse(11, -1.3, 7.5, 3.2, 0, 0, 6.283); g.fill();
      g.fillStyle = '#FF6B6B'; g.beginPath(); g.arc(-21.5, -20, 1.4, 0, 6.283); g.fill();
      g.fillStyle = '#6BFFAA'; g.beginPath(); g.arc(-21.5, 20, 1.4, 0, 6.283); g.fill();
      g.restore();
    }

    drawAgent(g, cam, a, time) {
      const x = cam.toX(a.x), y = cam.toY(a.y);
      g.save(); g.translate(x, y);
      if (a.kind === 'drone') {
        g.fillStyle = '#7f8ba0'; g.strokeStyle = '#1a2130'; g.lineWidth = 0.8;
        g.beginPath(); g.rect(-9, -5, 18, 10); g.fill(); g.stroke();
        g.fillStyle = '#2d6a9f'; g.fillRect(-22, -3, 12, 6); g.fillRect(10, -3, 12, 6);
        g.fillStyle = (Math.floor(time * 2) % 2) ? '#ffd166' : '#8a6a1a'; g.beginPath(); g.arc(0, -8, 2, 0, 6.283); g.fill();
        g.shadowColor = C.green; g.shadowBlur = 10; g.strokeStyle = 'rgba(91,214,154,0.6)'; g.setLineDash([3, 4]); g.beginPath(); g.arc(0, 0, 30 * cam.scale, 0, 6.283); g.stroke(); g.setLineDash([]);
      } else {
        g.fillStyle = '#b08968'; g.strokeStyle = '#2a1f14'; g.lineWidth = 0.8; g.beginPath(); g.rect(-7, -6, 14, 12); g.fill(); g.stroke();
        g.strokeStyle = '#5a4630'; g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.moveTo(0, -6); g.lineTo(0, 6); g.stroke();
      }
      g.restore();
      label(g, a.name, x, y + 24, C.dim, 'center');
    }

    drawBoom(g, x, y, time) {
      const t = Math.min(1, (time % 1.6) / 1.6);
      const r0 = 18 + 10 * Math.sin(time * 6);
      const gr = g.createRadialGradient(x, y, 0, x, y, r0 * 2.2); gr.addColorStop(0, 'rgba(255,244,214,0.95)'); gr.addColorStop(0.3, 'rgba(255,181,71,0.85)'); gr.addColorStop(0.7, 'rgba(229,87,60,0.35)'); gr.addColorStop(1, 'rgba(229,87,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r0 * 2.2, 0, 6.283); g.fill();
      g.strokeStyle = 'rgba(255,208,138,0.9)'; g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + time * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (14 + 16 * t), y + Math.sin(a) * (14 + 16 * t)); g.stroke(); }
      g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 26, 0, 6.283); g.stroke();
    }
  }

  function arrow(g, x, y, fx, fy, color, fixedLen, text, dashed) {
    const mag = Math.hypot(fx, fy); if (mag < 1e-9) return;
    const len = fixedLen || Math.max(26, Math.min(120, 22 + mag * 0.35));
    const ux = fx / mag, uy = -fy / mag; const ex = x + ux * len, ey = y + uy * len;
    g.save(); if (dashed) g.setLineDash([6, 5]);
    g.strokeStyle = color; g.lineWidth = 3; g.shadowColor = color; g.shadowBlur = 10;
    g.beginPath(); g.moveTo(x + ux * 14, y + uy * 14); g.lineTo(ex - ux * 10, ey - uy * 10); g.stroke();
    g.setLineDash([]); g.shadowBlur = 0; g.fillStyle = color;
    g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex - ux * 13 - uy * 6.5, ey - uy * 13 + ux * 6.5); g.lineTo(ex - ux * 13 + uy * 6.5, ey - uy * 13 - ux * 6.5); g.closePath(); g.fill();
    g.restore();
    if (text) {
      if (Math.abs(ux) < 0.3) label(g, text, ex + 10, ey + (uy > 0 ? 16 : -8), color, 'left');
      else label(g, text, ex + ux * 10 + (ux > 0 ? 4 : -4), ey + uy * 10 + 5, color, ux > 0 ? 'left' : 'right');
    }
  }
  function arrowVel(g, x, y, sim) {
    if (sim.speed < 0.05) return;
    arrow(g, x, y, sim.vx * 3, sim.vy * 3, C.cyan, Math.min(100, 30 + sim.speed * 2), 'v = ' + (Math.round(sim.speed * 10) / 10) + ' m/s');
  }
  function gate(g, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy); const ux = dx / L, uy = dy / L;
    const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, 'rgba(91,214,154,0.55)'); gr.addColorStop(0.5, 'rgba(91,214,154,0.12)'); gr.addColorStop(1, 'rgba(91,214,154,0.55)');
    g.strokeStyle = gr; g.lineWidth = 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    for (const [px, py, s] of [[x1, y1, -1], [x2, y2, 1]]) {
      g.save(); g.translate(px, py); g.rotate(Math.atan2(dy, dx));
      const pg = g.createLinearGradient(-4, 0, 4, 0); pg.addColorStop(0, '#C9D2DE'); pg.addColorStop(1, '#3A4558');
      g.fillStyle = pg; g.fillRect(-4, s > 0 ? 0 : -18, 8, 18);
      g.shadowColor = C.green; g.shadowBlur = 14; g.fillStyle = '#D9FFE9'; g.beginPath(); g.arc(0, s > 0 ? 18 : -18, 3.2, 0, 6.283); g.fill();
      g.restore();
    }
  }
  function dock(g, cam, geo, leg) {
    const x = cam.toX(geo.bx), y = cam.toY(geo.by); const h = leg.hw * cam.scale * 0.9;
    g.save(); g.translate(x, y); g.rotate(-Math.atan2(geo.uy, geo.ux));
    const pg = g.createLinearGradient(0, -h, 0, h); pg.addColorStop(0, '#6b7686'); pg.addColorStop(0.5, '#c3ccd8'); pg.addColorStop(1, '#3a4252');
    g.fillStyle = pg; g.fillRect(6, -h, 14, 2 * h); g.fillStyle = '#2a3140'; g.fillRect(0, -10, 8, 20);
    for (let i = -3; i <= 3; i++) { g.fillStyle = i % 2 ? '#ffd166' : '#4FD1E8'; g.beginPath(); g.arc(13, i * h / 3.5, 2.2, 0, 6.283); g.fill(); }
    g.restore();
    label(g, 'DOCK  ≤ ' + leg.gate.maxSpeed + ' m/s', x, y - h - 10, C.green, 'center');
  }
  function label(g, text, x, y, color, align) {
    g.save(); g.font = '600 12px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
    g.lineWidth = 4; g.strokeStyle = 'rgba(3,6,13,0.85)'; g.lineJoin = 'round'; g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y); g.restore();
  }
  function fmtN(v) { return Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : (Math.round(v * 10) / 10).toString(); }
  function fmtSci(v) { const e = Math.floor(Math.log10(v)); return (v / Math.pow(10, e)).toFixed(1) + 'e' + e; }

  root.GWRender = { Renderer, makeAsteroid, makeStarfield };
})(window);
