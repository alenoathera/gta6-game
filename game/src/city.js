/**
 * Solara Bay - Procedural City Generator
 * Creates the coastal road network, water, sandy beach, palm trees, buildings and props
 */

import * as THREE from 'three';
import { PRNG } from './utils.js';

export class CityManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.colliders = [];
    this.roads = [];
    this.roadGrid = [];
    this.beachZ = -220; // Coastal ocean boundary
    this.cityBounds = { minX: -240, maxX: 240, minZ: -200, maxZ: 240 };
    this.buildCity();
  }

  buildCity() {
    const prng = new PRNG(42891);

    // 1. Ocean & Sandy Beach
    this.createCoastline();

    // 2. Ground Terrain & Asphalt Base
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x1f242e });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 3. Road Network Grid
    // East-West streets (Z coordinates) & North-South avenues (X coordinates)
    const xRoads = [-160, -80, 0, 80, 160];
    const zRoads = [-160, -80, 0, 80, 160];
    const roadWidth = 16;

    // Build road segments and intersections
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2e38 });
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xf5d442 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    // North-South Avenues
    xRoads.forEach((rx) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 420), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0, 0);
      road.receiveShadow = true;
      this.scene.add(road);
      this.roads.push({ type: 'NS', x: rx, minZ: -210, maxZ: 210, width: roadWidth });

      // Yellow double centerline
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 420), markingMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(rx, 0.01, 0);
      this.scene.add(line);
    });

    // East-West Streets
    zRoads.forEach((rz) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(420, roadWidth), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.005, rz);
      road.receiveShadow = true;
      this.scene.add(road);
      this.roads.push({ type: 'EW', z: rz, minX: -210, maxX: 210, width: roadWidth });

      // Yellow centerline
      const line = new THREE.Mesh(new THREE.PlaneGeometry(420, 0.5), markingMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.015, rz);
      this.scene.add(line);
    });

    // 4. City Blocks with Procedural Buildings
    const blockColors = [
      0x4a6fa5, 0xdb5a6b, 0x3d5a80, 0xe07a5f, 0x81b29a, 0xf2cc8f,
      0x2a9d8f, 0xe76f51, 0x264653, 0xf4a261, 0x5e548e, 0x9f86c0
    ];

    const blockX = [-200, -120, -40, 40, 120, 200];
    const blockZ = [-200, -120, -40, 40, 120, 200];

    for (let i = 0; i < blockX.length - 1; i++) {
      for (let j = 0; j < blockZ.length - 1; j++) {
        const cx = (blockX[i] + blockX[i + 1]) / 2;
        const cz = (blockZ[j] + blockZ[j + 1]) / 2;
        const bWidth = 48;
        const bDepth = 48;

        // Sidewalk slab
        const sw = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth + 8, 0.3, bDepth + 8),
          new THREE.MeshLambertMaterial({ color: 0x8892a0 })
        );
        sw.position.set(cx, 0.15, cz);
        this.scene.add(sw);

        // Subdivide block into 2-4 distinct buildings
        const splits = prng.choice([1, 2, 4]);
        if (splits === 1) {
          const h = prng.range(25, 75);
          this.createBuilding(cx, cz, bWidth - 4, bDepth - 4, h, prng.choice(blockColors), prng);
        } else if (splits === 2) {
          const w = (bWidth - 6) / 2;
          const h1 = prng.range(20, 65);
          const h2 = prng.range(20, 65);
          this.createBuilding(cx - w / 2 - 1, cz, w, bDepth - 4, h1, prng.choice(blockColors), prng);
          this.createBuilding(cx + w / 2 + 1, cz, w, bDepth - 4, h2, prng.choice(blockColors), prng);
        } else {
          const w = (bWidth - 6) / 2;
          const d = (bDepth - 6) / 2;
          const offsets = [
            [-w / 2 - 1, -d / 2 - 1],
            [w / 2 + 1, -d / 2 - 1],
            [-w / 2 - 1, d / 2 + 1],
            [w / 2 + 1, d / 2 + 1],
          ];
          offsets.forEach(([ox, oz]) => {
            const h = prng.range(16, 50);
            this.createBuilding(cx + ox, cz + oz, w, d, h, prng.choice(blockColors), prng);
          });
        }

        // Add palm trees along sidewalk perimeter
        this.createPalmTree(cx - 26, cz - 26);
        this.createPalmTree(cx + 26, cz - 26);
      }
    }

    // 5. Street Lamps & Neon Accents
    this.createStreetProps();
  }

  createCoastline() {
    // Ocean Water
    const waterGeo = new THREE.PlaneGeometry(600, 200);
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x0088cc,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.2, this.beachZ - 100);
    this.scene.add(water);

    // Sand Beach Strip
    const sandGeo = new THREE.PlaneGeometry(600, 50);
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xf5dfa3 });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, -0.02, this.beachZ + 25);
    this.scene.add(sand);

    // Palm tree boulevard on the coast
    for (let x = -250; x <= 250; x += 25) {
      this.createPalmTree(x, this.beachZ + 45);
    }
  }

  createBuilding(x, z, width, depth, height, colorHex, prng) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshLambertMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Window grid texture simulation (roof borders / neon crown)
    if (height > 35) {
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.7, 4, depth * 0.7),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      crown.position.set(x, height + 2, z);
      this.scene.add(crown);
    }

    // Save collider for physics bounding box
    this.colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height: height,
    });
    this.buildings.push(mesh);
  }

  createPalmTree(x, z) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6e4b31 });
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 7, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    this.scene.add(trunk);

    const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
    for (let i = 0; i < 5; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(2, 0.4, 5), frondMat);
      frond.position.set(x, 7, z);
      frond.rotation.y = (i * Math.PI) / 2.5;
      frond.rotation.z = 0.5;
      this.scene.add(frond);
    }
  }

  createStreetProps() {
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

    const spots = [-150, -70, 10, 90, 170];
    spots.forEach((x) => {
      spots.forEach((z) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6), lampMat);
        post.position.set(x + 9, 3, z + 9);
        this.scene.add(post);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), glowMat);
        bulb.position.set(x + 9, 6.2, z + 9);
        this.scene.add(bulb);
      });
    });
  }

  checkCollision(x, z, radius = 1.0) {
    for (const b of this.colliders) {
      if (
        x + radius >= b.minX &&
        x - radius <= b.maxX &&
        z + radius >= b.minZ &&
        z - radius <= b.maxZ
      ) {
        return b;
      }
    }
    // Ocean boundary
    if (z - radius < this.beachZ) {
      return { isWater: true };
    }
    return null;
  }
}
