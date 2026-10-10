import './style.css';
import { createEngine } from './rendering/engine';
import { createScene } from './rendering/scene';
import { startRendering } from './rendering/lifecycle';
import { showError, showReady } from './ui';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
let engine: ReturnType<typeof createEngine> | undefined;
try {
  engine = createEngine(canvas);
  const scene = createScene(engine, canvas);
  const dispose = startRendering(engine, scene, canvas);
  showReady();
  window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); }, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (error) {
  engine?.dispose();
  showError(error);
}
