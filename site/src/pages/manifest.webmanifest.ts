import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  const raw = import.meta.env.BASE_URL;
  const base = raw.endsWith("/") ? raw : `${raw}/`;
  const body = {
    name: "Tesserone",
    short_name: "Tesserone",
    description:
      "A simple, local-first loyalty card manager. No cloud, no accounts, no tracking.",
    start_url: base,
    scope: base,
    display: "standalone",
    background_color: "#0c0a09",
    theme_color: "#6C2DD7",
    categories: ["productivity", "lifestyle", "utilities"],
    lang: "en",
    dir: "ltr",
    orientation: "portrait",
    icons: [
      {
        src: `${base}icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${base}icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/manifest+json" },
  });
};
