import './style.css';
import Phaser from 'phaser';
import { TrainingScene } from './scene';

try {
  const region = document.getElementById('game')!;
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#0b171f',
    pixelArt: true, roundPixels: true, antialias: false,
    scale: { mode: Phaser.Scale.NONE, width: region.clientWidth, height: region.clientHeight },
    input: { activePointers: 3 }, // Three touch pointers plus Phaser's separate mouse pointer.
    audio: { noAudio: true }, // Sound is isolated in the Web Audio adapter.
    scene: TrainingScene,
  });
  const observer = new ResizeObserver(() => {
    if (region.clientWidth > 0 && region.clientHeight > 0) game.scale.resize(region.clientWidth, region.clientHeight);
  });
  observer.observe(region);
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());
  if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
} catch (error) {
  const message = document.getElementById('error2d')!; message.hidden = false;
  message.textContent = `訓練エリアを起動できませんでした。${error instanceof Error ? error.message : String(error)}`;
  document.getElementById('loading')!.hidden = true;
}
