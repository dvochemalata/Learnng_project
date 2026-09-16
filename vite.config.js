import { readdirSync } from "node:fs";
import { resolve, relative, extname } from "node:path";
import { defineConfig } from "vite";

function findHtmlFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = resolve(directory, entry.name);

        if (entry.isDirectory()) {
            return ["node_modules", "dist", ".git"].includes(entry.name)
                ? []
                : findHtmlFiles(path);
        }

        return extname(entry.name) === ".html" ? [path] : [];
    });
}

const htmlInputs = Object.fromEntries(
    findHtmlFiles(process.cwd()).map((path) => [
        relative(process.cwd(), path).replace(/\\/g, "/").replace(/\.html$/, ""),
        path
    ])
);

export default defineConfig({
    build: {
        rollupOptions: {
            input: htmlInputs
        }
    }
});
