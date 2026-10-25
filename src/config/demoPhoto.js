/* THE DEMO'S HANDOVER PHOTO - demo build only (MerchantSalesView, behind IS_DEMO). His 2026-10-25 "yes auto pick
   photo is better": a visitor on a PC often has no camera, and a motorist login gets the live camera only, so the demo
   fills the proof with this picture - the capybara on a dark card, stamped DEMO and the time. Same shape as
   ProofCamera's photo (a JPEG data URL), so everything after it is the real save path. */
import face from '../assets/capy-talk/e-happy.webp';

export const DEMO_PHOTO_LABEL = 'FOTO SERAH TERIMA';

export function demoPhoto() {
    return new Promise((resolve) => {
        const c = Object.assign(document.createElement('canvas'), { width: 640, height: 480 });
        const g = c.getContext('2d');
        const paint = (img) => {
            g.fillStyle = '#1d1913';
            g.fillRect(0, 0, 640, 480);
            if (img) g.drawImage(img, 24, 100, 320, 320);
            g.fillStyle = '#e8b25a';
            g.font = '700 22px monospace';
            g.fillText(DEMO_PHOTO_LABEL, 356, 210);
            g.fillStyle = '#f3e7d3';
            g.font = '600 18px monospace';
            g.fillText('DEMO', 356, 246);
            g.fillText(new Date().toLocaleString('id-ID'), 356, 278);
            resolve(c.toDataURL('image/jpeg', 0.7));
        };
        const img = new Image();
        img.onload = () => paint(img);
        img.onerror = () => paint(null);   // no face is still a photo; the sale must not wait on a picture
        img.src = face;
    });
}
