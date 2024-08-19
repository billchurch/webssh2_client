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

- Node.js (version 18 or higher)
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

4. Build the project:
   ```
   npm run build
   ```

   This command runs Webpack in production mode to create optimized assets.

## Release Process

1. Make your changes and commit them using conventional commit messages.

2. When ready to release, run one of the following commands depending on the type of release:
   ```
   npm run release:patch  # for a patch release
   npm run release:minor  # for a minor release
   npm run release:major  # for a major release
   ```

   This will:
   - Bump the version number in package.json
   - Update the CHANGELOG.md file
   - Create a new commit with these changes
   - Create a new git tag

3. Push the changes and the new tag to the repository:
   ```
   git push --follow-tags origin main
   ```

## Publish Process

1. Ensure you're logged into npm:
   ```
   npm login
   ```

2. Run a dry-run to check what would be published:
   ```
   npm run publish:dry-run
   ```

   Review the output to ensure all expected files are included and no sensitive or unnecessary files are being published.

3. If the dry-run looks good, publish to npm:
   ```
   npm run publish:npm
   ```

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