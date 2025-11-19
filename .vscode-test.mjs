// .vscode-test.mjs
import { defineConfig } from '@vscode/test-cli';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
  {
    // Required: Glob of files to load (can be an array and include absolute paths).
    files: 'client/out/test/**/*.test.js',
    // Optional: Version to use, same as the API above, defaults to stable
    version: 'insiders',
    // Optional: Root path of your extension, same as the API above, defaults
    // to the directory this config file is in
    extensionDevelopmentPath: __dirname,
    // Optional: sample workspace to open
    workspaceFolder: `${__dirname}/client/src/test/fixtures`,
    // Optional: install additional extensions to the installation prior to testing. By
    //default, any `extensionDependencies` from the package.json are automatically installed.
    // Optional: additional mocha options to use:
    mocha: {
      timeout: 100000
    }
  },
  // you can specify additional test configurations if necessary
]);