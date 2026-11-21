/**
 * Solara Bay - Police & Wanted System
 * Manages 5-star wanted levels, police cruiser spawns, sirens, pursuits, and busted states
 */

import { dist2D } from './utils.js';

export class PoliceManager {
  constructor(scene, city, vehicles, audio) {
    this.scene = scene;
    this.city = city;
    this.vehicles = vehicles;
    this.audio = audio;

    this.wantedLevel = 0; // 0 to 5
    this.policeUnits = [];
    this.bustTimer = 0;
    this.decayTimer = 0;
  }

  raiseWanted(amount = 1) {
    this.wantedLevel = Math.min(5, this.wantedLevel + amount);
    this.decayTimer = 15; // Reset cooldown
    this.updatePoliceSpawns();
    window.dispatchEvent(new CustomEvent('wanted-changed', { detail: { level: this.wantedLevel } }));
  }

  setWanted(level) {
    this.wantedLevel = Math.max(0, Math.min(5, level));
    this.updatePoliceSpawns();
    window.dispatchEvent(new CustomEvent('wanted-changed', { detail: { level: this.wantedLevel } }));
  }

  clearWanted() {
    this.wantedLevel = 0;
    this.updatePoliceSpawns();
    window.dispatchEvent(new CustomEvent('wanted-changed', { detail: { level: 0 } }));
  }

  updatePoliceSpawns() {
    const requiredCruisers = this.wantedLevel > 0 ? Math.min(4, this.wantedLevel + 1) : 0;

    // Siren audio state
    this.audio.setSirenActive(this.wantedLevel > 0);

    // Spawn cruisers if needed
    while (this.policeUnits.length < requiredCruisers) {
      const spawnDist = 45;
      const angle = Math.random() * Math.PI * 2;
      const sx = Math.sin(angle) * spawnDist;
      const sz = Math.cos(angle) * spawnDist;

      const cruiser = this.vehicles.createVehicle('police', sx, sz, angle);
      cruiser.sirenActive = true;
      this.policeUnits.push(cruiser);
    }
  }

  update(dt, playerPos, playerInVehicle) {
    // Wanted level decay when escaping
    if (this.wantedLevel > 0) {
      this.decayTimer -= dt;
      if (this.decayTimer <= 0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.decayTimer = 12;
        this.updatePoliceSpawns();
        window.dispatchEvent(new CustomEvent('wanted-changed', { detail: { level: this.wantedLevel } }));
      }
    }

    // Pursuit logic for police cruisers
    let nearArrestingUnit = false;

    this.policeUnits.forEach((p) => {
      const d = dist2D(p.mesh.position.x, p.mesh.position.z, playerPos.x, playerPos.z);
      const angleToPlayer = Math.atan2(playerPos.x - p.mesh.position.x, playerPos.z - p.mesh.position.z);

      // Steer towards player
      p.heading = angleToPlayer;
      p.mesh.rotation.y = p.heading;

      if (d > 6.0) {
        p.speed = 24.0;
        p.mesh.position.x += Math.sin(p.heading) * p.speed * dt;
        p.mesh.position.z += Math.cos(p.heading) * p.speed * dt;
      } else {
        p.speed = 4.0;
        // Within arrest proximity
        nearArrestingUnit = true;
      }
    });

    // Check BUSTED condition: player stationary close to police
    if (this.wantedLevel > 0 && nearArrestingUnit) {
      this.bustTimer += dt;
      if (this.bustTimer > 2.2) {
        this.bustTimer = 0;
        window.dispatchEvent(new CustomEvent('player-busted'));
      }
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }
  }
}
