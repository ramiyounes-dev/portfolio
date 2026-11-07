/* Shared 3D stage: renderer, lights, a floor that melts into the page background,
   and a camera that frames the board inside the free space between the HUD and the action bar. */

import * as THREE from '../../modules/three.modules.js';
import { PALETTE, onThemeChange } from './theme.js';

export function createStage({ fov = 32 } = {}) {
    const container = document.getElementById('canvas-container');

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 1, 3000);

    /* Lights: warm key with soft shadows, sky/ground fill, cool rim for edges */
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff0dc, 2);
    key.position.set(-90, 220, 140);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.6;
    Object.assign(key.shadow.camera, { near: 20, far: 700, left: -220, right: 220, top: 220, bottom: -220 });
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xbcd2ff, 0.5);
    rim.position.set(160, 90, -180);
    scene.add(rim);

    /* Floor: an unlit radial pool that fades exactly into the page background (no horizon line) */
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorCanvas.height = 512;
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    function paintFloor(center, edge) {
        const g = floorCanvas.getContext('2d');
        const hex = n => '#' + n.toString(16).padStart(6, '0');
        const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
        grd.addColorStop(0, hex(center));
        grd.addColorStop(0.1, hex(center));
        grd.addColorStop(0.42, hex(edge));
        grd.addColorStop(1, hex(edge));
        g.fillStyle = grd;
        g.fillRect(0, 0, 512, 512);
        floorTex.needsUpdate = true;
    }
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(2400, 2400),
        new THREE.MeshBasicMaterial({ map: floorTex, fog: false, depthWrite: false, toneMapped: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.renderOrder = -1;
    scene.add(floor);

    const shadowCatcher = new THREE.Mesh(
        new THREE.PlaneGeometry(900, 900),
        new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.05;
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    let lastDist = 600;     // camera distance from the last fit (fog follows it)
    let palette = PALETTE.dark;
    const themeHandlers = [];
    onThemeChange(theme => {
        palette = PALETTE[theme];
        scene.background = new THREE.Color(palette.bg);
        scene.fog = new THREE.Fog(palette.bg, lastDist * 1.35, lastDist * 3.2);
        paintFloor(palette.floor, palette.bg);
        hemi.color.set(palette.hemiSky);
        hemi.groundColor.set(palette.hemiGround);
        hemi.intensity = palette.hemi;
        key.intensity = palette.key;
        rim.intensity = palette.rim;
        shadowCatcher.material.opacity = theme === 'dark' ? 0.45 : 0.22;
        themeHandlers.forEach(fn => fn(palette, theme));
    });

    /* ---------- Camera framing ---------- */
    let frameSpec = null;   // { points: Vector3[], target: Vector3, dir: () => Vector3 }

    function viewport() {
        const vp = window.visualViewport;
        return { w: vp ? vp.width : window.innerWidth, h: vp ? vp.height : window.innerHeight };
    }

    function chromeInsets() {
        const hud = document.getElementById('hud');
        const bar = document.getElementById('action-bar');
        const top = hud ? hud.getBoundingClientRect().bottom : 80;
        const bottom = bar ? viewport().h - bar.getBoundingClientRect().top : 70;
        return { top: Math.max(0, top), bottom: Math.max(0, bottom) };
    }

    const _v = new THREE.Vector3();
    function fits(dist, dir, target, points, usable, w, h) {
        camera.position.copy(target).addScaledVector(dir, dist);
        camera.lookAt(target);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        for (const p of points) {
            _v.copy(p).project(camera);
            // NDC -> screen pixels (the view offset is already in the projection), tested against the free band
            const x = (_v.x * 0.5 + 0.5) * w;
            const y = (-_v.y * 0.5 + 0.5) * h;
            if (x < usable.left || x > w - usable.left || y < usable.top || y > h - usable.bottom) return false;
        }
        return true;
    }

    function fit() {
        if (!frameSpec) return;
        const { w, h } = viewport();
        const insets = chromeInsets();
        const pad = Math.max(10, Math.min(w, h) * 0.035);
        const usable = { top: insets.top + pad, bottom: insets.bottom + pad, left: pad };
        // Centre of the free band vs centre of the canvas
        const shift = (insets.top - insets.bottom) / 2;
        usable.shift = shift;

        camera.aspect = w / h;
        camera.clearViewOffset();
        camera.setViewOffset(w, h, 0, -shift, w, h);

        const dir = frameSpec.dir(w / h).normalize();
        let lo = 50, hi = 3000;
        for (let i = 0; i < 26; i++) {
            const mid = (lo + hi) / 2;
            if (fits(mid, dir, frameSpec.target, frameSpec.points, usable, w, h)) hi = mid; else lo = mid;
        }
        camera.position.copy(frameSpec.target).addScaledVector(dir, hi);
        camera.lookAt(frameSpec.target);
        camera.updateProjectionMatrix();
        // Fog only far behind the board, whatever the camera distance
        lastDist = hi;
        if (scene.fog) { scene.fog.near = hi * 1.35; scene.fog.far = hi * 3.2; }
        key.shadow.camera.updateProjectionMatrix();
    }

    function frame(spec) { frameSpec = spec; fit(); }

    function resize() {
        const { w, h } = viewport();
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = w + 'px';
        renderer.domElement.style.height = h + 'px';
        fit();
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    // HUD height can change (wrapping hints, fonts loading): keep the board framed
    if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => fit());
        ['hud', 'action-bar'].forEach(id => { const el = document.getElementById(id); if (el) ro.observe(el); });
    }
    resize();

    /* ---------- Loop ---------- */
    const frameFns = [];
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        for (const fn of frameFns) fn(dt, now / 1000);
        renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);

    /* ---------- Picking ---------- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function pick(clientX, clientY, objects, recursive = true) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return raycaster.intersectObjects(objects, recursive);
    }
    /** Point where the pointer ray meets the horizontal plane y = height. */
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function pointOnPlane(clientX, clientY, height = 0, normal = null) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        if (normal) plane.normal.copy(normal); else plane.normal.set(0, 1, 0);
        plane.constant = -height;
        const out = new THREE.Vector3();
        return raycaster.ray.intersectPlane(plane, out) ? out : null;
    }

    return {
        THREE, scene, camera, renderer, floor, shadowCatcher,
        frame, fit, pick, pointOnPlane,
        onFrame: fn => frameFns.push(fn),
        onTheme: fn => { themeHandlers.push(fn); fn(palette); },
        palette: () => palette,
    };
}

/* ---------- Shared geometry helpers ---------- */

/** A bevelled coin / checker: crisp flat faces, rounded edge. Axis = Y, centred (y from -h/2 to h/2). */
export function coinGeometry(THREE, r, h, segments = 48) {
    const b = Math.min(h * 0.3, r * 0.14);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r - b, 0, Math.PI * 2, false);
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b,
        bevelSegments: 4, curveSegments: segments,
    });
    g.translate(0, 0, -(h - 2 * b) / 2);
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
}

/** The engraved ring on a coin's face (add as a child, at the top face). */
export function coinRing(THREE, r, h, color = 0x000000, opacity = 0.16) {
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 0.62, r * 0.7, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = h / 2 + 0.03;
    return ring;
}

/** A rounded rectangle shape (for extrusions). */
export function roundedRectShape(THREE, w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
}

/** A rounded box, extruded from a rounded rect (top/bottom bevel). Centered, height along Y. */
export function roundedBox(THREE, w, h, d, r = 1.5, bevel = 0.8) {
    const shape = roundedRectShape(THREE, w - bevel * 2, d - bevel * 2, Math.max(0.1, r - bevel));
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.1, h - bevel * 2), bevelEnabled: true,
        bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -h / 2 + bevel, 0);
    g.computeVertexNormals();
    return g;
}
