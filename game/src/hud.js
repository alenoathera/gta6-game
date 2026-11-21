/**
 * Solara Bay - HUD & Live Minimap Radar
 * Renders status counters, speed, wanted stars, and real-time canvas radar
 */

export class HUDManager {
  constructor(canvasMinimap) {
    this.canvas = canvasMinimap;
    this.ctx = canvasMinimap ? canvasMinimap.getContext('2d') : null;

    // DOM Elements
    this.healthBar = document.getElementById('health-bar-fill');
    this.cashDisplay = document.getElementById('cash-display');
    this.speedDisplay = document.getElementById('speed-display');
    this.vehicleName = document.getElementById('vehicle-name');
    this.weaponDisplay = document.getElementById('weapon-display');
    this.missionTitle = document.getElementById('mission-title');
    this.missionTask = document.getElementById('mission-task');
    this.dialogueBox = document.getElementById('dialogue-box');
    this.dialogueSpeaker = document.getElementById('dialogue-speaker');
    this.dialogueText = document.getElementById('dialogue-text');
    this.toast = document.getElementById('hud-toast');

    this.stars = [
      document.getElementById('star-1'),
      document.getElementById('star-2'),
      document.getElementById('star-3'),
      document.getElementById('star-4'),
      document.getElementById('star-5'),
    ];
  }

  updateStats(health, cash, speed, wantedLevel, inVehicle, vehicleName) {
    if (this.healthBar) this.healthBar.style.width = `${Math.max(0, health)}%`;
    if (this.cashDisplay) this.cashDisplay.textContent = `$${cash.toLocaleString()}`;
    if (this.speedDisplay) this.speedDisplay.textContent = Math.round(speed);
    if (this.vehicleName) this.vehicleName.textContent = inVehicle ? vehicleName.toUpperCase() : 'WALKING';

    // Update Wanted Stars
    this.stars.forEach((s, idx) => {
      if (s) {
        if (idx < wantedLevel) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      }
    });
  }

  setMissionInfo(title, task) {
    if (this.missionTitle) this.missionTitle.textContent = title;
    if (this.missionTask) this.missionTask.textContent = task;
  }

  showDialogue(speaker, text) {
    if (this.dialogueBox && this.dialogueSpeaker && this.dialogueText) {
      this.dialogueSpeaker.textContent = speaker;
      this.dialogueText.textContent = `"${text}"`;
      this.dialogueBox.classList.remove('hidden');
    }
  }

  hideDialogue() {
    if (this.dialogueBox) this.dialogueBox.classList.add('hidden');
  }

  showToast(message, duration = 2500) {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.classList.remove('hidden');
    setTimeout(() => {
      this.toast.classList.add('hidden');
    }, duration);
  }

  renderMinimap(player, vehicles, pedestrians, missionMarker) {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const zoom = 0.55; // scale meters to canvas pixels

    this.ctx.clearRect(0, 0, w, h);

    // Background circle
    this.ctx.fillStyle = '#101420';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    // Center on player with camera/heading rotation
    this.ctx.translate(cx, cy);
    this.ctx.rotate(-player.heading);

    // Draw City Roads Grid
    this.ctx.strokeStyle = '#2d3345';
    this.ctx.lineWidth = 14 * zoom;

    const roads = [-160, -80, 0, 80, 160];
    roads.forEach((r) => {
      // NS Avenues
      this.ctx.beginPath();
      this.ctx.moveTo((r - player.position.x) * zoom, (-220 - player.position.z) * zoom);
      this.ctx.lineTo((r - player.position.x) * zoom, (220 - player.position.z) * zoom);
      this.ctx.stroke();

      // EW Streets
      this.ctx.beginPath();
      this.ctx.moveTo((-220 - player.position.x) * zoom, (r - player.position.z) * zoom);
      this.ctx.lineTo((220 - player.position.x) * zoom, (r - player.position.z) * zoom);
      this.ctx.stroke();
    });

    // Draw Pedestrians (Tiny green dots)
    this.ctx.fillStyle = '#66ee88';
    pedestrians.forEach((p) => {
      const px = (p.mesh.position.x - player.position.x) * zoom;
      const pz = (p.mesh.position.z - player.position.z) * zoom;
      if (Math.abs(px) < cx && Math.abs(pz) < cy) {
        this.ctx.beginPath();
        this.ctx.arc(px, pz, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // Draw Vehicles (Traffic: yellow; Police: flashing blue/red)
    vehicles.vehicles.forEach((v) => {
      if (v === player.currentVehicle) return;
      const vx = (v.mesh.position.x - player.position.x) * zoom;
      const vz = (v.mesh.position.z - player.position.z) * zoom;
      if (Math.abs(vx) < cx && Math.abs(vz) < cy) {
        this.ctx.fillStyle = v.isPolice ? (Date.now() % 400 < 200 ? '#ff2222' : '#2255ff') : '#eebb22';
        this.ctx.fillRect(vx - 3, vz - 4, 6, 8);
      }
    });

    // Draw Mission Objective Blip (Golden pulsing star)
    if (missionMarker) {
      const mx = (missionMarker.x - player.position.x) * zoom;
      const mz = (missionMarker.z - player.position.z) * zoom;
      this.ctx.fillStyle = '#ffcc00';
      this.ctx.beginPath();
      this.ctx.arc(mx, mz, 5 + Math.sin(Date.now() * 0.008) * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();

    // Player cursor in center (Forward arrow)
    this.ctx.fillStyle = '#ff0077';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - 7);
    this.ctx.lineTo(cx - 5, cy + 6);
    this.ctx.lineTo(cx, cy + 3);
    this.ctx.lineTo(cx + 5, cy + 6);
    this.ctx.closePath();
    this.ctx.fill();
  }
}
