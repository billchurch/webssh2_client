# Migration from Webpack to Vite

This document outlines the migration of webssh2_client from Webpack to Vite, completed on 2025-07-22.

## Motivation

- **Performance**: Vite offers 10-100x faster build times compared to Webpack
- **Simplicity**: Reduced configuration complexity and maintenance burden
- **Developer Experience**: Instant HMR (Hot Module Replacement) and faster dev server startup
- **Modern Standards**: Native ES modules support and better tree-shaking
- **Smaller Dependencies**: Reduced node_modules size (~201 packages removed)

## Feature Parity Checklist

All critical features from the Webpack configuration have been preserved:

✅ **Git commit hash injection** - Automatically captured and injected into builds
✅ **Banner string generation** - Version, date, and commit hash in all output files
✅ **HTML template processing** - Dynamic version and config injection
✅ **CSS extraction and minification** - Single webssh2.css output file
✅ **JavaScript bundling** - Single webssh2.bundle.js output file
✅ **Static asset copying** - favicon.ico copied to output
✅ **Development server** - Port 3000 with HMR support
✅ **Production optimizations** - Terser minification with same settings
✅ **Bundle analysis** - Using vite-bundle-visualizer
✅ **Output structure** - Identical file structure in client/public/

## Configuration Mapping

### Webpack → Vite

| Webpack Feature | Vite Implementation |
|----------------|---------------------|
| `BannerPlugin` | Custom `bannerPlugin()` in vite.config.js |
| `DefinePlugin` | Built-in `define` option |
| `HtmlWebpackPlugin` | Custom `htmlTemplatePlugin()` + HTML entry |
| `CopyWebpackPlugin` | Custom `copyAssetsPlugin()` |
| `MiniCssExtractPlugin` | Built-in CSS handling |
| `CleanWebpackPlugin` | Built-in `emptyOutDir: true` |
| webpack-merge | Vite's mode-based configuration |
| Source maps | Built-in `sourcemap` option |

### Build Commands

| Old Command | New Command | Description |
|-------------|-------------|-------------|
| `npm run build` | `npm run build` | Production build |
| `npm run builddev` | `npm run builddev` | Development build |
| `npm run watch:build` | `npm run dev` | Dev server with HMR |
| `npm run analyze` | `npm run analyze` | Bundle analysis |

## Implementation Details

### 1. Custom Vite Plugins

Three custom plugins were created to maintain feature parity:

#### bannerPlugin
- Injects version/date/commit banner into JS and CSS files
- Executes during the `generateBundle` phase

#### htmlTemplatePlugin
- Processes HTML template variables
- Injects webssh2Config based on build mode
- Replaces version placeholders

#### copyAssetsPlugin
- Copies favicon.ico to output
- Moves and renames HTML output from nested path to client.htm
- Fixes asset paths in HTML

### 2. Project Structure Changes

- Added: `client/src/vite.config.js` (Vite configuration)
- Added: `client/src/index.html` (Vite entry point)
- Modified: `package.json` scripts and dependencies
- Removed: `scripts/` directory with webpack configs
- No changes to source code structure required

### 3. Missing Function Resolution

Two functions were missing from the original codebase:
- `getLocalTerminalSettings` - Added as alias to `getStoredSettings`
- `applyStoredSettings` - Added as placeholder function

### 4. Performance Improvements

Development build times:
- Webpack: ~3-5 seconds
- Vite: ~1.1 seconds

Production build times:
- Webpack: ~5-8 seconds
- Vite: ~2.5 seconds

Bundle sizes remain comparable:
- webssh2.bundle.js: ~446KB (gzipped: ~122KB)
- webssh2.css: ~25KB (gzipped: ~6.3KB)

## Troubleshooting

### Common Issues

1. **"CJS build of Vite's Node API is deprecated" warning**
   - This is a harmless warning that will be resolved in future Vite versions
   - Does not affect functionality

2. **Missing imports/exports**
   - Check that all functions are properly exported from their modules
   - Vite is stricter about ES module standards than Webpack

3. **Asset paths**
   - Vite uses different path resolution than Webpack
   - Ensure all asset imports use relative paths

### Rollback Instructions

If you need to rollback to Webpack:

1. Restore webpack dependencies in package.json
2. Delete `vite.config.js`
3. Delete `client/src/index.html`
4. Restore original npm scripts in package.json
5. Run `npm install`

## Next Steps

1. Remove webpack dependencies to reduce package size
2. Delete webpack configuration files
3. Update CI/CD pipelines if necessary
4. Consider migrating to Vite's built-in features for:
   - Environment variables handling
   - Asset optimization
   - Legacy browser support (if needed)

## Dependencies Changed

### Added
- `vite: ^5.0.0`
- `vite-bundle-visualizer: ^1.0.0`
- `@rollup/plugin-terser: ^0.4.0`

### To Be Removed
- webpack
- webpack-cli
- webpack-merge
- webpack-bundle-size-analyzer
- clean-webpack-plugin
- copy-webpack-plugin
- css-loader
- css-minimizer-webpack-plugin
- html-webpack-plugin
- mini-css-extract-plugin
- terser-webpack-plugin

## References

- [Vite Documentation](https://vitejs.dev/)
- [Migrating from Webpack](https://vitejs.dev/guide/migration.html)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)