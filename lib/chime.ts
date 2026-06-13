"use client";

// New-order chime for the captain board — KDS-style two-tone ding via
// WebAudio (no asset download, works offline). Per-tablet on/off toggle.

const KEY = "orbean-chime";

export function chimeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "off";
}

export function setChimeEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? "on" : "off");
}

let ctx: AudioContext | null = null;

export function playChime() {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    [[880, 0], [1318.5, 0.16]].forEach(([freq, dt]) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq as number;
      gain.gain.setValueAtTime(0.0001, t0 + (dt as number));
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + (dt as number) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (dt as number) + 0.5);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t0 + (dt as number));
      osc.stop(t0 + (dt as number) + 0.55);
    });
  } catch {
    /* audio blocked until first user gesture — fine */
  }
}
