# Septic config file support for Visual Studio Code

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://dev.azure.com/EIIDS/vscode-septic/_apis/build/status/equinor.vscode-septic?branchName=master)](https://dev.azure.com/EIIDS/vscode-septic/_build/latest?definitionId=1&branchName=master)

## Features

-   Syntax highlighting
-   Symbols for navigation (breadcrumbs)
-   Bracket matching
-   Snippets
-   Multi-level folding
-   Renaming of (Sopc)Xvrs
-   Completion
    -   Suggest relevant Xvrs when writing identifiers for objects
    -   Suggest relevant Xvrs when writing values for attributes that references Xvrs
    -   Suggest Xvrs, public properties and calcs when editing CalcPvr.Alg
-   Diagnostics
    -   Disable diagnostics for certain lines using
    -   Report errors if unable to parse calc (missing parenthesis, incomplete expression, unexpected tokens etc.)
    -   Verify that the used calcs are valid Septic calcs
    -   Verify that referenced Xvrs exist in the file
-   Hover:
    -   Display the Text1 and Text2 if non empty from the associated xvr when hovering over an (Sopc)Xvr reference.
    -   Display documentation for object type when hovering over object type (e.g. Evr:)
    -   Display documentation for object attribute when hovering over object type (e.g. Meas=)
    -   Display documentation for calc when hovering over calc identifier (e.g. intpoltype1(...) )
-   Ensures correct encoding (Windows 1252) for Septic files
-   Formatting: Formats files similar to formatting done by Septic. See instructions for more info,
-   GoToDefinition: Goes to the declaration of the connected Xvr when referenced (e.g. in calcs, SopcXvr etc.)
-   GoToDeclaration: Goes to the declaration of the connected SopcXvr when referenced (e.g. in calcs, Xvr etc.)
-   Find References: Finds all references to a (Sopc)Xvr (e.g. in calcs, object declaration, XvrPlot etc.)
-   Ignore Diagnostics for specified paths.
-   Documentation: Built in documentation of objects/attributes and calcs based on source code.
-   SignatureHelp: Signature help for calcs
-   Code Actions: Fixing references to unknown Evrs in calcs
-   Co-Pilot: Chat interface with specialized chat participant for generating Septic calculations. Quick fix for generating calculation for selected CalcPvr based on Text1 description
-   Command for extracting all OPC-tags used in the config/scg-context
-   Command for detecting cycles in calcs
-   Command for comparing configs

## Instructions

If you don't know what the Septic file format is, then you don't need this extension.

Adding the Septic extension to VS Code allows you to do the following when loading a Septic .cnfg file:

-   Auto-complete for references to other objects (identifiers and attributes), object attributes and calcs.
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
-   Diagnostics (Errors/Warnings) for a certain line can be disabled by writing `// noqa` or `{# noqa #}` at the same line. It is recommended to use the jinja version when suppressing diagnostics when using scg in order to get proper diagnostics on the generated config. To disable certain errors/warnings write `{# noqa: Ennn, Wnnn #}` or `// noqa: Ennn, Ennn` (i.e. `noqa` + `:` + comma separated list of errors). The relevant error codes are displayed on the errors/warnings (e.g. `septic Enn`). To disable all diagnostics, use the `septic.diagnostics.enabled` setting. Diagnostics can be ignored for certain files by adding the path of the file to the `septic.ignored.paths` setting together with an array with the specific codes that should be ignored. Empty array is interpreted as ignore all codes.  `*` can be used as a wildcard i.e. you can write `templates/*` to ignore all files in the folder `templates`. Examples: `"templates_sim/Sopc*": []` will ignore all diagnostics from files that matches the pattern, `"/templates_main/SmpcAppl.cnfg": ["W501"]` will ignore all diagnostics with code W501. The paths are calculated relative the workspace folder(s) root(s) i.e. `templates/*`, `/templates/*` and `./templates/*` are equivalent. This setting should be set on a workspace level in order avoid unintentionally ignoring files when switching between projects.

    -   Code actions for adding comment that disables diagnostics for a certain code is available. The code action is only available if there are no non-disable-diagnostics comments on the same line, and will either insert a new comment or update existing disable comment.

-   Formatting of cnfg files can be enabled by setting `septic.formatting.enabled = True` in the settings. Comments `// or /* */` and jinja-comments `{#   #}` are not formatted. Everything between the jinja expressions `{% for w %}` ... `{% endfor %}` and `{% if %}` ... `{% endif %}` are not formatted. To avoid formatting certain sections of the file the flags `{# format:off #}` and `{# format:on #}` can be used to turn off and on again formatting (Tip: snippets available by writing `formaton/off`).

-   Documentation of objects and calcs are available by hovering over the object/calc definition. Hovering on object definition will provide an overview of the object and related attributes. For more information about a certain attribute (datatype, description etc.), hover over the definition of the attribute. Hovering over a calc will provide information about parameters, return values, quality etc.

-   SignatureHelp is provided when writing calcs inside CalcPvr.Alg. The signature is shown with the active parameter highlighted together with the documentation of the active parameter. SignatureHelp can be manually activated by pressing `Ctrl + Shift + Space`.

-   Search functionality for calcs are builtin into the completion. To start searching, start typing the search word into the CalcPvr.Alg field and all calcs that has the relevant search word in the documentation is included in the filtered results. Pressing `Ctrl + Space` starts the completion without a starting phrase and can be used to browse all available calcs and variables inside a CalcPvr.Alg.

-   Code action for fixing references to unknown Xvrs are provided for CalcPvr. The code action can be activated by hovering over the relevant diagnostics in the file and pressing the `QuickFix` button. You can then select the `Insert Evr` code action. An Evr with the same name as the missing reference will then be inserted within the same DmmyAppl as the CalcPvr. The placement can be adjusted by changing the setting `septic.codeActions.insertEvrPosition`. `Top` means that the evr is inserted right below the DmmyAppl object, while `bottom` means right above the CalcModl object

-   Commands can be run by pressing `Ctrl+Shift+P` and searching for `Septic`. 
    - List OPC Tag: Select the desired config/scg-context from the list of available configs/scg-context. If the desired config is not listed, make sure that it is placed in the workspace folder and open the file. A csv file with the OPC-tags is generated in the root of the workspace.
    - Detect cycles: Select the desired config/scg-context from the list of available configs/scg-context. If the desired config is not listed, make sure that it is placed in the workspace folder and open the file. A text file with all the detected cycles in the config/scg-context sorted by length is generated in the root of the workspace.
    - Compare configs: Select the previous version of the config from the file explorer. Select the current version of the config from the file explorer. The user can select if the default settings for comparing configs or provide their own settings. Settings are provided in yaml-files and the user are promted to either select the default or a yaml file in the current workspace. A text file with the detected changes is generated in the root of the workspace. Tip: Press `Ctrl + k Ctrl + 0` to get a dense view of all updated objects. Example settings file:
    
        ```yaml
        ignoredVariables: # List of regexes for variables that should be ignored
        - ^A1.*
        ignoredObjectTypes: # List of object types that should be ignored
        - DisplayGroup
        ignoredAttributes: # List of attributes pr object type that should be ignored
        - objectName: Evr
            attributes:
            - Meas
        ```

The extension supports Septic projects that uses the Septic Config Generator (SCG). The SCG-config file for the project is loaded and the relevant `.cnfg` files (required to be in the templates folder) listed in the layout section are loaded into a common context that shares references etc.

Septic Co-Pilot features powered by Large Language Models (LLM): 
- Chat participant `@septic`. The following commands are available:
    - `/calculation` which is specialized in generating calculations based on the description from the user. The suggested calculations are quality checked by the Septic diagnostics provider to increase the quality of the output.
    - `/scg` which is specialized in understanding Septic Config Generator (scg) contexts and sources. The participant can be used to modify scg sources on csv format e.g. add a new well to an scg source or update the values of certain cells. Use the scg-configs that are attached to the context or select the scg-config based on the open Septic config if non is attached.
- Code action for generating Alg attribute for a CalcPvr based on the Text1 description is available by selecting the relevant CalcPvr with the cursor and selecting `Generate Calc: CalcPvrName` in the code action options. The generated calc is filled in the Alg field.The suggested calculation is quality checked by the Septic diagnostics provider to increase the quality of the output. Co-Pilot reiterate up to 3 times based on the feedback from the diagnostics provider.

`@septic` use tools to perform different actions. The different commands acts as agents with a given set of tools that it can call. A tool can be used to gather more context (e.g. get documentation of all functions), perform non-modifying actions (e.g. validate a given calculation) or perform modifying actions (e.g. add/delete a row to an scg source). The participant will always ask for permission before using a tool with a modifying action, while all tools related to gathering context and non-modifying actions will be called without asking for permission.

Septic documentation is used as input to the Large Language Models (LLM) powering the Co-Pilot and is selected based on the selected version in the workspace.

The extension provides a dedicated view for working with Septic projects. The view offer functionality for quick navigation between applications, SCG-config files and templates. Editing functionality for SCG-config is integrated in the view. Some of the functionality are dependent on that the project uses the best practices repo/application structure.

![](./images/septic_view.PNG)

 A separate view for tagged functions is offered in the terminal view.

 ![](./images/septic_functions_view.PNG)

 A tagged function is created by adding a `#functionName` in a `CalcPvr.Text2`. All calculations and inputs that the CalcPvr is dependent on is extracted. The recursive depth of the tree is can be set by using `#functionName(depth)`


```cpp
  CalcPvr:       {{Wellname}}State
         Text1=  "Current state of the state machine"
         Text2=  "#stateMachine(2)"
           Alg=  "setgood(if({{Wellname}}IntermediateState > 0, {{Wellname}}IntermediateState, {{Wellname}}State))"
```

Model files (".mdf" or ".pdf") can be plotted by right clicking the model file in the file explorer and selecting `Septic: Plot Model File`

## Feedback and contributions

Please let us know of any issues, bugs or requests for modification or new features you may have.

Use the [Issue tracker](https://github.com/equinor/vscode-septic/issues).

## Additional recommended extensions for working with Septic config files

-   [Snippet Creator][snippet-creator]: For creating your own snippets.
-   [Color Highlight][color-highlight]: Handy if you want to experiment with colors since it can display the color of hex triplets, e.g. "#f0f0f0", inside VSCode.
-   [YAML][vscode-yaml]: Useful for validating and providing help for SCG config files. Septic extension provides default configuration of schemas for this extension.

[snippet-creator]: https://marketplace.visualstudio.com/items?itemName=wware.snippet-creator
[color-highlight]: https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight
[vscode-yaml]: https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml