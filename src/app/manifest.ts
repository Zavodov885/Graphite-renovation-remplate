import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "Graphite Renovation";
  return {
    id: "/", name, short_name: "Graphite", description: "Ремонт квартир: расчёт, заявки, смета и фотоотчёты", lang: "ru",
    start_url: "/", scope: "/", display: "standalone", background_color: "#0B0C0C", theme_color: "#0B0C0C", categories: ["business", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Рассчитать стоимость", url: "/#calc" }, { name: "Мои заявки", url: "/cabinet" }],
  };
}
