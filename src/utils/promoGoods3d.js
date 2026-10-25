/* THE 3D PROMO GOODS (his 2026-10-26 "design 3D default for all the goods, therefore we dont actually need to upload
   the photo file"). Loaded only when a promo item without a photo is on screen - three.js is ~150 KB zipped, so it sits
   in its own chunk (PromoGoods3D.jsx imports this file with import()), never in the app's first download.

   The models are public/promo/<goods>.glb, made in Blender by tools/promo-goods/goods.py (lab: tools/promo-goods/
   board.html). Every printed area is a mesh with extras {print, aspect, style}; the item's word is drawn onto it here,
   so one model serves every brand. Lite Mode: no idle spin (his "nothing rotates") - it draws once and on a drag. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const CREAM = '#efe9df', BLACK = '#1c1814', GOLD = '#d4a017';
const TILT = { ashtray: 0.6, hat: 0.3 };   // looked at from above, or their print hides

/* black with the word in gold (gold only on black - the palette law); 'ink' = the word alone, printed on black fabric;
   a poster is cream with a black block; the ashtray floor is round. Portrait areas (the lighter) run the word upward. */
const drawPrint = (word, aspect, style) => {
    const W = aspect >= 1 ? 1024 : Math.round(1024 * aspect), H = aspect >= 1 ? Math.round(1024 / aspect) : 1024;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const fit = (text, x, y, maxW, maxH, color) => {
        let size = maxH; g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
        const w = g.measureText(text).width;
        if (w > maxW) { size *= maxW / w; g.font = `900 ${size}px "Arial Black", Arial, sans-serif`; }
        g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y);
    };
    if (style === 'poster') {
        g.fillStyle = CREAM; g.fillRect(0, 0, W, H);
        const bw = W * 0.84, bh = H * 0.26, bx = (W - bw) / 2, by = H * 0.30;
        g.fillStyle = BLACK; g.beginPath(); g.roundRect(bx, by, bw, bh, W * 0.04); g.fill();
        fit(word, W / 2, by + bh / 2, bw * 0.84, bh * 0.56, GOLD);
        fit('KPM', W / 2, H * 0.84, W * 0.36, H * 0.07, BLACK);
    } else if (style === 'round') {
        g.fillStyle = BLACK; g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = GOLD; g.lineWidth = W * 0.014; g.beginPath(); g.arc(W / 2, H / 2, W * 0.44, 0, Math.PI * 2); g.stroke();
        fit(word, W / 2, H / 2, W * 0.66, H * 0.2, GOLD);
    } else {
        if (style !== 'ink') { g.fillStyle = BLACK; g.fillRect(0, 0, W, H); }
        if (aspect < 1) { g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2); fit(word, 0, 0, H * 0.84, W * 0.56, GOLD); }
        else fit(word, W / 2, H / 2, W * 0.84, H * 0.56, GOLD);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8;
    return t;
};

const models = new Map();   // goods -> Promise<gltf>, fetched once per visit
const loadGoods = (goods) => {
    if (!models.has(goods)) models.set(goods, new GLTFLoader().loadAsync(`/promo/${goods}.glb`).catch((e) => { models.delete(goods); throw e; }));
    return models.get(goods);
};

/* Puts the turning model into `el` and returns the function that takes it out again. drag = the finger turns it
   (the fullscreen viewer); without it a tap goes through to whatever opens fullscreen. */
export const mount = (el, { goods, word, drag = false, onFail }) => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.style.cssText = `width:100%;height:100%;display:block;touch-action:${drag ? 'none' : 'manipulation'}`;
    el.appendChild(canvas);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    scene.environment = env;
    const key = new THREE.DirectionalLight(0xfff2dc, 1.4); key.position.set(2, 3, 4); scene.add(key);
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x1a1410, 0.5));
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0.55, 4.3); cam.lookAt(0, 0, 0);
    const pivot = new THREE.Group(); pivot.rotation.set(TILT[goods] ?? 0.12, -0.45, 0); scene.add(pivot);
    const owned = [];   // what this mount made and must free: print textures + materials
    let alive = true, frame = 0, held = null;

    const draw = () => { if (alive) renderer.render(scene, cam); };
    const fitSize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw();
    };
    const sizer = new ResizeObserver(fitSize); sizer.observe(el); fitSize();

    loadGoods(goods).then((gltf) => {
        if (!alive) return;
        const model = gltf.scene.clone(true);
        model.traverse((o) => {
            if (!o.isMesh || !o.userData.print) return;
            const d = o.userData, map = drawPrint(d.print === 'back' ? 'KPM' : word, d.aspect, d.style);
            o.material = new THREE.MeshStandardMaterial({ map, roughness: 0.4, alphaTest: 0.5 });
            owned.push(map, o.material);
        });
        const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
        model.position.sub(box.getCenter(new THREE.Vector3()));
        const holder = new THREE.Group(); holder.add(model); holder.scale.setScalar(1.55 / Math.max(size.x, size.y, size.z));
        pivot.add(holder); draw();
    }).catch(() => { if (alive) onFail?.(); });

    let last = performance.now();
    const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!held && !document.documentElement.classList.contains('lite-mode')) { pivot.rotation.y += 0.5 * dt; draw(); }
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    if (drag) {
        canvas.addEventListener('pointerdown', (e) => { held = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); e.stopPropagation(); });
        canvas.addEventListener('pointermove', (e) => {
            if (!held) return;
            pivot.rotation.y += (e.clientX - held.x) * 0.012;
            pivot.rotation.x = Math.max(-0.9, Math.min(0.9, pivot.rotation.x + (e.clientY - held.y) * 0.008));
            held = { x: e.clientX, y: e.clientY }; draw();
        });
        const letGo = () => { held = null; };
        canvas.addEventListener('pointerup', letGo); canvas.addEventListener('pointercancel', letGo);
    }

    return () => {
        alive = false; cancelAnimationFrame(frame); sizer.disconnect();
        owned.forEach((x) => x.dispose()); env.dispose(); pmrem.dispose();
        renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    };
};
