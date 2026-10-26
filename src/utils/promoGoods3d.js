/* THE 3D PROMO GOODS (his 2026-10-26 "design 3D default for all the goods, therefore we dont actually need to upload
   the photo file"). Loaded only when a promo item without a photo is on screen - three.js is ~150 KB zipped, so it sits
   in its own chunk (PromoGoods3D.jsx imports this file with import()), never in the app's first download.

   The models are public/promo/<goods>.glb, made in Blender by tools/promo-goods/goods.py (lab: tools/promo-goods/
   board.html). Every printed area is a mesh with extras {print, aspect, style}; the item's word is drawn onto it here,
   so one model serves every brand. Lite Mode: no idle spin in the small vault box (his "nothing rotates") - it draws
   once. The fullscreen viewer (drag) spins in Lite too: he opened it to look, it says "AUTOMATIC ROTATION", and a
   cigarette pack there turns in Lite as well (his 2026-10-26 "doesnt spin automatically when viewed in fullscreen").

   THE LOOK (his same-day "edit the color appearance on the 3D design, and change the name on it"): look = {body, ink,
   word} from promoLook(). The modelled materials are named in goods.py: BODY ones take the body colour, 'gold' the ink;
   silver / steel stay metal. set() repaints without reloading the model, so the form's colour picker can drag. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GOODS_PARTS } from './helpers';

const BLACK = '#1c1814', CREAM = '#efe9df';
const BODY = new Set(['fabric', 'black', 'cream', 'paper', 'clear']);   // clear = the lighter's see-through plastic
const TILT = { ashtray: 0.6, hat: 0.3 };   // looked at from above, or their print hides

/* the word in the ink colour; 'ink' = the word alone (fabric, the lighter); 'label' = the mug's black band; a poster
   is the paper colour with a black block; the ashtray floor is round. Portrait areas (the lighter) run the word upward. */
const drawPrint = (word, aspect, style, look) => {
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
        const light = new THREE.Color(look.body).getHSL({}).l > 0.5;
        g.fillStyle = look.body; g.fillRect(0, 0, W, H);
        const bw = W * 0.84, bh = H * 0.26, bx = (W - bw) / 2, by = H * 0.30;
        g.fillStyle = BLACK; g.beginPath(); g.roundRect(bx, by, bw, bh, W * 0.04); g.fill();
        fit(word, W / 2, by + bh / 2, bw * 0.84, bh * 0.56, look.ink);
        fit('KPM', W / 2, H * 0.84, W * 0.36, H * 0.07, light ? BLACK : CREAM);
    } else if (style === 'round') {
        g.fillStyle = look.body; g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = look.ink; g.lineWidth = W * 0.014; g.beginPath(); g.arc(W / 2, H / 2, W * 0.44, 0, Math.PI * 2); g.stroke();
        fit(word, W / 2, H / 2, W * 0.66, H * 0.2, look.ink);
    } else {
        if (style === 'label') { g.fillStyle = BLACK; g.fillRect(0, 0, W, H); }
        if (aspect < 1) { g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2); fit(word, 0, 0, H * 0.84, W * 0.56, look.ink); }
        else fit(word, W / 2, H / 2, W * 0.84, H * 0.56, look.ink);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8;
    return t;
};

const models = new Map();   // goods -> Promise<gltf>, fetched once per visit
const loadGoods = (goods) => {
    if (!models.has(goods)) models.set(goods, new GLTFLoader().loadAsync(`/promo/${goods}.glb`).catch((e) => { models.delete(goods); throw e; }));
    return models.get(goods);
};

/* Puts the turning model into `el` and returns the function that takes it out again, carrying set(look) (repaint) and
   snapshot() (a small still for the Master Vault list). drag = the finger turns it (the fullscreen viewer); without it
   a tap goes through to whatever opens fullscreen. */
export const mount = (el, { goods, look, drag = false, onFail }) => {
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
    const owned = [];   // materials this mount cloned or made - the cached model's own stay untouched
    let alive = true, frame = 0, held = null, model = null, current = look;

    const draw = () => { if (alive) renderer.render(scene, cam); };
    const parts = GOODS_PARTS[goods] || {};   // TRIM / ACCENT parts by mesh name - checked before the material rules
    const paint = () => {
        model?.traverse((o) => {
            if (!o.isMesh) return;
            if (o.userData.print) {
                const d = o.userData;
                o.material.map?.dispose();
                o.material.map = drawPrint(d.print === 'back' ? current.back : current.word, d.aspect, d.style, current);
                o.material.needsUpdate = true;
            } else if (parts.trim?.[1].test(o.name)) o.material.color.set(current.trim);
            else if (parts.accent?.[1].test(o.name)) o.material.color.set(current.accent);
            else if (BODY.has(o.material.name)) o.material.color.set(current.body);
            else if (o.material.name === 'gold') o.material.color.set(current.ink);
        });
        draw();
    };
    const fitSize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw();
    };
    const sizer = new ResizeObserver(fitSize); sizer.observe(el); fitSize();

    loadGoods(goods).then((gltf) => {
        if (!alive) return;
        model = gltf.scene.clone(true);
        model.traverse((o) => {
            if (!o.isMesh) return;
            o.material = o.userData.print ? new THREE.MeshStandardMaterial({ roughness: 0.4, alphaTest: 0.5 }) : o.material.clone();
            owned.push(o.material);
        });
        const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
        model.position.sub(box.getCenter(new THREE.Vector3()));
        const holder = new THREE.Group(); holder.add(model); holder.scale.setScalar(1.55 / Math.max(size.x, size.y, size.z));
        pivot.add(holder); paint();
    }).catch(() => { if (alive) onFail?.(); });

    let last = performance.now();
    const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!held && (drag || !document.documentElement.classList.contains('lite-mode'))) { pivot.rotation.y += 0.5 * dt; draw(); }
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

    const unmount = () => {
        alive = false; cancelAnimationFrame(frame); sizer.disconnect();
        owned.forEach((m) => { m.map?.dispose(); m.dispose(); }); env.dispose(); pmrem.dispose();
        renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    };
    unmount.set = (next) => { current = next; paint(); };
    /* the list picture: the three-quarter view, square, drawn and read in one go (the canvas keeps no copy after) */
    unmount.snapshot = (size = 128) => {
        if (!model) return null;
        const was = pivot.rotation.clone();
        pivot.rotation.set(TILT[goods] ?? 0.12, -0.45, 0); renderer.render(scene, cam);
        const out = document.createElement('canvas'); out.width = out.height = size;
        const s = Math.min(canvas.width, canvas.height);
        out.getContext('2d').drawImage(canvas, (canvas.width - s) / 2, (canvas.height - s) / 2, s, s, 0, 0, size, size);
        pivot.rotation.copy(was); draw();
        return out.toDataURL('image/webp', 0.85);
    };
    return unmount;
};
