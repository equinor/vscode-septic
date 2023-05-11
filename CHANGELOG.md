# Changelog

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
