/**
 * Solara Bay - Narrative Missions & Cash Pickups
 * Implements 3 story missions with Eddie Ramos & Maya Cruz, 3D beacons, and city pickups
 */

import * as THREE from 'three';
import { dist2D } from './utils.js';

export class MissionManager {
  constructor(scene, audio, police) {
    this.scene = scene;
    this.audio = audio;
    this.police = police;

    this.currentMissionIndex = 0;
    this.stage = 0; // Stage in current mission

    this.missions = [
      {
        id: 1,
        title: 'MISSION 1: REPO RUN',
        task: 'Steal the yellow Cheetah sports car at Marina Plaza',
        targetPos: { x: -80, z: -120 },
        dropoffPos: { x: 0, z: 80 },
        reward: 500,
        dialogues: [
          { speaker: 'EDDIE RAMOS', text: '"Maya, The Vultures left a fresh Cheetah GT near the Marina. Snatch it and bring it to my garage."' },
          { speaker: 'MAYA CRUZ', text: '"On it, Eddie. It\'ll be in your garage before they know it\'s gone."' },
        ],
      },
      {
        id: 2,
        title: 'MISSION 2: HOT PACKAGE',
        task: 'Retrieve the contraband crate along Ocean Boulevard and lose the heat',
        targetPos: { x: 80, z: -160 },
        dropoffPos: { x: -80, z: 80 },
        reward: 1200,
        dialogues: [
          { speaker: 'EDDIE RAMOS', text: '"The shipment came in by the coast, but the cops are patrolling heavy. Keep your eyes sharp."' },
          { speaker: 'MAYA CRUZ', text: '"Package acquired. Sirens in the distance — shaking them now!"' },
        ],
      },
      {
        id: 3,
        title: 'MISSION 3: BAY HEIST',
        task: 'Hit the Vultures stash house in Downtown and escape to the safehouse',
        targetPos: { x: -40, z: 40 },
        dropoffPos: { x: 120, z: 120 },
        reward: 5000,
        dialogues: [
          { speaker: 'EDDIE RAMOS', text: '"This is the big score, Maya. Hit their vault and get out fast."' },
          { speaker: 'MAYA CRUZ', text: '"Vault blown! Heading for the bridge safehouse with the cash."' },
        ],
      },
    ];

    this.beaconMesh = null;
    this.pickups = [];

    this.createObjectiveBeacon();
    this.createCashPickups();
  }

  createObjectiveBeacon() {
    this.beaconMesh = new THREE.Group();

    // Glowing vertical cylinder
    const cylGeo = new THREE.CylinderGeometry(2.0, 2.0, 8, 16, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const cyl = new THREE.Mesh(cylGeo, cylMat);
    cyl.position.y = 4;
    this.beaconMesh.add(cyl);

    // Floor target ring
    const ringGeo = new THREE.RingGeometry(2.2, 2.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    this.beaconMesh.add(ring);

    this.scene.add(this.beaconMesh);
    this.updateBeaconPosition();
  }

  createCashPickups() {
    const pickupLocations = [
      { x: -50, z: -50 },
      { x: 50, z: 50 },
      { x: -120, z: 0 },
      { x: 120, z: -80 },
      { x: 0, z: -170 },
      { x: 0, z: 170 },
    ];

    const coinGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 12);
    const coinMat = new THREE.MeshLambertMaterial({ color: 0x55ff99 });
    coinGeo.rotateZ(Math.PI / 2);

    pickupLocations.forEach((loc) => {
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.position.set(loc.x, 0.8, loc.z);
      this.scene.add(mesh);
      this.pickups.push({ mesh, value: 150, collected: false });
    });
  }

  updateBeaconPosition() {
    const m = this.missions[this.currentMissionIndex];
    if (!m) {
      this.beaconMesh.visible = false;
      return;
    }
    this.beaconMesh.visible = true;
    const pos = this.stage === 0 ? m.targetPos : m.dropoffPos;
    this.beaconMesh.position.set(pos.x, 0, pos.z);
  }

  update(dt, playerPos) {
    // Pulse and rotate beacon
    if (this.beaconMesh && this.beaconMesh.visible) {
      this.beaconMesh.rotation.y += dt * 1.5;
    }

    // Spin cash pickups
    this.pickups.forEach((p) => {
      if (!p.collected) {
        p.mesh.rotation.y += dt * 2.0;
        const d = dist2D(p.mesh.position.x, p.mesh.position.z, playerPos.x, playerPos.z);
        if (d < 2.5) {
          p.collected = true;
          p.mesh.visible = false;
          this.audio.playCoin();
          window.dispatchEvent(new CustomEvent('pickup-collected', { detail: { value: p.value } }));
        }
      }
    });

    // Check mission objective collision
    const m = this.missions[this.currentMissionIndex];
    if (!m) return;

    const target = this.stage === 0 ? m.targetPos : m.dropoffPos;
    const d = dist2D(target.x, target.z, playerPos.x, playerPos.z);

    if (d < 4.0) {
      if (this.stage === 0) {
        // Stage 1 complete -> Switch to dropoff
        this.stage = 1;
        this.updateBeaconPosition();
        if (m.id === 2) this.police.raiseWanted(2); // Alert police on package pickup
        if (m.id === 3) this.police.raiseWanted(3); // 3-star alert on heist vault
        this.audio.playCoin();
        window.dispatchEvent(new CustomEvent('mission-stage-complete', { detail: { mission: m, stage: 1 } }));
      } else {
        // Mission Completed
        this.audio.playMissionComplete();
        window.dispatchEvent(new CustomEvent('mission-complete', { detail: { mission: m } }));
        this.currentMissionIndex = (this.currentMissionIndex + 1) % this.missions.length;
        this.stage = 0;
        this.updateBeaconPosition();
      }
    }
  }

  getCurrentMission() {
    return this.missions[this.currentMissionIndex];
  }
}
