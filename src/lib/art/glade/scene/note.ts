/** The note: about me, pinned to the great tree. */
import * as THREE from "three";
import { TAU, lcg } from "../math";
import { HOME_POS, TREE_POS } from "./layout";

export interface NoteCopy {
  title: string;
  /** broken by hand to fit the paper */
  lines: readonly string[];
  contacts: readonly string[];
  signature: string;
}

/** hand-written note on odds and ends of paper, pinned to the bark */
function makeNoteTexture(redraw: (canvas: HTMLCanvasElement) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  redraw(canvas);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  // the jay display font may not be decoded yet on first paint
  void document.fonts.ready.then(() => {
    redraw(canvas);
    t.needsUpdate = true;
  });
  return t;
}

function paintNote(canvas: HTMLCanvasElement, copy: NoteCopy): void {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // paper: warm rag with a darker burnt edge and a soft fold
  const rng = lcg(918273);
  const px = 14, py = 10, pw = W - 28, ph = H - 20;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 7);
  ctx.fillStyle = "#cfc3a4";
  ctx.fill();
  // rag fibers
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${120 + rng() * 80}, ${110 + rng() * 70}, ${85 + rng() * 50}, ${0.05 + rng() * 0.1})`;
    ctx.fillRect(px + rng() * pw, py + rng() * ph, 1 + rng() * 9, 0.6 + rng() * 1.6);
  }
  // edge burn
  const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
  edge.addColorStop(0, "rgba(64, 48, 28, 0)");
  edge.addColorStop(0.82, "rgba(64, 48, 28, 0.16)");
  edge.addColorStop(1, "rgba(46, 33, 18, 0.5)");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 7);
  ctx.clip();
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  // a faint diagonal fold crease
  ctx.strokeStyle = "rgba(74, 58, 36, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + pw * 0.28, py);
  ctx.lineTo(px + pw * 0.74, py + ph);
  ctx.stroke();
  ctx.restore();

  // text: basic ascii only (the jay display face covers nothing else)
  const ink = "#3a2c1c";
  ctx.fillStyle = ink;
  ctx.textBaseline = "top";
  const font = (size: number): string => `${size}px Jay, cursive`;
  ctx.font = font(34);
  ctx.fillText(copy.title, 44, 44);
  // underline flourish
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(46, 92);
  ctx.quadraticCurveTo(140, 100, 226, 90);
  ctx.stroke();

  ctx.font = font(27);
  let y = 122;
  for (const line of copy.lines) {
    ctx.fillText(line, 44, y);
    y += 41;
  }

  ctx.font = font(22);
  ctx.fillStyle = "rgba(58, 44, 28, 0.85)";
  copy.contacts.forEach((contact, i) => ctx.fillText(contact, 44, y + 14 + i * 32));

  ctx.font = font(30);
  ctx.fillStyle = ink;
  ctx.fillText(copy.signature, W - 96, H - 92);

  // a rusty pin at the top with a soft cast shadow
  const pinX = W / 2, pinY = 26;
  const pinShadow = ctx.createRadialGradient(pinX + 3, pinY + 3, 1, pinX + 3, pinY + 3, 12);
  pinShadow.addColorStop(0, "rgba(0,0,0,0.5)");
  pinShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pinShadow;
  ctx.fillRect(pinX - 14, pinY - 10, 34, 34);
  const pin = ctx.createRadialGradient(pinX - 2, pinY - 2, 0.5, pinX, pinY, 8);
  pin.addColorStop(0, "#d8d4c8");
  pin.addColorStop(0.55, "#8e8a7e");
  pin.addColorStop(1, "#4c4941");
  ctx.fillStyle = pin;
  ctx.beginPath();
  ctx.arc(pinX, pinY, 7.2, 0, TAU);
  ctx.fill();
}

export function buildNote(
  scene: THREE.Scene,
  groundHeightAt: (x: number, z: number) => number,
  copy: NoteCopy
): void {
  const toHome = new THREE.Vector3().subVectors(HOME_POS, TREE_POS).normalize();
  const treeGround = groundHeightAt(TREE_POS.x, TREE_POS.z);
  const texture = makeNoteTexture((canvas) => paintNote(canvas, copy));
  const note = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.98),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      fog: true,
      side: THREE.DoubleSide,
      color: 0xbcb198,
    })
  );
  // on the trunk at reading height, facing the glade's path
  const trunkR = 2.28;
  const pos = new THREE.Vector3()
    .copy(TREE_POS)
    .addScaledVector(toHome, trunkR);
  note.position.set(pos.x, treeGround + 1.62, pos.z);
  note.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toHome);
  // a slight sag and lean off the bark, pinned at the top
  note.rotateX(-0.075);
  note.rotateZ(0.028);
  scene.add(note);
}
