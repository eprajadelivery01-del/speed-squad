// vite.config.ts
import { defineConfig } from "file:///C:/Users/antho/.gemini/antigravity-ide/scratch/eprajadelivery01-del/speed-squad/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/antho/.gemini/antigravity-ide/scratch/eprajadelivery01-del/speed-squad/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\antho\\.gemini\\antigravity-ide\\scratch\\eprajadelivery01-del\\speed-squad";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    },
    hmr: {
      overlay: false
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"]
  },
  optimizeDeps: {
    entries: ["src/application.tsx"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbnRob1xcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5LWlkZVxcXFxzY3JhdGNoXFxcXGVwcmFqYWRlbGl2ZXJ5MDEtZGVsXFxcXHNwZWVkLXNxdWFkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhbnRob1xcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5LWlkZVxcXFxzY3JhdGNoXFxcXGVwcmFqYWRlbGl2ZXJ5MDEtZGVsXFxcXHNwZWVkLXNxdWFkXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9hbnRoby8uZ2VtaW5pL2FudGlncmF2aXR5LWlkZS9zY3JhdGNoL2VwcmFqYWRlbGl2ZXJ5MDEtZGVsL3NwZWVkLXNxdWFkL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwibm8tc3RvcmUsIG5vLWNhY2hlLCBtdXN0LXJldmFsaWRhdGVcIixcclxuICAgICAgUHJhZ21hOiBcIm5vLWNhY2hlXCIsXHJcbiAgICAgIEV4cGlyZXM6IFwiMFwiLFxyXG4gICAgfSxcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiBmYWxzZSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLCBcIkB0YW5zdGFjay9xdWVyeS1jb3JlXCJdLFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBlbnRyaWVzOiBbXCJzcmMvYXBwbGljYXRpb24udHN4XCJdLFxyXG4gIH0sXHJcbn0pKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErYSxTQUFTLG9CQUFvQjtBQUM1YyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsaUJBQWlCO0FBQUEsTUFDakIsUUFBUTtBQUFBLE1BQ1IsU0FBUztBQUFBLElBQ1g7QUFBQSxJQUNBLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxJQUNYO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLElBQ0EsUUFBUSxDQUFDLFNBQVMsYUFBYSx5QkFBeUIsc0JBQXNCO0FBQUEsRUFDaEY7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxxQkFBcUI7QUFBQSxFQUNqQztBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
