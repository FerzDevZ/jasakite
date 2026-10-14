import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  // Komponen (mis. kartu OG) memakai JSX dengan runtime otomatis React 19 —
  // sama seperti Next. Tanpa ini esbuild memakai runtime klasik dan test yang
  // merender komponen gagal dengan "React is not defined".
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
