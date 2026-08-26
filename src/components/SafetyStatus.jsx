import React, { useState } from 'react';

/* THE THREE SAFETY LAMPS.
   ────────────────────────────────────────────────────────────────────────────
   🔴 THIS FILE WAS PAINTING GREEN. Every indicator here was a raw Tailwind colour —
   `text-emerald-500`, `bg-emerald-500`, `text-red-500`, `text-orange-500`, `text-emerald-400` —
   which is the palette law broken in the one place on the dashboard the eye goes first. It
   survived every token sweep for the obvious reason: it was never written as a token, so nothing
   searching for `--` or for `bg-black/` could see it.

   State is carried by the LAMP, not by the word, and the lamp is a filled dot with a rim:
     lit  = --lamp-on with an --accent-edge rim   (settled)
     dark = transparent with a --line-3 rim       (needs you)
     bad  = --danger-rail with a --danger rim     (wrong, not merely unset)
   ⚠️ No glow, no pulse, no shadow. Lite Mode strips shadow and filter, and a state that is only
   readable while it is animating is not readable at all. The rim is what makes an unlit lamp
   visible on both grounds.

   It used to be a full-width card carrying three tiny labels across 1400px. It is a strip now:
   the row lives in the live panel's head, and the sentence behind a lamp appears in one reserved
   line when you point at it, so nothing on the screen moves when it does.                     */

const LAMP = {
  on:  { background: 'var(--lamp-on)',     borderColor: 'var(--accent-edge)' },
  off: { background: 'transparent',        borderColor: 'var(--line-3)' },
  bad: { background: 'var(--danger-rail)', borderColor: 'var(--danger)' },
};

export default function SafetyStatus({ auditLogs = [], sessionStatus }) {
    const [hint, setHint] = useState('');

    const resetThreshold = parseInt(localStorage.getItem('indicator_reset_time') || '0');
    const now = new Date();
    const todayStr = now.toLocaleDateString();

    const confirmedMirror = auditLogs.find(log =>
        (log.action === "DATABASE_MIRROR" || log.action === "MASTER_BACKUP") &&
        log.timestamp &&
        (log.timestamp.seconds * 1000 > resetThreshold)
    );
    const isCloudSecure = sessionStatus?.cloud || !!confirmedMirror;

    const lastUSB = parseInt(localStorage.getItem('last_usb_backup') || '0');
    const usbAgeDays = lastUSB ? Math.floor((now.getTime() - lastUSB) / 86400000) : null;
    const isUsbValidInDb = lastUSB > resetThreshold && (now.getTime() - lastUSB) < (7 * 24 * 60 * 60 * 1000);
    const isUsbSecure = sessionStatus?.usb || isUsbValidInDb;

    const todaySnapshots = auditLogs.filter(log => {
        if (!log.isSavePoint || !log.timestamp || !log.timestamp.seconds) return false;
        try {
            return new Date(log.timestamp.seconds * 1000).toLocaleDateString() === todayStr;
        } catch { return false; }
    }).length;
    const isRecoverySecure = sessionStatus?.recovery || todaySnapshots > 0;

    const lamps = [
        {
            key: 'cloud', label: 'Cloud', state: isCloudSecure ? 'on' : 'bad',
            say: isCloudSecure ? 'Tersalin ke cloud' : 'Belum tersalin ke cloud — jalankan Master Backup',
        },
        {
            key: 'usb', label: 'USB', state: isUsbSecure ? 'on' : 'off',
            say: isUsbSecure
                ? (usbAgeDays === null ? 'Backup USB aman' :
                   usbAgeDays === 0 ? 'Backup USB hari ini' : `Backup USB ${usbAgeDays} hari lalu`)
                : 'Backup USB lewat 7 hari — colok flashdisk',
        },
        {
            key: 'save', label: 'Save point', state: isRecoverySecure ? 'on' : 'off',
            say: todaySnapshots > 0
                ? `${todaySnapshots} save point hari ini`
                : 'Belum ada save point hari ini',
        },
    ];

    return (
        <div className="kpm-safety">
            <div className="kpm-safety-row" onPointerLeave={() => setHint('')}>
                {lamps.map(l => (
                    <button
                        key={l.key}
                        type="button"
                        className="kpm-safety-lamp"
                        aria-label={l.say}
                        onPointerEnter={() => setHint(l.say)}
                        onPointerDown={() => setHint(l.say)}
                        onFocus={() => setHint(l.say)}
                        onBlur={() => setHint('')}
                    >
                        <span className="kpm-lamp-dot" style={LAMP[l.state]} />
                        <span className="kpm-lamp-label">{l.label}</span>
                    </button>
                ))}
            </div>
            {/* the line is always here, so a sentence appearing never moves the panel */}
            <p className="kpm-safety-hint" aria-live="polite">{hint || ' '}</p>
        </div>
    );
}
