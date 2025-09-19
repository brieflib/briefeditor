import { defineConfig } from "vite";
import path from "path";

const __dirname = path.resolve();

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/app")
        },
    },
    build: {
        rollupOptions: {
            output: {
                entryFileNames: 'brief-editor.js',
            },
        },
    }
});