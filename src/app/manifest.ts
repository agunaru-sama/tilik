import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tilik",
    short_name: "Tilik",
    description: "Validasi klaim dalam hitungan detik. Bukan opini, murni data.",
    start_url: "/",
    display: "standalone",
    background_color: "#02050b",
    theme_color: "#02050b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
