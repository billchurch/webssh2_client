// scripts/webpack.prod.js
const { merge } = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const common = require('./webpack.common.js')

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false
          },
          compress: {
            drop_console: false, // Remove console statements for smaller file size
            drop_debugger: false,
            // Reduce the passes and compress options
            passes: 1,
            dead_code: true,
            unused: true
          },
          // Disable property mangling
          mangle: {
            properties: false
          },
        },
        extractComments: false
      }),
      new CssMinimizerPlugin()
    ],
  },
  performance: {
    hints: 'warning', // Show performance hints
    maxEntrypointSize: 512000, // 512 KB
    maxAssetSize: 512000 // 512 KB
  },
})
