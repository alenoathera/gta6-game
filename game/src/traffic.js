/**
 * Solara Bay - Traffic System
 * Spawns and manages civilian AI vehicles cruising the city road grid
 */

import { PRNG, dist2D } from './utils.js';

export class TrafficManager {
  constructor(scene, city, vehicles) {
    this.scene = scene;
    this.city = city;
    this.vehicles = vehicles;
    this.trafficCars = [];
    this.spawnTimer = 0;
    this.maxTraffic = 14;
    this.prng = new PRNG(98765);

    this.initTraffic();
  }

  initTraffic() {
    // Populate roads with initial traffic cars
    const types = ['sports', 'muscle', 'sedan'];
    const xRoads = [-160, -80, 0, 80, 160];
    const zRoads = [-160, -80, 0, 80, 160];

    for (let i = 0; i < 8; i++) {
      const rx = this.prng.choice(xRoads);
      const rz = this.prng.range(-150, 150);
      const type = this.prng.choice(types);
      const v = this.vehicles.createVehicle(type, rx + 4, rz, Math.PI);
      v.isTraffic = true;
      v.targetSpeed = this.prng.range(12, 18);
      this.trafficCars.push(v);
    }

    for (let i = 0; i < 6; i++) {
      const rz = this.prng.choice(zRoads);
      const rx = this.prng.range(-150, 150);
      const type = this.prng.choice(types);
      const v = this.vehicles.createVehicle(type, rx, rz - 4, Math.PI / 2);
      v.isTraffic = true;
      v.targetSpeed = this.prng.range(12, 18);
      this.trafficCars.push(v);
    }
  }

  update(dt, playerPos) {
    this.trafficCars.forEach((v) => {
      // If car was stolen by player, skip AI
      if (v === this.vehicles.playerVehicle) return;

      // Simple road cruising AI
      v.speed = v.targetSpeed || 14;
      const forwardX = Math.sin(v.heading);
      const forwardZ = Math.cos(v.heading);

      let nextX = v.mesh.position.x + forwardX * v.speed * dt;
      let nextZ = v.mesh.position.z + forwardZ * v.speed * dt;

      // Wrap around or bounce at boundary
      if (Math.abs(nextX) > 220 || nextZ < -190 || nextZ > 220) {
        v.heading += Math.PI; // Turn around
      } else {
        v.mesh.position.x = nextX;
        v.mesh.position.z = nextZ;
      }

      v.mesh.rotation.y = v.heading;
    });
  }
}
