/** Copy contract for the parchment at the cathedral entrance. */
import * as THREE from "three";
import { mulberry32, TAU } from "../math";
import { CATHEDRAL } from "./layout";

export interface NoteCopy {
  title: string;
  lines: readonly string[];
  contacts: readonly string[];
  signature: string;
}

function paintNote(canvas: HTMLCanvasElement, copy: NoteCopy): void {
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(918273);
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(18, 14);
  for (let x = 18; x <= w - 18; x += 14) ctx.lineTo(x, 12 + rng() * 8);
  for (let y = 20; y <= h - 18; y += 14) ctx.lineTo(w - 16 - rng() * 8, y);
  for (let x = w - 18; x >= 18; x -= 14) ctx.lineTo(x, h - 14 - rng() * 8);
  for (let y = h - 18; y >= 18; y -= 14) ctx.lineTo(14 + rng() * 8, y);
  ctx.closePath(); ctx.clip();
  ctx.fillStyle = "#c8ab72"; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = i % 2 ? "rgba(61,39,14,0.08)" : "rgba(247,224,168,0.12)";
    ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 12, 0.5 + rng() * 2);
  }
  const burn = ctx.createRadialGradient(w / 2, h / 2, 140, w / 2, h / 2, h * 0.62);
  burn.addColorStop(0, "rgba(54,24,8,0)"); burn.addColorStop(0.76, "rgba(70,32,10,0.18)"); burn.addColorStop(1, "rgba(25,12,6,0.98)");
  ctx.fillStyle = burn; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(76,45,19,0.15)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.32, 0); ctx.lineTo(w * 0.66, h); ctx.stroke();
  ctx.fillStyle = "#241a12"; ctx.textBaseline = "top";
  ctx.font = "34px Jay, cursive"; ctx.fillText(copy.title, 46, 48);
  ctx.strokeStyle = "#382718"; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(46, 96); ctx.quadraticCurveTo(140, 104, 230, 94); ctx.stroke();
  ctx.font = "27px Jay, cursive";
  let y = 126;
  for (const line of copy.lines) { ctx.fillText(line, 46, y); y += 41; }
  ctx.font = "22px Jay, cursive";
  copy.contacts.forEach((contact, i) => ctx.fillText(contact, 46, y + 18 + i * 34));
  ctx.font = "30px Jay, cursive"; ctx.fillText(copy.signature, w - 110, h - 90);
  ctx.restore();
}

export function buildNote(scene: THREE.Scene, copy: NoteCopy): void {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 640;
  paintNote(canvas, copy);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  void document.fonts.ready.then(() => { paintNote(canvas, copy); texture.needsUpdate = true; });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.32), new THREE.MeshBasicMaterial({ map: texture, color: 0xc4af8c, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
  paper.position.set(CATHEDRAL.x - 3.1, 1.72, CATHEDRAL.z + 7.11);
  paper.rotation.z = -0.025; scene.add(paper);
  const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.028, 8), new THREE.MeshStandardMaterial({ color: 0x372b23, metalness: 0.7, roughness: 0.7 }));
  nail.rotation.x = TAU / 4; nail.position.copy(paper.position).add(new THREE.Vector3(0.015, 0.59, 0.025)); scene.add(nail);
}
