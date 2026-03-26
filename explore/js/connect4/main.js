import * as THREE from '../../modules/three.modules.js';
import { board, on } from './game.js';

const UNIT    = 20;
const ROWS    = 6;
const COLS    = 7;
const DISC_R  = UNIT * 0.42;
const DISC_H  = 3;
const BD      = 8;

const BOARD_W = COLS * UNIT + 14;
const BOARD_H = ROWS * UNIT + 14;

function col2x(col) { return (col - 3) * UNIT; }
function row2y(row) { return (row - 2.5) * UNIT; }

/* ── Scene ── */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0e1c);

const _vp = window.visualViewport;
const W = _vp ? _vp.width  : window.innerWidth;
const H = _vp ? _vp.height : window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 1000);

const CAM_Z = 170;
camera.position.set(0, 8, CAM_Z);
camera.lookAt(0, 0, 0);

function fitCamera() {
    const vp = window.visualViewport;
    const vw = vp ? vp.width  : window.innerWidth;
    const vh = vp ? vp.height : window.innerHeight;
    const hud = document.getElementById('hud');
    const bar = document.getElementById('action-bar');
    const hudH = hud ? hud.offsetHeight : 60;
    const barH = bar ? bar.offsetHeight : 50;
    const usableH = vh - hudH - barH;
    const usableAspect = vw / Math.max(usableH, 1);

    const halfH = (BOARD_H + UNIT) / 2;
    const halfW = BOARD_W / 2;
    const dist = CAM_Z;

    const vFov = 2 * Math.atan(halfH / dist) * (180 / Math.PI);
    const vFovFromW = 2 * Math.atan(Math.tan((2 * Math.atan(halfW / dist)) * 0.5) / usableAspect) * (180 / Math.PI);
    const fov = Math.max(vFov, vFovFromW) + 10;

    const shiftFrac = ((hudH - barH) / 2) / vh;
    const baseShift = -shiftFrac * fov * 0.6;
    camera.position.y = baseShift - 38;
    camera.lookAt(0, (baseShift + 28) * 0.3, 0);

    camera.fov = fov;
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
}
fitCamera();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const container = document.getElementById('canvas-container');
if (container) container.appendChild(renderer.domElement);
else {
    Object.assign(renderer.domElement.style, { position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '0' });
    document.body.appendChild(renderer.domElement);
}

/* ── Lights ── */
const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
sun.position.set(40, 80, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { near: 10, far: 400, left: -150, right: 150, top: 150, bottom: -150 });
scene.add(sun);
scene.add(new THREE.AmbientLight(0x4466aa, 0.8));
scene.add(new THREE.HemisphereLight(0x6688cc, 0x222211, 0.4));

/* ── Board ── */
const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_W, BOARD_H, BD),
    new THREE.MeshStandardMaterial({ color: 0x1144aa, roughness: 0.55, metalness: 0.1 })
);
boardMesh.receiveShadow = true;
scene.add(boardMesh);

// Board stand
const stand = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_W + 20, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x0a0a2a, roughness: 0.9 })
);
stand.position.set(0, -(BOARD_H / 2) - 4, 4);
stand.receiveShadow = true;
scene.add(stand);

// Slot holes
const slotGeo = new THREE.CylinderGeometry(DISC_R + 0.5, DISC_R + 0.5, DISC_H + 1, 24);
slotGeo.rotateX(Math.PI / 2);
for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
        const slot = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({
            color: 0x08081a, roughness: 0.95
        }));
        slot.position.set(col2x(c), row2y(r), BD / 2 + 0.1);
        scene.add(slot);
    }
}

/* ── Pieces ── */
const PIECE_CLR = { A: 0xcc1818, B: 0xdddddd };
const discGeo = new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_H, 24);
discGeo.rotateX(Math.PI / 2);

const pieceMeshes = {};

function syncBoard() {
    for (const key of Object.keys(pieceMeshes)) { scene.remove(pieceMeshes[key]); delete pieceMeshes[key]; }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = board.grid[r][c];
            if (!cell) continue;
            const mesh = new THREE.Mesh(discGeo, new THREE.MeshStandardMaterial({
                color: PIECE_CLR[cell], roughness: 0.3, metalness: 0.15,
                emissive: new THREE.Color(0x000000)
            }));
            mesh.position.set(col2x(c), row2y(r), BD / 2 + 2);
            mesh.castShadow = true;
            scene.add(mesh);
            pieceMeshes[`${r},${c}`] = mesh;
        }
    }
}

/* ── Ghost disc (hover preview) ── */
let ghostMesh = null;

export function showGhost(col, player) {
    hideGhost();
    if (col < 0 || col >= COLS) return;
    const mat = new THREE.MeshBasicMaterial({
        color: PIECE_CLR[player], transparent: true, opacity: 0.4, depthWrite: false
    });
    ghostMesh = new THREE.Mesh(discGeo, mat);
    ghostMesh.position.set(col2x(col), row2y(ROWS) + UNIT * 0.1, BD / 2 + 2);
    scene.add(ghostMesh);
}

export function hideGhost() {
    if (ghostMesh) { scene.remove(ghostMesh); ghostMesh = null; }
}

/* ── Column click targets ── */
const colTargets = [];
const colTargetGeo = new THREE.BoxGeometry(UNIT - 2, BOARD_H + UNIT * 2, 4);
for (let c = 0; c < COLS; c++) {
    const mesh = new THREE.Mesh(colTargetGeo, new THREE.MeshBasicMaterial({
        visible: false
    }));
    mesh.position.set(col2x(c), 0, BD / 2 + 2);
    mesh.userData = { type: 'column', col: c };
    scene.add(mesh);
    colTargets.push(mesh);
}

/* ── Last-move highlight ── */
const lastMoveMeshes = [];
const lastMoveGeo = new THREE.RingGeometry(DISC_R + 0.5, DISC_R + 2, 32);

export function showLastMove(row, col) {
    clearLastMove();
    const mat = new THREE.MeshBasicMaterial({
        color: 0xff8800, transparent: true, opacity: 0.7,
        side: THREE.DoubleSide, depthWrite: false
    });
    const m = new THREE.Mesh(lastMoveGeo, mat);
    m.position.set(col2x(col), row2y(row), BD / 2 + 3.5);
    m.renderOrder = 1;
    scene.add(m);
    lastMoveMeshes.push(m);
}

export function clearLastMove() {
    for (const m of lastMoveMeshes) scene.remove(m);
    lastMoveMeshes.length = 0;
}

/* ── Win highlight ── */
const winHighlightMeshes = [];
const winRingGeo = new THREE.RingGeometry(DISC_R + 1, DISC_R + 3.5, 32);

export function showWinHighlight(cells) {
    clearWinHighlight();
    const mat = new THREE.MeshBasicMaterial({
        color: 0xffdd44, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false
    });
    for (const { row, col } of cells) {
        const m = new THREE.Mesh(winRingGeo, mat.clone());
        m.position.set(col2x(col), row2y(row), BD / 2 + 3.8);
        m.renderOrder = 2;
        scene.add(m);
        winHighlightMeshes.push(m);
    }
}

export function clearWinHighlight() {
    for (const m of winHighlightMeshes) scene.remove(m);
    winHighlightMeshes.length = 0;
}

/* ── Turn glow ── */
const TURN_EMISSIVE = { A: 0x331100, B: 0x181818 };
let activeTurnPlayer = null;

export function highlightTurnPieces(player) {
    activeTurnPlayer = player;
    for (const [key, mesh] of Object.entries(pieceMeshes)) {
        const mat = mesh.material;
        const p = mesh.position;
        // Determine player from color
        const cellR = Math.round((p.y / UNIT) + 2.5);
        const cellC = Math.round((p.x / UNIT) + 3);
        const cellPlayer = board.grid[cellR]?.[cellC];
        mat.emissive.set(cellPlayer === player ? TURN_EMISSIVE[cellPlayer] : 0x000000);
    }
}

/* ── Resize ── */
function onResize() {
    const vp = window.visualViewport;
    const w = vp ? vp.width  : window.innerWidth;
    const h = vp ? vp.height : window.innerHeight;
    renderer.setSize(w, h);
    fitCamera();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 100));
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

/* ── Events ── */
on('boardChange', syncBoard);
on('reset', () => { clearWinHighlight(); clearLastMove(); hideGhost(); syncBoard(); });

/* ── Animate ── */
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
syncBoard();
animate();
requestAnimationFrame(() => fitCamera());

export { scene, camera, renderer, pieceMeshes, colTargets, col2x, row2y, UNIT, ROWS, COLS, BD };
