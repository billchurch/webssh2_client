# Build and Publish Process for webssh2_client

This document outlines the steps to build, release, and publish the webssh2_client package.

## Development Environment

This project uses a VSCode devcontainer, which provides a consistent development environment with all necessary prerequisites installed. To use it:

1. Ensure you have Visual Studio Code and Docker installed on your system.
2. Open the project in VSCode.
3. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Remote-Containers: Reopen in Container".

The devcontainer will automatically set up the development environment with all required dependencies.

## Prerequisites

If you're not using the devcontainer, ensure you have the following installed:

- Node.js (version 22 or higher)
- npm (comes with Node.js)
- git
- An npm account with publishing rights to the package

Ensure your SSH or GPG key is set up for git commit signing and added to your github account.

## Build Process

1. Clone the repository:

   ```
   git clone https://github.com/billchurch/webssh2_client.git
   cd webssh2_client
   ```

2. If using VSCode with the devcontainer, open the project in VSCode and reopen in the container when prompted.

3. Install dependencies:

   ```
   npm install
   ```

4. Build the client bundle:

   ```
   npm run build
   ```

   This runs Vite in production mode and outputs to `client/public/` (e.g., `webssh2.bundle.js`, `webssh2.css`, `client.htm`).

5. Type-check (recommended):

   ```
   npm run typecheck
   npm run typecheck:client
   ```

6. Lint (recommended):

   ```
   npm run lint
   ```

7. Build Node entrypoints (for local testing or publish):

   ```
   npm run build:server
   ```

   This compiles `index.ts` and `client/index.ts` (and `csp-config.ts`) to JS in-place so `main: index.js` remains valid.

## Release Process

Releases are automated via GitHub Actions with `googleapis/release-please-action@v4`:

- On pushes to `main`, Release Please will open or update a release PR.
- When that PR is merged, a new release is created.
- The release workflow builds the client and server entries and publishes to npm using `NPM_TOKEN`.

Manual alternative (optional):

1. Conventional commits throughout development.
2. Use `standard-version` locally if needed:
   ```
   npm run release:patch  # or :minor / :major
   git push --follow-tags origin main
   ```
   CI release will still run on merge/push.

## Publish Process

Publishing is handled by the Release workflow on merges to `main` when a release is created by Release Please. If you need to test locally:

1. `npm run publish:dry-run` to inspect the publish contents.
2. `npm publish` (requires `npm login`) — normally not required thanks to CI.

## Additional Notes

- The devcontainer ensures a consistent development environment across different machines.
- The changelog is automatically updated based on your conventional commit messages.
- Make sure to update the README.md file if there are significant changes or new features.
- If you need to customize the changelog generation or version bumping process, you can modify the `.versionrc` file in the project root.

## Troubleshooting

- If you're having issues with the devcontainer, ensure Docker is running and try rebuilding the container.
- If you encounter issues with git commit signing, ensure your SSH key is correctly set up and added to your github account.
- If the changelog isn't generating as expected, check your commit messages to ensure they follow the conventional commit format.
- For any npm publishing issues, make sure you have the necessary permissions for the package on npmjs.com.

For any other issues or questions about the build and publish process, please refer to the project's issue tracker or contact the maintainers.
