// Build script to bundle the CLI API for use with rustyscript/Deno
// This creates a self-contained bundle with all YAML data embedded

import * as esbuild from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import * as YAML from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and embed public data files at build time
function loadYamlData() {
    const publicPath = path.join(__dirname, 'public');
    
    // Load objects.yaml (common to all versions)
    const objectsPath = path.join(publicPath, 'objects.yaml');
    const objects = YAML.load(fs.readFileSync(objectsPath, 'utf-8'));
    
    // Get available versions
    const versions = fs.readdirSync(publicPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name.match(/^v?\d+(_\d+)*$|^latest$/))
        .map(entry => entry.name);
    
    // Load version-specific data
    const versionData = {};
    for (const version of versions) {
        const versionPath = path.join(publicPath, version);
        versionData[version] = {
            calcs: loadYamlIfExists(path.join(versionPath, 'calcs.yaml')),
            objectsDoc: loadYamlIfExists(path.join(versionPath, 'objectsDoc.yaml')),
            snippets: loadYamlIfExists(path.join(versionPath, 'snippets.yaml')),
            meta: loadYamlIfExists(path.join(versionPath, 'meta.yaml')),
        };
    }
    
    return { objects, versions, versionData };
}

function loadYamlIfExists(filePath) {
    if (fs.existsSync(filePath)) {
        return YAML.load(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
}

// Load the YAML data at build time
const embeddedData = loadYamlData();

// Plugin to inject embedded data into embeddedData.ts
const injectEmbeddedDataPlugin = {
    name: 'inject-embedded-data',
    setup(build) {
        build.onLoad({ filter: /embeddedData\.ts$/ }, async (args) => {
            let contents = fs.readFileSync(args.path, 'utf-8');
            
            // Replace the declare statement with actual data
            contents = contents.replace(
                /declare const __SEPTIC_EMBEDDED_DATA__: EmbeddedData \| undefined;/,
                `const __SEPTIC_EMBEDDED_DATA__: EmbeddedData = ${JSON.stringify(embeddedData)};`
            );
            
            return {
                contents,
                loader: 'ts',
            };
        });
    },
};

// Plugin to stub out Node.js built-ins
const stubNodeBuiltins = {
    name: 'stub-node-builtins',
    setup(build) {
        // Stub fs module
        build.onResolve({ filter: /^fs$/ }, args => ({
            path: args.path,
            namespace: 'stub-fs',
        }));
        
        build.onLoad({ filter: /.*/, namespace: 'stub-fs' }, () => ({
            contents: `
                export function existsSync() { return false; }
                export function readFileSync() { throw new Error("fs not available in bundled mode"); }
                export function readdirSync() { return []; }
                export function mkdirSync() { }
                export function writeFileSync() { throw new Error("fs not available in bundled mode"); }
                export default { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync };
            `,
            loader: 'js',
        }));
        
        // Stub path module  
        build.onResolve({ filter: /^path$/ }, args => ({
            path: args.path,
            namespace: 'stub-path',
        }));
        
        build.onLoad({ filter: /.*/, namespace: 'stub-path' }, () => ({
            contents: `
                export function join(...args) { return args.join('/'); }
                export function dirname(p) { return p.split('/').slice(0, -1).join('/'); }
                export function resolve(...args) { return args.join('/'); }
                export function basename(p) { return p.split('/').pop(); }
                export default { join, dirname, resolve, basename };
            `,
            loader: 'js',
        }));
        
        // Stub js-yaml since we embed the parsed data
        build.onResolve({ filter: /^js-yaml$/ }, args => ({
            path: args.path,
            namespace: 'stub-yaml',
        }));
        
        build.onLoad({ filter: /.*/, namespace: 'stub-yaml' }, () => ({
            contents: `
                export function load(str) { 
                    console.warn('js-yaml load called in bundled mode');
                    return []; 
                }
                export function dump(obj) { return JSON.stringify(obj, null, 2); }
                export default { load, dump };
            `,
            loader: 'js',
        }));
    },
};

async function build() {
    try {
        await esbuild.build({
            entryPoints: [path.join(__dirname, 'src/cli/standalone.ts')],
            bundle: true,
            outfile: path.join(__dirname, 'dist/cli-bundle.js'),
            format: 'esm',
            platform: 'neutral',
            target: 'es2022',
            sourcemap: false,
            minify: false,
            plugins: [injectEmbeddedDataPlugin, stubNodeBuiltins],
            define: {
                'process.env.NODE_ENV': '"production"',
            },
            banner: {
                js: '// Bundled for rustyscript/Deno - Node.js built-ins are stubbed\n',
            },
        });
        console.log('✅ CLI bundle built successfully: dist/cli-bundle.js');
        console.log(`   Embedded ${embeddedData.versions.length} versions: ${embeddedData.versions.join(', ')}`);
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
