import type { GameEvent } from './logic';

const audioFiles = ['shot', 'hit', 'explosion', 'dodge', 'bgm'] as const;
export function createAudio(base: string) {
  let context: AudioContext | undefined, bgm: AudioBufferSourceNode | undefined, gain: GainNode | undefined;
  let unlocked = false, muted = false, disposed = false;
  const buffers = new Map<string, AudioBuffer>(), sources = new Set<AudioBufferSourceNode>();
  const button = document.getElementById('mute')!;
  const running = () => unlocked && !muted && !document.hidden && context?.state === 'running';
  const startMusic = () => {
    if (!running() || bgm || !buffers.has('bgm')) return;
    bgm = context!.createBufferSource(); bgm.buffer = buffers.get('bgm')!; bgm.loop = true;
    const volume = context!.createGain(); volume.gain.value = .22;
    bgm.connect(volume).connect(gain!); bgm.start();
  };
  const stop = () => {
    bgm?.stop(); bgm = undefined;
    for (const source of sources) source.stop(); sources.clear();
  };
  const visibility = () => {
    if (document.hidden) { stop(); void context?.suspend().catch(() => {}); }
    else if (unlocked && !muted) void context?.resume().then(startMusic).catch(() => {});
  };
  const hide = () => { stop(); void context?.suspend().catch(() => {}); };
  const show = () => visibility();
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', hide); window.addEventListener('pageshow', show);
  return {
    unlock() {
      if (disposed) return;
      try {
        if (!context) {
          const Audio = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!Audio) return;
          context = new Audio(); gain = context.createGain(); gain.gain.value = muted ? 0 : 1; gain.connect(context.destination);
          const decoder = context;
          // Audio failures are isolated from game setup and individual files may fail independently.
          for (const name of audioFiles) void fetch(`${base}${name}.wav`).then(r => {
            if (!r.ok) throw new Error(`Audio HTTP ${r.status}`); return r.arrayBuffer();
          }).then(data => decoder.decodeAudioData(data)).then(buffer => {
            if (!disposed) { buffers.set(name, buffer); startMusic(); }
          }).catch(() => {});
        }
        unlocked = true;
        if (!document.hidden && !muted) void context.resume().then(startMusic).catch(() => {});
      } catch { /* Sound is optional; input and simulation continue. */ }
    },
    toggle() {
      muted = !muted; button.setAttribute('aria-pressed', String(muted)); button.textContent = muted ? '音 OFF' : '音 ON';
      button.setAttribute('aria-label', muted ? '音声を有効化' : '音声をミュート');
      if (gain) gain.gain.value = muted ? 0 : 1;
      if (muted) stop(); else if (context) void context.resume().then(startMusic).catch(() => {});
    },
    play(name: GameEvent) {
      if (!running() || !buffers.has(name) || sources.size >= 16) return;
      try {
        const source = context!.createBufferSource(), volume = context!.createGain();
        source.buffer = buffers.get(name)!; volume.gain.value = name === 'explosion' ? .18 : name === 'shot' ? .35 : .45;
        source.connect(volume).connect(gain!); source.onended = () => { sources.delete(source); source.disconnect(); volume.disconnect(); };
        sources.add(source); source.start();
      } catch { /* Audio errors must not interrupt a frame. */ }
    },
    get status() { return { unlocked, muted, loaded: buffers.size, playing: !!bgm, context: context?.state ?? 'unavailable', effects: sources.size }; },
    dispose() { disposed = true; stop(); void context?.close().catch(() => {}); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show); },
  };
}
