# Changelog

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
