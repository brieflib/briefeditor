import { defineConfig } from "vite";
import path from "path";
import dts from 'vite-plugin-dts';

const __dirname = path.resolve();

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            rollupTypes: true,
            tsconfigPath: './tsconfig.json'
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/app")
        },
    },
    build: {
        lib: {
            entry: 'src/app/brief-editor.ts',
            name: 'BriefEditor'
        },
        rollupOptions: {
            output: {
                entryFileNames: "index.js",
                assetFileNames: "index.[ext]",
            },
        },
        cssCodeSplit: true,
        emptyOutDir: true,
        minify: true,
        sourcemap: true
    },
});