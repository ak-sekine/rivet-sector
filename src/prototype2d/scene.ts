import Phaser from 'phaser';
import { createGame, facingRow, FIXED_SECONDS } from './logic';
import { bindInput } from './input';
import { createAudio } from './audio';
import { obstacles, TARGET, walls, WORLD } from './stage';

export class TrainingScene extends Phaser.Scene {
  readonly simulation = createGame();
  private player!: Phaser.GameObjects.Sprite;
  private enemy!: Phaser.GameObjects.Sprite;
  private reticle!: Phaser.GameObjects.Graphics;
  private controls?: ReturnType<typeof bindInput>;
  private soundLab?: ReturnType<typeof createAudio>;
  private bullets = new Map<number, Phaser.GameObjects.Image>();
  private effects = new Map<number, Phaser.GameObjects.Sprite>();
  private accumulator = 0;
  readonly assetBase = `${import.meta.env.BASE_URL}2d/assets/`;

  constructor() { super('training'); }
  preload() {
    this.load.spritesheet('player', `${this.assetBase}player.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy', `${this.assetBase}enemy.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('impact', `${this.assetBase}impact.png`, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('afterimage', `${this.assetBase}afterimage.png`, { frameWidth: 32, frameHeight: 32 });
    for (const key of ['floor', 'wall', 'obstacle', 'energy']) this.load.image(key, `${this.assetBase}${key}.png`);
    this.load.on('loaderror', () => {
      const error = document.getElementById('error2d')!; error.hidden = false;
      error.textContent = '素材を読み込めませんでした。ページを再読み込みしてください。';
    });
  }
  create() {
    for (const key of ['player', 'enemy', 'impact', 'afterimage', 'floor', 'wall', 'obstacle', 'energy']) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.tileSprite(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 'floor');
    const paint = this.add.graphics();
    paint.lineStyle(1, 0x427c7c, .45); paint.strokeRect(352, 192, 576, 448);
    paint.lineStyle(1, 0x427c7c, .25); paint.strokeCircle(640, 416, 96); paint.strokeCircle(640, 416, 100);
    for (let y = 208; y < 640; y += 48) { paint.lineBetween(352, y, 360, y); paint.lineBetween(920, y, 928, y); }
    paint.lineStyle(1, 0xf69e43, .45); paint.strokeCircle(TARGET.x, TARGET.y, 26);
    this.add.text(640, 176, 'RIVET / SECTOR 07', { fontFamily: 'monospace', fontSize: '12px', color: '#5d999b' }).setOrigin(.5);
    this.add.text(TARGET.x, TARGET.y - 34, 'TRAINING UNIT', { fontFamily: 'monospace', fontSize: '7px', color: '#cc8e53' }).setOrigin(.5);
    this.add.text(640, 648, 'LIVE FIRE  •  GENERATED ASSETS', { fontFamily: 'monospace', fontSize: '8px', color: '#4a737d' }).setOrigin(.5);
    for (const rect of walls) this.add.tileSprite(rect.x, rect.y, rect.width, rect.height, 'wall').setOrigin(0).setDepth(1);
    for (const rect of obstacles) {
      this.add.rectangle(rect.x + 3, rect.y + 5, rect.width, rect.height, 0x050e16, .55).setOrigin(0).setDepth(1);
      this.add.tileSprite(rect.x, rect.y, rect.width, rect.height, 'obstacle').setOrigin(0).setDepth(2);
    }
    this.enemy = this.add.sprite(TARGET.x, TARGET.y, 'enemy').setDepth(3);
    const p = this.simulation.state.player;
    this.player = this.add.sprite(p.x, p.y, 'player', 4).setDepth(4);
    this.reticle = this.add.graphics().setDepth(6);
    const camera = this.cameras.main; camera.setZoom(Math.max(1, Math.min(2, this.scale.width / 320))); camera.setBounds(0, 0, WORLD.width, WORLD.height); camera.startFollow(this.player, true, 1, 1);
    const resizeCamera = () => camera.setZoom(Math.max(1, Math.min(2, this.scale.width / 320)));
    this.scale.on(Phaser.Scale.Events.RESIZE, resizeCamera);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, resizeCamera));
    this.soundLab = createAudio(this.assetBase);
    this.controls = bindInput(this.game.canvas, (x, y) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const point = camera.getWorldPoint((x - rect.x) * this.scale.width / rect.width, (y - rect.y) * this.scale.height / rect.height);
      return { x: point.x - this.player.x, y: point.y - this.player.y };
    }, () => this.soundLab!.unlock(), () => this.soundLab!.toggle(), () => { this.simulation.suspend(); this.accumulator = 0; });
    this.game.canvas.setAttribute('aria-label', 'Rivet Sector 2D操作画面'); this.game.canvas.tabIndex = 0;
    document.getElementById('loading')!.hidden = true;
    // Read-only snapshots allow dev/public browser checks without changing game state.
    const lab = window as Window & { rivet2d?: { snapshot: () => unknown } };
    lab.rivet2d = { snapshot: () => structuredClone({ ...this.simulation.state, audio: this.soundLab!.status,
      camera: { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom }, pointers: this.input.manager.pointersTotal, version: Phaser.VERSION }) };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.controls?.dispose(); this.soundLab?.dispose(); delete lab.rivet2d; });
  }
  update(_time: number, delta: number) {
    if (!this.controls) return;
    if (!this.controls.active()) { this.accumulator = 0; return; }
    this.accumulator += Math.min(delta / 1000, .1);
    const input = this.controls.read(this.accumulator >= FIXED_SECONDS);
    while (this.accumulator >= FIXED_SECONDS) {
      for (const event of this.simulation.step(input, FIXED_SECONDS)) this.soundLab?.play(event);
      input.dodge = false; this.accumulator -= FIXED_SECONDS;
    }
    const s = this.simulation.state, row = facingRow(s.facing);
    this.player.setPosition(s.player.x, s.player.y).setFrame(row * 4 + (s.moving || s.dodgeRemaining > 0 ? Math.floor(s.time * 10) % 4 : 0));
    this.player.setAlpha(s.dodgeRemaining > 0 ? .8 : 1);
    this.enemy.setFrame(Math.floor(s.time * 2) % 2);
    if (s.targetFlash > 0) { this.enemy.setTint(0xffedc4); this.enemy.setTintFill(); } else this.enemy.clearTint();
    const liveBullets = new Set(s.bullets.map(b => b.id));
    for (const [id, sprite] of this.bullets) if (!liveBullets.has(id)) { sprite.destroy(); this.bullets.delete(id); }
    for (const b of s.bullets) {
      if (!this.bullets.has(b.id)) this.bullets.set(b.id, this.add.image(b.x, b.y, 'energy').setDepth(5));
      this.bullets.get(b.id)!.setPosition(b.x, b.y).setRotation(Math.atan2(b.direction.y, b.direction.x));
    }
    const liveEffects = new Set(s.effects.map(e => e.id));
    for (const [id, sprite] of this.effects) if (!liveEffects.has(id)) { sprite.destroy(); this.effects.delete(id); }
    for (const e of s.effects) {
      if (!this.effects.has(e.id)) this.effects.set(e.id, this.add.sprite(e.x, e.y, e.kind === 'trail' ? 'afterimage' : 'impact').setDepth(e.kind === 'trail' ? 3 : 5));
      const sprite = this.effects.get(e.id)!;
      sprite.setFrame(e.kind === 'trail' ? facingRow(e.direction) : Math.min(5, Math.floor((.24 - e.life) / .04)));
      sprite.setAlpha(Math.min(1, e.life / (e.kind === 'trail' ? .18 : .08)));
      if (e.kind === 'wall') sprite.setTint(0x71d6cf);
    }
    this.reticle.clear();
    if (Math.hypot(input.aim.x, input.aim.y) > 0) {
      const x = s.player.x + input.aim.x * 48, y = s.player.y + input.aim.y * 48;
      this.reticle.lineStyle(1, 0x8befe0, .8); this.reticle.strokeCircle(x, y, 4);
      this.reticle.lineBetween(x - 7, y, x - 4, y); this.reticle.lineBetween(x + 4, y, x + 7, y);
      this.reticle.lineBetween(x, y - 7, x, y - 4); this.reticle.lineBetween(x, y + 4, x, y + 7);
    }
    const gauge = document.getElementById('stamina2d')!, dodge = document.getElementById('dodge2d')!;
    gauge.style.setProperty('--stamina', `${s.stamina}%`); gauge.setAttribute('aria-valuenow', String(Math.floor(s.stamina)));
    gauge.classList.toggle('exhausted', s.stamina < 25); document.getElementById('stamina-value2d')!.textContent = String(Math.floor(s.stamina));
    dodge.classList.toggle('dodging', s.dodgeRemaining > 0); dodge.classList.toggle('exhausted', s.stamina < 25);
    dodge.setAttribute('aria-disabled', String(s.dodgeRemaining > 0 || s.stamina < 25));
    document.getElementById('hits')!.textContent = String(s.hits).padStart(3, '0');
  }
}
