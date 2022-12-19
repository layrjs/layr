import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import globals from 'rollup-plugin-node-globals';

export default {
  input: 'src/index.tsx',
  output: {
    file: 'build/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve({browser: true, extensions: ['.mjs', '.js', '.json', '.node', '.ts', '.tsx']}),
    commonjs(),
    globals(),
    babel({extensions: ['ts', 'tsx'], babelHelpers: 'bundled'})
  ]
};
