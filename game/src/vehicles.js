/**
 * Solara Bay - Vehicle System & Car Physics
 * Implements procedural car models (Sports, Muscle, Cruiser, Sedan) & arcade driving physics
 */

import * as THREE from 'three';
import { clamp } from './utils.js';

export class VehicleManager {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.vehicles = [];
    this.playerVehicle = null;
  }

  createVehicle(type = 'sports', x = 0, z = 0, heading = 0) {
    const group = new THREE.Group();

    let bodyColor = 0xff3366;
    let maxSpeed = 38;
    let accel = 18;
    let handling = 2.4;
    let name = 'Cheetah GT';

    if (type === 'muscle') {
      bodyColor = 0x2244aa;
      maxSpeed = 34;
      accel = 15;
      handling = 2.0;
      name = 'Dominator V8';
    } else if (type === 'police') {
      bodyColor = 0x111111;
      maxSpeed = 36;
      accel = 20;
      handling = 2.5;
      name = 'Interceptor Cruiser';
    } else if (type === 'sedan') {
      bodyColor = 0xddaa33;
      maxSpeed = 28;
      accel = 12;
      handling = 1.8;
      name = 'Taxi Cab';
    }

    // Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.4, 0.8, 4.8);
    const chassisMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.6;
    chassis.castShadow = true;
    group.add(chassis);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(2.0, 0.7, 2.6);
    const cabinMat = new THREE.MeshLambertMaterial({
      color: type === 'police' ? 0xffffff : 0x111111,
      transparent: true,
      opacity: 0.9,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.25, -0.3);
    group.add(cabin);

    // Wheels (4)
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.4, 12);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      [-1.15, 0.42, 1.5],
      [1.15, 0.42, 1.5],
      [-1.15, 0.42, -1.5],
      [1.15, 0.42, -1.5],
    ];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });

    // Headlights & Taillights
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });

    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    hl1.position.set(-0.8, 0.65, 2.41);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    hl2.position.set(0.8, 0.65, 2.41);
    group.add(hl1, hl2);

    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    tl1.position.set(-0.8, 0.65, -2.41);
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    tl2.position.set(0.8, 0.65, -2.41);
    group.add(tl1, tl2);

    // Police Lightbar
    let sirenMesh = null;
    if (type === 'police') {
      const bar = new THREE.Group();
      const redLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xff1111 })
      );
      redLight.position.x = -0.4;
      const blueLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x1144ff })
      );
      blueLight.position.x = 0.4;
      bar.add(redLight, blueLight);
      bar.position.set(0, 1.68, -0.3);
      group.add(bar);
      sirenMesh = { bar, redLight, blueLight };
    }

    group.position.set(x, 0, z);
    group.rotation.y = heading;
    this.scene.add(group);

    const vehicle = {
      type,
      name,
      mesh: group,
      speed: 0,
      maxSpeed,
      accel,
      handling,
      heading,
      isPolice: type === 'police',
      sirenMesh,
      sirenActive: false,
      flasherTimer: 0,
    };

    this.vehicles.push(vehicle);
    return vehicle;
  }

  update(dt, input, isPlayerControlling) {
    this.vehicles.forEach((v) => {
      // Siren flashing logic
      if (v.sirenMesh && v.sirenActive) {
        v.flasherTimer += dt * 10;
        const flash = Math.sin(v.flasherTimer) > 0;
        v.sirenMesh.redLight.visible = flash;
        v.sirenMesh.blueLight.visible = !flash;
      }

      if (v === this.playerVehicle && isPlayerControlling) {
        // Arcade Driving Controls
        let throttle = 0;
        if (input.actions.forward) throttle += 1;
        if (input.actions.backward) throttle -= 0.6;

        let steer = 0;
        if (input.actions.left) steer += 1;
        if (input.actions.right) steer -= 1;

        // Accelerate / Brake
        if (throttle > 0) {
          v.speed = Math.min(v.maxSpeed, v.speed + v.accel * dt);
        } else if (throttle < 0) {
          v.speed = Math.max(-v.maxSpeed * 0.4, v.speed - v.accel * 1.5 * dt);
        } else {
          // Natural rolling friction
          v.speed = Math.sign(v.speed) * Math.max(0, Math.abs(v.speed) - 10 * dt);
        }

        // Handbrake
        if (input.actions.jump) {
          v.speed = Math.sign(v.speed) * Math.max(0, Math.abs(v.speed) - 25 * dt);
        }

        // Steer (effective when moving)
        if (Math.abs(v.speed) > 0.5) {
          const dir = Math.sign(v.speed);
          v.heading += steer * v.handling * dt * dir * Math.min(1.0, Math.abs(v.speed) / 10);
        }

        // Position update
        const forwardX = Math.sin(v.heading);
        const forwardZ = Math.cos(v.heading);
        const nextX = v.mesh.position.x + forwardX * v.speed * dt;
        const nextZ = v.mesh.position.z + forwardZ * v.speed * dt;

        // Collision check with city
        const col = this.city.checkCollision(nextX, nextZ, 1.8);
        if (col) {
          v.speed = -v.speed * 0.4; // Bounce back
        } else {
          v.mesh.position.x = nextX;
          v.mesh.position.z = nextZ;
        }

        v.mesh.rotation.y = v.heading;
      }
    });
  }

  getNearestVehicle(x, z, maxDist = 4.5) {
    let nearest = null;
    let minDist = maxDist;
    this.vehicles.forEach((v) => {
      const d = Math.hypot(v.mesh.position.x - x, v.mesh.position.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = v;
      }
    });
    return nearest;
  }
}
