/* Quoridor: board, pawns, walls and animations.
   Each player's unused walls stand along their side; a placed wall flies from that stack into its slot. */

import * as THREE from '../../modules/three.modules.js';
import { createStage, roundedBox } from '../shared/stage.js';
import { PLAYER, ACCENT, DANGER } from '../shared/theme.js';
import { tween, ease } from '../shared/anim.js';

const stage = createStage({ fov: 30 });
const { scene } = stage;

const N = 9;
const UNIT = 20;
const GROOVE = 4.2;
const TILE = UNIT - GROOVE;
const SLAB_H = 8;
const Y_TOP = SLAB_H;
const Y_TILE = Y_TOP + 1.4;           // tile surface
const WALL_LEN = UNIT * 2 - GROOVE * 0.9;
const WALL_THK = GROOVE * 0.78;
const WALL_H = 11;
const HALF = N * UNIT / 2;
const STOCK_Z = HALF + 36;            // distance of the wall stacks from the centre (clear of the slab)

export const col2x = x => (x - 4) * UNIT;
export const row2z = y => -(y - 4) * UNIT;
const wallX = wx => (wx - 3.5) * UNIT;
const wallZ = wy => -(wy - 3.5) * UNIT;

/* ---------- Board ---------- */
const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b2f23, roughness: 0.55, metalness: 0.08 });
const slab = new THREE.Mesh(roundedBox(THREE, N * UNIT + 24, SLAB_H, N * UNIT + 24, 5, 1.6), frameMat);
slab.position.y = SLAB_H / 2;
slab.castShadow = true;
slab.receiveShadow = true;
scene.add(slab);

const tileGeo = roundedBox(THREE, TILE, 2.8, TILE, 1.4, 0.45);
const tileMats = { a: new THREE.MeshStandardMaterial({ roughness: 0.72 }), b: new THREE.MeshStandardMaterial({ roughness: 0.72 }) };
const goalMatA = new THREE.MeshStandardMaterial({ roughness: 0.6 });   // Amber aims for row 8
const goalMatB = new THREE.MeshStandardMaterial({ roughness: 0.6 });   // Ivory aims for row 0
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const mat = y === 8 ? goalMatA : y === 0 ? goalMatB : ((x + y) % 2 ? tileMats.a : tileMats.b);
    const t = new THREE.Mesh(tileGeo, mat);
    t.position.set(col2x(x), Y_TOP, row2z(y));
    t.receiveShadow = true;
    scene.add(t);
}

stage.onTheme(p => {
    frameMat.color.set(p.frame);
    tileMats.a.color.set(p.tileA);
    tileMats.b.color.set(p.tileB);
    goalMatA.color.set(new THREE.Color(p.tileB).lerp(new THREE.Color(PLAYER.A.color), 0.3));
    goalMatB.color.set(new THREE.Color(p.tileB).lerp(new THREE.Color(PLAYER.B.color), 0.2));
});

/* ---------- Pawns ---------- */
function pawnGeometry() {
    const pts = [
        [0, 0], [6.4, 0], [6.6, 0.8], [6.2, 1.8], [4.8, 2.6], [3.4, 4.2], [2.6, 7.4], [2.3, 9.4],
        [3.6, 10.2], [3.7, 10.9], [2.4, 11.5], [3.5, 12.6], [4.0, 14.4], [3.4, 16.4], [2.0, 17.6], [0, 18.0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 48);
    g.computeVertexNormals();
    return g;
}
const pawnGeo = pawnGeometry();
const pawns = {};
const pawnMats = {};
for (const p of ['A', 'B']) {
    pawnMats[p] = new THREE.MeshPhysicalMaterial({
        color: PLAYER[p].color, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.35,
        emissive: PLAYER[p].emissive, emissiveIntensity: 0,
    });
    const m = new THREE.Mesh(pawnGeo, pawnMats[p]);
    m.scale.setScalar(1.3);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    pawns[p] = m;
}

const turnRing = new THREE.Mesh(
    new THREE.RingGeometry(7.4, 8.6, 48),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.8, depthWrite: false })
);
turnRing.rotation.x = -Math.PI / 2;
turnRing.renderOrder = 2;
scene.add(turnRing);
let turnOf = null;

export function setTurn(player) { turnOf = player; turnRing.visible = !!player; }

export function placePawns(pos) {
    for (const p of ['A', 'B']) pawns[p].position.set(col2x(pos[p].x), Y_TILE, row2z(pos[p].y));
}

export function hopPawn(player, to) {
    const m = pawns[player];
    const x0 = m.position.x, z0 = m.position.z;
    const x1 = col2x(to.x), z1 = row2z(to.y);
    const dist = Math.hypot(x1 - x0, z1 - z0) / UNIT;
    return tween(300 + dist * 70, t => {
        m.position.x = x0 + (x1 - x0) * t;
        m.position.z = z0 + (z1 - z0) * t;
        m.position.y = Y_TILE + Math.sin(Math.PI * t) * (8 + dist * 3);
    }, ease.inOutCubic);
}

/** Winner's pawn does a little victory bounce. */
export function cheer(player) {
    const m = pawns[player];
    return tween(900, t => { m.position.y = Y_TILE + Math.abs(Math.sin(t * Math.PI * 3)) * 9 * (1 - t); m.rotation.y = t * Math.PI * 2; }, ease.linear);
}

/* ---------- Walls ---------- */
const wallGeo = roundedBox(THREE, WALL_LEN, WALL_H, WALL_THK, 1, 0.5);
const wallMats = {
    A: new THREE.MeshStandardMaterial({ color: PLAYER.A.color, roughness: 0.45, metalness: 0.05 }),
    B: new THREE.MeshStandardMaterial({ color: PLAYER.B.color, roughness: 0.5, metalness: 0.0 }),
};
const placed = new Map();      // key -> mesh
const stock = { A: [], B: [] };

function stockSlot(player, i) {
    // Ten walls in a row along the player's own side; Amber sits on the near side (row 0)
    const side = player === 'A' ? 1 : -1;
    const x = (i - 4.5) * (WALL_THK + 9.5);
    return { x, z: side * STOCK_Z, rotY: Math.PI / 2 };
}

function newWall(player) {
    const m = new THREE.Mesh(wallGeo, wallMats[player]);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

export function resetWalls(board) {
    for (const m of placed.values()) scene.remove(m);
    placed.clear();
    for (const p of ['A', 'B']) {
        stock[p].forEach(m => scene.remove(m));
        stock[p] = [];
        for (let i = 0; i < board.wallCounts[p]; i++) {
            const m = newWall(p);
            const s = stockSlot(p, i);
            m.position.set(s.x, WALL_H / 2, s.z);
            m.rotation.y = s.rotY;
            scene.add(m);
            stock[p].push(m);
        }
    }
    for (const key of board.walls) {
        const [o, wx, wy] = key.split(',');
        const m = newWall(board.wallOwners[key] || 'A');
        m.position.set(wallX(+wx), Y_TOP + WALL_H / 2, wallZ(+wy));
        m.rotation.y = o === 'H' ? 0 : Math.PI / 2;
        scene.add(m);
        placed.set(key, m);
    }
}

/** Lift a wall from the player's stack and set it down in its slot. */
export function flyWall(player, wx, wy, o) {
    const m = stock[player].pop() || (() => { const w = newWall(player); scene.add(w); return w; })();
    placed.set(`${o},${wx},${wy}`, m);
    const p0 = m.position.clone(), r0 = m.rotation.y;
    const p1 = new THREE.Vector3(wallX(wx), Y_TOP + WALL_H / 2, wallZ(wy));
    let r1 = o === 'H' ? 0 : Math.PI / 2;
    if (Math.abs(r1 - r0) > Math.PI / 2) r1 += Math.PI;
    return tween(620, t => {
        m.position.lerpVectors(p0, p1, t);
        m.position.y += Math.sin(Math.PI * t) * 42;
        m.rotation.y = r0 + (r1 - r0) * t;
    }, ease.inOutCubic).then(() => tween(160, t => { m.position.y = p1.y + Math.sin(Math.PI * t) * 1.2; }, ease.outCubic));
}

/* Ghost wall (preview) */
const ghostMat = new THREE.MeshStandardMaterial({ color: ACCENT, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.4, emissive: ACCENT, emissiveIntensity: 0.25 });
const ghost = new THREE.Mesh(wallGeo, ghostMat);
ghost.visible = false;
ghost.renderOrder = 5;
scene.add(ghost);
let ghostTarget = null;

export function showGhost(wx, wy, o, valid) {
    ghostMat.color.set(valid ? ACCENT : DANGER);
    ghostMat.emissive.set(valid ? ACCENT : DANGER);
    const x = wallX(wx), z = wallZ(wy), r = o === 'H' ? 0 : Math.PI / 2;
    if (!ghost.visible) { ghost.position.set(x, Y_TOP + WALL_H / 2 + 6, z); ghost.rotation.y = r; }
    ghostTarget = { x, z, r };
    ghost.visible = true;
}
export function hideGhost() { ghost.visible = false; ghostTarget = null; }

/* ---------- Move targets ---------- */
const markers = new THREE.Group();
scene.add(markers);
const dotGeo = new THREE.CircleGeometry(3.8, 32);
const dotMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85, depthWrite: false });
export function showTargets(list) {
    markers.clear();
    for (const { x, y } of list) {
        const m = new THREE.Mesh(dotGeo, dotMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(col2x(x), Y_TILE + 0.05, row2z(y));
        m.renderOrder = 2;
        markers.add(m);
    }
}
export function clearTargets() { markers.clear(); }

/* ---------- Picking ---------- */
export function cellAt(clientX, clientY) {
    const p = stage.pointOnPlane(clientX, clientY, Y_TILE + 4);
    if (!p) return null;
    const x = Math.round(p.x / UNIT + 4), y = Math.round(-p.z / UNIT + 4);
    if (x < 0 || x >= N || y < 0 || y >= N) return null;
    return { x, y };
}

/** Nearest wall slot to the pointer (walls sit on grid line crossings). */
export function slotAt(clientX, clientY) {
    const p = stage.pointOnPlane(clientX, clientY, Y_TILE);
    if (!p || Math.abs(p.x) > HALF + UNIT || Math.abs(p.z) > HALF + UNIT) return null;
    const wx = Math.min(7, Math.max(0, Math.round(p.x / UNIT + 3.5)));
    const wy = Math.min(7, Math.max(0, Math.round(-p.z / UNIT + 3.5)));
    return { wx, wy };
}

export const canvas = stage.renderer.domElement;

stage.onFrame((dt, t) => {
    const k = 0.5 + 0.5 * Math.sin(t * 3.5);
    if (turnOf) {
        const m = pawns[turnOf];
        turnRing.position.set(m.position.x, Y_TILE + 0.06, m.position.z);
        turnRing.material.opacity = 0.45 + 0.45 * k;
        turnRing.scale.setScalar(1 + 0.06 * k);
    }
    dotMat.opacity = 0.65 + 0.25 * k;
    if (ghost.visible && ghostTarget) {
        const a = Math.min(1, dt * 20);
        ghost.position.x += (ghostTarget.x - ghost.position.x) * a;
        ghost.position.z += (ghostTarget.z - ghost.position.z) * a;
        ghost.position.y += (Y_TOP + WALL_H / 2 + 1.5 - ghost.position.y) * a;
        ghost.rotation.y += (ghostTarget.r - ghost.rotation.y) * a;
    }
});

/* ---------- Camera ---------- */
let side = 'A';
function frame() {
    const h = HALF + 12;
    const corners = [];
    for (const x of [-h, h]) for (const z of [-STOCK_Z - 20, STOCK_Z + 20]) corners.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, WALL_H, z));
    const zs = side === 'B' ? -1 : 1;
    stage.frame({
        points: corners,
        target: new THREE.Vector3(0, Y_TOP, 0),
        dir: aspect => new THREE.Vector3(0, aspect < 0.8 ? 2.1 : 1.45, zs),
    });
}
export function setSide(s) { side = s; frame(); }
frame();
