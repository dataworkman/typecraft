# Typecraft — MVP PRD v1

## 1. Product Concept

Typecraft is a small 3D flight-game prototype designed to test one idea:

> Can a player memorize the physical location of keyboard keys by using those exact keys as meaningful flight controls?

The game is **not primarily a flight simulator**.
The aircraft is the motivation and memory device; **keyboard-location learning is the real goal**.

---

## 2. Core Learning Principle

Every control must use the **exact keyboard key the player is supposed to learn**.

Do not remap an easy key to represent another letter.

The learning loop should create a direct association between:

- the visual letter
- the physical keyboard location
- an immediate in-game action

The aircraft is the mnemonic device.

---

## 3. MVP Key Set

| Key | Meaning | Flight Action | MVP Notes |
|---|---|---|---|
| U | Up | Climb | Move aircraft upward |
| D | Down | Descend | Move aircraft downward |
| F | Forward | Fly forward | Move aircraft forward |
| B | Backward | Fly backward | Move aircraft backward |
| L | Left | Move left | Move aircraft left |
| R | Right | Move right | Move aircraft right |
| S | Shoot | Fire | Shoot target or obstacle |

### Possible later keys

Only after the seven-key prototype proves the concept:

- `T` = Turbo
- `X` = Stop / Cancel
- `G` = Gear
- `M` = Missile

Do **not** add more keys just because aircraft can have many controls.

---

## 4. First-Run Learning Flow

1. Show a large on-screen keyboard.
2. Highlight only the required key.
3. Show a simple mission prompt such as:
   - `CLIMB — press U`
   - `TURN LEFT — press L`
4. When a direction key is held, the aircraft moves immediately on that axis. Rings are navigation targets, not objects opened by pressing a cue key.
5. Repeat that key enough times for the player to begin remembering its location.
6. Mix already-learned keys together.
7. Gradually reduce keyboard highlighting.
8. Eventually hide the keyboard overlay.
9. Test whether the player can respond without looking.

The player should feel like they are learning aircraft controls, not memorizing a keyboard chart.

---

## 5. Gameplay Prototype

The aircraft moves in 3D through a simple course under direct keyboard control.

The player does **not** control realistic aerodynamics. `U/D` move vertically, `L/R` move laterally, and `F/B` move forward/backward.

Situations appear that require a single meaningful key action.

Examples:

- Altitude gate above → `U`
- Altitude gate below → `D`
- Left checkpoint → `L`
- Right checkpoint → `R`
- Fly forward through the ring → `F`
- Back up to a ring behind you → `B`
- Target drone / obstacle → `S`

The important point is that the player sees a situation, understands the required action, and then has to locate the correct keyboard key.

---

## 6. Mission Structure

Keep the first prototype short.

### Target session length

**2–5 minutes**

### Suggested stages

#### Stage 1
Teach 2 keys with full keyboard hints.

#### Stage 2
Add 2 more keys and mix old/new controls.

#### Stage 3
Introduce the remaining keys.

#### Stage 4
Reduce keyboard hints.

#### Final run
No keyboard overlay unless the player explicitly requests help.

The player should finish a short run having repeatedly used all seven target keys.

---

## 7. Feedback and Mistakes

### Correct key

- immediate aircraft response
- short positive sound
- subtle visual confirmation
- no delay between input and action

### Wrong key

Do not hard-fail the player.

Instead:

- briefly slow the aircraft
- flash or highlight the correct key
- allow immediate recovery

If the player repeatedly presses the wrong key, automatically bring the keyboard hint back.

The prototype should teach through repetition, not punishment.

---

## 8. 3D Visual Direction

Use a **modern arcade-style 3D presentation**, not a realistic flight simulator.

Recommended:

- third-person chase camera
- aircraft visible from behind
- clear horizon
- large gates
- visible targets
- simple terrain
- clouds
- lightweight effects
- smooth climb, bank, and turn animations

Avoid:

- complicated cockpit instrumentation
- realistic flight physics
- dense HUD elements
- visual effects that hide the mission prompt or keyboard hint

The 3D environment should make the learning task feel fun, but should not become the main engineering problem.

---

## 9. Technical Recommendation

For a browser MVP:

- **Three.js** or **Babylon.js**
- client-side only
- local assets
- no backend required
- no paid API required

All of the following can run locally:

- keyboard input
- mission logic
- score
- key-learning state
- hint system
- pre/post test
- simple local statistics

---

## 10. What to Measure

The main question is **not**:

> Is the flight game visually impressive?

The main question is:

> Does the player find the target keys faster after playing?

### Simple validation method

1. Run a short pre-test.
2. Ask the player to locate the seven target keys without hints.
3. Measure:
   - response time
   - errors
4. Let the player play the 3D flight mission for about 5 minutes.
5. Run the same key-location test again.
6. Compare:
   - average response time
   - wrong-key count
   - hesitation

Also ask:

> Would you play this again even if it were described as typing practice?

That tells us whether the game layer is doing its job.

---

## 11. MVP Success Criteria

- [ ] All seven keys trigger distinct in-game actions.
- [ ] A first-time player understands what to do without a long tutorial.
- [ ] Keyboard hints can fade or disappear as the player improves.
- [ ] Wrong-key feedback helps learning without stopping the game.
- [ ] The prototype runs smoothly in a desktop browser.
- [ ] `S = Shoot` is meaningful through at least one simple target/obstacle mechanic.
- [ ] The player performs better on the post-test than the pre-test.
- [ ] The player can complete at least part of the course without looking at the on-screen keyboard.

---

## 12. Explicitly Out of Scope

Do not add these to the first MVP:

- realistic flight physics
- full alphabet mapping
- multiplayer
- accounts
- cloud saves
- large open world
- complex weapons
- missions with story
- mobile controls
- paid APIs
- advanced aircraft customization

---

## 13. Critical Design Warning

This project can become too complicated very quickly.

The biggest risk is adding too many controls because a 3D aircraft *can* support them.

That would defeat the purpose.

The first prototype must answer only one question:

> Can seven meaningful aircraft controls improve keyboard-location memory?

If the answer is no, adding 20 more keys will not fix the concept.

---

## 14. Prototype Build Order

1. Basic aircraft
2. Third-person chase camera
3. Automatic forward movement
4. Seven keyboard controls
5. Mission prompt UI
6. On-screen keyboard
7. Highlight required key
8. Simple gates
9. One shootable target
10. Hint fading
11. Pre-test
12. Post-test
13. Basic polish only after the learning loop works

---

## 15. Product Principle

> **The plane is not the lesson.
> The keyboard is the lesson.
> The plane makes the lesson worth playing.**
