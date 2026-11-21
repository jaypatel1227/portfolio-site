export function prepareVapor(hero: HTMLElement): void {
  const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let index = 0;
  for (const node of nodes) {
    if (!node.textContent?.trim()) continue;
    const fragment = document.createDocumentFragment();
    for (const word of node.textContent.split(/(\s+)/)) {
      if (!word.trim()) { fragment.append(word); continue; }
      const span = document.createElement("span");
      span.className = "vapor-word";
      span.textContent = word;
      span.style.setProperty("--vapor-delay", `${Math.min(index++, 30) * 11}ms`);
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
}
