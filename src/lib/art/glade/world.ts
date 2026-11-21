/**
 * The contract between the engine (renderer, loop, walking) and whatever
 * place is being walked through. A new art style is a new World; nothing
 * on the engine side needs to change.
 */
import type * as THREE from "three";

/** a circle on the ground the walker cannot enter */
export interface Collision {
  x: number;
  z: number;
  r: number;
}

export interface Frame {
  /** seconds */
  time: number;
  dt: number;
  camera: THREE.PerspectiveCamera;
  /** the walker's feet */
  player: THREE.Vector3;
  /** 0 standing still .. 1 walking, eased */
  motion: number;
}

/** how a world gets from its scene to pixels */
export interface Post {
  render(): void;
  setSize(width: number, height: number): void;
}

export interface World {
  scene: THREE.Scene;
  /** where the walker starts and returns to, and what it faces from there */
  home: { x: number; z: number; lookAt: THREE.Vector3 };
  /** the walker stays within this distance of the origin */
  boundRadius: number;
  collisions: readonly Collision[];
  heightAt(x: number, z: number): number;
  /** sets the renderer's look and builds the post chain */
  createPost(renderer: THREE.WebGLRenderer, camera: THREE.Camera): Post;
  update(frame: Frame): void;
}
