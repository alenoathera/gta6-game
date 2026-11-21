/**
 * Solara Bay - Player Controller (Maya Cruz)
 * Manages on-foot movement, animations, third-person camera, combat, health & vehicle enter/exit
 */

import * as THREE from 'three';
import { clamp, lerp } from './utils.js';

export class PlayerController {
  constructor(scene, camera, city, vehicles, audio) {
    this.scene = scene;
    this.camera = camera;
    this.city = city;
    this.vehicles = vehicles;
    this.audio = audio;

    this.position = new THREE.Vector3(0, 0, 0);
    this.heading = 0;
    this.health = 100;
    this.cash = 1500;
    this.inVehicle = false;
    this.currentVehicle = null;

    this.speed = 0;
    this.walkSpeed = 5.5;
    this.runSpeed = 9.0;
    this.isGrounded = true;
    this.verticalVelocity = 0;

    this.weapon = 'FISTS'; // 'FISTS' or 'PISTOL'
    this.ammo = Infinity;
    this.attackCooldown = 0;

    // Camera orbit parameters
    this.camDistance = 6.5;
    this.camHeight = 2.8;
    this.camPitch = 0.25;
    this.camYaw = 0;

    this.createMayaMesh();
  }

  createMayaMesh() {
    this.mesh = new THREE.Group();

    // Torso (Stylish pink/teal jacket)
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0xff0066 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), torsoMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    this.mesh.add(torso);

    // Head
    const headMat = new THREE.MeshLambertMaterial({ color: 0xd9a07a });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMat);
    head.position.y = 2.05;
    this.mesh.add(head);

    // Dark hair
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.5), hairMat);
    hair.position.set(0, 2.22, -0.05);
    this.mesh.add(hair);

    // Legs (Jeans)
    const legMat = new THREE.MeshLambertMaterial({ color: 0x243355 });
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.32), legMat);
    this.leftLeg.position.set(-0.2, 0.45, 0);
    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.32), legMat);
    this.rightLeg.position.set(0.2, 0.45, 0);
    this.mesh.add(this.leftLeg, this.rightLeg);

    // Arms
    const armMat = new THREE.MeshLambertMaterial({ color: 0xd9a07a });
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.25), armMat);
    this.leftArm.position.set(-0.48, 1.35, 0);
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.25), armMat);
    this.rightArm.position.set(0.48, 1.35, 0);
    this.mesh.add(this.leftArm, this.rightArm);

    this.scene.add(this.mesh);
  }

  update(dt, input) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Handle Vehicle Enter / Exit
    if (input.consumeAction()) {
      if (this.inVehicle) {
        this.exitVehicle();
      } else {
        const nearCar = this.vehicles.getNearestVehicle(this.position.x, this.position.z, 4.0);
        if (nearCar) {
          this.enterVehicle(nearCar);
        }
      }
    }

    if (this.inVehicle) {
      // In Vehicle: Sync Maya position with vehicle
      this.position.copy(this.currentVehicle.mesh.position);
      this.heading = this.currentVehicle.heading;
      this.mesh.position.copy(this.position);
      this.mesh.visible = false; // Hidden inside car

      // Chase camera
      this.updateCarCamera(dt);
      this.audio.updateEngine(Math.abs(this.currentVehicle.speed) / this.currentVehicle.maxSpeed, true);
    } else {
      // On Foot
      this.mesh.visible = true;
      this.audio.updateEngine(0, false);
      this.updateOnFootMovement(dt, input);
      this.updateCombat(input);
      this.updateFootCamera(dt);
    }
  }

  updateOnFootMovement(dt, input) {
    let moveX = 0;
    let moveZ = 0;

    if (input.actions.forward) moveZ += 1;
    if (input.actions.backward) moveZ -= 1;
    if (input.actions.left) moveX += 1;
    if (input.actions.right) moveX -= 1;

    const moving = moveX !== 0 || moveZ !== 0;
    const targetSpeed = input.actions.sprint ? this.runSpeed : this.walkSpeed;

    if (moving) {
      const angle = Math.atan2(moveX, moveZ) + this.camYaw;
      this.heading = lerp(this.heading, angle, 0.2);

      this.speed = lerp(this.speed, targetSpeed, 0.15);
      const nextX = this.position.x + Math.sin(angle) * this.speed * dt;
      const nextZ = this.position.z + Math.cos(angle) * this.speed * dt;

      // Collision check with city
      if (!this.city.checkCollision(nextX, nextZ, 0.8)) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }

      // Leg and arm animation
      const walkCycle = Date.now() * 0.012 * (input.actions.sprint ? 1.6 : 1.0);
      this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.7;
      this.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.7;
      this.leftArm.rotation.x = -Math.sin(walkCycle) * 0.6;
      this.rightArm.rotation.x = Math.sin(walkCycle) * 0.6;
    } else {
      this.speed = lerp(this.speed, 0, 0.2);
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }

    // Jump / Gravity
    if (input.actions.jump && this.isGrounded) {
      this.verticalVelocity = 8.5;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.verticalVelocity -= 22 * dt;
      this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
  }

  updateCombat(input) {
    if (input.actions.attack && this.attackCooldown <= 0) {
      this.attackCooldown = 0.35;
      // Punch animation
      this.rightArm.rotation.x = -Math.PI / 2;
      setTimeout(() => {
        if (this.rightArm) this.rightArm.rotation.x = 0;
      }, 150);

      this.audio.playPunch();
      window.dispatchEvent(new CustomEvent('player-attack', {
        detail: { x: this.position.x, z: this.position.z, heading: this.heading, range: 2.2 }
      }));
    }
  }

  updateFootCamera(dt) {
    // Camera smoothly follows player
    const targetX = this.position.x - Math.sin(this.camYaw) * this.camDistance;
    const targetZ = this.position.z - Math.cos(this.camYaw) * this.camDistance;
    const targetY = this.position.y + this.camHeight;

    this.camera.position.set(targetX, targetY, targetZ);
    this.camera.lookAt(this.position.x, this.position.y + 1.5, this.position.z);
  }

  updateCarCamera(dt) {
    const v = this.currentVehicle;
    const carHeading = v.heading;
    const camDist = 9.0;
    const targetX = v.mesh.position.x - Math.sin(carHeading) * camDist;
    const targetZ = v.mesh.position.z - Math.cos(carHeading) * camDist;
    const targetY = v.mesh.position.y + 3.8;

    this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.15);
    this.camera.lookAt(v.mesh.position.x, v.mesh.position.y + 1.2, v.mesh.position.z);
  }

  enterVehicle(vehicle) {
    this.inVehicle = true;
    this.currentVehicle = vehicle;
    this.vehicles.playerVehicle = vehicle;
    window.dispatchEvent(new CustomEvent('player-enter-vehicle', { detail: { vehicle } }));
  }

  exitVehicle() {
    if (!this.currentVehicle) return;
    this.inVehicle = false;
    const exitX = this.currentVehicle.mesh.position.x - Math.cos(this.currentVehicle.heading) * 2.2;
    const exitZ = this.currentVehicle.mesh.position.z + Math.sin(this.currentVehicle.heading) * 2.2;
    this.position.set(exitX, 0, exitZ);
    this.mesh.position.copy(this.position);
    this.vehicles.playerVehicle = null;
    this.currentVehicle = null;
    window.dispatchEvent(new CustomEvent('player-exit-vehicle'));
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      window.dispatchEvent(new CustomEvent('player-wasted'));
    }
  }
}
