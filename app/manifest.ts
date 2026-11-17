import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PagTipon",
    short_name: "PagTipon",
    description:
      "Event coordination, registration, and attendance management for Antique.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#122443",
    icons: [
      {
        src: "/PagTipon-Icon-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}