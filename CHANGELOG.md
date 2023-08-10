# Changelog

## [1.7.4](https://github.com/equinor/vscode-septic/compare/v1.7.3...v1.7.4) (2023-08-10)


### 🔨 Refactor

* improve responsiveness with new tokenizer ([#258](https://github.com/equinor/vscode-septic/issues/258)) ([ea22ab7](https://github.com/equinor/vscode-septic/commit/ea22ab7e4ea5edc0845aa2a2e9d0df1677eec937))


### ⏪️ Revert

* version of @types/vscode to match engine version ([#264](https://github.com/equinor/vscode-septic/issues/264)) ([7b51a48](https://github.com/equinor/vscode-septic/commit/7b51a486ea38e0475090880011f292b27497ccc1))

## [1.7.3](https://github.com/equinor/vscode-septic/compare/v1.7.2...v1.7.3) (2023-08-09)


### 🧹 Chores

* **deps:** bump @types/node from 16.18.38 to 16.18.40 ([#259](https://github.com/equinor/vscode-septic/issues/259)) ([208a702](https://github.com/equinor/vscode-septic/commit/208a7029cd5e82248aef719a24fd58a50244f2e7))
* **deps:** bump @types/vscode from 1.79.1 to 1.81.0 ([#255](https://github.com/equinor/vscode-septic/issues/255)) ([8be3fc7](https://github.com/equinor/vscode-septic/commit/8be3fc7200abeadfb60ab3dca09c907d22c59d1e))
* **deps:** bump @typescript-eslint/parser from 5.61.0 to 5.62.0 ([#242](https://github.com/equinor/vscode-septic/issues/242)) ([150f39d](https://github.com/equinor/vscode-septic/commit/150f39d7ebf042d677fe3dc47c05a8a5399dee35))
* **deps:** bump eslint from 8.44.0 to 8.46.0 ([#248](https://github.com/equinor/vscode-septic/issues/248)) ([a5e8a8e](https://github.com/equinor/vscode-septic/commit/a5e8a8edcd975584d36706ba08037baddc37859c))
* **deps:** bump typescript from 4.9.5 to 5.1.6 ([#225](https://github.com/equinor/vscode-septic/issues/225)) ([2365368](https://github.com/equinor/vscode-septic/commit/23653688e855892401eb264697b8743285d0458e))


### 🐛 Bug Fixes

* add SopcChangeEvr ([#253](https://github.com/equinor/vscode-septic/issues/253)) ([086d0bf](https://github.com/equinor/vscode-septic/commit/086d0bf72c3fd4891bebf2ac90a48acf8a608518))
* no diagnostics for empty refs ([#260](https://github.com/equinor/vscode-septic/issues/260)) ([012e6e2](https://github.com/equinor/vscode-septic/commit/012e6e2944c888164251f3c738b121dd9434a04d))


### 🔨 Refactor

* improve e2e-test coverage ([#243](https://github.com/equinor/vscode-septic/issues/243)) ([f90c609](https://github.com/equinor/vscode-septic/commit/f90c60925029ec595ff91c83c47110feaed212b5))

## [1.7.2](https://github.com/equinor/vscode-septic/compare/v1.7.1...v1.7.2) (2023-07-06)


### 🐛 Bug Fixes

* formatting merging first items in list ([#236](https://github.com/equinor/vscode-septic/issues/236)) ([304ce0c](https://github.com/equinor/vscode-septic/commit/304ce0c5f4dc9413352e3d5873f6c374e0691a0d))


### 🧹 Chores

* **deps:** bump @types/node from 16.18.34 to 16.18.38 ([#229](https://github.com/equinor/vscode-septic/issues/229)) ([26dbeba](https://github.com/equinor/vscode-septic/commit/26dbebaeb4d6c7fd405c2912e3a577ef53674c6e))
* **deps:** bump @types/vscode from 1.78.1 to 1.79.1 ([#193](https://github.com/equinor/vscode-septic/issues/193)) ([aabfdc6](https://github.com/equinor/vscode-septic/commit/aabfdc636a11d695c71930b43e883f409d32cb8c))
* **deps:** bump @typescript-eslint/parser from 5.59.9 to 5.61.0 ([#234](https://github.com/equinor/vscode-septic/issues/234)) ([b6b10a6](https://github.com/equinor/vscode-septic/commit/b6b10a631e1cd953723202692207e85003cf5088))
* **deps:** bump eslint from 8.40.0 to 8.44.0 ([#228](https://github.com/equinor/vscode-septic/issues/228)) ([7535ccc](https://github.com/equinor/vscode-septic/commit/7535cccdcd0f6657668bbbf1dee0f1bb8a305e18))
* **deps:** bump semver from 7.3.8 to 7.5.3 in /client ([#223](https://github.com/equinor/vscode-septic/issues/223)) ([649b6d3](https://github.com/equinor/vscode-septic/commit/649b6d35efece210634bdcff69ec0ab6c9f9c61a))

## [1.7.1](https://github.com/equinor/vscode-septic/compare/v1.7.0...v1.7.1) (2023-07-03)


### 🐛 Bug Fixes

* missing diagnostics for xvrmatrix ([#232](https://github.com/equinor/vscode-septic/issues/232)) ([5a36142](https://github.com/equinor/vscode-septic/commit/5a36142991142fc96ea0bfef60660b278861c961))
* update formatting of lists ([#230](https://github.com/equinor/vscode-septic/issues/230)) ([3fc5880](https://github.com/equinor/vscode-septic/commit/3fc58803d846c6119d3d0364c118e17bd00f24c0))

## [1.7.0](https://github.com/equinor/vscode-septic/compare/v1.6.2...v1.7.0) (2023-06-30)


### 🐛 Bug Fixes

* support arbitrary content for jinja variable ([#224](https://github.com/equinor/vscode-septic/issues/224)) ([36fc3ff](https://github.com/equinor/vscode-septic/commit/36fc3fffe9895eebe45b89307ba9155a30a08baf))


### ✨ Features

* add diagnostics for object attributes ([#213](https://github.com/equinor/vscode-septic/issues/213)) ([5709d35](https://github.com/equinor/vscode-septic/commit/5709d354b984ecaa34fa63407f254af1e016dd1e))
* disable diagnostics for line ([#209](https://github.com/equinor/vscode-septic/issues/209)) ([d3a3511](https://github.com/equinor/vscode-septic/commit/d3a35111a0d422bdd04bb719ef0b3d8ec4780337))

## [1.6.2](https://github.com/equinor/vscode-septic/compare/v1.6.1...v1.6.2) (2023-06-28)


### 🐛 Bug Fixes

* remove diagnostics on pure jinja in alg ([#211](https://github.com/equinor/vscode-septic/issues/211)) ([9718828](https://github.com/equinor/vscode-septic/commit/9718828bfd96d6118d05e41006a9a2fcb1c08022))
* server crashing when multiple workspacefolders open ([#210](https://github.com/equinor/vscode-septic/issues/210)) ([cccdbde](https://github.com/equinor/vscode-septic/commit/cccdbde1ef87d83f0e04f414c354c05600ef1945))

## [1.6.1](https://github.com/equinor/vscode-septic/compare/v1.6.0...v1.6.1) (2023-06-22)


### 🐛 Bug Fixes

* formatter removing identifiers at end of file ([#206](https://github.com/equinor/vscode-septic/issues/206)) ([f7026e3](https://github.com/equinor/vscode-septic/commit/f7026e3ece6ed716d82cfd34deb7a8e22baf4ace))

## [1.6.0](https://github.com/equinor/vscode-septic/compare/v1.5.0...v1.6.0) (2023-06-21)


### 🐛 Bug Fixes

* UAEvr snippet ([#192](https://github.com/equinor/vscode-septic/issues/192)) ([c0ac179](https://github.com/equinor/vscode-septic/commit/c0ac179475fdfa1d2d7b639afd9e16f939ddd9b4))


### ✨ Features

* add diagnostics for object identifiers ([#200](https://github.com/equinor/vscode-septic/issues/200)) ([00d2e55](https://github.com/equinor/vscode-septic/commit/00d2e556f710359ff9e0637b4c09f446e8b389be))
* add formatting of files ([#196](https://github.com/equinor/vscode-septic/issues/196)) ([55834b2](https://github.com/equinor/vscode-septic/commit/55834b262e37921090208720ef3025ae82c1d97d))

## [1.5.0](https://github.com/equinor/vscode-septic/compare/v1.4.0...v1.5.0) (2023-06-09)


### ✨ Features

* add OPCUA objects and snippets ([#183](https://github.com/equinor/vscode-septic/issues/183)) ([4fdb5e7](https://github.com/equinor/vscode-septic/commit/4fdb5e7cc7e096861047d6a99cd254dd644dca50))

## [1.4.0](https://github.com/equinor/vscode-septic/compare/v1.3.0...v1.4.0) (2023-06-09)


### 🐛 Bug Fixes

* bug with wrong files in context ([#178](https://github.com/equinor/vscode-septic/issues/178)) ([2d554c9](https://github.com/equinor/vscode-septic/commit/2d554c97ddef5e40041e74c73285a41bc933d603))
* parsing of variable starting with num ([#180](https://github.com/equinor/vscode-septic/issues/180)) ([a6dd4ed](https://github.com/equinor/vscode-septic/commit/a6dd4ed8ed9441c67c4e247e3c75590eb398137d))
* update error message for empty alg ([#174](https://github.com/equinor/vscode-septic/issues/174)) ([864fc91](https://github.com/equinor/vscode-septic/commit/864fc91b7001dac6ffc41cf52a792cdf3b194ffb))
* update error message for parsing of jinja in alg ([#130](https://github.com/equinor/vscode-septic/issues/130)) ([12badb9](https://github.com/equinor/vscode-septic/commit/12badb9453ff0f0cec2dbbe1347873facb9d2995))
* use Meas instead of MeasBad for Evr snippet ([#152](https://github.com/equinor/vscode-septic/issues/152)) ([f6f63b8](https://github.com/equinor/vscode-septic/commit/f6f63b81f79869d7722b1b9e5a89b64f9324ca77))


### ✨ Features

* add setting for updating level of calcModl ([#175](https://github.com/equinor/vscode-septic/issues/175)) ([1bb8c39](https://github.com/equinor/vscode-septic/commit/1bb8c39d1eb51df28cb8bcefc70ab78e00ff4d12))
* Integration test ([#171](https://github.com/equinor/vscode-septic/issues/171)) ([ff5b9e7](https://github.com/equinor/vscode-septic/commit/ff5b9e73a79ee0cf2fce1c79c189a62a96d7f8bd))


### 🧹 Chores

* **deps:** bump @types/node from 16.18.25 to 16.18.34 ([#166](https://github.com/equinor/vscode-septic/issues/166)) ([15fa8e5](https://github.com/equinor/vscode-septic/commit/15fa8e5c18c2787f69d14d40fb4aa1812ad026af))
* **deps:** bump @typescript-eslint/eslint-plugin from 5.56.0 to 5.59.9 ([#173](https://github.com/equinor/vscode-septic/issues/173)) ([e3a4438](https://github.com/equinor/vscode-septic/commit/e3a4438cf94c824e3c8fec168a1b8bf7f8018cb8))
* **deps:** bump @typescript-eslint/parser from 5.56.0 to 5.59.9 ([#172](https://github.com/equinor/vscode-septic/issues/172)) ([c5099c8](https://github.com/equinor/vscode-septic/commit/c5099c8a109810f1fb584aa4705c201e325865ac))
* **deps:** bump rimraf from 5.0.0 to 5.0.1 ([#161](https://github.com/equinor/vscode-septic/issues/161)) ([b4d0249](https://github.com/equinor/vscode-septic/commit/b4d0249d6e4c3f110b9bf148f9fb718b8f03b2f2))

## [1.3.0](https://github.com/equinor/vscode-septic/compare/v1.2.1...v1.3.0) (2023-05-12)


### ✨ Features

* add hover information on xvr-refs ([#143](https://github.com/equinor/vscode-septic/issues/143)) ([be863b5](https://github.com/equinor/vscode-septic/commit/be863b50a726b79fd14bb0bfb127d6e691818460))
* add support for renaming (sopc)xvrs ([#132](https://github.com/equinor/vscode-septic/issues/132)) ([3694425](https://github.com/equinor/vscode-septic/commit/3694425b0ad6f147ee2dbda842354b2764bfb818))


### 🐛 Bug Fixes

* bug with parsing of jinja-variables in alg ([#144](https://github.com/equinor/vscode-septic/issues/144)) ([5e6767d](https://github.com/equinor/vscode-septic/commit/5e6767d14d025e55492405d832d53ad7f39b755e))

## [1.2.1](https://github.com/equinor/vscode-septic/compare/v1.2.0...v1.2.1) (2023-05-11)


### 🐛 Bug Fixes

* bug in scgcontext that crashes server  ([#139](https://github.com/equinor/vscode-septic/issues/139)) ([b8345de](https://github.com/equinor/vscode-septic/commit/b8345de5ecbe87dfec209623edf211eace1148db))

## [1.2.0](https://github.com/equinor/vscode-septic/compare/v1.1.0...v1.2.0) (2023-05-11)


### ✨ Features

* support references across different config files for scg ([#127](https://github.com/equinor/vscode-septic/issues/127)) ([4be02d2](https://github.com/equinor/vscode-septic/commit/4be02d2647a8d1fac8886f25484e6b5a940c9375))


### 🐛 Bug Fixes

* typo in error message ([#117](https://github.com/equinor/vscode-septic/issues/117)) ([ccd6187](https://github.com/equinor/vscode-septic/commit/ccd618796d3fad8f21ff5f99654bf36435954944))


### 🧹 Chores

* **deps:** bump eslint from 8.36.0 to 8.40.0 ([#128](https://github.com/equinor/vscode-septic/issues/128)) ([77be3cf](https://github.com/equinor/vscode-septic/commit/77be3cf19720bd3f183eaea27b03ae58a8a8fe88))

## [1.1.0](https://github.com/equinor/vscode-septic/compare/v1.0.1...v1.1.0) (2023-05-03)


### 🧹 Chores

* **deps:** bump @types/jest from 29.5.0 to 29.5.1 ([#108](https://github.com/equinor/vscode-septic/issues/108)) ([411db6c](https://github.com/equinor/vscode-septic/commit/411db6c7159f3a5c17432500c09add2caa5c103b))
* **deps:** bump @types/node from 16.11.65 to 16.18.25 ([#107](https://github.com/equinor/vscode-septic/issues/107)) ([935e367](https://github.com/equinor/vscode-septic/commit/935e367e34f706296cada01dcd82a2eb98d2653b))
* **deps:** bump typescript from 4.8.4 to 5.0.4 ([#104](https://github.com/equinor/vscode-septic/issues/104)) ([bcd8b6c](https://github.com/equinor/vscode-septic/commit/bcd8b6c31313d275c51528f935ea6f4703f93b78))


### ✨ Features

* add find references ([#106](https://github.com/equinor/vscode-septic/issues/106)) ([395f28d](https://github.com/equinor/vscode-septic/commit/395f28d3def2f9ce493811a1fa8116926cdfecf6))
* add go-to declaration ([#106](https://github.com/equinor/vscode-septic/issues/106)) ([395f28d](https://github.com/equinor/vscode-septic/commit/395f28d3def2f9ce493811a1fa8116926cdfecf6))
* add go-to definition ([#106](https://github.com/equinor/vscode-septic/issues/106)) ([395f28d](https://github.com/equinor/vscode-septic/commit/395f28d3def2f9ce493811a1fa8116926cdfecf6))

## [1.0.1](https://github.com/equinor/vscode-septic/compare/v1.0.0...v1.0.1) (2023-05-02)


### 📚 Documentation

* update readme to reflect latest version ([#110](https://github.com/equinor/vscode-septic/issues/110)) ([d4fd928](https://github.com/equinor/vscode-septic/commit/d4fd928e20721bff828def2226cc89ae3031e296))


### 🐛 Bug Fixes

* bug with exceeding callstack in symbolProvider ([#111](https://github.com/equinor/vscode-septic/issues/111)) ([46bc452](https://github.com/equinor/vscode-septic/commit/46bc452051c12901cfc6c24d70ee078273926971))

## [1.0.0](https://github.com/equinor/vscode-septic/compare/v0.5.0...v1.0.0) (2023-05-02)


### 📦 Build system

* dependabot should ignore node &gt;16.x ([d0c6685](https://github.com/equinor/vscode-septic/commit/d0c6685cebb5da30d312c57f4fa1fa97b61ea7ad))


### 🧹 Chores

* **deps:** bump @typescript-eslint/eslint-plugin from 5.40.0 to 5.59.0 ([#99](https://github.com/equinor/vscode-septic/issues/99)) ([ebd4f20](https://github.com/equinor/vscode-septic/commit/ebd4f201e10dd1248036cfb751808050e23492eb))
* **deps:** bump @typescript-eslint/parser from 5.40.0 to 5.59.0 ([#98](https://github.com/equinor/vscode-septic/issues/98)) ([a677eab](https://github.com/equinor/vscode-septic/commit/a677eaba47950cb713acd2aeec5c01f5b44dbe72))
* **deps:** bump actions/checkout from 2 to 3 ([#14](https://github.com/equinor/vscode-septic/issues/14)) ([adac926](https://github.com/equinor/vscode-septic/commit/adac9261ac5cd69cff99d9cc0246e4a30d5b434d))


### ✨ Features

* convert to language server architecture ([#95](https://github.com/equinor/vscode-septic/issues/95)) ([1ee263a](https://github.com/equinor/vscode-septic/commit/1ee263a5ae87cba977fcadd93f1db50fc214a165))
* provide completion for (Sopc)Xvrs. Suggest existing Xvrs when creating new SopcXvr and vice versa. ([6dd676e](https://github.com/equinor/vscode-septic/commit/6dd676e5b4d96b7083061979ed55dbebe62da3fd))
* provide completion of Xvrs and calcs in CalcPvr.Alg ([6dd676e](https://github.com/equinor/vscode-septic/commit/6dd676e5b4d96b7083061979ed55dbebe62da3fd))
* provide diagnostics for calcs ([#105](https://github.com/equinor/vscode-septic/issues/105)) ([6dd676e](https://github.com/equinor/vscode-septic/commit/6dd676e5b4d96b7083061979ed55dbebe62da3fd))
* provide error reports if the calc is not parsable. ([6dd676e](https://github.com/equinor/vscode-septic/commit/6dd676e5b4d96b7083061979ed55dbebe62da3fd))
* provide warnings for calcs that are not supported in Septic. ([6dd676e](https://github.com/equinor/vscode-septic/commit/6dd676e5b4d96b7083061979ed55dbebe62da3fd))
* provide warnings for references to Xvrs that are not in the config. ([6dd676e](https://github.com/equinor/vscode-septic/commit/6dd676e5b4d96b7083061979ed55dbebe62da3fd))

## [0.4.0] - 2020-02-16

First release in marketplace.

### Added

-   Support for Jinja2 grammar
-   Snippets for mastertcip and remotetcip

### Changed

-   Better syntax highlighting

## [0.3.0] - 2019-11-04

### Added

-   Symbol navigation. This enables
    -   [Breadcrumbs](https://code.visualstudio.com/docs/editor/editingevolved#_breadcrumbs)
    -   [Go to symbol](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-symbol)
    -   [Open symbol by name](https://code.visualstudio.com/docs/editor/editingevolved#_open-symbol-by-name) across current workspace

## [0.2.0] - 2019-10-31

### Added

-   Multi-level folding

## [0.1.0] - 2019-10-30

### First release as .vsix file. Released with the following features:

-   Syntax highlighting
-   [Bracket matching](https://code.visualstudio.com/docs/editor/editingevolved#_bracket-matching)
-   [Snippets](https://code.visualstudio.com/docs/editor/userdefinedsnippets)
-   Ensures correct encoding (Windows 1252) for Septic files
