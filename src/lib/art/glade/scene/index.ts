/**
 * "The Painted Glade": ultramarine night, cypress strokes and golden
 * stars. A quiet oil-painted path leads to one enormous old tree.
 */
import * as THREE from "three";
import type { Collision, World } from "../world";
import { buildFireflies } from "./fireflies";
import { buildFlora } from "./flora";
import { buildTrees } from "./forest";
import { buildGreatTree } from "./great-tree";
import { buildGround } from "./ground";
import { buildLandmarks } from "./landmarks";
import { BOUND_RADIUS, HOME_POS, TREE_LOOK, TREE_POS, makeGroundHeight } from "./layout";
import { buildSkyAccents } from "./meteor";
import { buildMist } from "./mist";
import { buildNote, type NoteCopy } from "./note";
import { createGladePost } from "./post";
import { buildRidge } from "./ridge";
import { buildSky } from "./sky";

export function createGlade(seed: number, note: NoteCopy): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x14285d, 22, 132);

  scene.add(new THREE.HemisphereLight(0x668add, 0x4b4318, 0.85));
  const moonLight = new THREE.DirectionalLight(0xffdd80, 1.55);
  moonLight.position.set(-90, 120, 40);
  scene.add(moonLight);
  const rim = new THREE.DirectionalLight(0x547be0, 0.6);
  rim.position.set(60, 40, -90);
  scene.add(rim);
  // a soft moon bounce from behind the viewer, so the near grass and path
  // keep some shape instead of falling to pure black
  const fill = new THREE.DirectionalLight(0xe8ca66, 0.32);
  fill.position.set(14, 26, 42);
  scene.add(fill);

  const heightAt = makeGroundHeight(seed);
  const collisions: Collision[] = [{ x: TREE_POS.x, z: TREE_POS.z, r: 2.7 }];

  const sky = buildSky(scene, seed);
  buildRidge(scene, seed ^ 0x0d1d);
  buildGround(scene, seed, heightAt);
  buildTrees(scene, seed ^ 0x77aa, collisions, heightAt);
  const greatTree = buildGreatTree(scene, seed ^ 0x310e, heightAt(TREE_POS.x, TREE_POS.z));
  const mist = buildMist(scene, seed);
  const skyAccents = buildSkyAccents(scene, seed);
  const fireflies = buildFireflies(scene, seed ^ 0x51f1);
  const flora = buildFlora(scene, seed ^ 0x2c4d, heightAt, collisions);
  buildLandmarks(scene, seed ^ 0x5eed, heightAt, collisions);
  buildNote(scene, heightAt, note);

  return {
    scene,
    home: { x: HOME_POS.x, z: HOME_POS.z, lookAt: TREE_LOOK },
    boundRadius: BOUND_RADIUS,
    collisions,
    heightAt,
    createPost: (renderer, camera) => createGladePost(renderer, scene, camera),
    update({ time, dt, camera, player, motion }) {
      sky.update(camera, time);
      greatTree.update(time);
      skyAccents.update(dt, time, player, motion);
      fireflies.update(dt, time, player);
      mist.update(dt, time, player);
      flora.update(time);
    },
  };
}
