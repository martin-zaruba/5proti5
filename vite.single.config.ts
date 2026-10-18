import { mergeConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

import baseConfig from './vite.config'

/** One self-contained HTML file for running from disk without a server (T-013). */
export default mergeConfig(baseConfig, {
  base: './',
  publicDir: false,
  plugins: [viteSingleFile()],
  build: { outDir: 'dist-single', emptyOutDir: true },
})
