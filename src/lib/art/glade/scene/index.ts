/** The Ashen Ruins: a broken causeway beneath a cathedral, castle and blood moon. */
import * as THREE from "three";
import type { Collision, World } from "../world";
import { buildAtmosphere } from "./atmosphere";
import { buildCastle } from "./castle";
import { buildCathedral } from "./cathedral";
import { BOUND_RADIUS, HOME, LOOK_AT, makeHeightAt } from "./layout";
import { buildNote, type NoteCopy } from "./note";
import { createRuinsPost } from "./post";
import { buildProps } from "./props";
import { buildSky } from "./sky";
import { buildTerrain } from "./terrain";

export function createGlade(seed: number, note: NoteCopy): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x343644, 28, 160);
  scene.add(new THREE.HemisphereLight(0x8992b0, 0x0c090d, 0.85));
  const moonlight = new THREE.DirectionalLight(0xa7adc7, 1.1);
  moonlight.position.set(-30, 70, 25);
  scene.add(moonlight);
  const stoneFill = new THREE.DirectionalLight(0x8e9ab9, 1.15);
  stoneFill.position.set(-25, 16, 40);
  scene.add(stoneFill);
  const emberLight = new THREE.DirectionalLight(0xb85635, 0.22);
  emberLight.position.set(40, 20, -90);
  scene.add(emberLight);
  const heightAt = makeHeightAt(seed);
  const collisions: Collision[] = [];
  const sky = buildSky(scene);
  buildTerrain(scene, seed, heightAt);
  buildCathedral(scene, seed, collisions);
  buildCastle(scene, seed ^ 0xca57);
  const props = buildProps(scene, seed, heightAt, collisions);
  const atmosphere = buildAtmosphere(scene, seed, props.fires, heightAt);
  buildNote(scene, note);
  return {
    scene,
    home: { x: HOME.x, z: HOME.z, lookAt: LOOK_AT },
    boundRadius: BOUND_RADIUS,
    collisions,
    heightAt,
    createPost: (renderer, camera) => createRuinsPost(renderer, scene, camera),
    update({ camera, time }) { sky.update(camera, time); props.update(time); atmosphere.update(camera, time); },
  };
}
