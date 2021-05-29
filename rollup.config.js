import buble from '@rollup/plugin-buble'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import url from '@rollup/plugin-url'
import vue from 'rollup-plugin-vue'
import { terser } from 'rollup-plugin-terser'
import autoprefixer from 'autoprefixer'
import { name, version } from './package.json'

const banner = `/*!
 * @license
 * ${name} v${version}
 * Copyright © ${new Date().getFullYear()} Takeshi Sone.
 * Released under the MIT License.
 */
`

const plugins = [
  resolve({ extensions: ['.js', '.vue'] }),
  commonjs(),
  vue({
    needMap: false,
    style: { postcssPlugins: [autoprefixer()] },
    template: { isProduction: true }
  }),
  buble(),
  url()
]

export default [
  {
    input: 'src/components/book-effects.vue',
    external: 'rematrix',
    output: [
      { banner, format: 'es', file: 'dist/vue-booke-ffects.es.js' },
      { banner, format: 'cjs', file: 'dist/vue-booke-ffects.cjs.js' }
    ],
    plugins
  },
  {
    input: 'src/wrapper.coffee',
    output: { banner, format: 'iife', file: 'dist/vue-booke-ffects.js' },
    plugins
  },
  {
    input: 'src/wrapper.coffee',
    output: { banner, format: 'iife', file: 'dist/vue-book-effects.min.js' },
    plugins: [...plugins, terser({ output: { comments: /copyright|license/i } })]
  }
]
