import { restFraming } from "../camera/framing";

export function measureRestFrame(hero: HTMLElement | null, width: number, height: number) {
  let right = 0;
  if (hero) {
    const nodes = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (nodes.nextNode()) {
      if (!nodes.currentNode.textContent?.trim()) continue;
      range.selectNodeContents(nodes.currentNode);
      for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
    }
  }
  return restFraming(width, height,
    { right, bottom: hero?.getBoundingClientRect().bottom ?? height * 0.38 },
    document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 64,
    document.querySelector(".site-footer")?.getBoundingClientRect().top ?? height * 0.84);
}
