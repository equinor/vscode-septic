// .vscode-test.mjs
import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    // Required: Glob of files to load (can be an array and include absolute paths).
    files: 'client/out/test/**/*.test.js',
    // Optional: Version to use, same as the API above, defaults to stable
    version: 'insiders',
    // Optional: sample workspace to open
    workspaceFolder: `./test-workspace`,
    // Optional: install additional extensions to the installation prior to testing. By
    //default, any `extensionDependencies` from the package.json are automatically installed.
    // Optional: additional mocha options to use:
    mocha: {
      timeout: 100000
    },
    launchArgs: ['--disable-extensions'],
  },
  // you can specify additional test configurations if necessary
]);