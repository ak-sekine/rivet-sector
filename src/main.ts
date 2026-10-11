import './style.css';
import { createEngine } from './rendering/engine';
import { createScene } from './rendering/scene';
import { startRendering } from './rendering/lifecycle';
import { showError, showReady } from './ui';
import { createInput } from './input';
import { DODGE_STAMINA_COST } from './game/dodge';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
let engine: ReturnType<typeof createEngine> | undefined;
try {
  engine = createEngine(canvas);
  const scene = createScene(engine, canvas);
  const dodgeButton = document.querySelector<HTMLButtonElement>('#dodge')!;
  const shootButton = document.querySelector<HTMLButtonElement>('#shoot')!;
  const staminaGauge = document.querySelector<HTMLElement>('#stamina')!;
  const staminaValue = document.querySelector<HTMLElement>('#stamina-value')!;
  const updateHud = () => {
    shootButton.classList.toggle('cooling', scene.metadata.shooting.remaining > 0);
    shootButton.setAttribute('aria-disabled', String(scene.metadata.shooting.remaining > 0));
    const dodge = scene.metadata.dodge;
    dodgeButton.classList.toggle('dodging', dodge.active);
    dodgeButton.classList.toggle('exhausted', dodge.phase === 'exhausted');
    dodgeButton.setAttribute('aria-disabled', String(!dodge.canDodge));
    staminaGauge.classList.toggle('exhausted', dodge.stamina < DODGE_STAMINA_COST);
    staminaGauge.style.setProperty('--stamina', `${dodge.stamina / dodge.maxStamina * 100}%`);
    staminaGauge.setAttribute('aria-valuenow', String(dodge.stamina));
    staminaGauge.setAttribute('aria-valuemax', String(dodge.maxStamina));
    staminaValue.textContent = `${Math.floor(dodge.stamina)} / ${dodge.maxStamina}`;
  };
  const input = createInput(canvas, document.querySelector<HTMLElement>('#stick')!, dodgeButton, () => { scene.metadata.reset(); updateHud(); }, shootButton);
  const renderingDispose = startRendering(engine, scene, canvas, (dt) => {
    scene.metadata.update(input.read(), dt); input.consumeLook();
    updateHud();
  });
  updateHud();
  const dispose = () => { input.dispose(); renderingDispose(); };
  showReady();
  window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); }, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (error) {
  engine?.dispose();
  showError(error);
}
