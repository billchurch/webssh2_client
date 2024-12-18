# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0-alpha1](https://github.com/billchurch/webssh2_client/compare/webssh2_client-v2.1.0-alpha.0...webssh2_client-v2.0.0-alpha1) (2024-12-18)


### chore

* release 2.0.0-alpha1 ([0538ff7](https://github.com/billchurch/webssh2_client/commit/0538ff736c5b818d226991077c6aecda8c83b497))


### Bug Fixes

* release please testing ([bb88e56](https://github.com/billchurch/webssh2_client/commit/bb88e56dbb4a33bc87986ff165222e24a6439756))

## [2.1.0-alpha.0](https://github.com/billchurch/webssh2_client/compare/webssh2_client-v2.0.0-alpha.0...webssh2_client-v2.1.0-alpha.0) (2024-12-18)


### Features

* `Switch User` or `reauth` support for HTTP Basic ([4c2b9ba](https://github.com/billchurch/webssh2_client/commit/4c2b9babf0d0857bc46af67e4eb052dfc1fd3336))
* add allowReconnect, allowReauth, and autoLog features ([77dbada](https://github.com/billchurch/webssh2_client/commit/77dbada3755da853f71aadc4a555ddbc4e2d42a2))
* add clearLog feature, refactoring of logging and dom functions ([de92652](https://github.com/billchurch/webssh2_client/commit/de926529c86a8deae4f8a5672d3dce31e82df9ea))
* add disconnect and reconnect logic ([d8e37d6](https://github.com/billchurch/webssh2_client/commit/d8e37d64be61fc21940b7e68b91894b587deda62))
* add favicon.ico to client.htm ([542a4d7](https://github.com/billchurch/webssh2_client/commit/542a4d73725798863ae74ce4a4236f7b52e97d7b))
* capslock indicator for password field ([29d393b](https://github.com/billchurch/webssh2_client/commit/29d393bf43bdc4402073d21e3e43e46780052288))
* change handling of disconnect, maintain terminal display, add error to status, and reset terminal only after reconnect attempt. ([fca5ff3](https://github.com/billchurch/webssh2_client/commit/fca5ff351b2166970c545459ac626612d03fe250))
* Confirmation before closing the tab [#1](https://github.com/billchurch/webssh2_client/issues/1) ([1ce9c13](https://github.com/billchurch/webssh2_client/commit/1ce9c1386c2d0fc34e1c22908a6730d9e5bee058))
* default terminal options applied to localStorage ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))
* introduce maskerjs to mask sensitive debug logs. ([51739f1](https://github.com/billchurch/webssh2_client/commit/51739f1a2b158d31562a841f20af1bca1945bd76))
* keyboard-interactive login ([4c25a2a](https://github.com/billchurch/webssh2_client/commit/4c25a2a9f1960746685801005c7caa45db801075))
* Populate form fields from URL parameters on login page load ([67f2b76](https://github.com/billchurch/webssh2_client/commit/67f2b767cecd4ee83ef0d22008aa43aa6a10f33d))
* reauth disables loginDialog hostInput and portInput ([063b0f1](https://github.com/billchurch/webssh2_client/commit/063b0f17664ef257db1df73395df1878748e5e90))
* Refactor terminal settings handling and apply default options ([72077ba](https://github.com/billchurch/webssh2_client/commit/72077ba65f06b863356b6e0e9332e1f35bcc3371))
* sanatizeObject function to obscure passwords in debug messages ([41a4eb0](https://github.com/billchurch/webssh2_client/commit/41a4eb0c20230b0bbbc97e51d9aa11ae4c58ef31))
* support uploading of ssh-rsa private key from client for authentication [#6](https://github.com/billchurch/webssh2_client/issues/6) ([2188e67](https://github.com/billchurch/webssh2_client/commit/2188e6732f1510fecca82b169ddd79604a98776d))
* terminal options configuration from login prompt ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))
* terminal settings dialog ([933f607](https://github.com/billchurch/webssh2_client/commit/933f6070c6a4d6b557e58602198f9b2e76e677a3))
* test release please setup ([3a4cdcb](https://github.com/billchurch/webssh2_client/commit/3a4cdcb5b3c1402834bc9162e425e0e159129396))
* trivial change to test release-please and npm publish workflows. ([19e0c76](https://github.com/billchurch/webssh2_client/commit/19e0c76c5812c3de0afc13ddf7d2033aa1dce5fd))
* update jsmasker to v1.4.0 ([1989d45](https://github.com/billchurch/webssh2_client/commit/1989d45b8ec951e5af080b8ac30e94035d9fac5d))
* validation of terminal options form ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))


### Bug Fixes

* better handle ssh error messages ([e731440](https://github.com/billchurch/webssh2_client/commit/e731440634518356239bdcc3ea0d77fc171be62c))
* fixes docs: explain the "Routes" section in the webssh2_client README [#3](https://github.com/billchurch/webssh2_client/issues/3) ([b43222b](https://github.com/billchurch/webssh2_client/commit/b43222bd61f7cb5a430aac15c1935ae35c29322b))
* fixes docs: update README on the bigip-server to mention webssh2_client, [#5](https://github.com/billchurch/webssh2_client/issues/5) ([5bfc40f](https://github.com/billchurch/webssh2_client/commit/5bfc40f252d4cf165120437c9963baafb13de5ac))
* handle websocket url properly and mixed security protocols properly ([0aeb798](https://github.com/billchurch/webssh2_client/commit/0aeb7983b543a03af5b2387458d1499a55ab6ddd))
* missed import for focusTerminal on dom.js ([bb7396c](https://github.com/billchurch/webssh2_client/commit/bb7396c5cf24546c8aa87e839bc751412cddda51))
* ping timeouts due to duplicate session setup ([10e6576](https://github.com/billchurch/webssh2_client/commit/10e6576ea09124a923abc34e0cedf6047e7a0ef2))
* release-please testing ([f0d15c2](https://github.com/billchurch/webssh2_client/commit/f0d15c2a98e214c4a309fafa87b26205d46deb71))
* release-please testing ([540bfb0](https://github.com/billchurch/webssh2_client/commit/540bfb0f600014bcac93099ef271275c9742b045))
* release-please workflow ([a3fd089](https://github.com/billchurch/webssh2_client/commit/a3fd0897cff05a59202d78333eb5475e4b2b6649))
* sanatize debug message for keyboard-interactive ([233bf6c](https://github.com/billchurch/webssh2_client/commit/233bf6c6054839792725a0f340636df5259064ae))
* set focus to first prompt-input when keyboard-interactive dialog appears. ([3bb6482](https://github.com/billchurch/webssh2_client/commit/3bb648269097059dc339589c8521cb70ddda70f8))
* testing out release-please workflow ([8747d15](https://github.com/billchurch/webssh2_client/commit/8747d152abe2ae4aa773ecf026ab6c392b73ba44))
* testing release-please workflow ([2e1de68](https://github.com/billchurch/webssh2_client/commit/2e1de68ae063e9901405da91b345552d0afbaa4a))
* testing workflows ([9b209ee](https://github.com/billchurch/webssh2_client/commit/9b209ee7d37535f5ab9604376e346f86a7abc3bc))
* Update menu button styling and behavior for better user experience ([7402984](https://github.com/billchurch/webssh2_client/commit/7402984517fefd5b44ae386e5e57146d6a0946d5))


### Breaking Changes

* changed case of `headerBackground` to `headerbackground` eliminate usability concerns for entering url parameters ([d6a3366](https://github.com/billchurch/webssh2_client/commit/d6a3366a711f51bd1c1feb3c7e93b8f334c58c19))
* changed case of `sshTerm` to `sshterm` to eliminate usability concerns for entering url parameters ([bf9ec2b](https://github.com/billchurch/webssh2_client/commit/bf9ec2be7712ca8d5f3a6f14c4efb128ff6c495b))

## [2.0.0-alpha.0](https://github.com/billchurch/webssh2_client/compare/v0.2.27...v2.0.0-alpha.0) (2024-12-17)


### Features

* test release please setup ([3a4cdcb](https://github.com/billchurch/webssh2_client/commit/3a4cdcb5b3c1402834bc9162e425e0e159129396))

### [0.2.27](https://github.com/billchurch/webssh2_client/compare/v0.2.26...v0.2.27) (2024-12-02)


### Features

* support uploading of ssh-rsa private key from client for authentication [#6](https://github.com/billchurch/webssh2_client/issues/6) ([2188e67](https://github.com/billchurch/webssh2_client/commit/2188e6732f1510fecca82b169ddd79604a98776d))
* update jsmasker to v1.4.0 ([1989d45](https://github.com/billchurch/webssh2_client/commit/1989d45b8ec951e5af080b8ac30e94035d9fac5d))

### [0.2.26](https://github.com/billchurch/webssh2_client/compare/v0.2.25...v0.2.26) (2024-11-30)


### Features

* Confirmation before closing the tab [#1](https://github.com/billchurch/webssh2_client/issues/1) ([1ce9c13](https://github.com/billchurch/webssh2_client/commit/1ce9c1386c2d0fc34e1c22908a6730d9e5bee058))


### Bug Fixes

* better handle ssh error messages ([e731440](https://github.com/billchurch/webssh2_client/commit/e731440634518356239bdcc3ea0d77fc171be62c))
* fixes docs: explain the "Routes" section in the webssh2_client README [#3](https://github.com/billchurch/webssh2_client/issues/3) ([b43222b](https://github.com/billchurch/webssh2_client/commit/b43222bd61f7cb5a430aac15c1935ae35c29322b))
* fixes docs: update README on the bigip-server to mention webssh2_client, [#5](https://github.com/billchurch/webssh2_client/issues/5) ([5bfc40f](https://github.com/billchurch/webssh2_client/commit/5bfc40f252d4cf165120437c9963baafb13de5ac))

### [0.2.25](https://github.com/billchurch/webssh2_client/compare/v0.2.24...v0.2.25) (2024-08-22)


### Bug Fixes

* set focus to first prompt-input when keyboard-interactive dialog appears. ([3bb6482](https://github.com/billchurch/webssh2_client/commit/3bb648269097059dc339589c8521cb70ddda70f8))

### [0.2.24](https://github.com/billchurch/webssh2_client/compare/v0.2.23...v0.2.24) (2024-08-22)


### Features

* keyboard-interactive login ([4c25a2a](https://github.com/billchurch/webssh2_client/commit/4c25a2a9f1960746685801005c7caa45db801075))


### Bug Fixes

* sanatize debug message for keyboard-interactive ([233bf6c](https://github.com/billchurch/webssh2_client/commit/233bf6c6054839792725a0f340636df5259064ae))

### [0.2.23](https://github.com/billchurch/webssh2_client/compare/v0.2.22...v0.2.23) (2024-08-20)


### Features

* introduce maskerjs to mask sensitive debug logs. ([51739f1](https://github.com/billchurch/webssh2_client/commit/51739f1a2b158d31562a841f20af1bca1945bd76))
* reauth disables loginDialog hostInput and portInput ([063b0f1](https://github.com/billchurch/webssh2_client/commit/063b0f17664ef257db1df73395df1878748e5e90))


### Breaking Changes

* changed case of `sshTerm` to `sshterm` to eliminate usability concerns for entering url parameters ([bf9ec2b](https://github.com/billchurch/webssh2_client/commit/bf9ec2be7712ca8d5f3a6f14c4efb128ff6c495b))

### [0.2.22](https://github.com/billchurch/webssh2_client/compare/v0.2.21...v0.2.22) (2024-08-19)


### Features

* `Switch User` or `reauth` support for HTTP Basic ([4c2b9ba](https://github.com/billchurch/webssh2_client/commit/4c2b9babf0d0857bc46af67e4eb052dfc1fd3336))

### [0.2.21](https://github.com/billchurch/webssh2_client/compare/v0.2.20...v0.2.21) (2024-08-19)


### Features

* Refactor terminal settings handling and apply default options ([72077ba](https://github.com/billchurch/webssh2_client/commit/72077ba65f06b863356b6e0e9332e1f35bcc3371))

### [0.2.20](https://github.com/billchurch/webssh2_client/compare/v0.2.19...v0.2.20) (2024-08-18)


### Features

* terminal options configuration from login prompt ([284a3fb](https://github.com/billchurch/webssh2_client/commit/284a3fb94a1c8ac4b050c90ff7adbc9b6b203354))
* terminal settings dialog ([933f607](https://github.com/billchurch/webssh2_client/commit/933f6070c6a4d6b557e58602198f9b2e76e677a3))

### [0.2.19](https://github.com/billchurch/webssh2_client/compare/v0.2.18...v0.2.19) (2024-08-16)


### Features

* add allowReconnect, allowReauth, and autoLog features ([77dbada](https://github.com/billchurch/webssh2_client/commit/77dbada3755da853f71aadc4a555ddbc4e2d42a2))
* capslock indicator for password field ([29d393b](https://github.com/billchurch/webssh2_client/commit/29d393bf43bdc4402073d21e3e43e46780052288))

### [0.2.18](https://github.com/billchurch/webssh2_client/compare/v0.2.17...v0.2.18) (2024-08-14)


### Features

* add clearLog feature, refactoring of logging and dom functions ([de92652](https://github.com/billchurch/webssh2_client/commit/de926529c86a8deae4f8a5672d3dce31e82df9ea))
* change handling of disconnect, maintain terminal display, add error to status, and reset terminal only after reconnect attempt. ([fca5ff3](https://github.com/billchurch/webssh2_client/commit/fca5ff351b2166970c545459ac626612d03fe250))
* sanatizeObject function to obscure passwords in debug messages ([41a4eb0](https://github.com/billchurch/webssh2_client/commit/41a4eb0c20230b0bbbc97e51d9aa11ae4c58ef31))

### [0.2.17](https://github.com/billchurch/webssh2_client/compare/v0.2.16...v0.2.17) (2024-08-13)


### Bug Fixes

* ping timeouts due to duplicate session setup ([10e6576](https://github.com/billchurch/webssh2_client/commit/10e6576ea09124a923abc34e0cedf6047e7a0ef2))

### [0.2.16](https://github.com/billchurch/webssh2_client/compare/v0.2.15...v0.2.16) (2024-07-19)

### 0.2.15 (2024-07-19)


### Features

* add disconnect and reconnect logic ([d8e37d6](https://github.com/billchurch/webssh2_client/commit/d8e37d64be61fc21940b7e68b91894b587deda62))
* add favicon.ico to client.htm ([542a4d7](https://github.com/billchurch/webssh2_client/commit/542a4d73725798863ae74ce4a4236f7b52e97d7b))
* Populate form fields from URL parameters on login page load ([67f2b76](https://github.com/billchurch/webssh2_client/commit/67f2b767cecd4ee83ef0d22008aa43aa6a10f33d))


### Bug Fixes

* handle websocket url properly and mixed security protocols properly ([0aeb798](https://github.com/billchurch/webssh2_client/commit/0aeb7983b543a03af5b2387458d1499a55ab6ddd))
* Update menu button styling and behavior for better user experience ([7402984](https://github.com/billchurch/webssh2_client/commit/7402984517fefd5b44ae386e5e57146d6a0946d5))

## 0.2.14 (2024-07-19)


### Bug Fixes

* Update menu button styling and behavior for better user experience ([7402984](https://github.com/billchurch/webssh2_client/commit/7402984517fefd5b44ae386e5e57146d6a0946d5))


### Features

* add disconnect and reconnect logic ([d8e37d6](https://github.com/billchurch/webssh2_client/commit/d8e37d64be61fc21940b7e68b91894b587deda62))
* add favicon.ico to client.htm ([542a4d7](https://github.com/billchurch/webssh2_client/commit/542a4d73725798863ae74ce4a4236f7b52e97d7b))
* Populate form fields from URL parameters on login page load ([67f2b76](https://github.com/billchurch/webssh2_client/commit/67f2b767cecd4ee83ef0d22008aa43aa6a10f33d))
