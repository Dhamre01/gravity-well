/* Gravity Well — game flow and UI. */
(function () {
  'use strict';
  const P = window.GWPhysics, LV = window.GWLevels, CALC = window.GWCalc, R = window.GWRender;
  const LEVELS = LV.LEVELS, F = LV.fmt;
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SAVE_KEY = 'gravitywell.progress.v1';

  const App = {
    progress: load(), level: null, sim: null, renderer: new R.Renderer(), screen: null,
    attempts: 0, solutionViewed: false, stageValues: [], planStage: 0, lastFocus: null,
    speed: 4, playing: false, raf: 0, simClock: 0, lastFrame: 0, calc: { expr: '', ans: 0 }, rafPlan: 0,
  };

  function load() { try { return Object.assign({ stars: {}, cleared: {} }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { return { stars: {}, cleared: {} }; } }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(App.progress)); } catch (e) { /* private mode */ } }
  function unlockedUpTo() { let u = 1; for (const l of LEVELS) if (App.progress.cleared[l.num]) u = Math.max(u, l.num + 1); return Math.min(u, LEVELS.length); }
  function totalStars() { return Object.values(App.progress.stars).reduce((a, b) => a + b, 0); }
  function rank() { const s = totalStars(); return s >= 27 ? 'Commander' : s >= 21 ? 'Captain' : s >= 15 ? 'Lieutenant' : s >= 9 ? 'Cadet II' : s >= 3 ? 'Cadet I' : 'Recruit'; }
  function starsHtml(n) { let h = '<span class="stars-big">'; for (let i = 1; i <= 3; i++) h += '<span class="' + (i <= n ? '' : 'star-off') + '">★</span>'; return h + '</span>'; }

  // ---------- Page background ----------
  (function bg() {
    const cv = $('#stars'); const draw = () => { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.drawImage(R.makeStarfield(innerWidth, innerHeight, 99), 0, 0); };
    draw(); let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200); });
  })();

  function show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    App.screen = name; window.scrollTo(0, 0);
    if (name !== 'plan') cancelAnimationFrame(App.rafPlan);
    if (name !== 'flight') { App.playing = false; cancelAnimationFrame(App.raf); }
  }
  function topbar(extra) {
    $('#topright').innerHTML = '<span>Pilot rank: <strong style="color:var(--text)">' + rank() + '</strong></span><span class="stars">' + totalStars() + ' / ' + (LEVELS.length * 3) + ' stars</span>' + (extra || '') + '<a class="manual-link" href="manual.html" target="_blank" rel="noopener" title="Pilot\'s operating handbook (opens in a new tab)"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Manual</span></a>';
  }
  $('#brand').addEventListener('click', showMap);
  $('#brand').addEventListener('keydown', e => { if (e.key === 'Enter') showMap(); });

  // ================= SECTOR MAP =================
  function showMap() {
    topbar(); const unlocked = unlockedUpTo(); const cleared = Object.keys(App.progress.cleared).length;
    let cards = '';
    for (const l of LEVELS) {
      const done = !!App.progress.cleared[l.num], locked = l.num > unlocked, next = l.num === unlocked && !done;
      const cls = 'panel level-card' + (locked ? ' locked' : '') + (next ? ' panel-hi' : '');
      cards += '<div class="' + cls + '"><div class="num"><span>LVL ' + String(l.num).padStart(2, '0') + '</span><span class="' + (done ? 'c-green' : next ? 'c-cyan' : '') + '">' + (done ? 'CLEARED' : next ? 'NEXT UP' : locked ? 'LOCKED' : 'OPEN') + '</span></div>'
        + '<div class="title">' + esc(l.title) + '</div><div class="dim" style="font-size:13px">' + esc(l.subtitle) + '</div><div class="formula">' + esc(l.formula) + '</div>'
        + '<div class="foot">' + (done ? starsHtml(App.progress.stars[l.num] || 0) : '<span></span>')
        + (locked ? '' : '<button class="' + (next ? 'btn-primary' : '') + '" data-level="' + l.num + '">' + (done ? 'Replay' : 'Start mission') + '</button>') + '</div></div>';
    }
    $('#screen-map').innerHTML = '<div class="map-head"><div><div class="eyebrow">Sector map</div><h1>Belt Alpha</h1></div>'
      + '<p class="muted" style="max-width:560px">Each level adds one new force or idea. Clear a level to unlock the next. Stars reward accuracy, few attempts and fuel saved. Later levels pause at checkpoints so you can plan the next leg from live telemetry. New pilot? Read the <a href="manual.html" target="_blank" rel="noopener">Pilot\'s Operating Handbook</a> first.</p></div>'
      + '<div class="levels">' + cards + '</div>'
      + '<div class="row" style="margin-top:20px;gap:18px"><span class="muted" style="white-space:nowrap">Belt Alpha progress</span><div class="progressbar"><div style="width:' + (cleared / LEVELS.length * 100) + '%"></div></div><span class="mono">' + cleared + ' / ' + LEVELS.length + ' cleared</span>'
      + '<button id="reset" style="min-height:36px;font-size:12px;padding:0 10px">Reset progress</button></div>';
    $('#screen-map').querySelectorAll('button[data-level]').forEach(b => b.addEventListener('click', () => showBrief(LEVELS.find(l => l.num === +b.dataset.level))));
    $('#reset').addEventListener('click', () => { if (confirm('Reset all progress and stars?')) { App.progress = { stars: {}, cleared: {} }; save(); showMap(); } });
    show('map');
  }

  // ================= BRIEFING =================
  function showBrief(level) {
    App.level = level; App.attempts = 0; App.solutionViewed = false; App.stageValues = [];
    App.renderer.setLevel(level); App.sim = new P.Sim(level);
    topbar(); const st = level.stages[0];
    const known = st.known(App.sim).map(k => '<span class="k">' + esc(k[0]) + '</span><span class="v">' + esc(k[1]) + '</span>').join('');
    const enters = level.stages.map((s, i) => (level.stages.length > 1 ? '<strong>' + esc(s.title) + ':</strong> ' : '') + (s.inputs.length ? s.inputs.map(x => esc(x.label)).join(' · ') : 'no inputs (coast)')).map(x => '<div>' + x + '</div>').join('');
    $('#screen-brief').innerHTML = '<div class="row between" style="margin-bottom:16px"><button id="b-back">‹ Sector map</button><span class="mono muted" style="font-size:13px">BELT ALPHA · LEVEL ' + String(level.num).padStart(2, '0') + ' · MISSION BRIEFING</span><span></span></div>'
      + '<div class="brief"><div class="viewport"><canvas id="cv-brief"></canvas><div class="overlay"><span>Top-down view · ' + esc(level.legs.length > 1 ? level.legs.length + ' legs' : 'single leg') + '</span></div></div>'
      + '<div class="stack" style="gap:20px"><div><div class="eyebrow">New concept · ' + esc(level.concept) + '</div><h1 style="margin-top:8px">' + esc(level.title) + '</h1>' + ((window.GWTutorials || {})[level.num] ? '<a href="#" id="to-tut" class="chip" style="display:inline-block;margin-top:10px;text-decoration:none;color:var(--amber);border-color:#7a5a1e">📘 New idea? Read the Flight School lesson below ↓</a>' : '') + '</div>'
      + '<p style="font-size:16px;line-height:1.6;color:#c5d2e4">' + esc(level.intro) + '</p>'
      + '<div class="panel"><div class="sectionlabel" style="margin-bottom:10px">Known values</div><div class="known">' + known + '</div></div>'
      + '<div class="panel stack" style="gap:8px"><div class="sectionlabel">You will enter</div><div style="font-size:14px;line-height:1.6;color:#c5d2e4">' + enters + '</div><div class="note">' + esc(level.assumptions) + '</div></div>'
      + '<button class="btn-primary btn-lg" id="b-open">Open flight computer</button></div></div>' + tutorialHtml(level);
    $('#b-back').addEventListener('click', showMap);
    $('#b-open').addEventListener('click', () => showPlan(0, false));
    const tt = $('#to-tut'); if (tt) tt.addEventListener('click', e => { e.preventDefault(); $('.tutorial').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const b2 = $('#b-open2'); if (b2) b2.addEventListener('click', () => showPlan(0, false));
    show('brief');
    requestAnimationFrame(() => App.renderer.draw($('#cv-brief'), { sim: App.sim, mode: 'plan', previewBurns: [] }));
  }


  function tutorialHtml(level) {
    const t = (window.GWTutorials || {})[level.num]; if (!t) return '';
    return '<section class="panel tutorial" aria-labelledby="tut-h"><div class="tut-head"><div><div class="eyebrow amber">Flight school · ' + esc(level.concept) + '</div><h2 id="tut-h" style="margin-top:6px">' + esc(t.title) + '</h2></div>'
      + '<div class="tut-formulas">' + t.formulas.map(f => '<span>' + esc(f) + '</span>').join('') + '</div></div>'
      + '<div class="tut-grid"><div class="tut-idea"><div class="sectionlabel">The idea</div>' + t.idea.map(p => '<p>' + esc(p) + '</p>').join('') + '</div>'
      + '<div class="stack" style="gap:14px"><div class="tut-example"><div class="sectionlabel">Worked example <span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">· different numbers from your mission</span></div><p>' + esc(t.example.setup) + '</p>'
      + t.example.steps.map((x, i) => '<div class="tut-step"><span>' + (i + 1) + '</span><code>' + esc(x) + '</code></div>').join('') + '</div>'
      + '<div class="callout amber"><div class="eyebrow amber" style="margin-bottom:4px">Watch out</div>' + esc(t.watch) + '</div></div></div>'
      + '<div class="tut-foot"><span class="muted">More in the <a href="manual.html#sec-11" target="_blank" rel="noopener">physics reference</a> and <a href="manual.html#sec-10" target="_blank" rel="noopener">mission notes</a>.</span><button class="btn-primary" id="b-open2">Open flight computer</button></div></section>';
  }

  // ================= PLAN / FLIGHT COMPUTER =================
  function showPlan(stageIndex, keepValues) {
    const level = App.level; const st = level.stages[stageIndex]; App.planStage = stageIndex;
    // make sure the sim is paused at this stage
    if (!(App.sim && App.sim.status === 'paused' && App.sim.pendingStage === stageIndex)) App.sim = P.simAtStage(level, App.stageValues, stageIndex);
    const sim = App.sim; const prev = keepValues ? (App.stageValues[stageIndex] || {}) : {};
    topbar('<span class="mono">ATTEMPT ' + (App.attempts + 1) + '</span>' + fuelChip(sim));
    const unlocked = LV.FORMULAS.filter(f => f.level <= level.num); const fresh = unlocked.filter(f => f.level === level.num);
    const known = st.known(sim).map(k => '<span class="k">' + esc(k[0]) + '</span><span class="v' + (k[2] != null ? ' click" data-ins="' + k[2] + '" title="Insert into calculator' : '') + '">' + esc(k[1]) + '</span>').join('');
    const fields = st.inputs.map((inp, i) => '<div class="field' + (inp.drives ? ' drives' : '') + '"><label for="in-' + inp.id + '">' + (i + 1) + ' · ' + esc(inp.label) + '</label><div class="in"><input id="in-' + inp.id + '" data-id="' + inp.id + '" inputmode="decimal" autocomplete="off" placeholder="enter value" value="' + (prev[inp.id] != null ? esc(prev[inp.id]) : '') + '"><span class="unit">' + esc(inp.unit) + '</span></div>' + (inp.id === 'F' && level.ship.maxThrust ? '<div class="sub">Engine max: ' + F.f0(level.ship.maxThrust) + ' N</div>' : '') + '</div>').join('');
    const banner = st.checkpoint ? '<div class="checkpoint-banner"><div class="pulse"></div><div><div class="eyebrow">Checkpoint reached · T+' + F.f1(sim.t) + ' s</div><div style="font-size:14px;color:#c5d2e4">The ship is holding at the gate. Known values below now show live telemetry; plan the next leg from them.</div></div></div>' : '';
    $('#screen-plan').innerHTML = '<div class="row between" style="margin-bottom:12px;flex-wrap:wrap;gap:10px"><div class="row"><button id="p-back">‹ ' + (st.checkpoint ? 'Abort mission' : 'Briefing') + '</button><h2>LVL ' + String(level.num).padStart(2, '0') + ' · ' + esc(level.title) + (level.stages.length > 1 ? ' <span class="muted" style="font-weight:400;font-size:16px">· stage ' + (stageIndex + 1) + ' of ' + level.stages.length + '</span>' : '') + '</h2></div><span class="mono muted" style="font-size:13px">' + (st.checkpoint ? '<span class="c-cyan">CHECKPOINT</span>' : '<span class="c-cyan">PLANNING</span>') + '</span></div>' + banner
      + '<div class="plan"><div class="viewport"><canvas id="cv-plan"></canvas><div class="overlay"><span>Arrows update as you type · gravity shown as direction only until you fly</span></div><div class="zoom"><button id="z-in" aria-label="Zoom in">+</button><button id="z-out" aria-label="Zoom out">−</button></div></div>'
      + '<div class="tools"><div class="panel formulas"><div class="row between"><span class="sectionlabel">Formula reference</span><span class="muted" style="font-size:12px">Unlocked: ' + unlocked.length + '</span></div>'
      + fresh.map(f => '<div class="formula-new"><div class="f">' + esc(f.f) + '</div><div class="muted" style="font-size:13px;margin-top:3px">' + esc(f.d) + ' · NEW this level</div></div>').join('')
      + '<div class="formula-list">' + unlocked.filter(f => f.level < level.num).map(f => '<div>' + esc(f.f) + '<span>' + esc(f.d) + '</span></div>').join('') + '</div>'
      + '<div class="panel" style="padding:12px 14px;margin-top:4px"><div class="sectionlabel" style="margin-bottom:8px">Known values · click one to send it to the calculator</div><div class="known">' + known + '</div></div></div>'
      + calcHtml() + '</div>'
      + '<div class="panel fc"><div><div class="eyebrow">Flight computer</div><div class="muted" style="font-size:14px;margin-top:4px">' + esc(st.title) + '. The ship flies exactly what you enter — no autopilot.</div></div>'
      + (st.inputs.length ? fields : '<div class="callout cyan">' + esc(st.note || 'No inputs on this stage.') + '</div>')
      + '<div class="note">' + esc(level.assumptions) + '</div>'
      + '<div class="note">Headings, the calculator and check vs. drive fields are explained in the <a href="manual.html#sec-4" target="_blank" rel="noopener">pilot\'s manual §4</a>. <a href="manual.html#sec-10" target="_blank" rel="noopener">Mission notes</a> · <a href="manual.html#sec-3" target="_blank" rel="noopener">heading compass</a></div>'
      + '<div class="row between" style="font-size:13px;color:var(--muted)"><span>Fields complete</span><span class="mono" id="fc-count">0 / ' + st.inputs.length + '</span></div>'
      + '<button class="btn-primary btn-lg" id="launch">' + (st.checkpoint ? 'RESUME FLIGHT' : st.inputs.length ? 'LAUNCH' : 'FLY') + '</button></div></div>';
    $('#p-back').addEventListener('click', () => st.checkpoint ? showMap() : showBrief(level));
    $('#launch').addEventListener('click', launch);
    $('#z-in').addEventListener('click', () => { App.renderer.zoom = Math.min(4, App.renderer.zoom * 1.3); });
    $('#z-out').addEventListener('click', () => { App.renderer.zoom = Math.max(0.5, App.renderer.zoom / 1.3); });
    document.querySelectorAll('#screen-plan .fc input').forEach(inp => {
      inp.addEventListener('input', updatePlan); inp.addEventListener('focus', () => { App.lastFocus = inp; });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const all = [...document.querySelectorAll('#screen-plan .fc input')]; const i = all.indexOf(inp); if (i < all.length - 1) all[i + 1].focus(); else launch(); } });
    });
    document.querySelectorAll('#screen-plan .known .v.click').forEach(v => v.addEventListener('click', () => calcInsert(formatInsert(+v.dataset.ins))));
    wireCalc(); show('plan'); App.lastFocus = $('#screen-plan .fc input'); updatePlan();
    const loop = () => { if (App.screen !== 'plan') return; App.renderer.draw($('#cv-plan'), { sim: App.sim, mode: 'plan', previewBurns: previewBurns() }); App.rafPlan = requestAnimationFrame(loop); };
    App.rafPlan = requestAnimationFrame(loop);
    if (App.lastFocus) App.lastFocus.focus();
  }
  function formatInsert(v) { if (v === P.G) return '6.67e-11'; if (Math.abs(v) >= 1e6) return v.toExponential(2).replace('+', ''); return String(Math.round(v * 1000) / 1000); }
  function fuelChip(sim) { const f = sim.level.fuel; if (!f || !f.budget) return ''; const left = Math.max(0, 100 - sim.fuelUsed / f.budget * 100); return '<span class="mono">FUEL ' + Math.round(left) + '%</span>'; }
  function readValues() { const v = {}; document.querySelectorAll('#screen-plan .fc input').forEach(i => { v[i.dataset.id] = i.value.trim(); }); return v; }
  function previewBurns() {
    const st = App.level.stages[App.planStage]; if (!st.program) return [];
    try {
      const vals = readValues(); for (const k in vals) vals[k] = parseFloat(vals[k]) || 0;
      const prog = st.program(vals, App.sim) || {}; const out = [];
      for (const b of (prog.burns || [])) {
        if ((b.t0 || 0) > 0.01) continue;
        let fx, fy; if (b.force !== undefined) { const f = Math.min(Math.abs(b.force), App.sim.maxThrust); fx = f * Math.cos(b.heading * P.DEG); fy = f * Math.sin(b.heading * P.DEG); } else { fx = b.fx || 0; fy = b.fy || 0; }
        if (isFinite(fx) && isFinite(fy)) out.push({ fx, fy });
      }
      return out;
    } catch (e) { return []; }
  }
  function updatePlan() {
    const inputs = [...document.querySelectorAll('#screen-plan .fc input')]; const done = inputs.filter(i => i.value.trim() !== '' && isFinite(parseFloat(i.value))).length;
    $('#fc-count').textContent = done + ' / ' + inputs.length;
    inputs.forEach(i => i.classList.toggle('bad', i.value.trim() !== '' && !isFinite(parseFloat(i.value))));
  }

  // ---------- Calculator ----------
  function calcHtml() {
    const keys = [['7', ''], ['8', ''], ['9', ''], ['÷', 'op'], ['x²', 'op'], ['√', 'op'], ['4', ''], ['5', ''], ['6', ''], ['×', 'op'], ['sin', 'op'], ['cos', 'op'], ['1', ''], ['2', ''], ['3', ''], ['−', 'op'], ['tan', 'op'], ['atan2', 'op'], ['0', ''], ['.', ''], ['EXP', ''], ['+', 'op'], ['(', 'op'], [')', 'op'], ['ANS', ''], ['G', ''], ['π', ''], ['^', 'op'], ['⌫', 'op'], ['C', 'op']];
    return '<div class="panel calc"><div class="row between" style="margin-bottom:8px"><span class="sectionlabel">Calculator</span><span class="muted" style="font-size:12px">trig in degrees · type or tap</span></div>'
      + '<div class="display"><input id="calc-expr" placeholder="e.g. 6.67e-11 * 4.5e15 * 1200 / 1500^2" value="' + esc(App.calc.expr) + '"><div class="res" id="calc-res">' + (App.calc.ans ? CALC.format(App.calc.ans) : '0') + '</div></div>'
      + '<div class="keys" style="margin-top:8px">' + keys.map(k => '<button type="button" data-k="' + esc(k[0]) + '" class="' + k[1] + '">' + esc(k[0]) + '</button>').join('') + '<button type="button" class="eq" data-k="=" style="grid-column:span 3">=</button><button type="button" class="use" data-k="use" style="grid-column:span 3">Use → field</button></div>'
      + '<div class="calc-foot"><span>Functions: sqrt, sin, cos, tan, atan, atan2(y,x), abs, log, ln · G = 6.67e-11</span></div></div>';
  }
  function wireCalc() {
    const ex = $('#calc-expr');
    ex.addEventListener('input', () => { App.calc.expr = ex.value; calcEval(false); });
    ex.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); calcEval(true); } });
    document.querySelectorAll('.keys button').forEach(b => b.addEventListener('click', () => calcKey(b.dataset.k)));
    calcEval(false);
  }
  function calcInsert(text) { const ex = $('#calc-expr'); if (!ex) return; const s = ex.selectionStart || ex.value.length, e = ex.selectionEnd || s; ex.value = ex.value.slice(0, s) + text + ex.value.slice(e); App.calc.expr = ex.value; ex.focus(); ex.setSelectionRange(s + text.length, s + text.length); calcEval(false); }
  function calcKey(k) {
    const ex = $('#calc-expr');
    if (k === 'C') { ex.value = ''; App.calc.expr = ''; calcEval(false); ex.focus(); return; }
    if (k === '⌫') { const s = ex.selectionStart || ex.value.length; if (s > 0) { ex.value = ex.value.slice(0, s - 1) + ex.value.slice(ex.selectionEnd || s); ex.setSelectionRange(s - 1, s - 1); } App.calc.expr = ex.value; calcEval(false); ex.focus(); return; }
    if (k === '=') { calcEval(true); return; }
    if (k === 'use') { if (App.lastFocus && document.body.contains(App.lastFocus)) { App.lastFocus.value = CALC.format(App.calc.ans); App.lastFocus.dispatchEvent(new Event('input')); App.lastFocus.focus(); } return; }
    const map = { 'x²': '^2', '√': 'sqrt(', 'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(', 'atan2': 'atan2(', 'EXP': 'e', 'ANS': 'ans', '×': '*', '÷': '/', '−': '-' };
    calcInsert(map[k] !== undefined ? map[k] : k);
  }
  function calcEval(commit) {
    const ex = $('#calc-expr'), res = $('#calc-res'); if (!ex) return; const src = ex.value.trim();
    if (!src) { res.textContent = App.calc.ans ? CALC.format(App.calc.ans) : '0'; res.classList.remove('err'); return; }
    try { const v = CALC.evaluate(src, { ans: App.calc.ans }); res.textContent = CALC.format(v); res.classList.remove('err'); if (commit) { App.calc.ans = v; } }
    catch (e) { if (commit) { res.textContent = e.message; res.classList.add('err'); } else { res.textContent = '…'; res.classList.remove('err'); } }
  }

  // ================= FLIGHT =================
  function launch() {
    const st = App.level.stages[App.planStage]; const vals = readValues();
    const missing = st.inputs.filter(i => vals[i.id] === '' || !isFinite(parseFloat(vals[i.id])));
    if (missing.length) { const el = $('#in-' + missing[0].id); el.focus(); el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 900); return; }
    App.stageValues[App.planStage] = vals;
    if (App.planStage === 0) App.attempts++;
    App.sim.beginStage(vals);
    showFlight();
  }
  function showFlight() {
    const level = App.level, sim = App.sim; topbar('<span class="mono">ATTEMPT ' + App.attempts + '</span><span class="mono c-green">IN FLIGHT</span>');
    $('#screen-flight').innerHTML = '<div class="row between" style="margin-bottom:12px"><h2>LVL ' + String(level.num).padStart(2, '0') + ' · ' + esc(level.title) + '</h2><span class="mono muted" style="font-size:13px">STAGE ' + (sim.stageIndex + 1) + ' / ' + level.stages.length + '</span></div>'
      + '<div class="flight"><div><div class="viewport"><canvas id="cv-flight"></canvas><div class="clock" id="clock">T+ 0.0 s</div><div class="zoom"><button id="fz-in" aria-label="Zoom in">+</button><button id="fz-out" aria-label="Zoom out">−</button></div></div>'
      + '<div class="panel playbar"><button id="pp" aria-label="Pause" style="width:48px;padding:0">❚❚</button><div class="row spd" style="gap:6px"><button data-s="1">1×</button><button data-s="4" class="on">4×</button><button data-s="16">16×</button><button data-s="64">64×</button></div><div class="progressbar" style="flex:1"><div id="tprog" style="width:0%"></div></div><span class="mono dim" id="tlabel" style="font-size:13px"></span><button id="skip">Skip to result</button><button id="abort" class="btn-danger">Abort</button></div></div>'
      + '<div class="panel stack" style="gap:16px"><div class="eyebrow">Live telemetry</div><div class="tele" id="tele"></div><div><div class="sectionlabel" style="margin-bottom:6px">Forces on ship</div><div class="forces" id="forces"></div></div><div id="edge"></div><div id="fuel"></div><div class="callout green" id="status" style="margin-top:auto">Burn programmed. Flying.</div></div></div>';
    $('#pp').addEventListener('click', () => { App.playing = !App.playing; $('#pp').textContent = App.playing ? '❚❚' : '▶'; App.lastFrame = 0; });
    document.querySelectorAll('.spd button').forEach(b => b.addEventListener('click', () => { App.speed = +b.dataset.s; document.querySelectorAll('.spd button').forEach(x => x.classList.toggle('on', x === b)); }));
    $('#skip').addEventListener('click', () => { sim.runUntilPause(); App.playing = false; afterFlight(); });
    $('#abort').addEventListener('click', () => { App.playing = false; cancelAnimationFrame(App.raf); showMap(); });
    $('#fz-in').addEventListener('click', () => { App.renderer.zoom = Math.min(4, App.renderer.zoom * 1.3); });
    $('#fz-out').addEventListener('click', () => { App.renderer.zoom = Math.max(0.5, App.renderer.zoom / 1.3); });
    show('flight'); App.playing = true; App.lastFrame = 0; App.raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (App.screen !== 'flight') return;
    const sim = App.sim;
    if (App.playing && sim.status === 'flying') {
      const dt = App.lastFrame ? Math.min(0.05, (now - App.lastFrame) / 1000) : 0; App.lastFrame = now;
      let budget = dt * App.speed; const maxSteps = 4000; let n = 0;
      while (budget > 0 && sim.status === 'flying' && n++ < maxSteps) { sim.step(P.DT); budget -= P.DT; }
    } else App.lastFrame = now;
    App.renderer.draw($('#cv-flight'), { sim, mode: 'flight', time: now / 1000 });
    telemetry(sim);
    if (sim.status !== 'flying') { setTimeout(afterFlight, sim.status === 'fail' ? 900 : 500); return; }
    App.raf = requestAnimationFrame(frame);
  }
  function telemetry(sim) {
    const L = sim.level, leg = sim.currentLeg; let s = 0, d = 0, edge = 0, legLen = 1;
    if (leg.type === 'orbit') { const b = L.bodies[leg.body]; const r = Math.hypot(sim.x - b.x, sim.y - b.y); d = r - leg.r; edge = Math.min(r - leg.rmin, leg.rmax - r); s = sim.legSwept * leg.r; legLen = leg.sweep * leg.r; }
    else { const g = P.legGeom(leg), p = P.project(g, sim.x, sim.y); s = p.s; d = p.d; edge = leg.hw - Math.abs(p.d); legLen = g.len; }
    const net = sim.netForce();
    $('#clock').textContent = 'T+ ' + sim.t.toFixed(1) + ' s';
    $('#tele').innerHTML = tile(leg.type === 'orbit' ? 'Arc flown' : 'Downrange', F.f0(s) + ' m') + tile(leg.type === 'orbit' ? 'Radius error' : 'Drift from centreline', (d >= 0 ? '+' : '−') + F.f1(Math.abs(d)) + ' m', Math.abs(d) > (leg.hw || 200) * 0.6 ? 'c-amber' : 'c-green')
      + tile('Speed', F.f2(sim.speed) + ' m/s') + tile('Heading', F.f1(sim.heading) + '°') + tile('Net force', F.f1(net.mag) + ' N') + tile('Mass', F.f0(sim.mass) + ' kg');
    $('#forces').innerHTML = sim.forces().map(f => '<div><span class="' + (f.kind === 'thrust' ? 'c-violet' : 'c-amber') + '">' + esc(f.name) + '</span><span class="mono">' + F.f1(Math.hypot(f.fx, f.fy)) + ' N @ ' + Math.round(((Math.atan2(f.fy, f.fx) / P.DEG) + 360) % 360) + '°</span></div>').join('') || '<div class="muted">Coasting — no forces</div>';
    const edgeFrac = Math.max(0, Math.min(1, edge / (leg.type === 'orbit' ? (leg.rmax - leg.rmin) / 2 : leg.hw)));
    $('#edge').innerHTML = '<div class="row between" style="font-size:13px;color:var(--muted)"><span>' + (leg.type === 'orbit' ? 'Margin to safe-band edge' : 'Distance to corridor edge') + '</span><span class="mono">' + F.f1(Math.max(0, edge)) + ' m</span></div><div class="progressbar fuel' + (edgeFrac < 0.25 ? ' bad' : edgeFrac < 0.5 ? ' warn' : '') + '" style="margin-top:6px"><div style="width:' + (edgeFrac * 100) + '%"></div></div>';
    const fu = L.fuel; if (fu && fu.budget) { const left = Math.max(0, 1 - sim.fuelUsed / fu.budget); $('#fuel').innerHTML = '<div class="row between" style="font-size:13px;color:var(--muted)"><span>Fuel (impulse) remaining</span><span class="mono">' + Math.round(left * 100) + '% · ' + F.f0(sim.fuelUsed) + ' of ' + F.f0(fu.budget) + ' N·s used</span></div><div class="progressbar fuel' + (left < 0.2 ? ' bad' : left < 0.4 ? ' warn' : '') + '" style="margin-top:6px"><div style="width:' + (left * 100) + '%"></div></div>'; }
    const frac = Math.max(0, Math.min(1, s / legLen)); $('#tprog').style.width = (frac * 100) + '%'; $('#tlabel').textContent = Math.round(frac * 100) + '% of leg ' + (sim.legIndex + 1);
    const st = $('#status');
    if (leg.type === 'orbit' && sim.t > 5) { st.className = 'callout cyan'; st.textContent = 'In orbit: gravity supplies the centripetal acceleration v²/r = ' + F.f2(sim.speed * sim.speed / Math.hypot(sim.x - L.bodies[leg.body].x, sim.y - L.bodies[leg.body].y)) + ' m/s², so the path bends instead of the speed changing.'; }
    else if (net.mag < 0.5 && sim.speed > 0.1) { st.className = 'callout green'; st.textContent = 'Forces balanced: the ship keeps its velocity (Newton\'s 1st law).'; }
    else if (edgeFrac < 0.3) { st.className = 'callout red'; st.textContent = 'Warning: closing on the corridor edge.'; }
    else if (net.mag >= 0.5) { st.className = 'callout amber'; st.textContent = 'Net force ' + F.f1(net.mag) + ' N → accelerating at ' + F.f2(net.mag / sim.mass) + ' m/s².'; }
    if (sim.fuelOut) { st.className = 'callout red'; st.textContent = 'Fuel exhausted — thrusters dead.'; }
  }
  function tile(k, v, cls) { return '<div class="inset"><div>' + esc(k) + '</div><div class="' + (cls || '') + '">' + esc(v) + '</div></div>'; }

  function afterFlight() {
    const sim = App.sim; if (App.screen !== 'flight') return;
    if (sim.status === 'paused') showPlan(sim.pendingStage, false);
    else if (sim.status === 'success') showSuccess();
    else showDebrief();
  }

  // ================= DEBRIEF =================
  function showDebrief() {
    const level = App.level, sim = App.sim; const k = sim.stageIndex; const st = level.stages[k];
    const simAt = P.simAtStage(level, App.stageValues, k); // state at the start of the failed stage, for grading live-dependent answers
    const rows = LV.gradeStage(level, k, App.stageValues[k], simAt);
    const hint = rows.map(r => r.hint).find(Boolean) || genericHint(rows, sim);
    topbar('<span class="mono">ATTEMPT ' + App.attempts + '</span><span class="mono c-red">MISSION FAILED</span>');
    const table = rows.length ? '<table class="entries"><tr><th>Field</th><th>You entered</th><th>Check</th></tr>' + rows.map(r => '<tr><td>' + esc(r.label) + '</td><td class="mono ' + (r.ok ? 'c-green' : 'c-red') + '">' + (isFinite(r.entered) ? F.f2(r.entered) + ' ' + esc(r.unit) : '—') + '</td><td class="' + (r.ok ? 'c-green' : 'c-red') + '">' + (r.ok ? 'Correct' : offBy(r)) + '</td></tr>').join('') + '</table>' : '<div class="muted">No entries on this stage.</div>';
    $('#screen-debrief').innerHTML = '<div class="debrief"><div class="stack" style="gap:14px"><div><div class="eyebrow red">Crash debrief' + (level.stages.length > 1 ? ' · stage ' + (k + 1) : '') + '</div><h1 style="font-size:30px;margin-top:6px">' + esc(sim.fail.msg) + '</h1><div class="muted" style="margin-top:6px">At T+' + F.f1(sim.t) + ' s' + (sim.fail.s != null ? ' · ' + F.f0(sim.fail.s) + ' m downrange · ' + F.f0(Math.abs(sim.fail.d)) + ' m off the centreline' : '') + '</div></div>'
      + '<div class="viewport" style="flex:1"><canvas id="cv-debrief"></canvas><div class="overlay"><span class="c-green">green dashes = needed path</span><span class="c-red">red = your path</span></div></div>'
      + '<div class="panel"><div class="sectionlabel" style="margin-bottom:10px">Your entries</div>' + table + '</div></div>'
      + '<div class="stack" style="gap:14px"><div class="callout amber"><div class="eyebrow amber" style="margin-bottom:6px">Hint</div><div style="font-size:15px">' + esc(hint) + '</div><div style="font-size:13px;margin-top:8px">More help: <a href="manual.html#sec-8" target="_blank" rel="noopener" style="color:#f5b63e">manual §8, failure messages</a></div></div>'
      + '<div class="panel stack" style="gap:10px;flex:1"><div class="row between"><span class="eyebrow">Worked solution</span><span class="muted" style="font-size:12px">' + (App.solutionViewed ? 'Viewed · this level is capped at 2 stars' : 'Viewing caps this level at 2 stars') + '</span></div><div id="sol">' + (App.solutionViewed ? solutionHtml(st, simAt) : '<button id="show-sol">Show worked solution</button>') + '</div></div>'
      + '<div class="row"><button class="btn-primary btn-lg" id="retry" style="flex:1">Retry (keep my values)</button><button class="btn-lg" id="retry-fresh" style="flex:1">Retry from scratch</button></div><button id="d-map">Back to sector map</button></div></div>';
    const sb = $('#show-sol'); if (sb) sb.addEventListener('click', () => { App.solutionViewed = true; $('#sol').innerHTML = solutionHtml(st, simAt); $('#screen-debrief .panel .muted').textContent = 'Viewed · this level is capped at 2 stars'; });
    $('#retry').addEventListener('click', () => { App.sim = null; showPlan(k, true); });
    $('#retry-fresh').addEventListener('click', () => { App.stageValues = []; App.sim = null; showPlan(0, false); });
    $('#d-map').addEventListener('click', showMap);
    show('debrief');
    let t0 = performance.now(); const loop = () => { if (App.screen !== 'debrief') return; App.renderer.draw($('#cv-debrief'), { sim, mode: 'debrief', showNeeded: true, time: (performance.now() - t0) / 1000 }); App.rafPlan = requestAnimationFrame(loop); }; loop();
  }
  function offBy(r) { if (!isFinite(r.entered)) return 'Missing'; if (r.unit === 'deg') return 'Expected ' + F.f1(r.expected) + '°'; const ratio = r.expected ? r.entered / r.expected : 0; if (ratio && Math.abs(Math.log10(Math.abs(ratio))) >= 1) return Math.abs(ratio) >= 1 ? F.f0(Math.abs(ratio)) + '× too large' : F.f0(1 / Math.abs(ratio)) + '× too small'; return (r.entered > r.expected ? 'Too high' : 'Too low') + ' by ' + F.f1(Math.abs(r.entered / r.expected - 1) * 100) + '%'; }
  function genericHint(rows, sim) {
    const bad = rows.filter(r => !r.ok);
    if (!bad.length) { const c = sim.fail.code; if (c === 'early') return 'Your numbers check out but you arrived early — a small rounding error compounds over the whole leg. Carry one more decimal place.'; if (c === 'late') return 'Your numbers are close but you arrived late. Keep an extra decimal place; small errors grow over the whole leg.'; return 'Your entries are all within tolerance, yet the flight failed — re-read the assumptions on the briefing; the burn may run too long or too short.'; }
    const r = bad[0]; return 'Start with “' + r.label + '”: it is ' + offBy(r).toLowerCase() + '. The others may follow from it.';
  }
  function solutionHtml(st, simAt) { return '<div class="solution">' + st.solution(simAt).map(s => '<div class="step"><div class="t">' + esc(s.title) + '</div>' + s.lines.map(l => '<div class="l">' + esc(l) + '</div>').join('') + '</div>').join('') + '</div>'; }

  // ================= SUCCESS =================
  function showSuccess() {
    const level = App.level, sim = App.sim; const fu = level.fuel;
    let stars = 3; const reasons = [];
    if (App.attempts > 2) { stars--; reasons.push('more than 2 attempts'); }
    if (App.solutionViewed) { stars--; reasons.push('worked solution viewed'); }
    if (fu && fu.par && sim.fuelUsed > fu.par) { stars--; reasons.push('fuel above par'); }
    stars = Math.max(1, stars);
    const prevBest = App.progress.stars[level.num] || 0; App.progress.cleared[level.num] = true; App.progress.stars[level.num] = Math.max(prevBest, stars); save();
    topbar('<span class="mono c-green">GATE CLEARED</span>');
    const next = LEVELS.find(l => l.num === level.num + 1);
    const acc = Math.max(0, 100 - sim.maxDrift / ((level.legs[0].hw || 200)) * 100);
    const summary = summaryLine(level, sim);
    $('#screen-success').innerHTML = '<div class="success"><div class="panel stack" style="gap:24px;padding:36px"><div><div class="eyebrow green">Mission complete</div><h1 style="margin-top:8px;font-size:44px">' + esc(level.winTitle || 'Gate cleared.') + '</h1><p style="margin-top:12px;font-size:17px;line-height:1.55;color:#c5d2e4">' + esc(summary) + '</p></div>'
      + '<div>' + starsHtml(stars).replace('stars-big', 'stars-big" style="font-size:44px;letter-spacing:10px') + (reasons.length ? '<div class="muted" style="font-size:13px;margin-top:6px">Lost: ' + esc(reasons.join(', ')) + '</div>' : '<div class="muted" style="font-size:13px;margin-top:6px">Perfect run</div>') + '</div>'
      + '<div class="statgrid"><div class="inset"><div>Accuracy</div><div>' + acc.toFixed(1) + '%</div><div>max drift ' + F.f1(sim.maxDrift) + ' m</div></div><div class="inset"><div>Attempts</div><div>' + App.attempts + '</div><div>' + (App.solutionViewed ? 'solution viewed' : 'no solution viewed') + '</div></div><div class="inset"><div>Impulse spent</div><div>' + F.f0(sim.fuelUsed) + '</div><div>N·s' + (fu && fu.par ? ' · par ' + F.f0(fu.par) : '') + '</div></div><div class="inset"><div>Flight time</div><div>' + F.f1(sim.t) + ' s</div><div>' + (fu && fu.budget ? 'fuel left ' + Math.round(Math.max(0, 100 - sim.fuelUsed / fu.budget * 100)) + '%' : 'no fuel used') + '</div></div></div>'
      + '<div class="row" style="margin-top:auto"><button id="s-map">Sector map</button><button id="s-replay">Replay level</button></div></div>'
      + (next ? '<div class="panel panel-hi stack" style="gap:16px;padding:28px"><div class="eyebrow">Unlocked · level ' + String(next.num).padStart(2, '0') + '</div><h2 style="font-size:32px">' + esc(next.title) + '</h2><div class="teaser"><div class="viewport"><canvas id="cv-teaser"></canvas></div></div><p style="font-size:15px;line-height:1.55;color:#c5d2e4">' + esc(next.intro) + '</p><div class="mono c-cyan">New: ' + esc(next.formula) + '</div><button class="btn-primary btn-lg" id="s-next" style="margin-top:auto">Next mission</button></div>'
        : '<div class="panel panel-hi stack" style="gap:16px;padding:28px"><div class="eyebrow">Belt Alpha complete</div><h2 style="font-size:32px">You flew the Gauntlet.</h2><p style="color:#c5d2e4;line-height:1.55">Every force in the belt — thrust, braking, impulse, vectors, relative motion, gravity, momentum and orbits — now answers to your flight computer. Belt Beta (slingshots and moving asteroids) is on the drawing board.</p><div class="mono c-amber">' + totalStars() + ' / ' + (LEVELS.length * 3) + ' stars · rank ' + rank() + '</div><button class="btn-primary btn-lg" id="s-map2" style="margin-top:auto">Back to sector map</button></div>') + '</div>';
    $('#s-map').addEventListener('click', showMap); $('#s-replay').addEventListener('click', () => showBrief(level));
    if (next) { $('#s-next').addEventListener('click', () => showBrief(next)); const tr = new R.Renderer(); tr.setLevel(next); requestAnimationFrame(() => tr.draw($('#cv-teaser'), { sim: new P.Sim(next), mode: 'teaser', previewBurns: [] })); }
    else $('#s-map2').addEventListener('click', showMap);
    show('success');
  }
  function summaryLine(level, sim) {
    switch (level.num) {
      case 1: return 'You reached the gate at T+' + F.f1(sim.t) + ' s, inside the launch window. Thrust gave the acceleration; the coast did the rest.';
      case 2: return 'Docked at ' + F.f2(sim.speed) + ' m/s. The retro-burn bled off exactly the kinetic energy you arrived with.';
      case 3: return 'One 4-second burst delivered the impulse; momentum carried you through the gate at T+' + F.f1(sim.t) + ' s.';
      case 4: return 'Thrust components pointed the ship straight down the diagonal corridor — drift stayed within ' + F.f1(sim.maxDrift) + ' m.';
      case 5: return 'Clamp fired at T+' + F.f1(sim.extra.clampT || sim.t) + ' s with the drone ' + F.f1(sim.extra.clampDist || 0) + ' m away. Relative velocity told you exactly when.';
      case 6: return 'Your thrust matched KR-6\'s pull, so the net force was nearly zero and the ship held its line for all 3,000 m.';
      case 7: return 'Two pulls, one thrust. Adding the vectors gave a single force that cancelled both for the whole pass.';
      case 8: return 'The pod went one way, the ship went faster the other — momentum conserved, gate 2 crossed at T+' + F.f1(sim.t - sim.gateTimes[0]) + ' s after release.';
      case 9: return 'Circular orbit held: radius never strayed more than ' + F.f1(sim.maxDrift) + ' m from 2,000 m over half an orbit.';
      default: return 'Three legs, three different forces, one fuel tank — and ' + Math.round(Math.max(0, 100 - sim.fuelUsed / level.fuel.budget * 100)) + '% of it left.';
    }
  }

  // ---------- keyboard shortcuts ----------
  addEventListener('keydown', e => { if (App.screen === 'flight' && e.key === ' ' && e.target.tagName !== 'INPUT') { e.preventDefault(); $('#pp').click(); } });

  showMap();
})();
