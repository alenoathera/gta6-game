/**
 * Solara Bay - Main Entry & Core Game Loop
 * Orchestrates Scene, Camera, Render loop, Physics and State Machine
 */

import * as THREE from 'three';
import { CityManager } from './city.js';
import { VehicleManager } from './vehicles.js';
import { PlayerController } from './player.js';
import { TrafficManager } from './traffic.js';
import { PedestrianManager } from './pedestrians.js';
import { PoliceManager } from './police.js';
import { MissionManager } from './missions.js';
import { HUDManager } from './hud.js';
import { AudioManager } from './audio.js';
import { InputController } from './input.js';
import { setupDeterministicShot } from './shots.js';

class SolaraBayGame {
  constructor() {
    this.canvas = document.getElementById('three-canvas');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'BUSTED', 'WASTED'

    this.lastTime = performance.now();
    this.initEngine();
    this.initGameSystems();
    this.setupEvents();
    this.checkURLParams();
    this.startLoop();
  }

  initEngine() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5a36c); // Warm Miami sunset
    this.scene.fog = new THREE.FogExp2(0xf5a36c, 0.0035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // 3. Renderer with robust WebGL context acquisition
    const glContext =
      this.canvas.getContext('webgl2') ||
      this.canvas.getContext('webgl') ||
      this.canvas.getContext('experimental-webgl');

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context: glContext || undefined,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0xffe0cc, 0.65);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xff9944, 1.2);
    sun.position.set(120, 90, -120);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 400;
    const d = 160;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    this.scene.add(sun);

    // Window resize handler
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initGameSystems() {
    this.audio = new AudioManager();
    this.input = new InputController(this.canvas);
    this.city = new CityManager(this.scene);
    this.vehicles = new VehicleManager(this.scene, this.city);
    this.player = new PlayerController(this.scene, this.camera, this.city, this.vehicles, this.audio);
    this.traffic = new TrafficManager(this.scene, this.city, this.vehicles);
    this.pedestrians = new PedestrianManager(this.scene, this.city);
    this.police = new PoliceManager(this.scene, this.city, this.vehicles, this.audio);
    this.missions = new MissionManager(this.scene, this.audio, this.police);
    this.hud = new HUDManager(this.minimapCanvas);

    // Initial vehicle near player for immediate driving
    this.vehicles.createVehicle('sports', -6, 4, 0);
  }

  setupEvents() {
    // Buttons
    document.getElementById('btn-start')?.addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume')?.addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-respawn-busted')?.addEventListener('click', () => this.respawnAfterBust());
    document.getElementById('btn-respawn-wasted')?.addEventListener('click', () => this.respawnAfterWaste());

    // Game Events
    window.addEventListener('player-attack', (e) => {
      this.pedestrians.onPlayerAttack(e.detail.x, e.detail.z, e.detail.range);
    });

    window.addEventListener('crime-committed', (e) => {
      this.police.raiseWanted(1);
    });

    window.addEventListener('player-busted', () => {
      this.state = 'BUSTED';
      this.audio.setSirenActive(false);
      document.getElementById('screen-busted')?.classList.remove('hidden');
    });

    window.addEventListener('player-wasted', () => {
      this.state = 'WASTED';
      this.audio.setSirenActive(false);
      document.getElementById('screen-wasted')?.classList.remove('hidden');
    });

    window.addEventListener('pickup-collected', (e) => {
      this.player.cash += e.detail.value;
      this.hud.showToast(`+$${e.detail.value} CASH PICKUP!`);
    });

    window.addEventListener('mission-stage-complete', (e) => {
      const { mission } = e.detail;
      this.hud.setMissionInfo(mission.title, `Deliver package to Eddie's garage!`);
      if (mission.dialogues[1]) {
        this.hud.showDialogue(mission.dialogues[1].speaker, mission.dialogues[1].text);
      }
    });

    window.addEventListener('mission-complete', (e) => {
      const { mission } = e.detail;
      this.player.cash += mission.reward;
      this.police.clearWanted();
      this.hud.showToast(`MISSION COMPLETE: +$${mission.reward.toLocaleString()}`);
      setTimeout(() => this.hud.hideDialogue(), 4000);
    });
  }

  startGame() {
    this.state = 'PLAYING';
    document.getElementById('screen-start')?.classList.add('hidden');
    this.audio.init();

    const m = this.missions.getCurrentMission();
    if (m) {
      this.hud.setMissionInfo(m.title, m.task);
      this.hud.showDialogue(m.dialogues[0].speaker, m.dialogues[0].text);
      setTimeout(() => this.hud.hideDialogue(), 6000);
    }
  }

  resumeGame() {
    this.state = 'PLAYING';
    document.getElementById('screen-pause')?.classList.add('hidden');
  }

  respawnAfterBust() {
    this.player.cash = Math.max(0, this.player.cash - 200);
    this.player.position.set(0, 0, 0);
    this.player.mesh.position.set(0, 0, 0);
    this.police.clearWanted();
    this.state = 'PLAYING';
    document.getElementById('screen-busted')?.classList.add('hidden');
  }

  respawnAfterWaste() {
    this.player.cash = Math.max(0, this.player.cash - 150);
    this.player.health = 100;
    this.player.position.set(0, 0, 0);
    this.player.mesh.position.set(0, 0, 0);
    this.police.clearWanted();
    this.state = 'PLAYING';
    document.getElementById('screen-wasted')?.classList.add('hidden');
  }

  checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      this.state = 'PLAYING';
      document.getElementById('screen-start')?.classList.add('hidden');
      setupDeterministicShot(shot, this);
    }
  }

  startLoop() {
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      // Handle pause toggle
      if (this.input.consumePause() && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.state = this.state === 'PLAYING' ? 'PAUSED' : 'PLAYING';
        document.getElementById('screen-pause')?.classList.toggle('hidden', this.state === 'PLAYING');
      }

      // Handle audio mute toggle
      if (this.input.consumeMute()) {
        const isMuted = this.audio.toggleMute();
        this.hud.showToast(isMuted ? 'AUDIO MUTED' : 'AUDIO UNMUTED');
      }

      if (this.state === 'PLAYING') {
        this.player.update(dt, this.input);
        this.vehicles.update(dt, this.input, this.player.inVehicle);
        this.traffic.update(dt, this.player.position);
        this.pedestrians.update(dt, this.player.position, this.police.wantedLevel > 0);
        this.police.update(dt, this.player.position, this.player.inVehicle);
        this.missions.update(dt, this.player.position);

        // Update HUD
        const currentSpeed = this.player.inVehicle && this.player.currentVehicle
          ? Math.abs(this.player.currentVehicle.speed) * 1.8
          : this.player.speed * 1.5;

        const vName = this.player.inVehicle && this.player.currentVehicle
          ? this.player.currentVehicle.name
          : 'Walking';

        this.hud.updateStats(
          this.player.health,
          this.player.cash,
          currentSpeed,
          this.police.wantedLevel,
          this.player.inVehicle,
          vName
        );

        const currentMission = this.missions.getCurrentMission();
        const targetMarker = currentMission
          ? (this.missions.stage === 0 ? currentMission.targetPos : currentMission.dropoffPos)
          : null;

        this.hud.renderMinimap(this.player, this.vehicles, this.pedestrians.pedestrians, targetMarker);
      }

      this.renderer.render(this.scene, this.camera);
    };

    requestAnimationFrame(loop);
  }
}

// Boot game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new SolaraBayGame();
});
