# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0-alpha.1](https://github.com/billchurch/webssh2_client/compare/v2.0.0-alpha.0...v1.0.0-alpha.1) (2025-09-07)


### Features

* `Switch User` or `reauth` support for HTTP Basic ([4c2b9ba](https://github.com/billchurch/webssh2_client/commit/4c2b9babf0d0857bc46af67e4eb052dfc1fd3336))
* **a11y:** label controls, add live status, set html lang ([2c30e21](https://github.com/billchurch/webssh2_client/commit/2c30e21b0b9978752e26d8e6dc25610a97c030d3))
* add allowReconnect, allowReauth, and autoLog features ([77dbada](https://github.com/billchurch/webssh2_client/commit/77dbada3755da853f71aadc4a555ddbc4e2d42a2))
* add clearLog feature, refactoring of logging and dom functions ([de92652](https://github.com/billchurch/webssh2_client/commit/de926529c86a8deae4f8a5672d3dce31e82df9ea))
* add disconnect and reconnect logic ([d8e37d6](https://github.com/billchurch/webssh2_client/commit/d8e37d64be61fc21940b7e68b91894b587deda62))
* add favicon.ico to client.htm ([542a4d7](https://github.com/billchurch/webssh2_client/commit/542a4d73725798863ae74ce4a4236f7b52e97d7b))
* capslock indicator for password field ([29d393b](https://github.com/billchurch/webssh2_client/commit/29d393bf43bdc4402073d21e3e43e46780052288))
* change handling of disconnect, maintain terminal display, add error to status, and reset terminal only after reconnect attempt. ([fca5ff3](https://github.com/billchurch/webssh2_client/commit/fca5ff351b2166970c545459ac626612d03fe250))
* **client:** move to lucide inline icons and ESM-safe masking; refresh Vite build ([dd77df5](https://github.com/billchurch/webssh2_client/commit/dd77df5920d776e5d98e3b4986bf29b3abe22362))
* Confirmation before closing the tab [#1](https://github.com/billchurch/webssh2_client/issues/1) ([1ce9c13](https://github.com/billchurch/webssh2_client/commit/1ce9c1386c2d0fc34e1c22908a6730d9e5bee058))
* default terminal options applied to localStorage ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))
* **html:** support better auto-complete behavior ([8e055da](https://github.com/billchurch/webssh2_client/commit/8e055da9c4159a9db2eb57c2d4d0aafa5fc2dd8c))
* introduce maskerjs to mask sensitive debug logs. ([51739f1](https://github.com/billchurch/webssh2_client/commit/51739f1a2b158d31562a841f20af1bca1945bd76))
* keyboard-interactive login ([4c25a2a](https://github.com/billchurch/webssh2_client/commit/4c25a2a9f1960746685801005c7caa45db801075))
* **layout,terminal:** flex layout, correct FitAddon sizing, resize after settings ([ca76575](https://github.com/billchurch/webssh2_client/commit/ca765757551e81cfb2d21eaad9878ec89aa19c85))
* migrate build system from Webpack to Vite ([8c0c264](https://github.com/billchurch/webssh2_client/commit/8c0c264fa6b9b8b54d43f848c27ff5c75cd8cca7))
* migrate webssh2_client to SolidJS reactive architecture ([452a7dd](https://github.com/billchurch/webssh2_client/commit/452a7dd1fcf195d339955f362f8e94caaf640a25))
* **mobile:** tap menu + responsive terminal fit; better mobile input UX ([7c063ad](https://github.com/billchurch/webssh2_client/commit/7c063ad5abdae0d2fbf26162c3dd239693b4ea4b))
* Populate form fields from URL parameters on login page load ([67f2b76](https://github.com/billchurch/webssh2_client/commit/67f2b767cecd4ee83ef0d22008aa43aa6a10f33d))
* reauth disables loginDialog hostInput and portInput ([063b0f1](https://github.com/billchurch/webssh2_client/commit/063b0f17664ef257db1df73395df1878748e5e90))
* Refactor terminal settings handling and apply default options ([72077ba](https://github.com/billchurch/webssh2_client/commit/72077ba65f06b863356b6e0e9332e1f35bcc3371))
* sanatizeObject function to obscure passwords in debug messages ([41a4eb0](https://github.com/billchurch/webssh2_client/commit/41a4eb0c20230b0bbbc97e51d9aa11ae4c58ef31))
* **solidjs:** refactor code to solidjs declarative ([87c136b](https://github.com/billchurch/webssh2_client/commit/87c136b34912fbe0c113bb85ac18836b2029a2ef))
* support uploading of ssh-rsa private key from client for authentication [#6](https://github.com/billchurch/webssh2_client/issues/6) ([2188e67](https://github.com/billchurch/webssh2_client/commit/2188e6732f1510fecca82b169ddd79604a98776d))
* **tailwind+mobile+a11y:** integrate Tailwind CSS; mobile menu; responsive terminal fit; accessibility/tooling upgrades ([459b733](https://github.com/billchurch/webssh2_client/commit/459b7335b49ed097e0da1efea15fd250ca8900b9))
* terminal options configuration from login prompt ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))
* terminal settings dialog ([933f607](https://github.com/billchurch/webssh2_client/commit/933f6070c6a4d6b557e58602198f9b2e76e677a3))
* **ui:** adopt Tailwind CSS 3.4 and remove PureCSS in client\n\n- Add Tailwind + PostCSS config (tailwind.config.js, postcss.config.js)\n- Replace PureCSS import with Tailwind entry and remove purecss dep\n- Migrate dialogs (login/error/prompt/settings) to Tailwind utilities\n- Use native dialog::backdrop and robust modal centering\n- Standardize footer/header in markup with Tailwind borders and colors\n- Improve accessibility: focus rings, consistent button styles\n- Lighten secondary buttons; adjust bar height via CSS var\n- Keep xterm CSS; no inline styles added (CSP-safe)\n- Update Vite optimizeDeps to drop purecss; cleanup CSS files\n\nrefactor(dom): show login dialog with showModal() to match native backdrop\nfix(ui): prevent modal scrollbars with password managers (overflow-visible)\nfix(ui): consistent bottom bar border with border-neutral-200\n\nBREAKING CHANGE: PureCSS classes removed from templates; Tailwind now provides all styling. ([7e50951](https://github.com/billchurch/webssh2_client/commit/7e50951491880eb225719d799f5a897e842bff9e))
* update jsmasker to v1.4.0 ([1989d45](https://github.com/billchurch/webssh2_client/commit/1989d45b8ec951e5af080b8ac30e94035d9fac5d))
* update SolidJS client build and refine TailwindCSS config ([2ae3b87](https://github.com/billchurch/webssh2_client/commit/2ae3b87d1b60a03486fc49040fba66c2e03cd7e5))
* upgrade dependencies and webpack configuration ([5454989](https://github.com/billchurch/webssh2_client/commit/5454989ba735ea99c0787d9202d10c5576526ab4))
* upgrade webssh2 client to Node.js 22 ([f5f776c](https://github.com/billchurch/webssh2_client/commit/f5f776c3dd7a04beb1a049eb857f8ff3c62a068f))
* validation of terminal options form ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))


### Bug Fixes

* better handle ssh error messages ([e731440](https://github.com/billchurch/webssh2_client/commit/e731440634518356239bdcc3ea0d77fc171be62c))
* **bundle:** show version in console.log when start ([5108d24](https://github.com/billchurch/webssh2_client/commit/5108d243cfdbae1b66c89bc20d04c9a3a1ddc000))
* convert module exports to ES module syntax ([d102c3d](https://github.com/billchurch/webssh2_client/commit/d102c3d5dbbdc5a21deb9c9f82b2adef685daaa3))
* erroneous autoconnect when not all required parameters were present for autoconnect ([746ced9](https://github.com/billchurch/webssh2_client/commit/746ced95ee8bf4e8b613beb88c9c2c143fde59b5))
* fixes docs: explain the "Routes" section in the webssh2_client README [#3](https://github.com/billchurch/webssh2_client/issues/3) ([b43222b](https://github.com/billchurch/webssh2_client/commit/b43222bd61f7cb5a430aac15c1935ae35c29322b))
* fixes docs: update README on the bigip-server to mention webssh2_client, [#5](https://github.com/billchurch/webssh2_client/issues/5) ([5bfc40f](https://github.com/billchurch/webssh2_client/commit/5bfc40f252d4cf165120437c9963baafb13de5ac))
* handle websocket url properly and mixed security protocols properly ([0aeb798](https://github.com/billchurch/webssh2_client/commit/0aeb7983b543a03af5b2387458d1499a55ab6ddd))
* **html:** fix privatekey validation, privatekey file selection ([a9fad1a](https://github.com/billchurch/webssh2_client/commit/a9fad1ad057b017bf93aa9e879c8e9646351b272))
* improve port handling and form data persistence ([fd0b12d](https://github.com/billchurch/webssh2_client/commit/fd0b12d954fc3ed55f1f7cad75da9767f5465298))
* **layout:** terminal fills space between header and bottom bar ([4a0c911](https://github.com/billchurch/webssh2_client/commit/4a0c911b907b9359102dc6f1cf7d951aee0a6579))
* **menu:** correct visibility for Clear/Download Log via localStorage state\n\n- Start Clear/Download hidden by default; show on first log write\n- Hide both when log is cleared or recovered\n- Keep Stop/Start toggling through updatestartLogBtnState\n\nfix(icons): center gear spin and size icons via Tailwind classes\n- Route animate/w-*/h-* classes to SVG in createIconNode\n- Use origin-center for balanced rotation\n\nchore(ui): widen menu and prevent wrapping (min-w-56, whitespace-nowrap)\n\nrefactor(ui): terminal container sizing via Tailwind arbitrary values ([286bcff](https://github.com/billchurch/webssh2_client/commit/286bcffb146cf2dd70917ceaa84440585e365cd9))
* missed import for focusTerminal on dom.js ([bb7396c](https://github.com/billchurch/webssh2_client/commit/bb7396c5cf24546c8aa87e839bc751412cddda51))
* passphrase encrypted RSA keys now pass validation [#7](https://github.com/billchurch/webssh2_client/issues/7) ([d41e6de](https://github.com/billchurch/webssh2_client/commit/d41e6dec4d6120ef001e528007f5eeaff3734d15))
* ping timeouts due to duplicate session setup ([10e6576](https://github.com/billchurch/webssh2_client/commit/10e6576ea09124a923abc34e0cedf6047e7a0ef2))
* resolve terminal dimensions issue ([#350](https://github.com/billchurch/webssh2_client/issues/350)) and circular dependencies ([3744174](https://github.com/billchurch/webssh2_client/commit/37441748ae6c123743f8b8672eba5e6acd74ebce))
* sanatize debug message for keyboard-interactive ([233bf6c](https://github.com/billchurch/webssh2_client/commit/233bf6c6054839792725a0f340636df5259064ae))
* **security:** resolve XSS vulnerability in DOM manipulation ([#389](https://github.com/billchurch/webssh2_client/issues/389)) ([995f909](https://github.com/billchurch/webssh2_client/commit/995f909af7e0fb4accfdf04c5d4915066c6c7466))
* set focus to first prompt-input when keyboard-interactive dialog appears. ([3bb6482](https://github.com/billchurch/webssh2_client/commit/3bb648269097059dc339589c8521cb70ddda70f8))
* Update menu button styling and behavior for better user experience ([7402984](https://github.com/billchurch/webssh2_client/commit/7402984517fefd5b44ae386e5e57146d6a0946d5))
* white flash before solidjs load. ([746ced9](https://github.com/billchurch/webssh2_client/commit/746ced95ee8bf4e8b613beb88c9c2c143fde59b5))


### Miscellaneous Chores

* **release:** force version to 1.0.0-alpha.1 ([f007bd1](https://github.com/billchurch/webssh2_client/commit/f007bd16d4f2d251ecec0bace06444c8e34d9694))

## [1.0.0-alpha.1](https://github.com/billchurch/webssh2_client/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2025-09-05)

### Features

- **a11y:** label controls, add live status, set html lang ([2c30e21](https://github.com/billchurch/webssh2_client/commit/2c30e21b0b9978752e26d8e6dc25610a97c030d3))
- **html:** support better auto-complete behavior ([8e055da](https://github.com/billchurch/webssh2_client/commit/8e055da9c4159a9db2eb57c2d4d0aafa5fc2dd8c))
- **layout,terminal:** flex layout, correct FitAddon sizing, resize after settings ([ca76575](https://github.com/billchurch/webssh2_client/commit/ca765757551e81cfb2d21eaad9878ec89aa19c85))
- **mobile:** tap menu + responsive terminal fit; better mobile input UX ([7c063ad](https://github.com/billchurch/webssh2_client/commit/7c063ad5abdae0d2fbf26162c3dd239693b4ea4b))
- **tailwind+mobile+a11y:** integrate Tailwind CSS; mobile menu; responsive terminal fit; accessibility/tooling upgrades ([459b733](https://github.com/billchurch/webssh2_client/commit/459b7335b49ed097e0da1efea15fd250ca8900b9))
- **ui:** adopt Tailwind CSS 3.4 and remove PureCSS in client\n\n- Add Tailwind + PostCSS config (tailwind.config.js, postcss.config.js)\n- Replace PureCSS import with Tailwind entry and remove purecss dep\n- Migrate dialogs (login/error/prompt/settings) to Tailwind utilities\n- Use native dialog::backdrop and robust modal centering\n- Standardize footer/header in markup with Tailwind borders and colors\n- Improve accessibility: focus rings, consistent button styles\n- Lighten secondary buttons; adjust bar height via CSS var\n- Keep xterm CSS; no inline styles added (CSP-safe)\n- Update Vite optimizeDeps to drop purecss; cleanup CSS files\n\nrefactor(dom): show login dialog with showModal() to match native backdrop\nfix(ui): prevent modal scrollbars with password managers (overflow-visible)\nfix(ui): consistent bottom bar border with border-neutral-200\n\nBREAKING CHANGE: PureCSS classes removed from templates; Tailwind now provides all styling. ([7e50951](https://github.com/billchurch/webssh2_client/commit/7e50951491880eb225719d799f5a897e842bff9e))

### Bug Fixes

- **html:** fix privatekey validation, privatekey file selection ([a9fad1a](https://github.com/billchurch/webssh2_client/commit/a9fad1ad057b017bf93aa9e879c8e9646351b272))
- **layout:** terminal fills space between header and bottom bar ([4a0c911](https://github.com/billchurch/webssh2_client/commit/4a0c911b907b9359102dc6f1cf7d951aee0a6579))
- **menu:** correct visibility for Clear/Download Log via localStorage state\n\n- Start Clear/Download hidden by default; show on first log write\n- Hide both when log is cleared or recovered\n- Keep Stop/Start toggling through updatestartLogBtnState\n\nfix(icons): center gear spin and size icons via Tailwind classes\n- Route animate/w-_/h-_ classes to SVG in createIconNode\n- Use origin-center for balanced rotation\n\nchore(ui): widen menu and prevent wrapping (min-w-56, whitespace-nowrap)\n\nrefactor(ui): terminal container sizing via Tailwind arbitrary values ([286bcff](https://github.com/billchurch/webssh2_client/commit/286bcffb146cf2dd70917ceaa84440585e365cd9))

### Miscellaneous Chores

- **release:** force version to 1.0.0-alpha.1 ([f007bd1](https://github.com/billchurch/webssh2_client/commit/f007bd16d4f2d251ecec0bace06444c8e34d9694))

## [1.0.0-alpha.0](https://github.com/billchurch/webssh2_client/compare/v0.2.30...v1.0.0-alpha.0) (2025-09-04)

### Features

- **client:** move to lucide inline icons and ESM-safe masking; refresh Vite build ([dd77df5](https://github.com/billchurch/webssh2_client/commit/dd77df5920d776e5d98e3b4986bf29b3abe22362))
- migrate build system from Webpack to Vite ([8c0c264](https://github.com/billchurch/webssh2_client/commit/8c0c264fa6b9b8b54d43f848c27ff5c75cd8cca7))
- upgrade dependencies and webpack configuration ([5454989](https://github.com/billchurch/webssh2_client/commit/5454989ba735ea99c0787d9202d10c5576526ab4))

### Bug Fixes

- convert module exports to ES module syntax ([d102c3d](https://github.com/billchurch/webssh2_client/commit/d102c3d5dbbdc5a21deb9c9f82b2adef685daaa3))
- resolve terminal dimensions issue ([#350](https://github.com/billchurch/webssh2_client/issues/350)) and circular dependencies ([3744174](https://github.com/billchurch/webssh2_client/commit/37441748ae6c123743f8b8672eba5e6acd74ebce))
- **security:** resolve XSS vulnerability in DOM manipulation ([#389](https://github.com/billchurch/webssh2_client/issues/389)) ([995f909](https://github.com/billchurch/webssh2_client/commit/995f909af7e0fb4accfdf04c5d4915066c6c7466))

### [0.2.30](https://github.com/billchurch/webssh2_client/compare/v0.2.29...v0.2.30) (2025-07-22)

### [0.2.29](https://github.com/billchurch/webssh2_client/compare/v0.2.28...v0.2.29) (2025-07-21)

### Features

- upgrade webssh2 client to Node.js 22 ([f5f776c](https://github.com/billchurch/webssh2_client/commit/f5f776c3dd7a04beb1a049eb857f8ff3c62a068f))

### Bug Fixes

- improve port handling and form data persistence ([fd0b12d](https://github.com/billchurch/webssh2_client/commit/fd0b12d954fc3ed55f1f7cad75da9767f5465298))

### [0.2.28](https://github.com/billchurch/webssh2_client/compare/v0.2.27...v0.2.28) (2024-12-03)

### Bug Fixes

- passphrase encrypted RSA keys now pass validation [#7](https://github.com/billchurch/webssh2_client/issues/7) ([d41e6de](https://github.com/billchurch/webssh2_client/commit/d41e6dec4d6120ef001e528007f5eeaff3734d15))

### [0.2.27](https://github.com/billchurch/webssh2_client/compare/v0.2.26...v0.2.27) (2024-12-02)

### Features

- support uploading of ssh-rsa private key from client for authentication [#6](https://github.com/billchurch/webssh2_client/issues/6) ([2188e67](https://github.com/billchurch/webssh2_client/commit/2188e6732f1510fecca82b169ddd79604a98776d))
- update jsmasker to v1.4.0 ([1989d45](https://github.com/billchurch/webssh2_client/commit/1989d45b8ec951e5af080b8ac30e94035d9fac5d))

### [0.2.26](https://github.com/billchurch/webssh2_client/compare/v0.2.25...v0.2.26) (2024-11-30)

### Features

- Confirmation before closing the tab [#1](https://github.com/billchurch/webssh2_client/issues/1) ([1ce9c13](https://github.com/billchurch/webssh2_client/commit/1ce9c1386c2d0fc34e1c22908a6730d9e5bee058))

### Bug Fixes

- better handle ssh error messages ([e731440](https://github.com/billchurch/webssh2_client/commit/e731440634518356239bdcc3ea0d77fc171be62c))
- fixes docs: explain the "Routes" section in the webssh2_client README [#3](https://github.com/billchurch/webssh2_client/issues/3) ([b43222b](https://github.com/billchurch/webssh2_client/commit/b43222bd61f7cb5a430aac15c1935ae35c29322b))
- fixes docs: update README on the bigip-server to mention webssh2_client, [#5](https://github.com/billchurch/webssh2_client/issues/5) ([5bfc40f](https://github.com/billchurch/webssh2_client/commit/5bfc40f252d4cf165120437c9963baafb13de5ac))

### [0.2.25](https://github.com/billchurch/webssh2_client/compare/v0.2.24...v0.2.25) (2024-08-22)

### Bug Fixes

- set focus to first prompt-input when keyboard-interactive dialog appears. ([3bb6482](https://github.com/billchurch/webssh2_client/commit/3bb648269097059dc339589c8521cb70ddda70f8))

### [0.2.24](https://github.com/billchurch/webssh2_client/compare/v0.2.23...v0.2.24) (2024-08-22)

### Features

- keyboard-interactive login ([4c25a2a](https://github.com/billchurch/webssh2_client/commit/4c25a2a9f1960746685801005c7caa45db801075))

### Bug Fixes

- sanatize debug message for keyboard-interactive ([233bf6c](https://github.com/billchurch/webssh2_client/commit/233bf6c6054839792725a0f340636df5259064ae))

### [0.2.23](https://github.com/billchurch/webssh2_client/compare/v0.2.22...v0.2.23) (2024-08-20)

### Features

- introduce maskerjs to mask sensitive debug logs. ([51739f1](https://github.com/billchurch/webssh2_client/commit/51739f1a2b158d31562a841f20af1bca1945bd76))
- reauth disables loginDialog hostInput and portInput ([063b0f1](https://github.com/billchurch/webssh2_client/commit/063b0f17664ef257db1df73395df1878748e5e90))

### Breaking Changes

- changed case of `sshTerm` to `sshterm` to eliminate usability concerns for entering url parameters ([bf9ec2b](https://github.com/billchurch/webssh2_client/commit/bf9ec2be7712ca8d5f3a6f14c4efb128ff6c495b))

### [0.2.22](https://github.com/billchurch/webssh2_client/compare/v0.2.21...v0.2.22) (2024-08-19)

### Features

- `Switch User` or `reauth` support for HTTP Basic ([4c2b9ba](https://github.com/billchurch/webssh2_client/commit/4c2b9babf0d0857bc46af67e4eb052dfc1fd3336))

### [0.2.21](https://github.com/billchurch/webssh2_client/compare/v0.2.20...v0.2.21) (2024-08-19)

### Features

- Refactor terminal settings handling and apply default options ([72077ba](https://github.com/billchurch/webssh2_client/commit/72077ba65f06b863356b6e0e9332e1f35bcc3371))

### [0.2.20](https://github.com/billchurch/webssh2_client/compare/v0.2.19...v0.2.20) (2024-08-18)

### Features

- terminal options configuration from login prompt ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))
- terminal settings dialog ([933f607](https://github.com/billchurch/webssh2_client/commit/933f6070c6a4d6b557e58602198f9b2e76e677a3))

### [0.2.19](https://github.com/billchurch/webssh2_client/compare/v0.2.18...v0.2.19) (2024-08-16)

### Features

- add allowReconnect, allowReauth, and autoLog features ([77dbada](https://github.com/billchurch/webssh2_client/commit/77dbada3755da853f71aadc4a555ddbc4e2d42a2))
- capslock indicator for password field ([29d393b](https://github.com/billchurch/webssh2_client/commit/29d393bf43bdc4402073d21e3e43e46780052288))

### [0.2.18](https://github.com/billchurch/webssh2_client/compare/v0.2.17...v0.2.18) (2024-08-14)

### Features

- add clearLog feature, refactoring of logging and dom functions ([de92652](https://github.com/billchurch/webssh2_client/commit/de926529c86a8deae4f8a5672d3dce31e82df9ea))
- change handling of disconnect, maintain terminal display, add error to status, and reset terminal only after reconnect attempt. ([fca5ff3](https://github.com/billchurch/webssh2_client/commit/fca5ff351b2166970c545459ac626612d03fe250))
- sanatizeObject function to obscure passwords in debug messages ([41a4eb0](https://github.com/billchurch/webssh2_client/commit/41a4eb0c20230b0bbbc97e51d9aa11ae4c58ef31))

### [0.2.17](https://github.com/billchurch/webssh2_client/compare/v0.2.16...v0.2.17) (2024-08-13)

### Bug Fixes

- ping timeouts due to duplicate session setup ([10e6576](https://github.com/billchurch/webssh2_client/commit/10e6576ea09124a923abc34e0cedf6047e7a0ef2))

### [0.2.16](https://github.com/billchurch/webssh2_client/compare/v0.2.15...v0.2.16) (2024-07-19)

### 0.2.15 (2024-07-19)

### Features

- add disconnect and reconnect logic ([d8e37d6](https://github.com/billchurch/webssh2_client/commit/d8e37d64be61fc21940b7e68b91894b587deda62))
- add favicon.ico to client.htm ([542a4d7](https://github.com/billchurch/webssh2_client/commit/542a4d73725798863ae74ce4a4236f7b52e97d7b))
- Populate form fields from URL parameters on login page load ([67f2b76](https://github.com/billchurch/webssh2_client/commit/67f2b767cecd4ee83ef0d22008aa43aa6a10f33d))

### Bug Fixes

- handle websocket url properly and mixed security protocols properly ([0aeb798](https://github.com/billchurch/webssh2_client/commit/0aeb7983b543a03af5b2387458d1499a55ab6ddd))
- Update menu button styling and behavior for better user experience ([7402984](https://github.com/billchurch/webssh2_client/commit/7402984517fefd5b44ae386e5e57146d6a0946d5))

## 0.2.14 (2024-07-19)

### Bug Fixes

- Update menu button styling and behavior for better user experience ([7402984](https://github.com/billchurch/webssh2_client/commit/7402984517fefd5b44ae386e5e57146d6a0946d5))

### Features

- add disconnect and reconnect logic ([d8e37d6](https://github.com/billchurch/webssh2_client/commit/d8e37d64be61fc21940b7e68b91894b587deda62))
- add favicon.ico to client.htm ([542a4d7](https://github.com/billchurch/webssh2_client/commit/542a4d73725798863ae74ce4a4236f7b52e97d7b))
- Populate form fields from URL parameters on login page load ([67f2b76](https://github.com/billchurch/webssh2_client/commit/67f2b767cecd4ee83ef0d22008aa43aa6a10f33d))
