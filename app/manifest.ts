import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cookmark",
    short_name: "Cookmark",
    description: "夫婦でInstagramのレシピを共有・管理するアプリ",
    start_url: "/",
    display: "standalone",
    lang: "ja",
    background_color: "#ffffff",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    // Android: Instagramの共有シートから直接追加できるようにする(iOSは非対応だが害はない)
    share_target: {
      action: "/",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  } as MetadataRoute.Manifest;
}
