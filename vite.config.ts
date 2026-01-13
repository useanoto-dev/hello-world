import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Anotô - Cardápio Digital Inteligente",
        short_name: "Anotô",
        description: "Cardápio digital inteligente para seu estabelecimento",
        theme_color: "#dc2626",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        categories: ["food", "shopping"],
        shortcuts: [
          {
            name: "Ver Cardápio",
            short_name: "Cardápio",
            description: "Abrir o cardápio da pizzaria",
            url: "/menu",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Meu Carrinho",
            short_name: "Carrinho",
            description: "Ver itens no carrinho",
            url: "/cart",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      },
      // PWA sem offline - apenas network, requer conexão com internet
      workbox: {
        // Não cachear nenhum arquivo para funcionamento offline
        globPatterns: [],
        // Todas as requisições vão direto para a rede
        runtimeCaching: [
          {
            urlPattern: /.*/,
            handler: "NetworkOnly",
          }
        ],
        // Desabilitar precaching
        navigateFallback: null,
      },
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));