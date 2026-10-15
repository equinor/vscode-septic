import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { defineConfig } from "@vscode/test-cli";

const manifest = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
const minimumVersion = manifest.engines.vscode.replace(/^\^/, "");
const common = {
    files: "client/out/test/**/*.test.js",
    workspaceFolder: "./test-workspace",
    mocha: {
        timeout: 100000,
    },
    launchArgs: ["--disable-extensions"],
};

export default defineConfig([
    {
        ...common,
        label: "minimum",
        version: minimumVersion,
    },
    {
        ...common,
        label: "stable",
        version: "stable",
    },
]);
