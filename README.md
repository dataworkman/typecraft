# Typecraft

A short desktop-browser flight mission for building muscle memory around the exact physical locations of **U, D, F, B, L, R and S** on a QWERTY keyboard. The aircraft is the mnemonic; the keyboard is the lesson.

## Run locally

```bash
npm install
npm run dev
```

Vite prints a local development URL (normally http://localhost:5173). Build a static production bundle with `npm run build`, then serve it with `npm run preview`.

## The flight

1. **Pre-flight check** — find each target key without hints. Response time and misses are recorded.
2. **Flight school** — fly directly through each approaching ring. Hold `U/D` to climb/descend, `L/R` to move left/right, and `F/B` to fly forward/backward. Each ring waits at a position that uses its target direction; the green dot shows alignment in all three axes. There is no timer. Press `S` to shoot the training drone.

   A ring stops and waits — no countdown or timing window. It passes through when the plane is centered in the ring and at its depth. Stuck? **SKIP** is the explicit recovery.
3. **Flight debrief** — repeat the same no-hints key-location check and compare average response time and misses with the pre-flight results.

The key overlay shows the real QWERTY positions. Hints fade as the flight progresses and can be pinned or hidden. Sound can be muted. Run summaries and the optional replay answer are stored only in this browser's `localStorage` (last 20 flights); there are no accounts, backend calls, analytics or paid APIs.

The procedural environment, aircraft, gates, drone and effects are generated locally with Three.js; no image or model downloads are needed. Touch is supported: press and hold U/D/L/R/F/B on the on-screen QWERTY deck or flight pad to move, and tap `S` to shoot. Desktop keyboard input also works.

## Scope

This is a learning prototype, not a flight simulator. Learning keys are fixed to the PRD's seven keys (U D F B L R S); no remapping or remote services are included.
