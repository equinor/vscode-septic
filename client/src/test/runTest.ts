/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from "path";

import { runTests } from "@vscode/test-electron";

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, "../../../");

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, "./index");

        const workspacePath = path.resolve(__dirname, "fixtures");

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [workspacePath, "--disable-extensions"],
        });
    } catch {
        console.error("Failed to run tests");
        process.exit(1);
    }
}

main();
