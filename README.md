# SEPTIC file format support for Visual Studio Code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://dev.azure.com/EIIDS/vscode-septic/_apis/build/status/equinor.vscode-septic?branchName=master)](https://dev.azure.com/EIIDS/vscode-septic/_build/latest?definitionId=1&branchName=master)

## Features
* Syntax highlighting
* Symbols for navigation (breadcrumbs)
* Bracket matching
* Snippets
* Multi-level folding
* Ensures correct encoding (Windows 1252) for SEPTIC files

## Instructions
If you don't know what the SEPTIC file format is, then you don't need this extension.

Adding the SEPTIC Language Basics extension to VS Code allows you to do the following when loading a SEPTIC .cnfg file:
* Auto-complete commonly used segments of code, called snippets
  * Type e.g. 'sopc' (uncapitalized letters only), and you should see a number of sopcxvr snippet options. Choose the one you want with `arrow up`/`arrow down` and press `Tab` to create a complete sopcxvr section.
  * If you are missing a snippet, let me know and I will add it. Feel free to [make one yourself](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_create-your-own-snippets) and provide me the json.
  * More info on snippets [here](https://code.visualstudio.com/docs/editor/userdefinedsnippets)
* Fold sections of the config file. Either click the small downward-pointing arrows in the gutter to fold a specific section and all its lower-level sections, or use the following shortcuts to fold and unfold sections at different levels:
  * `ctrl-k` `ctrl-0` folds everything.
  * `ctrl-k` `ctrl-j` unfolds everything.
  * `ctrl-k` `ctrl-k` folds/unfolds the region at the cursor.
  * `ctrl-k` `ctrl-1` folds all level 1 sections (e.g. `SopcProc` and `System`) and lower except the level 1 section at the cursor.
  * `ctrl-k` `ctrl-2` folds all level 2 sections (e.g. `SopcMvr` and `CalcModl`) and lower except the level 2 section at the cursor.
  * `ctrl-k` `ctrl-3` folds all level 3 sections (e.g. `CalcPvr`) and lower except the level 3 section at the cursor.
  * More info on folding [here](https://code.visualstudio.com/docs/editor/codebasics#_folding)

## Feedback and contributions
Please let me know of any issues, bugs or requests for modification or new features you may have. 

Easiest is probably to contact me in person at work, or you can use the [Issue tracker](https://github.com/equinor/vscode-septic/issues).

## Additional recommended extensions for working with SEPTIC config files
* [SVN][svn]: For interfacing directly with Subversion server from within VS Code.
* [Bracket Pair Colorizer 2][bracket-pair-colorizer-2]: Helps with bracket nesting.
* [Easy Snippet Maker][easy-snippet-maker]: For creating your own snippets.
* [Color Highlight][color-highlight]: Handy if you want to experiment with colors since it can display the color of hex triplets, e.g. "#f0f0f0", inside VSCode.

[svn]: https://marketplace.visualstudio.com/items?itemName=johnstoncode.svn-scm
[bracket-pair-colorizer-2]: https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer-2
[easy-snippet-maker]: https://marketplace.visualstudio.com/items?itemName=tariky.easy-snippet-maker
[color-highlight]: https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight