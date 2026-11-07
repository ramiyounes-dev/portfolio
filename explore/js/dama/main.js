/* Turkish Checkers (Dama): board, pieces and animations. */

import * as THREE from '../../modules/three.modules.js';
import { createStage, coinGeometry, roundedBox } from '../shared/stage.js';
import { PLAYER, ACCENT, DANGER } from '../shared/theme.js';
import { tween, ease } from '../shared/anim.js';

const stage = createStage({ fov: 30 });
const { scene } = stage;

const N = 8;
const UNIT = 20;
const TILE = 18.6;
const SLAB_H = 8;
const Y_TOP = SLAB_H;                 // top of the slab
const Y_TILE = Y_TOP + 0.6;           // tile surface
const PIECE_R = 7.4, PIECE_H = 4.2;
const Y_PIECE = Y_TILE + PIECE_H / 2;

export const col2x = c => (c - 3.5) * UNIT;
export const row2z = r => -(r - 3.5) * UNIT;

/* ---------- Board ---------- */
const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b2f23, roughness: 0.55, metalness: 0.08 });
const slab = new THREE.Mesh(roundedBox(THREE, N * UNIT + 22, SLAB_H, N * UNIT + 22, 5, 1.6), frameMat);
slab.position.y = SLAB_H / 2;
slab.castShadow = true;
slab.receiveShadow = true;
scene.add(slab);

const tileGeo = roundedBox(THREE, TILE, 1.2, TILE, 1.2, 0.35);
const tileMats = { a: new THREE.MeshStandardMaterial({ roughness: 0.7 }), b: new THREE.MeshStandardMaterial({ roughness: 0.7 }) };
const promoMatA = new THREE.MeshStandardMaterial({ roughness: 0.6 });   // Amber promotes on row 7
const promoMatB = new THREE.MeshStandardMaterial({ roughness: 0.6 });   // Ivory promotes on row 0
const tiles = [];
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const mat = r === 7 ? promoMatA : r === 0 ? promoMatB : ((r + c) % 2 ? tileMats.a : tileMats.b);
    const t = new THREE.Mesh(tileGeo, mat);
    t.position.set(col2x(c), Y_TOP + 0.6, row2z(r));
    t.receiveShadow = true;
    scene.add(t);
    tiles.push(t);
}

stage.onTheme(p => {
    frameMat.color.set(p.frame);
    tileMats.a.color.set(p.tileA);
    tileMats.b.color.set(p.tileB);
    promoMatA.color.set(new THREE.Color(p.tileB).lerp(new THREE.Color(PLAYER.A.color), 0.28));
    promoMatB.color.set(new THREE.Color(p.tileB).lerp(new THREE.Color(PLAYER.B.color), 0.18));
});

/* ---------- Pieces ---------- */
const coinGeo = coinGeometry(THREE, PIECE_R, PIECE_H);
const ringGeo = new THREE.RingGeometry(PIECE_R * 0.58, PIECE_R * 0.66, 48);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14, depthWrite: false });
const crownGeo = new THREE.TorusGeometry(PIECE_R * 0.42, 0.75, 10, 36);
crownGeo.rotateX(Math.PI / 2);
const crownMat = new THREE.MeshStandardMaterial({ color: 0xe8b04a, roughness: 0.25, metalness: 0.85, emissive: 0x4a2c00, emissiveIntensity: 0.4 });

function pieceMaterial(player) {
    return new THREE.MeshPhysicalMaterial({
        color: PLAYER[player].color, roughness: 0.36, clearcoat: 0.5, clearcoatRoughness: 0.4,
        emissive: PLAYER[player].emissive, emissiveIntensity: 0,
    });
}

function coin(mat) {
    const m = new THREE.Mesh(coinGeo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = PIECE_H / 2 + 0.04;
    m.add(ring);
    return m;
}

function makePiece(player, king) {
    const g = new THREE.Group();
    const mat = pieceMaterial(player);
    g.add(coin(mat));
    g.userData = { player, king: false, mat };
    if (king) crown(g, false);
    return g;
}

/** A king is two stacked pieces with a gold ring, the traditional way. */
function crown(g, animate = true) {
    if (g.userData.king) return Promise.resolve();
    g.userData.king = true;
    const top = coin(g.userData.mat);
    top.position.y = PIECE_H;
    const ring = new THREE.Mesh(crownGeo, crownMat);
    ring.position.y = PIECE_H * 1.5 + 0.2;
    g.add(top, ring);
    if (!animate) return Promise.resolve();
    top.position.y = PIECE_H + 30;
    ring.scale.setScalar(0.01);
    return tween(420, t => { top.position.y = PIECE_H + 30 * (1 - t); ring.scale.setScalar(Math.max(0.01, t)); }, ease.outBounce);
}

const pieces = new Map();   // "r,c" -> group

export function rebuild(grid) {
    for (const g of pieces.values()) scene.remove(g);
    pieces.clear();
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const g = makePiece(cell.player, cell.king);
        g.position.set(col2x(c), Y_PIECE, row2z(r));
        scene.add(g);
        pieces.set(`${r},${c}`, g);
    }
}

/** Slide (or hop, for jumps and long king moves) one piece from one square to another. */
export function hop(from, to) {
    const g = pieces.get(`${from.row},${from.col}`);
    if (!g) return Promise.resolve();
    if (lifted === g) lifted = null;   // the hop takes over from the lift
    pieces.delete(`${from.row},${from.col}`);
    pieces.set(`${to.row},${to.col}`, g);
    const x0 = g.position.x, z0 = g.position.z;
    const x1 = col2x(to.col), z1 = row2z(to.row);
    const dist = Math.hypot(x1 - x0, z1 - z0) / UNIT;
    const lift = 6 + Math.min(dist, 4) * 2.5;
    const y0 = g.position.y;
    return tween(260 + Math.min(dist, 6) * 60, t => {
        g.position.x = x0 + (x1 - x0) * t;
        g.position.z = z0 + (z1 - z0) * t;
        g.position.y = Y_PIECE + (y0 - Y_PIECE) * (1 - t) + Math.sin(Math.PI * t) * lift;
    }, ease.inOutCubic);
}

/** A captured piece sinks into the board and fades. */
export function capture(pos) {
    const g = pieces.get(`${pos.row},${pos.col}`);
    if (!g) return Promise.resolve();
    pieces.delete(`${pos.row},${pos.col}`);
    const mats = [];
    g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    const y0 = g.position.y;
    return tween(360, t => {
        g.position.y = y0 - t * 5;
        g.scale.setScalar(1 - t * 0.25);
        mats.forEach(m => { m.opacity = (m.userData.o0 ??= m.opacity) * (1 - t); });
    }, ease.inQuad).then(() => scene.remove(g));
}

export function promote(pos) {
    const g = pieces.get(`${pos.row},${pos.col}`);
    return g ? crown(g, true) : Promise.resolve();
}

/** Lift the selected piece; gently glow the ones that must capture. */
let lifted = null;
export function lift(pos) {
    if (lifted) { const g = lifted; tween(160, t => { g.position.y = Y_PIECE + 3.5 * (1 - t); }); lifted = null; }
    if (!pos) return;
    const g = pieces.get(`${pos.row},${pos.col}`);
    if (!g) return;
    lifted = g;
    tween(180, t => { g.position.y = Y_PIECE + 3.5 * t; }, ease.outBack);
}

let glowing = [];
export function glow(list) {
    glowing.forEach(g => { g.userData.mat.emissiveIntensity = 0; });
    glowing = (list || []).map(p => pieces.get(`${p.row},${p.col}`)).filter(Boolean);
}

/* ---------- Markers ---------- */
const markerGroup = new THREE.Group();
scene.add(markerGroup);
const dotGeo = new THREE.CircleGeometry(4.2, 32);
const ringMarkGeo = new THREE.RingGeometry(6.2, 7.8, 40);
const dotMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85, depthWrite: false });
const threatMat = new THREE.MeshBasicMaterial({ color: DANGER, transparent: true, opacity: 0.9, depthWrite: false });

export function showTargets(targets, isCapture) {
    clearTargets();
    for (const t of targets) {
        const m = new THREE.Mesh(isCapture ? ringMarkGeo : dotGeo, dotMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(col2x(t.col), Y_TILE + 0.65, row2z(t.row));
        m.renderOrder = 2;
        markerGroup.add(m);
    }
}
export function showThreats(cells) {
    for (const t of cells) {
        const m = new THREE.Mesh(ringMarkGeo, threatMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(col2x(t.col), Y_TILE + 0.66, row2z(t.row));
        m.renderOrder = 2;
        markerGroup.add(m);
    }
}
export function clearTargets() { markerGroup.clear(); }

const lastGroup = new THREE.Group();
scene.add(lastGroup);
const lastMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.22, depthWrite: false });
const lastGeo = new THREE.PlaneGeometry(TILE - 1, TILE - 1);
export function markLast(cells) {
    lastGroup.clear();
    for (const c of cells || []) {
        const m = new THREE.Mesh(lastGeo, lastMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(col2x(c.col), Y_TILE + 0.62, row2z(c.row));
        lastGroup.add(m);
    }
}

/* ---------- Picking ---------- */
export function cellAt(clientX, clientY) {
    const p = stage.pointOnPlane(clientX, clientY, Y_TILE + PIECE_H * 0.5);
    if (!p) return null;
    const col = Math.round(p.x / UNIT + 3.5);
    const row = Math.round(-p.z / UNIT + 3.5);
    if (row < 0 || row >= N || col < 0 || col >= N) return null;
    return { row, col };
}

export const canvas = stage.renderer.domElement;

stage.onFrame((dt, t) => {
    const k = 0.5 + 0.5 * Math.sin(t * 4);
    glowing.forEach(g => { g.userData.mat.emissiveIntensity = 0.25 + 0.55 * k; });
    dotMat.opacity = 0.65 + 0.25 * k;
});

/* ---------- Camera ---------- */
let side = 'A';
function frame() {
    const h = N * UNIT / 2 + 11;
    const corners = [];
    for (const x of [-h, h]) for (const z of [-h, h]) corners.push(new THREE.Vector3(x, Y_TOP, z), new THREE.Vector3(x, 0, z));
    const zs = side === 'B' ? -1 : 1;
    stage.frame({
        points: corners,
        target: new THREE.Vector3(0, Y_TOP, 0),
        dir: aspect => new THREE.Vector3(0, aspect < 0.8 ? 1.9 : 1.35, zs),
    });
}
export function setSide(s) { side = s; frame(); }
frame();
