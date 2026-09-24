import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ekran Yönlendirme",
    short_name: "Ekran Yönlendirme",
    description: "Ekran yönlendirme ve duyuru yayın yönetim sistemi",
    start_url: "/admin",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
