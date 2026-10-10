import './style.css';
import { createEngine } from './rendering/engine';
import { createScene } from './rendering/scene';
import { startRendering } from './rendering/lifecycle';
import { showError, showReady } from './ui';
import { createInput } from './input';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
let engine: ReturnType<typeof createEngine> | undefined;
try {
  engine = createEngine(canvas);
  const scene = createScene(engine, canvas);
  const input = createInput(canvas, document.querySelector<HTMLElement>('#stick')!);
  const renderingDispose = startRendering(engine, scene, canvas, (dt) => {
    scene.metadata.update(input.read(), dt); input.consumeLook();
  });
  const dispose = () => { input.dispose(); renderingDispose(); };
  showReady();
  window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); }, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (error) {
  engine?.dispose();
  showError(error);
}
