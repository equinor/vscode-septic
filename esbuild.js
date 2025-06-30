/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
	const client_ctx = await esbuild.context({
		entryPoints: ['client/src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'warning',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin
		]
	});
	const server_ctx = await esbuild.context({
		entryPoints: ['server/src/server.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/server.js',
		external: ['vscode'],
		logLevel: 'warning',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin
		]
	});
	if (watch) {
		await client_ctx.watch();
		await server_ctx.watch();
	} else {
		await client_ctx.rebuild();
		await client_ctx.dispose();
		await server_ctx.rebuild();
		await server_ctx.dispose();
	}
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd(result => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location == null) return;
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	}
};

main().catch(e => {
	console.error(e);
	process.exit(1);
});
