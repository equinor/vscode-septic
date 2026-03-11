// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        ignores: ["**/out", "**/dist", "**/*.d.ts", ".vscode-test/**/*"],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: __dirname,
            },
        },
    },
);
