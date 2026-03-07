import htmlPlugin from '@chialab/esbuild-plugin-html';
import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { rimraf } from "rimraf";

await rimraf("./dist", { preserveRoot: true });

mkdirSync("./dist/assets", { recursive: true });

const htmlFiles = readdirSync("html", { encoding: "utf-8", withFileTypes: true })
	.filter((n) => n.isFile() && n.name.endsWith(".html"))
	.map((n) => pathJoin(n.parentPath, n.name));

// noinspection SpellCheckingInspection
await esbuild.build({
	bundle: true,
	entryPoints: htmlFiles,
	outdir: 'dist',
	assetNames: 'assets/[name]-[hash]',
	chunkNames: 'assets/[name]-[hash]',
	plugins: [
		htmlPlugin({
			preprocess: async (html): Promise<string> => {
				return html.replace(/content="..\/img\/([^"]+)"/g, (_all, name) => {
					copyFileSync(`img/${ name }`, `dist/assets/${ name }`);
					return `content="https://rickosborne.org/neuropride/assets/${ name }"`;
				});
			},
		}),
	],
});

const toCopy: Record<string, string> = {
	"img/neuropride-builder-1920x1080.png": "dist/assets/neuropride-builder-1920x1080.png",
};

for (const [ src, dest ] of Object.entries(toCopy)) {
	copyFileSync(src, dest);
}
