/* Gravity Well — Flight School lessons shown on each mission briefing.
   Written for about a 9th-grade reading level. Worked examples deliberately use
   different numbers from the mission, so they teach the method without giving the answer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GWTutorials = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    1: {
      title: 'Force makes things speed up',
      idea: [
        'A force is a push or a pull. We measure force in newtons (N). When a force acts on something, it speeds up, slows down, or changes direction.',
        'How quickly the speed changes is called acceleration. It is measured in meters per second, per second (m/s²). An acceleration of 2 m/s² means the speed goes up by 2 m/s every second.',
        'Newton’s second law connects the two: F = m·a. A heavier object needs a bigger force to speed up just as fast. If you know the speed change and how long it takes, find the acceleration first: a = change in speed ÷ time.',
      ],
      formulas: ['F = m·a', 'a = Δv ÷ t'],
      example: {
        setup: 'A 500 kg cargo sled starts at rest. It must reach 12 m/s in 6 seconds. What force does it need?',
        steps: ['a = 12 ÷ 6 = 2 m/s²', 'F = 500 × 2 = 1,000 N'],
      },
      watch: 'Speed (m/s), acceleration (m/s²) and force (N) are three different things. Look at the unit beside each field before you type.',
    },
    2: {
      title: 'Braking is acceleration too',
      idea: [
        'Slowing down is still acceleration. It just points backward. To brake, fire the engine against your motion. If you are moving at 0°, brake at 180°.',
        'Sometimes you know how far you have to stop, but not how long it will take. For that, use v² = v₀² + 2·a·d. Here v₀ is your starting speed, v is your final speed, and d is the distance.',
        'To stop completely, v = 0. Rearranged, the braking needed is a = v₀² ÷ (2·d). Once you know a, the time to stop is t = v₀ ÷ a.',
      ],
      formulas: ['v² = v₀² + 2·a·d', 'a = v₀² ÷ (2·d)', 't = v₀ ÷ a'],
      example: {
        setup: 'An 800 kg rover rolls at 10 m/s and must stop in 25 m.',
        steps: ['a = 10² ÷ (2 × 25) = 100 ÷ 50 = 2 m/s²', 't = 10 ÷ 2 = 5 s', 'F = 800 × 2 = 1,600 N, pointing backward'],
      },
      watch: 'Don’t use time = distance ÷ speed here. That only works at a constant speed. While braking, your average speed is only half your starting speed.',
    },
    3: {
      title: 'Impulse changes momentum',
      idea: [
        'Momentum is “mass in motion.” It is mass times velocity: p = m·v. A heavy, fast object has a lot of momentum.',
        'To change momentum, you need impulse: a force that acts for some time. J = F·Δt. (The symbol Δ, “delta,” means “change in.”) Impulse is measured in newton-seconds (N·s).',
        'The key rule: impulse equals the change in momentum, J = m·Δv. A big force for a short time can give the same push as a small force for a long time.',
      ],
      formulas: ['p = m·v', 'J = F·Δt', 'J = m·Δv'],
      example: {
        setup: 'A 200 kg probe moving at 3 m/s needs to reach 8 m/s using a 2-second burst.',
        steps: ['Δv = 8 − 3 = 5 m/s', 'J = 200 × 5 = 1,000 N·s', 'F = 1,000 ÷ 2 = 500 N'],
      },
      watch: 'Use the change in speed, not the final speed. And impulse (N·s) is not force (N): divide by the burst time to get the force.',
    },
    4: {
      title: 'Vectors have size and direction',
      idea: [
        'Some quantities need a direction as well as a size. These are called vectors. Force and velocity are both vectors.',
        'A vector at an angle can be split into two parts: an x part (sideways, right is positive) and a y part (up is positive). Picture a right triangle. The vector is the long slanted side. The x and y parts are the two short sides.',
        'Use Fx = F·cos θ and Fy = F·sin θ, where θ is the angle from the +x direction. To go backward from parts to a vector, the angle is θ = atan2(y, x) and the size is √(x² + y²). To fly along a slanted path, point your thrust the same way as the path.',
      ],
      formulas: ['Fx = F·cos θ', 'Fy = F·sin θ', 'θ = atan2(y, x)'],
      example: {
        setup: 'A target is 300 m right and 400 m up. The engine pushes with 100 N.',
        steps: ['θ = atan2(400, 300) = 53.13°', 'Fx = 100 × cos 53.13° = 60 N', 'Fy = 100 × sin 53.13° = 80 N', 'Check: √(60² + 80²) = 100 N ✓'],
      },
      watch: 'Cosine goes with x and sine goes with y. The calculator works in degrees, so don’t convert to radians.',
    },
    5: {
      title: 'Speed depends on who is watching',
      idea: [
        'Imagine you drive at 30 m/s and the car ahead drives at 25 m/s. From your seat, it only seems to get closer at 5 m/s. That is called relative velocity.',
        'When two objects move the same way, subtract their speeds. When they move toward each other, add them.',
        'To find when you catch up, divide the gap by the closing speed: time = gap ÷ relative speed.',
      ],
      formulas: ['v_rel = v₁ − v₂', 't = gap ÷ v_rel'],
      example: {
        setup: 'A tug moving at 15 m/s chases a barge moving at 9 m/s. The barge is 180 m ahead.',
        steps: ['Closing speed = 15 − 9 = 6 m/s', 't = 180 ÷ 6 = 30 s', 'Check: tug goes 15 × 30 = 450 m; barge ends at 180 + 9 × 30 = 450 m ✓'],
      },
      watch: 'If you only use your own speed, you forget that the target keeps moving while you chase it.',
    },
    6: {
      title: 'Everything with mass pulls',
      idea: [
        'Every object with mass pulls on every other object. This is gravity. The pull is stronger when the masses are bigger. It gets weaker as they move apart.',
        'Newton’s law of gravity is F = G·M·m ÷ r². M and m are the two masses, and r is the distance between their centers. G is a tiny number (6.67 × 10⁻¹¹), so you only notice gravity near something huge, like an asteroid. Because r is squared, doubling the distance cuts the pull to one quarter.',
        'Gravity always pulls toward the center of the body. To fly straight, cancel it with thrust of the same size pointing the opposite way. With zero net force, the ship keeps the same velocity. That is Newton’s first law.',
        'Big numbers use scientific notation. 4.5 × 10¹⁵ means 4.5 with the decimal moved 15 places right. Type it as 4.5e15.',
      ],
      formulas: ['F = G·M·m ÷ r²', 'G = 6.67e-11'],
      example: {
        setup: 'A 2,000 kg ship is 2,000 m from an 8 × 10¹⁵ kg rock. How hard does the rock pull?',
        steps: ['F = 6.67e-11 × 8e15 × 2000 ÷ 2000²', '= 1.0672e9 ÷ 4e6', '= 266.8 N, pointing at the rock'],
      },
      watch: 'G·M ÷ r² without the ship’s mass gives an acceleration (m/s²), not a force. And don’t forget to square r.',
    },
    7: {
      title: 'Adding forces that point different ways',
      idea: [
        'When more than one force acts, the ship feels their total. This is called the net force, written ΣF. (Σ, “sigma,” means “add them all up.”)',
        'Because forces have directions, you can’t just add their sizes. Two 10 N pulls in opposite directions add up to 0 N, not 20 N.',
        'Here is the method. Split each force into x and y parts. Add all the x parts. Add all the y parts. Then rebuild one vector: size = √(ΣFx² + ΣFy²), direction = atan2(ΣFy, ΣFx). To cancel it, use the same size and add 180° to the direction.',
      ],
      formulas: ['ΣFx = F₁x + F₂x', 'ΣFy = F₁y + F₂y', '|ΣF| = √(ΣFx² + ΣFy²)'],
      example: {
        setup: 'One pull is 30 N at 0°. Another is 40 N at 90°. What thrust cancels both?',
        steps: ['ΣFx = 30 + 0 = 30 N;  ΣFy = 0 + 40 = 40 N', 'Size = √(30² + 40²) = 50 N', 'Direction = atan2(40, 30) = 53.1°', 'Cancel with 50 N at 53.1° + 180° = 233.1°'],
      },
      watch: 'Signs matter. Something below you pulls at 270°, and sin 270° = −1, so its y part is negative.',
    },
    8: {
      title: 'Momentum is never lost',
      idea: [
        'If nothing from outside pushes on a group of objects, their total momentum stays the same. This is called conservation of momentum.',
        'When the ship pushes the cargo pod backward, the pod pushes the ship forward just as hard. That is Newton’s third law: every action has an equal and opposite reaction. The pod gets backward momentum, so the ship gains the same amount of forward momentum.',
        'Write it as before = after: M·v = m₁·v₁ + m₂·v₂. Count backward speeds as negative.',
      ],
      formulas: ['M·v = m₁·v₁ + m₂·v₂', 'backward = negative'],
      example: {
        setup: 'A 60 kg skateboarder holding a 10 kg bag rolls at 2 m/s. She throws the bag backward at 4 m/s. How fast does she go now?',
        steps: ['Before: (60 + 10) × 2 = 140 kg·m/s', 'After: 60·v + 10 × (−4) = 140', '60·v = 180, so v = 3 m/s'],
      },
      watch: 'After the release, each object has its own mass. Use the ship’s new, smaller mass on the “after” side, and give the backward speed a minus sign.',
    },
    9: {
      title: 'An orbit is falling sideways',
      idea: [
        'An orbit is really falling. Gravity pulls you toward the asteroid. But if you move sideways fast enough, you keep missing it. You fall around it instead of into it.',
        'Too slow, and you spiral inward. Too fast, and you swing outward. For a perfect circle at distance r, the speed must be exactly v = √(G·M ÷ r). This works because gravity supplies exactly the inward pull a circle needs.',
        'In this mission, gravity is real: the pull grows as you get closer. To change speed with a burn, use impulse from Mission 03: t = m·Δv ÷ F. Half an orbit takes π·r ÷ v seconds.',
      ],
      formulas: ['v = √(G·M ÷ r)', 't = m·Δv ÷ F', 'half orbit = π·r ÷ v'],
      example: {
        setup: 'A 1,500 kg ship moves sideways at 25 m/s, 1,600 m from a 2.4 × 10¹⁶ kg rock. The engine gives 3,000 N.',
        steps: ['v = √(6.67e-11 × 2.4e16 ÷ 1600) = √1000.5 ≈ 31.6 m/s', 'Δv = 31.6 − 25 = 6.6 m/s', 't = 1500 × 6.6 ÷ 3000 ≈ 3.3 s'],
      },
      watch: 'Under the square root, r is not squared. And you already have some speed, so only burn for the difference.',
    },
    10: {
      title: 'Putting it all together',
      idea: [
        'This mission uses three tools you already have. Cancel gravity (Missions 06–07). Hit a timed gate with an impulse burst (Missions 01 and 03). And plan from live data.',
        'The new skill is planning in stages. Real flights never go exactly to plan. At each checkpoint, read the ship’s measured speed and use that number, not the one from the briefing. Small errors add up, so fix them as you go.',
        'Two more tips. When a gate is open for a range of times, aim for the middle of the window, not the edge. And remember that fuel is impulse, force × time. All three legs share one tank.',
      ],
      formulas: ['t = d ÷ v', 'J = m·Δv', 'ΣF = 0 to fly straight'],
      example: {
        setup: 'A gate 900 m ahead opens at T+40 s and closes at T+50 s. Telemetry says you are moving at 18.5 m/s.',
        steps: ['Aim for the middle: T+45 s', 'Speed needed = 900 ÷ 45 = 20 m/s', 'Δv = 20 − 18.5 = 1.5 m/s (from the live speed)'],
      },
      watch: 'At a checkpoint, the most common mistake is using the speed from the briefing instead of the live speed shown in telemetry.',
    },
  };
});
