import * as THREE from '../modules/three.modules.js';
import { board, on } from './game.js';

const UNIT    = 20;
const B_H     = 4;
const TILE_SZ = 17;
const GAP     = UNIT - TILE_SZ;

const Y_BOARD = 0;
const Y_TILE  = B_H + 0.5;
const Y_PAWN  = B_H;
const Y_WALL  = B_H + 8;

function col2x(col) { return (col - 4) * UNIT; }
function row2z(row) { return -(row - 4) * UNIT; }
function wallX(wx) { return (wx - 3.5) * UNIT; }
function wallZ(wy) { return -(wy - 3.5) * UNIT; }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0e1c);

const _vp = window.visualViewport;
const W = _vp ? _vp.width  : window.innerWidth;
const H = _vp ? _vp.height : window.innerHeight;
const camera = new THREE.PerspectiveCamera(55, W / H, 0.5, 2000);

const CAM_Y = 225;
const CAM_Z = 110;
const BOARD_HALF = 9 * UNIT / 2 + 10;
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
    const usableW = vw;
    const usableAspect = usableW / Math.max(usableH, 1);

    const zSign = cameraRole === 'B' ? -1 : 1;
    camera.position.set(0, CAM_Y, CAM_Z * zSign);
    camera.lookAt(0, 0, 0);

    const dist = Math.sqrt(CAM_Y * CAM_Y + CAM_Z * CAM_Z);

    const vFovNeeded = 2 * Math.atan(BOARD_HALF / dist) * (180 / Math.PI);
    const hFovNeeded = 2 * Math.atan(BOARD_HALF / dist) * (180 / Math.PI);
    const vFovFromH = 2 * Math.atan(Math.tan(hFovNeeded * Math.PI / 360) / usableAspect) * (180 / Math.PI);

    const fov = Math.max(vFovNeeded, vFovFromH) + 12;

    const centreOffset = (hudH - barH) / 2;
    const shiftFrac = centreOffset / vh;
    const shiftAngle = shiftFrac * fov;
    const tiltRad = shiftAngle * Math.PI / 180;
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
if (container) {
    container.appendChild(renderer.domElement);
} else {
    Object.assign(renderer.domElement.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh', zIndex: '0',
    });
    document.body.appendChild(renderer.domElement);
}

const sun = new THREE.DirectionalLight(0xffeedd, 1.6);
sun.position.set(60, 160, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near   = 10;
sun.shadow.camera.far    = 500;
sun.shadow.camera.left   = -200;
sun.shadow.camera.right  =  200;
sun.shadow.camera.top    =  200;
sun.shadow.camera.bottom = -200;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x7788aa, 1.0));
scene.add(new THREE.HemisphereLight(0x9999dd, 0x332211, 0.5));

(function buildBoard() {
    const boardW = 9 * UNIT + 10;
    const slab = new THREE.Mesh(
        new THREE.BoxGeometry(boardW, B_H * 2, boardW),
        new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.95 })
    );
    slab.receiveShadow = true;
    scene.add(slab);

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            let color;
            if (row === 0)      color = 0xe8cfcf;
            else if (row === 8) color = 0x981a1a;
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

const PAWN_CLR = { A: 0xcc1818, B: 0xddd4c0 };
const pawnMeshes = {};

function buildPawn(player) {
    const geo = new THREE.CylinderGeometry(3.5, 5.5, 14, 20);
    const mat = new THREE.MeshStandardMaterial({
        color:     PAWN_CLR[player],
        roughness: 0.3,
        metalness: 0.1,
        emissive:  new THREE.Color(0x000000),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.userData = { type: 'pawn', player };
    scene.add(mesh);
    pawnMeshes[player] = mesh;
}

const WALL_CLR = { A: 0xaa1010, B: 0xc0b8a8 };
const WALL_H   = 16;
const WALL_LEN = UNIT * 2 - GAP;
const WALL_THK = GAP + 1;

const wallMeshes = {};

function buildWallMesh(wx, wy, orientation, player) {
    const key = `${orientation},${wx},${wy}`;
    if (wallMeshes[key]) return;

    const geoW = orientation === 'H' ? WALL_LEN : WALL_THK;
    const geoD = orientation === 'H' ? WALL_THK : WALL_LEN;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(geoW, WALL_H, geoD),
        new THREE.MeshStandardMaterial({ color: WALL_CLR[player], roughness: 0.5 })
    );
    mesh.position.set(wallX(wx), Y_WALL, wallZ(wy));
    mesh.castShadow = true;
    mesh.userData = { type: 'wall', key };
    scene.add(mesh);
    wallMeshes[key] = mesh;
}

const ghostWallMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00, transparent: true, opacity: 0.35,
    depthWrite: false, depthTest: false, roughness: 0.4,
});
const ghostWallMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostWallMat);
ghostWallMesh.visible = false;
scene.add(ghostWallMesh);

export function showGhostWall(wx, wy, orientation, valid) {
    const gW = orientation === 'H' ? WALL_LEN : WALL_THK;
    const gD = orientation === 'H' ? WALL_THK : WALL_LEN;
    ghostWallMesh.geometry.dispose();
    ghostWallMesh.geometry = new THREE.BoxGeometry(gW, WALL_H, gD);
    ghostWallMesh.position.set(wallX(wx), Y_WALL, wallZ(wy));
    ghostWallMat.color.set(valid ? 0xffaa00 : 0xcc2222);
    ghostWallMat.opacity = valid ? 0.65 : 0.65;
    ghostWallMesh.visible = true;
    ghostWallMesh.renderOrder = 999;
}

export function hideGhostWall() {
    ghostWallMesh.visible = false;
}

const highlightMeshes = [];

export function clearHighlights() {
    for (const m of highlightMeshes) scene.remove(m);
    highlightMeshes.length = 0;
}

export function showMoveHighlights(moves) {
    clearHighlights();
    const geo = new THREE.BoxGeometry(TILE_SZ - 1, 1, TILE_SZ - 1);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x22ff77, transparent: true, opacity: 0.6, depthWrite: false,
    });
    for (const { x, y } of moves) {
        const m = new THREE.Mesh(geo, mat.clone());
        m.position.set(col2x(x), Y_TILE + 0.9, row2z(y));
        m.userData = { type: 'moveTarget', x, y };
        scene.add(m);
        highlightMeshes.push(m);
    }
}

export function showWallHighlights(placements) {
    clearHighlights();
    for (const { wx, wy, orientation } of placements) {
        const geoW = orientation === 'H' ? WALL_LEN : WALL_THK + 2;
        const geoD = orientation === 'H' ? WALL_THK + 2 : WALL_LEN;
        const baseColor = orientation === 'H' ? 0x007744 : 0x005533;
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(geoW, 1, geoD),
            new THREE.MeshBasicMaterial({
                color: baseColor,
                transparent: true, opacity: 0.65, depthWrite: false,
            })
        );
        m.position.set(wallX(wx), Y_TILE + 0.9, wallZ(wy));
        m.userData = { type: 'wallTarget', wx, wy, orientation, _baseColor: baseColor };
        scene.add(m);
        highlightMeshes.push(m);
    }
}

export function highlightPawn(player, enable) {
    const m = pawnMeshes[player];
    if (m) m.material.emissive.set(enable ? (player === 'A' ? 0x770000 : 0x555555) : 0x000000);
}

const TURN_RING_CLR = { A: 0xff4444, B: 0xccccff };
const turnRings = {};

function buildTurnRing(player) {
    const geo = new THREE.RingGeometry(6.5, 8, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
        color: TURN_RING_CLR[player],
        transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;
    scene.add(mesh);
    turnRings[player] = mesh;
}

let turnRingTime = 0;

export function setActiveTurnRing(activePlayer) {
    for (const p of ['A', 'B']) {
        if (turnRings[p]) turnRings[p].material.opacity = 0;
    }
    turnRingTime = 0;
    if (activePlayer && turnRings[activePlayer]) {
        turnRings[activePlayer].material.opacity = 0.7;
    }
}

function updateTurnRings(dt) {
    turnRingTime += dt;
    for (const p of ['A', 'B']) {
        const ring = turnRings[p];
        if (!ring || ring.material.opacity === 0) continue;
        ring.material.opacity = 0.35 + 0.35 * Math.sin(turnRingTime * 3.5);
    }
}

export function setCameraForRole(role) {
    cameraRole = role;
    fitCamera();
}

function syncPawnPositions() {
    for (const player of ['A', 'B']) {
        const { x, y } = board.pawns[player];
        const m = pawnMeshes[player];
        if (m) m.position.set(col2x(x), Y_PAWN, row2z(y));
        if (turnRings[player]) turnRings[player].position.set(col2x(x), Y_TILE + 1.1, row2z(y));
    }
}

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
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
}

on('boardChange', () => {
    syncPawnPositions();
    for (const key of board.walls) {
        const [orientation, wxStr, wyStr] = key.split(',');
        buildWallMesh(Number(wxStr), Number(wyStr), orientation, board.wallOwners[key] || 'A');
    }
});

on('reset', () => {
    for (const key of Object.keys(wallMeshes)) {
        scene.remove(wallMeshes[key]);
        delete wallMeshes[key];
    }
    clearHighlights();
    hideGhostWall();
    syncPawnPositions();
});

let lastTime = 0;

function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if (dt > 0 && dt < 1) updateTurnRings(dt);
    renderer.render(scene, camera);
}

buildPawn('A');
buildPawn('B');
buildTurnRing('A');
buildTurnRing('B');
syncPawnPositions();
setActiveTurnRing('A');
animate(0);

requestAnimationFrame(() => fitCamera());

export { scene, camera, renderer, pawnMeshes, highlightMeshes };
