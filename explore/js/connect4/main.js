/* Connect 4: the board and its animations.
   A real frame with cut-out holes: discs fall inside it and show through the holes. */

import * as THREE from '../../modules/three.modules.js';
import { createStage, coinGeometry } from '../shared/stage.js';
import { PLAYER, ACCENT } from '../shared/theme.js';
import { tween, ease } from '../shared/anim.js';

const stage = createStage({ fov: 22 });
const { scene } = stage;

export const ROWS = 6, COLS = 7;
const UNIT = 20;
const M = 9;                     // frame margin around the grid
const FOOT = 7;                  // feet height
const DISC_R = 8.1, HOLE_R = 8.6, DISC_H = 3.6;
const PANEL = 2.4, GAP = 2.6;    // panel thickness, half-gap where discs slide
const BOARD_W = COLS * UNIT + M * 2;
const BOARD_H = ROWS * UNIT + M * 2;

export const col2x = c => (c - 3) * UNIT;
export const row2y = r => FOOT + M + (r + 0.5) * UNIT;
const TOP_Y = FOOT + BOARD_H;
const HOVER_Y = TOP_Y + UNIT * 0.62;

/* ---------- Frame ---------- */
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f1a14, roughness: 0.5, metalness: 0.12 });

function panelGeometry() {
    const s = new THREE.Shape();
    const w = BOARD_W / 2, h = BOARD_H / 2, r = 6;
    s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
    s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
    for (let r0 = 0; r0 < ROWS; r0++) {
        for (let c = 0; c < COLS; c++) {
            const hole = new THREE.Path();
            hole.absarc(col2x(c), row2y(r0) - (FOOT + BOARD_H / 2), HOLE_R, 0, Math.PI * 2, true);
            s.holes.push(hole);
        }
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: PANEL, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2, curveSegments: 28 });
    g.computeVertexNormals();
    return g;
}

const frame = new THREE.Group();
const panelGeo = panelGeometry();
const front = new THREE.Mesh(panelGeo, frameMat);
front.position.set(0, FOOT + BOARD_H / 2, GAP);
const back = new THREE.Mesh(panelGeo, frameMat);
back.position.set(0, FOOT + BOARD_H / 2, -GAP - PANEL);
for (const m of [front, back]) { m.castShadow = true; m.receiveShadow = true; frame.add(m); }

// Side and bottom rails close the gap between the panels
const railMat = frameMat;
const sideGeo = new THREE.BoxGeometry(M * 0.9, BOARD_H, GAP * 2);
for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(sideGeo, railMat);
    side.position.set(sx * (BOARD_W / 2 - M * 0.45), FOOT + BOARD_H / 2, 0);
    side.castShadow = true;
    frame.add(side);
}
const bottom = new THREE.Mesh(new THREE.BoxGeometry(BOARD_W, M * 0.9, GAP * 2), railMat);
bottom.position.set(0, FOOT + M * 0.45, 0);
frame.add(bottom);

// Feet
const footGeo = new THREE.BoxGeometry(22, FOOT, 46);
for (const sx of [-1, 1]) {
    const foot = new THREE.Mesh(footGeo, frameMat);
    foot.position.set(sx * (BOARD_W / 2 - 16), FOOT / 2, 0);
    foot.castShadow = true;
    foot.receiveShadow = true;
    frame.add(foot);
}
scene.add(frame);

// Column hint: a soft light strip in front of the column under the pointer
const stripMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const strip = new THREE.Mesh(new THREE.PlaneGeometry(UNIT * 0.92, BOARD_H - M), stripMat);
strip.position.set(0, FOOT + BOARD_H / 2, GAP + PANEL + 0.9);
scene.add(strip);

/* ---------- Discs ---------- */
const discGeo = coinGeometry(THREE, DISC_R, DISC_H);
discGeo.rotateX(Math.PI / 2);   // face the viewer
const ringGeo = new THREE.RingGeometry(DISC_R * 0.6, DISC_R * 0.68, 48);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14, depthWrite: false });

function discMaterial(player) {
    return new THREE.MeshPhysicalMaterial({
        color: PLAYER[player].color, roughness: player === 'A' ? 0.32 : 0.38,
        metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.35,
        emissive: PLAYER[player].emissive, emissiveIntensity: 0,
    });
}

function makeDisc(player) {
    const m = new THREE.Mesh(discGeo, discMaterial(player));
    m.castShadow = true;
    m.receiveShadow = true;
    const ring = new THREE.Mesh(ringGeo, ringMat);   // engraved ring on the face
    ring.position.z = DISC_H / 2 + 0.04;
    m.add(ring);
    return m;
}

const discs = new Map();   // "r,c" -> mesh

export function rebuild(grid) {
    for (const m of discs.values()) scene.remove(m);
    discs.clear();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const p = grid[r][c];
        if (!p) continue;
        const m = makeDisc(p);
        m.position.set(col2x(c), row2y(r), 0);
        scene.add(m);
        discs.set(`${r},${c}`, m);
    }
}

/** Disc falls from above the column and settles with a small bounce. */
export function drop(row, col, player) {
    const m = makeDisc(player);
    const y0 = HOVER_Y, y1 = row2y(row);
    m.position.set(col2x(col), y0, 0);
    scene.add(m);
    discs.set(`${row},${col}`, m);
    const rowsFallen = (y0 - y1) / UNIT;
    const dur = 300 + rowsFallen * 70;
    return tween(dur, t => { m.position.y = y0 + (y1 - y0) * t; }, ease.outBounce);
}

/** Release the latch: every disc drops through the bottom of the frame. */
export async function clearAll() {
    const all = [...discs.values()];
    discs.clear();
    clearWin();
    markLast(null);
    if (!all.length) return;
    const starts = all.map(m => m.position.y);
    await tween(520, t => {
        all.forEach((m, i) => { m.position.y = starts[i] - t * (starts[i] + 30); });
    }, ease.inQuad);
    all.forEach(m => scene.remove(m));
}

/* ---------- Ghost disc + column hint ---------- */
const ghost = { A: makeDisc('A'), B: makeDisc('B') };
for (const g of Object.values(ghost)) {
    g.material.transparent = true;
    g.material.opacity = 0.55;
    g.castShadow = false;
    g.visible = false;
    scene.add(g);
}
let ghostCol = -1, ghostPlayer = 'A', ghostTargetX = 0;

export function setGhost(col, player) {
    ghostCol = col;
    if (player) ghostPlayer = player;
    ghost.A.visible = ghost.B.visible = false;
    if (col < 0) return;
    const g = ghost[ghostPlayer];
    ghostTargetX = col2x(col);
    if (!g.visible) g.position.set(ghostTargetX, HOVER_Y, 0);
    g.visible = true;
}

/* ---------- Win line + last move ---------- */
let winCells = null;
const winLineMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95, depthTest: false });
let winLine = null;

export function showWin(cells) {
    clearWin();
    winCells = cells.map(({ row, col }) => discs.get(`${row},${col}`)).filter(Boolean);
    const a = new THREE.Vector3(col2x(cells[0].col), row2y(cells[0].row), GAP + PANEL + 1.5);
    const b = new THREE.Vector3(col2x(cells[cells.length - 1].col), row2y(cells[cells.length - 1].row), GAP + PANEL + 1.5);
    const len = a.distanceTo(b);
    winLine = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, len, 4, 12), winLineMat);
    winLine.position.copy(a).add(b).multiplyScalar(0.5);
    winLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    winLine.renderOrder = 10;
    winLine.scale.y = 0.001;
    scene.add(winLine);
    tween(600, t => { winLine && (winLine.scale.y = Math.max(0.001, t)); }, ease.outCubic);
}

export function clearWin() {
    if (winCells) winCells.forEach(m => { m.material.emissiveIntensity = 0; m.scale.setScalar(1); });
    winCells = null;
    if (winLine) { scene.remove(winLine); winLine.geometry.dispose(); winLine = null; }
}

const lastDot = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({ color: ACCENT }));
lastDot.visible = false;
scene.add(lastDot);
export function markLast(cell) {
    lastDot.visible = !!cell;
    if (cell) lastDot.position.set(col2x(cell.col), row2y(cell.row), DISC_H / 2 + 0.05);
}

/* ---------- Picking: which column is under the pointer ---------- */
const zNormal = new THREE.Vector3(0, 0, 1);
export function colAt(clientX, clientY) {
    const p = stage.pointOnPlane(clientX, clientY, GAP + PANEL, zNormal);
    if (!p) return -1;
    if (p.y < FOOT - 4 || p.y > TOP_Y + UNIT * 2.5) return -1;
    const c = Math.round(p.x / UNIT + 3);
    if (c < 0 || c >= COLS || Math.abs(p.x - col2x(c)) > UNIT * 0.62) return -1;
    return c;
}

export const canvas = stage.renderer.domElement;

/* ---------- Per frame ---------- */
stage.onFrame((dt, t) => {
    // Ghost glides to its column; strip follows
    for (const g of Object.values(ghost)) {
        if (!g.visible) continue;
        g.position.x += (ghostTargetX - g.position.x) * Math.min(1, dt * 18);
        g.position.y = HOVER_Y + Math.sin(t * 3) * 0.8;
    }
    const want = ghostCol >= 0 ? 0.045 : 0;
    stripMat.opacity += (want - stripMat.opacity) * Math.min(1, dt * 10);
    strip.position.x += ((ghostCol >= 0 ? col2x(ghostCol) : strip.position.x) - strip.position.x) * Math.min(1, dt * 18);
    // Winning discs breathe
    if (winCells) {
        const k = 0.5 + 0.5 * Math.sin(t * 4.5);
        winCells.forEach(m => { m.material.emissiveIntensity = 0.35 + k * 0.6; m.scale.setScalar(1 + k * 0.05); });
    }
});

stage.onTheme(p => { frameMat.color.set(p.frame); });

/* Frame the whole board plus room for the hovering disc */
const corners = [];
for (const x of [-BOARD_W / 2, BOARD_W / 2]) for (const y of [0, HOVER_Y + DISC_R]) corners.push(new THREE.Vector3(x, y, GAP + PANEL));
stage.frame({
    points: corners,
    target: new THREE.Vector3(0, (HOVER_Y + DISC_R) / 2, 0),
    dir: aspect => new THREE.Vector3(0, aspect < 0.8 ? 0.1 : 0.14, 1),
});
