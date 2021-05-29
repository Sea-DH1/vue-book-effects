module.exports = {
  publicPath: '',
  css: {
    extract: false
  },
  chainWebpack: config => {
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    svgRule
      .use('url-loader')
      .loader('url-loader')
      .end()
      .use('svgo-loader')
      .loader('svgo-loader')
      .options({ plugins: [{ removeViewBox: false }] })
      .end()
  },
  configureWebpack: config => {
    if (process.env.npm_config_report) {
      const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
      config.plugins.push(new BundleAnalyzerPlugin())
    }
  },
  productionSourceMap: false
}
