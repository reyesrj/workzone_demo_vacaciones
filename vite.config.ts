import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/claro_peru_gh_workzone_demo_vacaciones/"
});