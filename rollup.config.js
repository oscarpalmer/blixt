import typescript from '@rollup/plugin-typescript';

// eslint-disable-next-line n/prefer-global/process
const format = process?.env?.ROLLUP_FORMAT ?? 'es';
const isEsm = format === 'es';

const banner = isEsm
	? `/** @typedef {{[index: number]: any; [key: string]: any}} Data */
/** @typedef {{[K in keyof T]: T[K] extends Data ? Store<T[K]> : T[K]} & Data} Store<T> @template T */`
	: undefined;

const file = isEsm ? './dist/blixt.js' : './dist/blixt.iife.js';

const name = 'Blixt';

const configuration = {
	input: './src/index.ts',
	output: {
		banner,
		file,
		format,
		name,
	},
	plugins: [typescript()],
	watch: {
		include: 'src/**',
	},
	onLog(level, log, handler) {
		if (log.code === 'CIRCULAR_DEPENDENCY') {
			return;
		}

		handler(level, log);
	},
};

export default configuration;
