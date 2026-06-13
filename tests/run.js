#!/usr/bin/env node
/* Aster Bay headless regression suite.
   Usage: node tests/run.js
   Extracts the <script> from index.html, stubs DOM/canvas, drives the
   game loop manually, and asserts core systems behave. No browser needed. */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- DOM / canvas stubs ----------
const noop = () => {};
const ctxStub = new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient')
      return () => ({ addColorStop: noop });
    return typeof k === 'string' ? noop : undefined;
  },
  set: () => true,
});
const elStub = () => ({
  textContent: '', innerHTML: '', style: {}, className: '',
  classList: { add: noop, remove: noop, toggle: noop },
  addEventListener: noop, setPointerCapture: noop,
  dataset: { s: '1', t: 'inspect' }, onclick: null,
  getContext: () => ctxStub, width: 0, height: 0,
  appendChild: noop, remove: noop, click: noop, files: [],
});
global.window = { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, addEventListener: noop, scrollTo: noop,
  visualViewport: { width: 1280, height: 800, addEventListener: noop } };
global.location = { search: '' };
const docEl = elStub();
global.document = {
  getElementById: () => elStub(), querySelector: () => elStub(),
  querySelectorAll: () => [elStub(), elStub(), elStub()], createElement: () => elStub(),
  addEventListener: noop, documentElement: docEl, body: docEl,
  fullscreenElement: null, webkitFullscreenElement: null,
};
global.performance = { now: () => Date.now() };
global.Blob = class { constructor(parts) { global.__blob = parts[0]; } };
global.URL = { createObjectURL: () => 'x', revokeObjectURL: noop };
global.FileReader = class { readAsText() {} };
let rafCb = null;
global.requestAnimationFrame = cb => { rafCb = cb; };

// ---------- load game script with test hooks ----------
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
const hooks = `\n;global.__h={tryPlace,canPlace,setTool,getCash:()=>cash,buildings,bldMap,tkey,
  INTERS,peds,cars,stats,recompute,exportCity,importCity,getDay:()=>day,
  igniteAt,updateFires,coveredBy,stationsOf,scorch,setEvents,fireTrucks,findFireDispatch,
  getRank:()=>rankIdx,checkMilestones,
  tileAt,setTile,edits,terrainAt,hasProcTree,blocks,blockMap,setMode,getMode:()=>mode,
  setBlockColor:c=>{blockColor=c;},applyBootParams,
  joinCity,addWalker,removeWalker,clearWalkers,leaveCity,getWalkers:()=>walkers,
  getTrackedWalker,getTrackWalkerId:()=>trackWalkerId,setTrackWalker,toggleTrackWalker,
  instructWalker,parseWalkerCommand,updatePeds,
  rotateView,finishViewRot,resetCam:()=>{finishViewRot();cam.px=0;cam.py=40;cam.z=Math.min(CW,CH)>700?1.05:0.7;},
  tryExpand,availableExpansions,getDistricts:()=>districts,computeRoadReach,roadUnlocksSlot,roadReachesFrontier,
  undoLastBuild,getUndoLen:()=>undoStack.length,congestionPenalty,roadCong,recompute,getHappy:()=>stats.happy,
  screenToTile,getViewRot:()=>viewRot,tilePickRoundtrip,sortD,
  toggleFullscreen,isFsView,setImmersive};`;
const tmp = path.join(os.tmpdir(), 'aster-bay-test-' + Date.now() + '.js');
fs.writeFileSync(tmp, js + hooks);
require(tmp);
const H = global.__h;

// ---------- helpers ----------
let t = Date.now();
const run = n => { for (let i = 0; i < n; i++) { t += 33; if (rafCb) { const cb = rafCb; rafCb = null; cb(t); } } };
let failures = 0;
const A = (cond, msg) => {
  if (cond) console.log('  ✓ ' + msg);
  else { console.error('  ✗ FAIL: ' + msg); failures++; }
};

console.log('Aster Bay test suite\n');
run(100);
H.setEvents(false); // deterministic: disable random fires while testing

// ---------- placement & road graph ----------
console.log('placement & road graph');
H.setTool('road');
A(H.canPlace('road', 3, 10), 'fringe road placeable next to core road');
const cash0 = H.getCash();
H.tryPlace(3, 10);
A(H.tileAt(3,10) === 'road', 'tile became road');
A(H.getCash() === cash0 - 120, 'road cost charged');
A(H.tileAt(2,10) === 'walk' || H.tileAt(3,9) === 'walk', 'sidewalks auto-grown alongside');
A(!H.canPlace('road', -40, -40), 'disconnected road rejected (even far out)');

H.setTool('house');
let placedHouse = false;
outer: for (let x = 1; x < 6; x++) for (let y = 8; y < 13; y++)
  if (H.canPlace('house', x, y)) { const n = H.buildings.length; H.tryPlace(x, y); placedHouse = H.buildings.length === n + 1; break outer; }
A(placedHouse, 'house placed near new road');

// ---------- fire coverage ----------
console.log('\nfires & coverage');
H.setTool('fire');
let station = null;
outer2: for (let x = 1; x < 10; x++) for (let y = 6; y < 16; y++)
  if (H.canPlace('fire', x, y)) { H.tryPlace(x, y); station = H.buildings[H.buildings.length - 1]; break outer2; }
A(station && station.kind === 'fire', 'fire station placed');
A(H.coveredBy('fire', station.x + 3, station.y + 3), 'coverage radius works');

const victim = [...H.bldMap.values()].find(b => !b.landmark && b.use !== 'civic'
  && H.findFireDispatch(b));
A(!!victim, 'found a covered building');
const nBefore = H.buildings.length;
H.igniteAt(victim);
A(!!victim.fire, 'covered building ignited');
A(H.fireTrucks.length > 0, 'fire truck dispatched');
run(700);
A(!victim.fire, 'covered fire extinguished in time');
A(H.buildings.length === nBefore, 'covered building survived');

const far = [...H.bldMap.values()].find(b => !b.landmark && b.use !== 'civic' && !H.coveredBy('fire', b.x, b.y));
A(!!far, 'found an uncovered building');
const fk = H.tkey(far.x, far.y), n2 = H.buildings.length;
H.igniteAt(far);
run(450);
A(H.buildings.length < n2, 'uncovered building burned down');
A(H.scorch.has(fk), 'scorch mark left behind');

// ---------- school happiness ----------
console.log('\nschools & happiness');
const hap0 = H.stats.happy;
H.setTool('school');
let placedSchool = false;
outer3: for (let x = 1; x < 32; x++) for (let y = 1; y < 32; y++)
  if (H.canPlace('school', x, y)) { H.tryPlace(x, y); placedSchool = true; break outer3; }
A(placedSchool, 'school placed');
A(H.stats.happy > hap0, `school raised happiness (${hap0.toFixed(3)} → ${H.stats.happy.toFixed(3)})`);

// ---------- economy day tick ----------
console.log('\neconomy');
const day0 = H.getDay();
run(6000); // > 1 in-game day at 1×
A(H.getDay() > day0, 'day advanced and economy ticked');
A(H.peds.length > 0 && H.cars.length > 0, `agents alive (peds=${H.peds.length}, cars=${H.cars.length})`);

// ---------- save round trips ----------
console.log('\nsaves');
H.exportCity();
const data = JSON.parse(global.__blob);
A(data.v === 4, 'export is v4 (sparse world)');
H.importCity(data);
A(H.getCash() === data.cash, 'v3 import restored cash');
A(H.scorch.has(fk), 'scorch survived round trip');

const v3 = { v: 3, grid: 33, cash: data.cash, day: data.day, simClock: data.simClock,
  parks: data.parks, scorch: [], buildings: data.buildings, trees: data.trees, T: [] };
for (let x = 0; x < 33; x++) { v3.T[x] = [];
  for (let y = 0; y < 33; y++) {
    const t = H.tileAt(x, y);
    v3.T[x][y] = (t === 'forest' || t === 'water' && !H.edits.has(H.tkey(x,y))) ? 'edge' : (t==='forest'?'edge':t);
  } }
H.importCity(v3);
A(H.getCash() === v3.cash, 'v3 (legacy dense-grid) save imports');

// ---------- chaos run ----------
console.log('\nchaos (random fires on, ~6 game days)');
H.setEvents(true);
run(12000);
A(true, `survived: day=${H.getDay()} buildings=${H.buildings.length} cash=$${H.getCash()}`);

// ---------- v0.5: infinite terrain ----------
console.log('\ninfinite terrain');
A(H.tileAt(500, -300) === H.tileAt(500, -300), 'terrain is deterministic');
let foundWater = false, foundForest = false;
for (let x = -60; x < 90 && !(foundWater && foundForest); x++)
  for (let y = -60; y < 90; y++) {
    const t = H.tileAt(x, y);
    if (t === 'water') foundWater = true;
    if (t === 'forest') foundForest = true;
  }
A(foundWater, 'lakes exist in the wilds');
A(foundForest, 'forests exist in the wilds');
A(H.tileAt(16, 16) !== 'water', 'town center is dry land');
let expWater = 0, expN = 0;
for (let x = 30; x < 80; x++) for (let y = 30; y < 80; y++) {
  expN++;
  if (H.terrainAt(x, y) === 'water') expWater++;
}
A(expWater / expN < 0.18, `expansion ring stays mostly dry (${Math.round(expWater / expN * 100)}% water)`);

// road can extend far into the wilderness tile by tile
// (south from the edge road at (10,28) — roads auto-fell forest trees)
H.setMode('creative');
H.setTool('road');
let paved = 0;
for (let y = 29; y <= 48; y++) {
  if (H.canPlace('road', 10, y)) { H.tryPlace(10, y); paved++; }
  else if (H.tileAt(10, y) === 'water') break; // hit a lake — fine
}
A(paved >= 8, `paved ${paved} tiles into the wilderness`);
A([...H.edits.values()].filter(t=>t==='walk').length > 0, 'wilderness road grew sidewalks');

// ---------- boot URL params ----------
console.log('\nboot params');
H.setMode('mayor');
global.location.search = '?mode=creative';
H.applyBootParams();
A(H.getMode() === 'creative', '?mode=creative URL param');
global.location.search = '?mode=mayor';
H.applyBootParams();
A(H.getMode() === 'mayor', '?mode=mayor URL param');
global.location.search = '';

// ---------- player walker ----------
console.log('\nplayer walker');
A(!H.getWalkers().length, 'no walkers before add');
A(H.addWalker('  Alex  '), 'add walker with trimmed name');
A(H.getWalkers().length === 1 && H.getWalkers()[0].name === 'Alex', 'walker name stored');
A(H.getWalkers()[0].isYou, 'walker flagged as citizen');
const px0 = H.getWalkers()[0].fx, py0 = H.getWalkers()[0].fy;
for (let i = 0; i < 400; i++) run(1);
const w0 = H.getWalkers()[0];
A(w0.fx !== px0 || w0.fy !== py0 || w0.tx !== px0 || w0.ty !== py0, 'walker moves around');
A(H.addWalker('Sam'), 'second walker added');
A(H.getWalkers().length === 2, 'multiple walkers supported');
const sam = H.getWalkers().find(w => w.name === 'Sam');
H.toggleTrackWalker(sam.id);
A(H.getTrackWalkerId() === sam.id, 'can track a chosen walker');
H.exportCity();
const dPlayer = JSON.parse(global.__blob);
A(Array.isArray(dPlayer.walkers) && dPlayer.walkers.length === 2, 'all walkers saved in export');
H.clearWalkers();
A(!H.getWalkers().length, 'clear walkers');
H.importCity(dPlayer);
A(H.getWalkers().length === 2, 'walkers restored from save');
A(H.getWalkers().some(w => w.name === 'Alex') && H.getWalkers().some(w => w.name === 'Sam'),
  'restored walker names match');
const legacy = JSON.parse(JSON.stringify(dPlayer));
delete legacy.walkers;
legacy.playerName = 'Jordan';
legacy.playerPed = { fx: 12, fy: 10, tx: 12, ty: 10, p: 1, steps: 1, d: [1, 0] };
H.importCity(legacy);
A(H.getWalkers().length === 1 && H.getWalkers()[0].name === 'Jordan', 'legacy single walker import');

H.clearWalkers();
H.addWalker('Nora');
A(H.instructWalker('Nora - go to shop'), 'walker command accepted');
const nora = H.getWalkers()[0];
A(nora.path && nora.path.length > 0 && nora.goalLabel === 'shop', 'route assigned to shop');
A(H.parseWalkerCommand('Nora go to fire station').dest.includes('fire'), 'parses go-to phrasing');
H.clearWalkers();
H.addWalker('Nora');
H.setMode('creative');
H.setTool('fire');
let firePlaced = false;
outer5: for (let x = 8; x < 24; x++) for (let y = 8; y < 24; y++)
  if (H.canPlace('fire', x, y)) { H.tryPlace(x, y); firePlaced = true; break outer5; }
A(firePlaced, 'fire station ready for walker command');
A(H.instructWalker('Nora - go to fire station'), 'command to fire station accepted');
A(H.getWalkers()[0].goalLabel === 'fire station', 'fire station goal set');
let arriveSteps = 0;
while (H.getWalkers()[0].path && arriveSteps < 2500) { run(1); arriveSteps++; }
A(!H.getWalkers()[0].path, 'walker finishes route');

// ---------- camera rotation ----------
console.log('\ncamera rotation');
H.resetCam();
A(H.tilePickRoundtrip(10, 12), 'tile pick round-trip facing north');
H.rotateView(1);
H.finishViewRot();
A(H.getViewRot() === 1, 'view rotates 90°');
A(H.tilePickRoundtrip(10, 12), 'tile pick round-trip facing east');
A(H.sortD(21, 12) < H.sortD(12, 20), 'east view depth uses rotated axes');
H.rotateView(3);
H.finishViewRot();
A(H.getViewRot() === 0, 'rotation returns to north');

// ---------- full screen ----------
console.log('\nfull screen');
H.setImmersive(true);
A(H.isFsView(), 'immersive expanded view');
H.setImmersive(false);
A(!H.isFsView(), 'immersive exits');

// ---------- district expansion ----------
console.log('\ndistrict expansion');
A(H.getDistricts().has('0,0'), 'starts with one 4×4 district');
const exp0 = H.availableExpansions().length;
A(!H.availableExpansions().some(e => e.dgx === 2 && e.dgy === 0), 'far east slot closed before road link');

H.setTool('road');
const linkY = 16;
for (let x = 29; x <= 51; x++) {
  if (H.canPlace('road', x, linkY)) H.tryPlace(x, linkY);
}
A(H.roadReachesFrontier(2, 0, H.computeRoadReach()), 'road reaches far district slot');
A(H.availableExpansions().length > exp0, 'road paving opens new district slots');
A(H.availableExpansions().some(e => e.dgx === 2 && e.dgy === 0 && e.viaRoad), 'road-linked slot offered');
A(H.tryExpand(2, 0), 'road-linked district can be added');
A(H.getDistricts().has('2,0'), 'road-linked district tracked');

A(H.availableExpansions().some(e => e.dgx === 1 && e.dgy === 0), 'adjacent slot opens once road enters');
A(H.tryExpand(1, 0), 'east district can be added');
A(H.getDistricts().has('1,0'), 'east district tracked');
H.exportCity();
const dDist = JSON.parse(global.__blob);
A(Array.isArray(dDist.districts) && dDist.districts.includes('1,0'), 'districts saved in export');

// ---------- v0.5: blocks ----------
console.log('\nblocks (creative)');
H.setMode('creative');
const cashC = H.getCash();
H.setTool('block');
let bspot = null;
outer4: for (let x = -10; x < 0; x++) for (let y = 5; y < 20; y++)
  if (H.canPlace('block', x, y)) { bspot = [x, y]; break outer4; }
A(!!bspot, 'found wilderness spot for blocks');
H.setBlockColor('#e2574c');
H.tryPlace(bspot[0], bspot[1]);
H.setBlockColor('#ffd23e');
H.tryPlace(bspot[0], bspot[1]);
H.tryPlace(bspot[0], bspot[1]);
const tower = H.blockMap.get(H.tkey(bspot[0], bspot[1]));
A(tower && tower.colors.length === 3, 'blocks stack (3 high)');
A(tower.colors[0] === '#e2574c' && tower.colors[2] === '#ffd23e', 'per-block colors kept');
A(H.getUndoLen() >= 3, 'creative builds push undo stack');
H.undoLastBuild();
A(tower.colors.length === 2, 'undo removes last block');
A(H.getCash() === cashC, 'creative mode is free');

H.setTool('dozer');
H.tryPlace(bspot[0], bspot[1]);
A(tower.colors.length === 1, 'dozer pops one block at a time');
H.tryPlace(bspot[0], bspot[1]);
A(!H.blockMap.has(H.tkey(bspot[0], bspot[1])), 'empty tower removed');

// mayor mode charges for blocks
H.setMode('mayor');
H.setTool('block');
const cashM = H.getCash();
if (H.canPlace('block', bspot[0], bspot[1])) {
  H.tryPlace(bspot[0], bspot[1]);
  A(H.getCash() === cashM - 25, 'mayor mode charges $25 per block');
}

// ---------- traffic congestion ----------
console.log('\ntraffic congestion');
H.recompute();
const happyClear = H.getHappy();
H.roadCong.set('12,12', 4);
A(H.congestionPenalty() > 0.3, 'congestion detected on busy roads');
H.recompute();
A(H.getHappy() < happyClear, 'congestion lowers happiness');

// ---------- v0.5: v4 save round trip ----------
console.log('\nv4 saves');
H.exportCity();
const d4 = JSON.parse(global.__blob);
A(d4.v === 4 && Array.isArray(d4.edits) && Array.isArray(d4.blocks), 'v4 sparse save shape');
H.importCity(d4);
A(H.getCash() === d4.cash, 'v4 import restored cash');
A(H.blocks.length === d4.blocks.length, 'blocks survived round trip');

console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL TESTS PASSED (v0.5)'));
process.exit(failures ? 1 : 0);
