/**
 * Solara Bay - Deterministic Screenshot Setup (?shot=)
 * Configures exact deterministic scene states for the 4 required entry screenshots
 */

import * as THREE from 'three';

export function setupDeterministicShot(shotName, game) {
  const { player, vehicles, city, camera, police, missions, hud } = game;

  if (shotName === 'cover') {
    // 1-cover: Driving through coastal palm boulevard in yellow Cheetah sports car
    const car = vehicles.createVehicle('sports', 0, -140, Math.PI / 2);
    player.enterVehicle(car);
    car.speed = 32;

    camera.position.set(-10, 4.0, -148);
    camera.lookAt(8, 2.0, -138);

    player.cash = 3850;
    hud.updateStats(100, 3850, 48, 0, true, 'Cheetah GT');
    hud.setMissionInfo('MISSION 1: REPO RUN', 'Deliver the Cheetah GT to Eddie Ramos');
  } else if (shotName === 'onfoot') {
    // 2-onfoot: Maya on foot beside a parked Dominator muscle car, downtown towers & peds
    player.position.set(-80, 0, 0);
    player.mesh.position.copy(player.position);
    player.heading = Math.PI / 4;
    player.mesh.rotation.y = player.heading;

    const parked = vehicles.createVehicle('muscle', -76, 3, 0);

    camera.position.set(-85, 3.2, -8);
    camera.lookAt(-79, 1.6, 2);

    player.cash = 4200;
    hud.updateStats(100, 4200, 0, 0, false, 'Walking');
    hud.setMissionInfo('FREE ROAM', 'Explore Solara Bay or speak to Eddie Ramos');
  } else if (shotName === 'chase') {
    // 3-chase: High speed police chase! 3 stars wanted, police cruiser right behind
    const car = vehicles.createVehicle('sports', -80, 40, Math.PI);
    player.enterVehicle(car);
    car.speed = 36;

    // Spawn aggressive police unit right behind
    police.setWanted(3);
    const copCar = vehicles.createVehicle('police', -80, 22, Math.PI);
    copCar.sirenActive = true;
    copCar.speed = 34;

    camera.position.set(-80, 5.0, 14);
    camera.lookAt(-80, 2.0, 48);

    player.cash = 7500;
    hud.updateStats(85, 7500, 62, 3, true, 'Cheetah GT');
    hud.setMissionInfo('MISSION 2: HOT PACKAGE', 'Lose the 3-star police pursuit!');
  } else if (shotName === 'mission') {
    // 4-mission: Mission 3 "Bay Heist" with 3D beacon and dialogue banner
    player.position.set(-36, 0, 32);
    player.mesh.position.copy(player.position);
    player.heading = -Math.PI / 3;
    player.mesh.rotation.y = player.heading;

    camera.position.set(-42, 3.5, 24);
    camera.lookAt(-36, 2.0, 38);

    hud.updateStats(90, 9800, 0, 1, false, 'Walking');
    hud.setMissionInfo('MISSION 3: BAY HEIST', 'Rob the Vultures stash house in Downtown');
    hud.showDialogue('EDDIE RAMOS', 'This is the big score, Maya. Hit their vault and get out fast.');
  }
}
