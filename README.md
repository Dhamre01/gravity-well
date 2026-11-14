# Gravity Well

**A physics puzzle game.** You are a cadet pilot in an asteroid belt. The ship has no autopilot: to get through each corridor you work out the forces acting on the ship — thrust, braking, impulse, gravity, momentum, orbits — and type the results into the flight computer. Then you press LAUNCH and watch whether your numbers were right.

▶ **Play:** https://dhamre01.github.io/gravity-well/

📘 **Pilot's manual:** https://dhamre01.github.io/gravity-well/manual.html

No install, no build step, no dependencies. Open `index.html` in a browser (or serve the folder) and fly.

## How a level plays

1. **Briefing** – the situation, the known values, what you will have to enter, and a short **Flight School** lesson on the new idea (with a worked example using different numbers).
2. **Flight computer** – a formula reference (new formulas unlock as you progress), a scientific calculator, and the input fields. Click a known value to drop it into the calculator; *Use → field* sends the result to the field you were editing.
3. **Launch** – the simulator flies exactly what you entered, with live telemetry and force arrows. Playback runs at 1×–64×.
4. **Checkpoints** (later levels) – the sim pauses at a gate, shows live telemetry, and asks for the next leg's values. Errors carry forward.
5. **Debrief** – if you crash: which entries were off, a hint aimed at the specific mistake, and a worked solution (viewing it caps the level at 2 stars).
6. **Stars** – 3 for a clean run; you lose one for more than two attempts, one for viewing the solution, one for burning more fuel than par.

## Belt Alpha — the ten levels

| # | Level | Concept | Formula | Structure |
|---|---|---|---|---|
| 1 | Launch Window | Force & acceleration | F = m·a | timed gate |
| 2 | Docking Burn | Stopping distance | v² = v₀² + 2ad | dock with speed limit |
| 3 | Short Burst | Impulse & momentum | J = FΔt = mΔv | one fixed-length burst, timed gate |
| 4 | Crosscurrent | Vector components | Fx = F cos θ | diagonal corridor, thrust entered as components |
| 5 | Closing Gap | Relative velocity | v_rel = v₁ − v₂ | time a docking clamp on a moving drone |
| 6 | Pull of KR-6 | Universal gravitation | F = GMm/r² | cancel a constant pull |
| 7 | Crossfire | Vector sum of forces | ΣF = F₁ + F₂ | two asteroids, one thrust |
| 8 | Cargo Drop | Conservation of momentum | Mv = m₁v₁ + m₂v₂ | 2 legs, checkpoint at the drop zone |
| 9 | Holding Pattern | Circular orbit | v = √(GM/r) | real inverse-square gravity, half an orbit |
| 10 | The Gauntlet | Everything | — | 3 legs, 2 checkpoints, shared fuel |

Levels 6, 7 and 10 use a stated *uniform-pull* approximation (the pull is treated as constant in size and direction during a short pass). Level 9 uses true inverse-square gravity. Every assumption is printed on the briefing and the flight computer.

## Physics

`js/physics.js` is a small deterministic simulator: semi-implicit Euler at 10 ms steps, point-mass gravity, thrust as a vector, corridor and gate rules (crossing gates, timed windows, speed-limited docks, orbit bands), fuel as impulse, and stage triggers for checkpoints. It has no DOM dependencies and runs in Node.

`js/levels.js` defines each level: ship, corridors, bodies, inputs with reference answers and mistake-specific hints, the burn program the player's values produce, and the worked solution. All reference numbers are computed from the same constants the simulator uses, so the solutions always clear.

## Tests

```
node test/run-tests.js
```

Flies every level with its reference solution and checks it clears within fuel par; flies a set of classic wrong answers and checks each fails the right way; checks the grader and hints.

## Project layout

```
index.html        shell
manual.html       user guide (pilot's operating handbook)
css/style.css     layout and theme
js/physics.js     simulator (browser + Node)
js/levels.js      level data, grading, hints, solutions
js/tutorials.js   Flight School lessons shown on each briefing
js/calc.js        calculator expression evaluator
js/render.js      canvas renderer: starfield, shaded asteroids, ship, HUD
js/game.js        screens and game flow
test/run-tests.js Node test harness
```

## Credits

Built with plain HTML, CSS and JavaScript. All artwork is procedural (drawn in code at run time). Fonts: Inter, Space Grotesk and JetBrains Mono via Google Fonts.

MIT licensed — see `LICENSE`.
