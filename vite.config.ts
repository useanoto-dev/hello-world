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
      workbox: {
        // Cache static assets for faster loading
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,avif,jpg,jpeg,webp}'],
        // Estratégias de cache por tipo de recurso
        runtimeCaching: [
          {
            // Cache de APIs do Supabase - Network First com fallback
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache de imagens - Cache First
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
            },
          },
          {
            // Cache de fontes - Cache First
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 ano
              },
            },
          },
          {
            // Cache de páginas - Stale While Revalidate
            urlPattern: /^https:\/\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
            },
          },
        ],
        // Fallback para navegação offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        // Skip waiting para atualizações imediatas
        skipWaiting: true,
        clientsClaim: true,
      },
      // IMPORTANT: disable SW in dev to avoid stale cached chunks causing React hook runtime errors
      devOptions: {
        enabled: false,
        type: 'module',
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure a single React instance (prevents "useContext of null" / "useEffect of null")
    dedupe: ["react", "react-dom"],
  },
}));