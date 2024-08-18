// client
// client/index.js
const path = require('path');

module.exports = {
  getPublicPath: () => path.join(__dirname, 'public'),
  version: require('../package.json').version
};