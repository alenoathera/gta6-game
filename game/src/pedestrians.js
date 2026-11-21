/**
 * Solara Bay - Pedestrian AI System
 * Procedural pedestrians walking along sidewalks with reactive flee behavior
 */

import * as THREE from 'three';
import { PRNG, dist2D } from './utils.js';

export class PedestrianManager {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.pedestrians = [];
    this.prng = new PRNG(13579);
    this.maxPeds = 20;

    this.initPedestrians();
  }

  initPedestrians() {
    const shirts = [0xffffff, 0x33aa55, 0x4488ee, 0xee5533, 0xffbb22, 0xcc44aa];
    const pants = [0x223344, 0x111111, 0x556677, 0x4a3b32];

    for (let i = 0; i < this.maxPeds; i++) {
      const group = new THREE.Group();

      // Shirt
      const shirtMat = new THREE.MeshLambertMaterial({ color: this.prng.choice(shirts) });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), shirtMat);
      torso.position.y = 1.25;
      group.add(torso);

      // Head
      const headMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
      head.position.y = 1.85;
      group.add(head);

      // Legs
      const legMat = new THREE.MeshLambertMaterial({ color: this.prng.choice(pants) });
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), legMat);
      legs.position.y = 0.4;
      group.add(legs);

      // Spawn on sidewalks
      const x = this.prng.range(-180, 180);
      const z = this.prng.range(-170, 180);
      group.position.set(x, 0, z);

      this.scene.add(group);

      this.pedestrians.push({
        mesh: group,
        heading: this.prng.range(0, Math.PI * 2),
        speed: this.prng.range(1.5, 2.5),
        state: 'walk', // 'walk', 'flee', 'down'
        fleeTimer: 0,
      });
    }
  }

  update(dt, playerPos, crimesActive) {
    this.pedestrians.forEach((p) => {
      const dToPlayer = dist2D(p.mesh.position.x, p.mesh.position.z, playerPos.x, playerPos.z);

      // Trigger flee when player commits crime or gets very close aggressively
      if (crimesActive && dToPlayer < 25) {
        p.state = 'flee';
        p.fleeTimer = 5.0;
        // Run opposite direction from player
        p.heading = Math.atan2(p.mesh.position.x - playerPos.x, p.mesh.position.z - playerPos.z);
      }

      if (p.state === 'flee') {
        p.fleeTimer -= dt;
        p.speed = 6.0;
        if (p.fleeTimer <= 0) {
          p.state = 'walk';
          p.speed = 2.0;
        }
      }

      const nextX = p.mesh.position.x + Math.sin(p.heading) * p.speed * dt;
      const nextZ = p.mesh.position.z + Math.cos(p.heading) * p.speed * dt;

      // Bounce at boundary
      if (Math.abs(nextX) > 230 || nextZ < -195 || nextZ > 230) {
        p.heading += Math.PI;
      } else {
        p.mesh.position.x = nextX;
        p.mesh.position.z = nextZ;
      }

      p.mesh.rotation.y = p.heading;
    });
  }

  onPlayerAttack(hitX, hitZ, range = 2.5) {
    this.pedestrians.forEach((p) => {
      const d = dist2D(p.mesh.position.x, p.mesh.position.z, hitX, hitZ);
      if (d < range) {
        p.state = 'flee';
        p.fleeTimer = 8.0;
        p.mesh.rotation.z = Math.PI / 3; // Knocked sideways
        setTimeout(() => {
          if (p.mesh) p.mesh.rotation.z = 0;
        }, 1200);
        window.dispatchEvent(new CustomEvent('crime-committed', { detail: { type: 'assault' } }));
      }
    });
  }
}
