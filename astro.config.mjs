// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://jaypa.tel",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "three",
                test: /node_modules[\\/]three[\\/]/,
              },
            ],
          },
        },
      },
    },
  },
});
