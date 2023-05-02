# SEPTIC file format support for Visual Studio Code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://dev.azure.com/EIIDS/vscode-septic/_apis/build/status/equinor.vscode-septic?branchName=master)](https://dev.azure.com/EIIDS/vscode-septic/_build/latest?definitionId=1&branchName=master)

## New stuff

-   Check [releases](https://github.com/equinor/vscode-septic/releases) for change log between the different versions.

## Features

-   Syntax highlighting
-   Symbols for navigation (breadcrumbs)
-   Bracket matching
-   Snippets
-   Multi-level folding
-   Completion
    -   Suggest Xvrs when creating identifier for SopcXvrs (vice versa)
    -   Suggest Xvrs when creating identifier for CalcPvr
    -   Suggest Xvrs and Calcs when editing CalcPvr Algs
-   Diagnostics for CalcPvr Algs
    -   Report errors if unable to parse calc (missing parenthesis, incomplete expression, unexpected tokens etc.)
    -   Verify that the used calcs are valid SEPTIC calcs
    -   Verify that referenced Xvrs exist in the file
-   Ensures correct encoding (Windows 1252) for SEPTIC files

## Instructions

If you don't know what the SEPTIC file format is, then you don't need this extension.

Adding the SEPTIC extension to VS Code allows you to do the following when loading a SEPTIC .cnfg file:

-   Auto-complete (Sopc)Xvr names and Calcs.
-   Diagnose certain fault modes (missing parenthesis in calcs, mistyped Calc or Xvr names etc.)
-   Auto-complete commonly used segments of code, called snippets
    -   Type e.g. 'sopc' (uncapitalized letters only), and you should see a number of sopcxvr snippet options. Choose the one you want with `arrow up`/`arrow down` and press `Tab` to create a complete sopcxvr section.
    -   If you are missing a snippet, let us know and we will add it. Feel free to [make one yourself](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_create-your-own-snippets) and provide us the json.
    -   More info on snippets [here](https://code.visualstudio.com/docs/editor/userdefinedsnippets)
-   Fold sections of the config file. Either click the small downward-pointing arrows in the gutter to fold a specific section and all its lower-level sections, or use the following shortcuts to fold and unfold sections at different levels:
    -   `ctrl-k` `ctrl-0` folds everything.
    -   `ctrl-k` `ctrl-j` unfolds everything.
    -   `ctrl-k` `ctrl-k` folds/unfolds the region at the cursor.
    -   `ctrl-k` `ctrl-1` folds all level 1 sections (e.g. `SopcProc` and `System`) and lower except the level 1 section at the cursor.
    -   `ctrl-k` `ctrl-2` folds all level 2 sections (e.g. `SopcMvr` and `CalcModl`) and lower except the level 2 section at the cursor.
    -   `ctrl-k` `ctrl-3` folds all level 3 sections (e.g. `CalcPvr`) and lower except the level 3 section at the cursor.
    -   More info on folding [here](https://code.visualstudio.com/docs/editor/codebasics#_folding)
-   Settings for diagnostics can be updated using the standard settings manager for VsCode (`ctrl+,`). Search for Septic in the search field and update the relevant settings. Important to note that the settings for the workspace usually overwrite the settings for the user, thus make sure you update both if the settings are not applied properly.

## Feedback and contributions

Please let us know of any issues, bugs or requests for modification or new features you may have.

Use the [Issue tracker](https://github.com/equinor/vscode-septic/issues).

## Additional recommended extensions for working with SEPTIC config files

-   [Snippet Creator][snippet-creator]: For creating your own snippets.
-   [Color Highlight][color-highlight]: Handy if you want to experiment with colors since it can display the color of hex triplets, e.g. "#f0f0f0", inside VSCode.

[snippet-creator]: https://marketplace.visualstudio.com/items?itemName=wware.snippet-creator
[color-highlight]: https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight
