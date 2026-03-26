import * as THREE from '../../modules/three.modules.js';
import { board, on } from './game.js';

const UNIT    = 20;
const B_H     = 4;
const TILE_SZ = 17;
const Y_TILE  = B_H + 0.5;
const Y_PIECE = B_H + 2;

function col2x(col) { return (col - 3.5) * UNIT; }
function row2z(row) { return -(row - 3.5) * UNIT; }

/* ── Scene ── */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0e1c);

const _vp = window.visualViewport;
const W = _vp ? _vp.width  : window.innerWidth;
const H = _vp ? _vp.height : window.innerHeight;
const camera = new THREE.PerspectiveCamera(55, W / H, 0.5, 2000);

const CAM_Y = 225;
const CAM_Z = 110;
const BOARD_HALF = 8 * UNIT / 2 + 10;
let cameraRole = 'A';

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
    const zSign = cameraRole === 'B' ? -1 : 1;
    camera.position.set(0, CAM_Y, CAM_Z * zSign);
    camera.lookAt(0, 0, 0);
    const dist = Math.sqrt(CAM_Y * CAM_Y + CAM_Z * CAM_Z);
    const vFov = 2 * Math.atan(BOARD_HALF / dist) * (180 / Math.PI);
    const vFovFromH = 2 * Math.atan(Math.tan(vFov * Math.PI / 360) / usableAspect) * (180 / Math.PI);
    const fov = Math.max(vFov, vFovFromH) + 12;
    const shiftFrac = ((hudH - barH) / 2) / vh;
    const tiltRad = shiftFrac * fov * Math.PI / 180;
    const right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, camera.getWorldDirection(new THREE.Vector3())).normalize();
    camera.position.addScaledVector(up, -tiltRad * dist * 0.5);
    camera.lookAt(0, 0, 0);
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
    Object.assign(renderer.domElement.style, { position:'fixed',top:'0',left:'0',width:'100vw',height:'100vh',zIndex:'0' });
    document.body.appendChild(renderer.domElement);
}

/* ── Lights ── */
const sun = new THREE.DirectionalLight(0xffeedd, 1.6);
sun.position.set(60, 160, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { near:10, far:500, left:-200, right:200, top:200, bottom:-200 });
scene.add(sun);
scene.add(new THREE.AmbientLight(0x7788aa, 1.0));
scene.add(new THREE.HemisphereLight(0x9999dd, 0x332211, 0.5));

/* ── Board ── */
(function buildBoard() {
    const boardW = 8 * UNIT + 10;
    const slab = new THREE.Mesh(
        new THREE.BoxGeometry(boardW, B_H * 2, boardW),
        new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.95 })
    );
    slab.receiveShadow = true;
    scene.add(slab);

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let color;
            if (row === 7)      color = 0x981a1a;
            else if (row === 0) color = 0xe8cfcf;
            else                color = (col + row) % 2 === 0 ? 0x7A5130 : 0x66411A;
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(TILE_SZ, 1, TILE_SZ),
                new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
            );
            tile.position.set(col2x(col), Y_TILE, row2z(row));
            tile.receiveShadow = true;
            scene.add(tile);
        }
    }
})();

/* ── Pieces ── */
const PIECE_CLR = { A: 0xcc1818, B: 0xddd4c0 };
const pieceGeo  = new THREE.CylinderGeometry(5.5, 6.5, 3.5, 24);
const crownGeo  = new THREE.TorusGeometry(4, 0.7, 8, 24);
crownGeo.rotateX(Math.PI / 2);

const pieceMeshes = {};

function buildPieceMesh(player, king) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(pieceGeo, new THREE.MeshStandardMaterial({
        color: PIECE_CLR[player], roughness: 0.3, metalness: 0.1,
        emissive: new THREE.Color(0x000000),
    }));
    base.castShadow = true;
    group.add(base);
    if (king) {
        const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.2, metalness: 0.6,
        }));
        crown.position.y = 2.8;
        crown.castShadow = true;
        group.add(crown);
    }
    return group;
}

function syncPieces() {
    for (const key of Object.keys(pieceMeshes)) { scene.remove(pieceMeshes[key]); delete pieceMeshes[key]; }
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = board.grid[r][c];
            if (!cell) continue;
            const mesh = buildPieceMesh(cell.player, cell.king);
            mesh.position.set(col2x(c), Y_PIECE, row2z(r));
            mesh.userData = { type: 'piece', row: r, col: c, player: cell.player, king: cell.king };
            scene.add(mesh);
            pieceMeshes[`${r},${c}`] = mesh;
        }
    }
}

/* ── Last-move square highlights ── */
const lastMoveMeshes = [];
const lastMoveGeo = new THREE.BoxGeometry(TILE_SZ - 1, 1, TILE_SZ - 1);

export function showLastMove(from, to) {
    clearLastMove();
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.35, depthWrite: false });
    for (const pos of [from, to]) {
        const m = new THREE.Mesh(lastMoveGeo, mat.clone());
        m.position.set(col2x(pos.col), Y_TILE + 0.6, row2z(pos.row));
        m.renderOrder = 1;
        scene.add(m);
        lastMoveMeshes.push(m);
    }
}

export function clearLastMove() {
    for (const m of lastMoveMeshes) scene.remove(m);
    lastMoveMeshes.length = 0;
}

/* ── Highlights ── */
const highlightMeshes = [];

export function clearHighlights() {
    for (const m of highlightMeshes) scene.remove(m);
    highlightMeshes.length = 0;
}

export function showMoveHighlights(targets) {
    clearHighlights();
    const geo = new THREE.BoxGeometry(TILE_SZ - 1, 1, TILE_SZ - 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x22ff77, transparent: true, opacity: 0.6, depthWrite: false });
    for (const { row, col } of targets) {
        const m = new THREE.Mesh(geo, mat.clone());
        m.position.set(col2x(col), Y_TILE + 0.9, row2z(row));
        m.userData = { type: 'moveTarget', row, col };
        scene.add(m);
        highlightMeshes.push(m);
    }
}

const TURN_EMISSIVE = { A: 0x331100, B: 0x181818 };
let activeTurnPlayer = null;

export function highlightPiece(row, col, enable) {
    const m = pieceMeshes[`${row},${col}`];
    if (!m) return;
    const base = m.children[0];
    if (!base) return;
    if (enable) {
        base.material.emissive.set(0x444400);
    } else {
        const p = m.userData.player;
        base.material.emissive.set(p === activeTurnPlayer ? TURN_EMISSIVE[p] : 0x000000);
    }
}

export function highlightTurnPieces(player) {
    activeTurnPlayer = player;
    for (const [key, mesh] of Object.entries(pieceMeshes)) {
        const base = mesh.children[0];
        if (!base) continue;
        const p = mesh.userData.player;
        base.material.emissive.set(p === player ? TURN_EMISSIVE[p] : 0x000000);
    }
}

export function setCameraForRole(role) { cameraRole = role; fitCamera(); }

/* ── Resize ── */
function onResize() {
    const vp = window.visualViewport;
    const w = vp ? vp.width  : window.innerWidth;
    const h = vp ? vp.height : window.innerHeight;
    camera.aspect = w / h;
    renderer.setSize(w, h);
    fitCamera();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 100));
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

/* ── Events ── */
on('boardChange', syncPieces);
on('reset', () => { clearHighlights(); clearLastMove(); syncPieces(); });

/* ── Animate ── */
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    lastTime = time;
    renderer.render(scene, camera);
}
syncPieces();
animate(0);
requestAnimationFrame(() => fitCamera());

export { scene, camera, renderer, pieceMeshes, highlightMeshes };
