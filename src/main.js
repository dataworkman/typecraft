import * as THREE from 'three';
import './style.css';

const CONTROL = {
  U: { action: 'CLIMB', verb: 'CLIMB', hint: 'Find U to lift your wings', title: 'Climb through the sunrise gate', color: 0x8ff1cb },
  D: { action: 'DESCEND', verb: 'DESCEND', hint: 'Find D to dip below the clouds', title: 'Dive under the cloud shelf', color: 0x9cd9ff },
  F: { action: 'FLY FORWARD', verb: 'FORWARD', hint: 'Hold F to fly forward', title: 'Fly forward to the checkpoint', color: 0xffc274 },
  B: { action: 'FLY BACKWARD', verb: 'BACKWARD', hint: 'Hold B to fly backward', title: 'Back up to the checkpoint', color: 0xffaa91 },
  L: { action: 'FLY LEFT', verb: 'LEFT', hint: 'Hold L to fly left', title: 'Fly left around the marker', color: 0xc2adff },
  R: { action: 'FLY RIGHT', verb: 'RIGHT', hint: 'Hold R to fly right', title: 'Fly right around the marker', color: 0xf3a2cb },
  S: { action: 'SHOOT', verb: 'SHOOT', hint: 'Find S to tag the drone', title: 'Tag the training drone', color: 0xffdf86 },
};
const KEYS = Object.keys(CONTROL);
const $ = (id) => document.getElementById(id);
const screens = ['home', 'test', 'game', 'results'].reduce((o, id) => (o[id] = $(id), o), {});
const introKeys = ['U','D','L','R','F','B','U','D'];
const mixKeys = ['F','B','U','D','F','B','D','F'];
const bankKeys = ['L','R','U','L','D','R','F','L','R','B'];
const finalKeys = ['S','U','R','S','L','F','B','D','S','L','R','U'];
const mission = [
  ...introKeys.map(key => ({ key, stage: 'STAGE 01 · GETTING AIRBORNE' })),
  ...mixKeys.map(key => ({ key, stage: 'STAGE 02 · FLY IN DEPTH' })),
  ...bankKeys.map(key => ({ key, stage: 'STAGE 03 · FOLLOW THE WIND' })),
  ...finalKeys.map(key => ({ key, stage: 'STAGE 04 · OPEN SKY' })),
];

let scene, camera, renderer, plane, planeParts = {}, sun, horizonGlow, ground, runway, clouds = [], hills = [], stars, gate, drone, shot, clock;
let mode = 'home', testMode = 'before', testDeck = [], testIndex = 0, testStarted = 0, testTimes = [], testErrors = 0, beforeStats = null, testTransitioning = false;
let missionIndex = 0, score = 0, speed = 145, altitude = 1240, skipped = 0, goodStreak = 0, shownHints = 0, helpPinned = false, soundEnabled = true, toastTimer = 0, shake = 0, traveled = 0;
let targetPulse = 0, missionTransitioning = false, missionTimer = 0, missionInputAccepted = false, recenterTime = 0;
const HOME = { x: 0, y: .35, z: 0 };

const STEER = { speed: 8, response: 12, maxX: 6.2, minY: -4.6, maxY: 5.4, minZ: -13, maxZ: 11 };
const STEER_KEYS = ['U', 'D', 'L', 'R', 'F', 'B'];
// One source of truth for the ring: it is drawn at RING.radius (tube RING.tube) and a pass counts only when
// the plane's centre is inside the ring's outer visible edge (PASS_RADIUS). The green dot uses the same test.
const RING = { radius: 3.6, tube: .2 }, PASS_RADIUS = RING.radius + RING.tube;
const APPROACH_SPEED = 6, GATE_START_Z = -34, STOP_Z = 0, THROUGH_SPEED = 18, THROUGH_END_Z = 22, ADVANCE_DELAY_MS = 800;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const held = new Set(), steerVel = { x: 0, y: 0, z: 0 }, kick = { pitch: 0, roll: 0 };
// The ring approaches and waits at its target in 3D; U/D/L/R/F/B move the plane, S fires.
let gateState = 'open', altBase = 1240, lineStatusText = '', reticle;

function showScreen(id) {
  for (const [name, el] of Object.entries(screens)) el.classList.toggle('hidden', name !== id);
}
function sound(freq = 680, duration = .09, type = 'sine') {
  if (!soundEnabled) return;
  try {
    const ctx = sound.ctx || (sound.ctx = new AudioContext());
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * .73), ctx.currentTime + duration);
    gain.gain.setValueAtTime(.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
  } catch { /* Audio is an optional flourish; gameplay never depends on it. */ }
}
function announce(msg) { $('live-announcement').textContent = msg; }
function say(text, wrong = false) {
  const box = $('toast'); box.textContent = text; box.classList.toggle('wrong', wrong); box.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 1100);
}

// Flight scene — every mesh is procedural and local; no remote assets or services.
function renderPixelRatio() {
  const lowPower = matchMedia('(pointer: coarse)').matches || innerWidth <= 820;
  return Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5);
}
function initScene() {
  scene = new THREE.Scene(); scene.background = new THREE.Color('#719bb3'); scene.fog = new THREE.FogExp2('#719bb3', .009);
  camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .1, 650); camera.position.set(0, 6.2, 12.4);
  renderer = new THREE.WebGLRenderer({ canvas: $('flight-canvas'), antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(renderPixelRatio()); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight(0xd9f5ff, 0x334f61, 2.1));
  const key = new THREE.DirectionalLight(0xffe5c1, 3.0); key.position.set(-15, 24, 9); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fd4e8, 2.1); rim.position.set(14, 7, -26); scene.add(rim);
  makeSky(); makeLandscape(); makePlane(); makeGate(); makeDrone(); makeShot();
  clock = new THREE.Clock(); window.addEventListener('resize', resize); animate();
}
function makeSky() {
  sun = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd89f })); sun.position.set(-47, 36, -155); scene.add(sun);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe1b1, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false });
  horizonGlow = new THREE.Mesh(new THREE.PlaneGeometry(110, 42), glowMat); horizonGlow.position.set(0, 17, -95); scene.add(horizonGlow);
  const pos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) { pos[i*3] = (Math.random()-.5)*280; pos[i*3+1] = Math.random()*90+8; pos[i*3+2] = -Math.random()*300; }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xeafffc, size: .22, transparent: true, opacity: .7 })); scene.add(stars);
  for (let i=0;i<12;i++) clouds.push(makeCloud((Math.random()-.5)*90, Math.random()*17+10, -25-Math.random()*150, .65+Math.random()*1.3));
}
let cloudGeo, cloudMat;
function makeCloud(x,y,z,s) {
  cloudGeo ||= new THREE.SphereGeometry(1, 10, 8);
  cloudMat ||= new THREE.MeshStandardMaterial({ color: 0xf3faf4, roughness: 1, transparent: true, opacity: .72 });
  const g = new THREE.Group();
  for (let i=0;i<4;i++) { const b = new THREE.Mesh(cloudGeo,cloudMat); b.scale.set((1.2+Math.random())*s,(.48+Math.random()*.3)*s,(.7+Math.random()*.35)*s); b.position.set((i-1.5)*1.25*s,Math.random()*.4*s,Math.random()*.4*s); g.add(b); }
  g.position.set(x,y,z); scene.add(g); return g;
}
function makeLandscape() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x526d66, roughness: 1 });
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 650), new THREE.MeshStandardMaterial({ color: 0x526f68, roughness: 1 })); ground.rotation.x=-Math.PI/2; ground.position.set(0,-12,-230); ground.receiveShadow=true; scene.add(ground);
  runway = new THREE.Mesh(new THREE.PlaneGeometry(8, 800), new THREE.MeshStandardMaterial({color:0x52667a,roughness:.92})); runway.rotation.x=-Math.PI/2; runway.position.set(0,-11.85,-290); scene.add(runway);
  const stripeMat=new THREE.MeshStandardMaterial({color:0xe6d7ac,roughness:.7});
  for(let i=0;i<36;i++){const mark=new THREE.Mesh(new THREE.PlaneGeometry(.17,3.3),stripeMat);mark.rotation.x=-Math.PI/2;mark.position.set(0,-11.78,-i*18-8);scene.add(mark);}
  // broken ridgelines create a clear, low-contrast horizon and a sense of speed
  const hillGeo=new THREE.ConeGeometry(1,1,6);
  for(let side of [-1,1]) for(let i=0;i<18;i++){
    const h=11+Math.random()*23,w=10+Math.random()*14;
    const hill=new THREE.Mesh(hillGeo,mat);hill.scale.set(w,h,w);hill.position.set(side*(28+Math.random()*22),-12+h/2,-i*24-18);hill.rotation.y=Math.random();scene.add(hill);hills.push(hill);
  }
}
function mat(color, roughness=.55, metalness=.12){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function makePlane() {
  plane = new THREE.Group(); plane.position.set(0,.5,0); scene.add(plane);
  const navy=mat(0x173047,.32,.48), teal=mat(0x78e3cc,.29,.36), glass=mat(0x182c42,.2,.5), orange=mat(0xffb45f,.38,.2), light=mat(0xf0f1e1,.36,.2);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.39,2.5,5,10),navy); body.rotation.x=Math.PI/2; body.castShadow=true; plane.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.39,.92,12),teal); nose.rotation.x=-Math.PI/2; nose.position.z=-1.7; nose.castShadow=true; plane.add(nose);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(5.5,.12,.78),teal); wing.position.set(0,-.04,.1); wing.castShadow=true; plane.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(2,.11,.47),navy); tail.position.z=1.28; plane.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.13,.82,.63),orange); fin.position.set(0,.43,1.15); plane.add(fin);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(.47,14,12),glass); canopy.scale.set(.77,.63,1.15); canopy.position.set(0,.32,-.5); plane.add(canopy);
  for(const side of [-1,1]) {const pod=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,.62,10),light);pod.rotation.x=Math.PI/2;pod.position.set(side*2.1,-.08,.3);plane.add(pod);const glow=new THREE.PointLight(side<0?0x84ffe0:0xffb670,1.3,5);glow.position.set(side*2.1,-.1,.55);plane.add(glow);}
  const prop=new THREE.Mesh(new THREE.TorusGeometry(.42,.025,6,24),orange);prop.position.z=-2.05;plane.add(prop);planeParts.prop=prop;
}
function makeGate() {
  gate = new THREE.Group(); const frame=mat(0x90efd0,.25,.38), torus=new THREE.Mesh(new THREE.TorusGeometry(RING.radius,RING.tube,10,56),frame); torus.castShadow=true; gate.add(torus);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(RING.radius+RING.tube+.22,.03,5,56),new THREE.MeshBasicMaterial({color:0xd8ffec,transparent:true,opacity:.72}));gate.add(inner);
  const light=new THREE.PointLight(0x78ffce,3.2,18);gate.add(light);gate.position.set(0,0,GATE_START_Z);scene.add(gate);
  // Aim dot: where the plane will be when the ring reaches it, drawn at the ring's own depth so perspective can't mislead.
  reticle = new THREE.Group();
  const rmat=()=>new THREE.MeshBasicMaterial({color:0xffc78a,transparent:true,opacity:.95,depthTest:false,depthWrite:false});
  const dot=new THREE.Mesh(new THREE.CircleGeometry(.3,24),rmat()), halo=new THREE.Mesh(new THREE.RingGeometry(.55,.68,32),rmat());
  for(const m of [dot,halo]) m.renderOrder=20;
  reticle.add(dot,halo); reticle.userData.mats=[dot.material,halo.material]; reticle.visible=false; scene.add(reticle);
}
function makeDrone(){
  drone=new THREE.Group();const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(.84,1),mat(0xffc478,.27,.43));shell.castShadow=true;drone.add(shell);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(2.7,.1,.34),mat(0xf8efe0,.35,.2));drone.add(wing);
  for(const s of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.1,9,8),new THREE.MeshBasicMaterial({color:0xff795e}));eye.position.set(s*.46,.08,.62);drone.add(eye)}
  const halo=new THREE.Mesh(new THREE.TorusGeometry(1.35,.035,6,32),new THREE.MeshBasicMaterial({color:0xffdf99,transparent:true,opacity:.8}));drone.add(halo);drone.userData.halo=halo;drone.position.set(0,1.2,-26);scene.add(drone);
}
function makeShot(){shot=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),new THREE.MeshBasicMaterial({color:0xbaffdf}));shot.visible=false;scene.add(shot);}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(renderPixelRatio());}

function makeTestDeck(){const a=[...KEYS];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startTest(which){resetFlightState();testMode=which;mode='test';testDeck=makeTestDeck();testIndex=0;testTimes=[];testErrors=0;testTransitioning=false;showScreen('test');$('test-results').classList.add('hidden');$('test-phase-label').textContent=which==='before'?'FLIGHT CHECK · BEFORE':'FLIGHT CHECK · AFTER';$('test-title').innerHTML=which==='before'?'Find your<br/><em>flight keys.</em>':'Let’s see what<br/><em>stuck.</em>';$('test-feedback').textContent='Get ready';$('test-feedback').className='test-feedback';nextTestPrompt();}
function nextTestPrompt(){if(mode!=='test')return;const key=testDeck[testIndex];if(!key){finishTest();return}testTransitioning=false;testStarted=performance.now();$('test-letter').textContent=key;$('test-letter').setAttribute('aria-label',`Tap to answer ${key}, ${CONTROL[key].action.toLowerCase()}`);$('test-action').textContent=CONTROL[key].action;$('test-count').textContent=`${String(testIndex+1).padStart(2,'0')} / 07`;$('test-progress-fill').style.width=`${testIndex/7*100}%`;$('test-feedback').textContent='Find it on your keyboard';$('test-feedback').className='test-feedback';announce(`Find ${key}, ${CONTROL[key].action}`)}
function handleTestKey(key){if(!KEYS.includes(key)||testTransitioning)return;const expected=testDeck[testIndex];if(key!==expected){testErrors++;$('test-feedback').textContent=`Not ${key} — find ${expected} on your keyboard`;$('test-feedback').className='test-feedback bad';say(`TRY ${expected} — ${CONTROL[expected].action}`,true);sound(190,.13,'triangle');return}testTransitioning=true;const elapsed=performance.now()-testStarted;testTimes.push(elapsed);$('test-feedback').textContent=`Found in ${(elapsed/1000).toFixed(2)} sec`;$('test-feedback').className='test-feedback good';$('test-progress-fill').style.width=`${(testIndex+1)/7*100}%`;sound(740,.1);testIndex++;setTimeout(nextTestPrompt,460)}
function statsForRun(){const valid=testTimes.length;return{avg:valid?Math.round(testTimes.reduce((a,b)=>a+b,0)/valid):0,errors:testErrors,answered:valid,date:new Date().toISOString(),times:testTimes.map(Math.round)}}
function finishTest(){const stats=statsForRun();if(testMode==='before'){beforeStats=stats; mode='home'; showScreen('game');startMission();return}showResults(stats);}
function startMission(){clearTimeout(missionTimer);missionTransitioning=false;mode='game';missionIndex=0;score=0;skipped=0;goodStreak=0;shownHints=0;speed=145;recenterTime=0;altitude=altBase=1240;traveled=0;shot.visible=false;held.clear();steerVel.x=steerVel.y=steerVel.z=0;kick.pitch=kick.roll=0;plane.position.set(HOME.x,HOME.y,HOME.z);plane.rotation.set(0,0,0);showScreen('game');$('game').classList.remove('hidden');$('help-toggle').setAttribute('aria-pressed','false');helpPinned=false;document.querySelector('.keyboard-card').classList.remove('fading');updateMission(true);say('U/D · L/R · F/B TO FLY',false);announce('Flight mission started. Hold U and D to climb or descend, L and R to fly left or right, F and B to fly forward or backward. Fly through each ring; press S to shoot the drone.');}
function hintOpacity(){if(helpPinned||goodStreak<3)return 1;return Math.max(.2,1-(goodStreak-2)*.19)}
function updateKeyDeck(){const all=document.querySelectorAll('#keyboard .key-btn');const expected=mission[missionIndex]?.key;const opacity=hintOpacity();for(const el of all){const k=el.dataset.key;el.classList.toggle('target',KEYS.includes(k));el.classList.toggle('active',k===expected&&(!missionInputAccepted||gateState==='shoot'));el.style.opacity=KEYS.includes(k)?String(opacity):'.36'}document.querySelector('.keyboard-card').classList.toggle('fading',goodStreak>=8&&!helpPinned);}
function gateCenterFor(key){return{x:key==='L'?-5.2:key==='R'?5.2:0,y:key==='U'?4.6:key==='D'?-4:.4}}
// Keep depth checkpoints comfortably inside the plane's steering bounds. The previous F target (-11)
// was outside the 1.4-unit pass tolerance at the -13 clamp, making that checkpoint impossible to clear.
function gateDepthFor(key){return key==='F'?-8:key==='B'?8:STOP_Z}
function setGateState(state){gateState=state;updateKeyDeck();renderCue();updateGateLook()}
function renderCue(){
  const m=mission[missionIndex];if(!m)return;const c=CONTROL[m.key],isShot=m.key==='S';
  const stepKey=$('step-key'),stepFly=$('step-fly');
  $('step-key-cap').textContent=m.key;$('step-key-text').textContent=isShot?'to shoot the drone':`to ${c.action.toLowerCase()} through the ring`;
  stepFly.classList.remove('hidden');
  stepKey.classList.toggle('active',!missionInputAccepted&&gateState!=='cleared');stepKey.classList.toggle('done',missionInputAccepted||gateState==='cleared');
  stepFly.classList.toggle('active',gateState==='open');stepFly.classList.toggle('done',gateState==='cleared');
  const title={locked:c.title,shoot:c.title,open:c.title,cleared:'Checkpoint cleared — nice flying.'}[gateState];
  const sub={locked:c.hint,shoot:c.hint,open:`${c.hint} · ring waits at its position`,cleared:'On to the next flight cue'}[gateState];
  $('mission-title').textContent=title;$('mission-subtitle').textContent=sub;
}
function updateGateLook(){
  const m=mission[missionIndex];if(!m||m.key==='S')return;
  const col=new THREE.Color(CONTROL[m.key].color);
  gate.children[0].material.color.copy(col);gate.children[1].material.color.copy(col);gate.children[2].color.copy(col);
  gate.children[1].material.opacity=.78;gate.children[2].intensity=3.2;
}
function updateMission(initial=false){if(missionIndex>=mission.length){completeMission();return}missionTransitioning=false;missionInputAccepted=false;const m=mission[missionIndex],c=CONTROL[m.key];$('stage-label').textContent=m.stage;$('stage-progress').textContent=`${String(missionIndex+1).padStart(2,'0')} / ${String(mission.length).padStart(2,'0')}`;$('mission-meter-fill').style.width=`${missionIndex/mission.length*100}%`;gateState=m.key==='S'?'shoot':'open';updateKeyDeck();renderCue();
  const ctr=gateCenterFor(m.key);gate.userData.stopZ=gateDepthFor(m.key);gate.position.set(ctr.x,ctr.y,GATE_START_Z);gate.scale.setScalar(1);gate.visible=m.key!=='S';reticle.visible=false;updateGateLook();drone.visible=m.key==='S';drone.scale.setScalar(1);drone.position.set(HOME.x+(Math.random()-.5)*2,HOME.y+1+Math.random()*2,HOME.z-22);shot.visible=false;targetPulse=0;
}
function fireShot(){shot.visible=true;shot.position.copy(plane.position).add(new THREE.Vector3(0,.25,-1.6));shot.userData.target=drone.position.clone();shot.userData.start=shot.position.clone();shot.userData.life=0;shot.userData.duration=.58;drone.userData.hit=false;}
function advanceMission(delay=ADVANCE_DELAY_MS){clearTimeout(missionTimer);missionTransitioning=true;recenterTime=delay/1000;held.clear();const current=mission[missionIndex];if(current.key==='S'){$('mission-title').textContent='Target tagged — nice flying.';$('mission-subtitle').textContent='On to the next flight cue';say('TARGET TAGGED')}else{say('GATE CLEARED +60')}sound(760,.12);missionTimer=setTimeout(()=>{missionIndex++;updateMission()},delay)}
function doCorrect(){if(missionTransitioning||missionInputAccepted)return;const m=mission[missionIndex];missionInputAccepted=true;goodStreak++;score+=100+Math.max(0,goodStreak-1)*7;shownHints+=goodStreak<4?1:0;const keys=document.querySelectorAll('#keyboard .key-btn');for(const el of keys)if(el.dataset.key===m.key){el.classList.add('active');setTimeout(()=>el.classList.remove('active'),240)}
  updateKeyDeck();renderCue();$('score-readout').textContent=String(score).padStart(3,'0');
  if(m.key==='S'){missionTransitioning=true;fireShot();$('mission-title').textContent='Eyes on the drone…';$('mission-subtitle').textContent='Shooting — watch the target';announce('Shot fired. Watch the drone.');sound(480,.11,'triangle');return}
  say(`${m.key} · ${CONTROL[m.key].verb}`,false);sound(720,.11);announce(`${CONTROL[m.key].action}. Keep flying through the ring.`);
}
function handleGameKey(key){if(key==='?'||key==='/'){helpPinned=!helpPinned;$('help-toggle').setAttribute('aria-pressed',String(helpPinned));$('help-toggle').innerHTML=helpPinned?'HINTS PINNED <span>⌃</span>':'HINTS ON <span>⌄</span>';updateKeyDeck();return}if(!KEYS.includes(key)||missionTransitioning)return;const expected=mission[missionIndex]?.key;if(key===expected)doCorrect()}
function completeMission(){mode='game';missionTransitioning=true;gate.visible=reticle.visible=false;$('mission-title').textContent='Flight path complete.';$('mission-subtitle').textContent='You flew the course. One last flight check — no hints.';$('mission-meter-fill').style.width='100%';$('stage-progress').textContent='COMPLETE';clearTimeout(missionTimer);missionTimer=setTimeout(()=>startTest('after'),1400)}
function showResults(after){mode='results';showScreen('results');const delta=beforeStats?.avg?Math.round((beforeStats.avg-after.avg)/beforeStats.avg*100):0;const eDelta=(beforeStats?.errors||0)-after.errors;const cells=[['AVERAGE FIND TIME',`${(beforeStats.avg/1000).toFixed(2)}s → ${(after.avg/1000).toFixed(2)}s`,delta>0?`${delta}% FASTER`:delta<0?`${Math.abs(delta)}% SLOWER`:'NO CHANGE'],['MISSES',`${beforeStats.errors} → ${after.errors}`,eDelta>0?`${eDelta} FEWER`:`${Math.abs(eDelta)} ${eDelta<0?'MORE':'SAME'}`],['FLIGHT SCORE',String(score).padStart(3,'0'),`${skipped} SKIPPED IN FLIGHT`]]; $('comparison').innerHTML=cells.map(([a,b,c])=>`<div class="compare-cell"><span>${a}</span><strong>${b}</strong><em>${c}</em></div>`).join('');
  try{const prior=JSON.parse(localStorage.getItem('keyboard-flight-stats')||'[]');prior.push({before:beforeStats,after,score,skipped,elapsed:mission.length,again:null,date:new Date().toISOString()});localStorage.setItem('keyboard-flight-stats',JSON.stringify(prior.slice(-20)));$('replay-answer').onchange=e=>{try{const all=JSON.parse(localStorage.getItem('keyboard-flight-stats')||'[]');if(all.length){all[all.length-1].again=e.target.value;localStorage.setItem('keyboard-flight-stats',JSON.stringify(all))}}catch{}}}catch{announce('Mission complete. Your result could not be saved in this browser.')}
  if(delta>0)say(`${delta}% FASTER THIS TIME`);announce(`Mission complete. Average key location time changed from ${(beforeStats.avg/1000).toFixed(2)} to ${(after.avg/1000).toFixed(2)} seconds.`);
}
function gateOffsets(){return{dx:gate.position.x-plane.position.x,dy:gate.position.y-plane.position.y,dz:gate.position.z-plane.position.z}}
function gateAligned(){const{dx,dy,dz}=gateOffsets();return Math.hypot(dx,dy)<=PASS_RADIUS&&Math.abs(dz)<=1.4}
function steerHint(dx,dy,dz){const parts=[];if(dx<-.8)parts.push('L');if(dx>.8)parts.push('R');if(dy>.8)parts.push('U');if(dy<-.8)parts.push('D');if(Math.abs(dz)>1.4)parts.push(dz<0?'F':'B');return parts.length?parts.join(' + '):'HOLD POSITION'}
function passGate(){
  score+=60;$('score-readout').textContent=String(score).padStart(3,'0');
  setGateState('cleared');gate.children[0].material.color.set(0xb9ffd8);announce('Gate cleared.');advanceMission();
}
function skipCurrent(){
  if(mode!=='game'||missionIndex>=mission.length)return;
  if(document.activeElement instanceof HTMLButtonElement)document.activeElement.blur();
  clearTimeout(missionTimer);if(gateState!=='cleared')skipped++;missionIndex++;recenterTime=ADVANCE_DELAY_MS/1000;held.clear();updateMission();say('CHECKPOINT SKIPPED',true);
}
function updateGate(dt){
  const m=mission[missionIndex];if(!m||m.key==='S'||!gate.visible)return;
  if(gateState==='open'){
    gate.position.z=Math.min(gate.userData.stopZ??STOP_Z,gate.position.z+dt*APPROACH_SPEED);
    if(gate.position.z>=(gate.userData.stopZ??STOP_Z)&&gateAligned()&&missionInputAccepted)passGate();
  }else{gate.position.z+=dt*THROUGH_SPEED;if(gate.position.z>THROUGH_END_Z)gate.visible=false}
  const live=gate.visible&&gateState==='open';
  reticle.visible=live;
  if(live){
    reticle.position.set(plane.position.x,plane.position.y,gate.position.z);
    const ok=gateAligned();for(const mt of reticle.userData.mats)mt.color.set(ok?0x9dffd0:0xffc78a);
    reticle.scale.setScalar(1+(ok?0:.12*Math.sin(clock.elapsedTime*9)));
    gate.children[0].material.color.set(ok?0xb9ffd8:CONTROL[m.key].color);
  }
}
function updateSteering(dt,t){
  if(recenterTime>0){
    recenterTime-=dt;const r=Math.min(1,dt*6);steerVel.x=steerVel.y=steerVel.z=0;
    plane.position.x+=(HOME.x-plane.position.x)*r;plane.position.y+=(HOME.y-plane.position.y)*r;plane.position.z+=(HOME.z-plane.position.z)*r;
  }else{
    let ix=(held.has('R')?1:0)-(held.has('L')?1:0),iy=(held.has('U')?1:0)-(held.has('D')?1:0),iz=(held.has('B')?1:0)-(held.has('F')?1:0),k=Math.min(1,dt*STEER.response);
    const axes=[ix,iy,iz].filter(Boolean).length;if(axes>1){ix/=Math.sqrt(axes);iy/=Math.sqrt(axes);iz/=Math.sqrt(axes)}
    steerVel.x+=(ix*STEER.speed-steerVel.x)*k;steerVel.y+=(iy*STEER.speed-steerVel.y)*k;steerVel.z+=(iz*STEER.speed-steerVel.z)*k;
    plane.position.x=THREE.MathUtils.clamp(plane.position.x+steerVel.x*dt,-STEER.maxX,STEER.maxX);
    plane.position.y=THREE.MathUtils.clamp(plane.position.y+steerVel.y*dt,STEER.minY,STEER.maxY);
    plane.position.z=THREE.MathUtils.clamp(plane.position.z+steerVel.z*dt,STEER.minZ,STEER.maxZ);
  }
  kick.pitch*=Math.max(0,1-dt*3);kick.roll*=Math.max(0,1-dt*3);
  plane.rotation.z+=(-steerVel.x*.06+kick.roll-plane.rotation.z)*Math.min(1,dt*8);plane.rotation.x=Math.sin(t*1.3)*.018+steerVel.y*.03+kick.pitch;
}
function updateLineStatus(){
  const m=mission[missionIndex];let text,ok=false;
  if(!m)return;
  if(gateState==='shoot')text=missionTransitioning?'TARGET LOCKED':`STEER FREELY · PRESS ${m.key} TO FIRE`;
  else if(gateState==='cleared')text='RING CLEARED ✓';
  else if(gateState==='open'){const{dx,dy}=gateOffsets(),dz=(gate.userData.stopZ??gate.position.z)-plane.position.z;const aligned=gateAligned();ok=aligned&&missionInputAccepted;text=ok?'ALIGNED · THROUGH THE RING ✓':aligned?`ALIGNED · PRESS ${m.key} TO GO THROUGH`:`HOLD ${steerHint(dx,dy,dz)} · RING WAITS`}
  else text=`FLY ${m.key} TOWARD THE RING`;
  const alt=Math.round((altBase+plane.position.y*70)/10)*10;if(alt!==altitude){altitude=alt;$('altitude-readout').textContent=alt.toLocaleString()}
  if(text===lineStatusText)return;
  lineStatusText=text;const el=$('line-status');el.textContent=text;el.classList.toggle('ok',ok);
}
function releaseSteering(){held.clear()}
function keyFromEvent(event){
  if(/^[a-z]$/i.test(event.key))return event.key.toUpperCase();
  if(/^Key[A-Z]$/.test(event.code))return event.code.slice(3);
  return event.key.toUpperCase();
}
function handleKey(event){
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const key=keyFromEvent(event);
  if(mode==='game'&&STEER_KEYS.includes(key)){event.preventDefault();held.add(key)}
  if(event.repeat)return;
  if(KEYS.includes(key))event.preventDefault();pressKey(key);}
function resetFlightState(){
  clearTimeout(missionTimer);missionTransitioning=false;recenterTime=0;held.clear();
  steerVel.x=steerVel.y=steerVel.z=0;kick.pitch=kick.roll=0;
  if(gate)gate.visible=false;if(drone)drone.visible=false;if(shot)shot.visible=false;if(reticle)reticle.visible=false;
}
function tapHold(k){held.add(k);pressKey(k);setTimeout(()=>held.delete(k),300)}
function pressKey(key){if(mode==='test')handleTestKey(key);else if(mode==='game')handleGameKey(key)}
window.addEventListener('keydown',handleKey);
window.addEventListener('keyup',e=>{held.delete(keyFromEvent(e))});
window.addEventListener('blur',releaseSteering);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseSteering()});

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.5),t=clock.elapsedTime;if(!scene)return;
  if(mode==='game'){
    traveled+=dt*(speed/145)*3.3;planeParts.prop.rotation.z+=dt*15;updateSteering(dt,t);
    const cf=Math.min(1,dt*6);camera.position.x+=(plane.position.x*.5-camera.position.x)*cf;camera.position.y+=(5.8+plane.position.y*.5-camera.position.y)*cf;camera.position.z+=(plane.position.z+12.4-camera.position.z)*cf;camera.lookAt(plane.position.x*.4,plane.position.y*.4,plane.position.z-8);
    updateGate(dt);updateLineStatus();
    drone.position.y+=Math.sin(t*2.2)*dt*.35;drone.rotation.y+=dt*.65;drone.userData.halo.rotation.z+=dt*.5;
    if(shot.visible){shot.userData.life+=dt;const p=Math.min(shot.userData.life/shot.userData.duration,1);shot.position.lerpVectors(shot.userData.start,shot.userData.target,p);if(p>=1){shot.visible=false;drone.userData.hit=true;drone.scale.setScalar(.01);score+=50;$('score-readout').textContent=String(score).padStart(3,'0');announce('Training drone tagged. Great shot.');advanceMission()}}
    if(shake>0){shake-=dt;camera.position.x+=(Math.random()-.5)*.11}
  } else {
    reticle.visible=false;const e=Math.min(1,dt*4);
    camera.position.x+=(Math.sin(t*.12)*.35-camera.position.x)*e;camera.position.y+=(6.3+Math.sin(t*.19)*.25-camera.position.y)*e;camera.position.z+=(12.4-camera.position.z)*e;camera.lookAt(0,1,-7);
    plane.position.x+=(HOME.x-plane.position.x)*e;plane.position.z+=(HOME.z-plane.position.z)*e;plane.position.y+=(HOME.y+Math.sin(t*1.3)*.12-plane.position.y)*e;
    plane.rotation.x+=(0-plane.rotation.x)*e;plane.rotation.z+=(Math.sin(t*.4)*.025-plane.rotation.z)*e;planeParts.prop.rotation.z+=dt*5;
  }
  for(const c of clouds){c.position.z+=dt*(mode==='game'?speed/145*6:1.2);if(c.position.z>15){c.position.z=-155-Math.random()*75;c.position.x=(Math.random()-.5)*90;c.position.y=10+Math.random()*20}}
  for(const h of hills){h.position.z+=dt*(mode==='game'?speed/145*4.2:.55);if(h.position.z>30)h.position.z=-390-Math.random()*80}
  runway.position.z+=dt*(mode==='game'?speed/145*8:1);if(runway.position.z>20)runway.position.z=-310;
  renderer.render(scene,camera);
}

$('start-test').addEventListener('click',()=>startTest('before'));
$('help-toggle').addEventListener('click',()=>handleGameKey('?'));
$('skip-mission').addEventListener('click',skipCurrent);
document.querySelectorAll('[data-steer]').forEach(btn=>{
  const k=btn.dataset.steer,release=()=>held.delete(k);
  btn.addEventListener('pointerdown',e=>{e.preventDefault();held.add(k);pressKey(k)});
  ['pointerup','pointercancel','pointerleave'].forEach(name=>btn.addEventListener(name,release));
  btn.addEventListener('click',e=>{if(e.detail===0)tapHold(k)});
});
document.querySelectorAll('#keyboard .key-btn').forEach(btn=>{
  const k=btn.dataset.key;btn.setAttribute('aria-label',KEYS.includes(k)?`${k} key, ${CONTROL[k].action.toLowerCase()}`:`${k} key`);
  if(STEER_KEYS.includes(k)){
    const release=()=>held.delete(k);
    btn.addEventListener('pointerdown',e=>{if(mode==='game'){e.preventDefault();held.add(k);pressKey(k)}});
    ['pointerup','pointercancel','pointerleave'].forEach(name=>btn.addEventListener(name,release));
  }
  btn.addEventListener('click',e=>{
    const byPointer=e.detail>0;
    if(STEER_KEYS.includes(k)&&mode==='game'){if(!byPointer)tapHold(k)}else pressKey(k);
    if(byPointer)btn.blur();
  });
});
$('test-letter').addEventListener('click',e=>{if(mode==='test')handleTestKey(testDeck[testIndex]);if(e.detail>0)e.currentTarget.blur()});
$('sound-toggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('sound-toggle').textContent=soundEnabled?'◖))':'◖̸';$('sound-toggle').setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');if(soundEnabled)sound(560,.12)});
$('replay').addEventListener('click',()=>{beforeStats=null;$('replay-answer').value='';startTest('before')});$('back-home').addEventListener('click',()=>{resetFlightState();mode='home';showScreen('home')});
initScene();
