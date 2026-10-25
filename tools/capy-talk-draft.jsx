/* LAB ONLY - the capybara's RPG dialogue for the demo mission (his 2026-10-25 ask, after the "Perfect Dialogue System"
   video): one face picture that SNAPS between lines, a text box, everything behind it blurred, no moving animation.
     ?shell&places&tab=kirim&mission=b&talk=step2[&line=2]   (also talk=step3 / error / done)
   The video's layout: a big portrait at the bottom left standing over the box's edge, a slanted name plate on the box,
   a "more" mark in the corner, expressions per line, choices when the story branches.
   The capybara speaks as "saya" and calls the viewer "Anda" - his 2026-10-25 call for THIS dialogue: *"dont use aku kamu
   on the dialogue, use anda dan saya instead"*. His 2026-08-30 rule (no second person, audit G56) still holds for the
   Ponder book; a character in a conversation is the one exception. Never aku / kamu. */
import React from 'react';
import talk from './capy-portraits/e-talk.png';
import happy from './capy-portraits/e-happy.png';
import shock from './capy-portraits/e-shock.png';
import think from './capy-portraits/e-think.png';
import sad from './capy-portraits/e-sad.png';
import angry from './capy-portraits/e-angry.png';

const FACE = { talk, happy, shock, think, sad, angry };

export const SCENES = {
    intro: [
        { face: 'happy', text: 'Halo, saya Kapibara. Saya akan menemani Anda menjalankan satu putaran barang di pabrik ini.' },
        { face: 'talk', text: 'Ada tiga langkah: terima hasil produksi, kirim ke gudang wilayah, lalu isi tas salesman.' },
        { face: 'think', text: 'Kalau Anda bingung, tekan tombol lampu di atas. Saya tunjukkan tempatnya.' },
    ],
    step2: [
        { face: 'talk', text: 'Hasil produksi Anda sudah tercatat di Master Vault: 120 Bks Cello Green 16.' },
        { face: 'think', text: 'Sekarang barang itu perlu dikirim ke gudang wilayah Bandung lewat surat jalan.' },
        { face: 'talk', text: 'Tekan tombol + di samping nama barang untuk memasukkannya ke surat jalan.', choices: ['Tunjukkan tempatnya', 'Saya coba sendiri'] },
    ],
    step3: [
        { face: 'shock', text: 'Eits! Langkah ini bukan tugas Owner.' },
        { face: 'talk', text: 'Silakan tekan SWITCH di pojok atas dan masuk sebagai Admin Wilayah, Hendra Gunawan. Beliau yang mengisi tas Dika.' },
    ],
    error: [{ face: 'angry', text: 'Jumlah kirim masih kosong. Isi jumlahnya dulu, baru surat jalan bisa dibuat.' }],
    worry: [{ face: 'sad', text: 'Stok Bandung tinggal 3 Bks. Besok salesman berangkat dengan tas hampir kosong.' }],
    done: [{ face: 'happy', text: 'Mantap! 120 Bks sudah ada di tas Dika. Misi selesai, terima kasih sudah mencoba.' }],
};

const CSS = `
.ct-veil { position: fixed; inset: 0; z-index: 98; background: rgba(5, 4, 3, .55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
html.lite-mode .ct-veil { background: rgba(5, 4, 3, .8); }
.ct { position: fixed; left: 0; right: 0; bottom: 0; z-index: 99; display: flex; flex-direction: column; align-items: flex-start;
  padding: 0 10px calc(env(safe-area-inset-bottom, 0px) + 10px); pointer-events: none; }
.ct > * { pointer-events: auto; }
.ct-face { width: 150px; height: 150px; object-fit: contain; object-position: bottom; margin: 0 0 -26px 6px; position: relative; z-index: 2; }
.ct-box { position: relative; width: 100%; min-height: 128px; padding: 26px 16px 34px; background: var(--panel); border: 1px solid var(--line-3); cursor: pointer; }
.ct-box::before { content: ''; position: absolute; inset: 4px; border: 1px solid var(--line-2); pointer-events: none; }
.ct-name { position: absolute; top: -15px; left: 150px; padding: 6px 14px; background: var(--inset); border: 1px solid var(--accent-edge); transform: skewX(-14deg); }
.ct-name b { display: inline-block; transform: skewX(14deg); font: 700 12px/1 var(--font-mono); letter-spacing: .22em; color: var(--accent-ink); }
.ct-box p { position: relative; margin: 0; font: 600 17px/1.45 var(--font-body); color: var(--ink); }
.ct-next { position: absolute; right: 14px; bottom: 10px; font: 700 11px/1 var(--font-mono); letter-spacing: .18em; color: var(--accent-ink); }
.ct-choices { align-self: flex-end; display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; order: -1; }
.ct-choices button { min-height: 44px; padding: 0 16px; background: var(--plate); border: 1.5px solid var(--accent-edge); font: 700 15px/1 var(--font-body); color: var(--ink); text-align: left; cursor: pointer; }
@media (min-width: 1024px) {
  .ct { flex-direction: row; align-items: flex-end; max-width: 980px; margin: 0 auto; padding-bottom: 24px; }
  .ct-face { width: 300px; height: 300px; margin: 0 -70px 0 0; }
  .ct-box { flex: 1; min-height: 150px; padding: 30px 28px 38px 90px; }
  .ct-name { left: 80px; }
  .ct-box p { font-size: 20px; }
  .ct-choices { position: absolute; right: 0; bottom: calc(100% + 10px); margin: 0; }
}
`;

export default function CapyTalk({ scene, line = 0, onDone }) {
    const [i, setI] = React.useState(line);
    const lines = SCENES[scene] || SCENES.step2;
    const L = lines[Math.min(i, lines.length - 1)];
    const last = i >= lines.length - 1;
    const next = () => (last ? onDone?.() : setI(i + 1));
    return (
        <>
            <style>{CSS}</style>
            <div className="ct-veil hide-on-print" onClick={L.choices ? undefined : next} />
            <div className="ct hide-on-print" role="dialog" aria-label="Kapibara">
                <img className="ct-face" src={FACE[L.face]} alt="" />
                <div className="ct-box" onClick={L.choices ? undefined : next}>
                    <span className="ct-name"><b>KAPIBARA</b></span>
                    <p>{L.text}</p>
                    {!L.choices && <span className="ct-next">{last ? 'TUTUP' : 'LANJUT'} ▼</span>}
                </div>
                {L.choices && <div className="ct-choices">{L.choices.map((c) => <button key={c} type="button" onClick={next}>{c}</button>)}</div>}
            </div>
        </>
    );
}
