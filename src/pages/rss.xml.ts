import rss, { pagesGlobToRssItems } from "@astrojs/rss";
import type { APIContext } from "astro";
import { site } from "../data/site";

export async function GET(context: APIContext) {
  if (!context.site) {
    throw new Error("Set `site` in astro.config.mjs so RSS links resolve.");
  }

  return rss({
    title: `${site.name} · blog`,
    description: site.description,
    site: context.site,
    items: await pagesGlobToRssItems(import.meta.glob("./posts/*.{md,mdx}")),
    customData: `<language>en-us</language><copyright>${site.copyright}</copyright>`,
  });
}
