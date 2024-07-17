const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: '../client/public',
    hot: true
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: './client/src/test.htm', to: 'test.htm' }
      ]
    })
  ]
});
