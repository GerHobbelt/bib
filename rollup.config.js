import babel from '@rollup/plugin-babel';
import filesize from 'rollup-plugin-filesize';
import replace from '@rollup/plugin-replace';
import sizes from 'rollup-plugin-sizes';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const config = {
	external: [
		'cross-fetch/polyfill',
		/@babel\/runtime/
	],
	output: {
		format: 'cjs',
		compact: false,
		exports: 'default',
	},
	plugins: [
		resolve({
			preferBuiltins: false,
			mainFields: ['browser', 'main']
		}),
		replace({
			preventAssignment: true,
			'Zotero.isNode': false,
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
		}),
		commonjs(),
		babel({
			include: ['src/**/*.js'],
			extensions: ['.js'],
			babelHelpers: 'runtime'
		}),
		filesize({ showMinifiedSize: false, showGzippedSize: !!process.env.DEBUG }),

	]
};

if(process.env.DEBUG) {
	config.plugins.splice(-1, 0, sizes());
}


export default [
	{ ...config, input: 'src/main.js', output: { ...config.output, file: 'lib/main.cjs' } },
	{ ...config, input: 'src/main-node.js', output: { ...config.output, file: 'lib/main-node.cjs' } },
	{ ...config,
		external: [],
		input: 'src/main.js',
		output: { ...config.output, compact: true, name: 'ZoteroTranslationClient', format: 'umd', file: 'dist/zotero-translation-client.js' },
		plugins: [ ...config.plugins, terser() ]
	}
];
