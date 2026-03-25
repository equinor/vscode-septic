---
name: writing-septic-config
description: Write and maintain Septic configuration files (.cnfg) effectively.
---

# Writing Septic Configuration Skill

This skill helps you how to write and maintain Septic configuration files, the configuration syntax and how to use this for writing and maintaining Septic config files (`.cnfg`).

Septic is a domain-specific configuration language for configuring Model Predictive Control (MPC) applications. The configuration uses a text based structured format (see lanuage reference) and is typically generated using the Septic Config Generator (SCG) tool, which uses YAML configuration files and templates to generate the final `.cnfg` files.

Check the relevant reference files for detailed information on the Septic language, project structure and config generator:

## When to Use This Skill

Activate this skill when working with:

- Files with `.cnfg` extension (Septic configuration files)
- `scg.yaml` configuration files

## Best Practices

### 1. Updating existing configurations

- Check if the change is in a template or a generated config file. If it's in a generated file, update the template or source data instead.
- Review the entire config to understand dependencies before making changes
- Make a step by step plan for updating the relevant configuration files
- Validate the update with the built-in diagnostics in the editor

### 2. Adding a calculation

When adding a complex calculation, follow these steps:

- Check the available functions and operators for use in Alg expressions (using the `getFunctions` tool)
- Check the existing variables and calculations to see if any can be reused or referenced (using the `getVariables` tool)
- Check for relevant examples in the `examples/` directory for similar patterns
- Plan the calculation logic and break it down into intermediate steps if needed
- Create a new `Evr` variable to store the intermediate or final result
- Define a `CalcPvr` object with the appropriate `Alg` expression
- Verify the calculation logic and ensure all referenced variables and functions are valid using the built-in diagnostics in the editor

### 3. Adding a variable

When adding a variable, follow these steps:

- Choose the appropriate variable type (Mvr, Cvr, Tvr, Evr, Dvr) based on its purpose
- Use a descriptive name that reflects the variable's purpose
- Fill in the Text1 and Text2 attributes with meaningful descriptions
- Place the variable in the appropriate section of the config file based on its role (e.g., input variables in SopcProc, calculated variables in DmmyAppl, cvr/mvr variables in MpcAppl)
- If the variable is an input or output, ensure it is properly referenced in the corresponding Sopc or UA object

### 4. Generalizing configuration for multiple equipment

When you have multiple similar equipment (e.g., wells) that require similar configuration, consider using the Septic Config Generator (SCG) to create templates and data sources for efficient management.

- Identify the repeating patterns in the configuration that can be parameterized (e.g., tuning parameters for each well)
- Check the existing templates and data sources to see if they can be reused or adapted. Add new templates or data sources if needed.
- Update SCG YAML files to define how the new/updated templates and data sources combine to generate the final config
- Update the necessary data sources (e.g., CSV files) with the specific values for each equipment by adding rows (new instances) or columns (new parameters)

## Reference Files

- **Septic Language Reference**: [references/septic-language.md](./references/septic-language.md) - Detailed reference for Septic syntax, constructs, and best practices. Should be used as the primary reference for writing Septic config files.
- **Septic Project Structure**: [references/septic-project-structure.md](./references/septic-project-structure.md) - Overview of the typical project structure. Should be sued when asked about where to place files or how to structure a Septic project.
- **Septic Config Generator (SCG)**: [references/septic-config-generator.md](./references/septic-config-generator.md) - Reference for writing SCG YAML configuration files and templates. Should be used when asked about updating or writing SCG config files.

## Examples

### Object types and attributes

- **Objects** - [/objects](./objects/) contains examples of different object types and their attributes. Files are named `{objecttype}.cnfg` (lower case object type) and should be read before creating an instance of that particular object type.

### Calculations

- **General use of calculations**: [examples/calcs.cnfg](./examples/calcs_general.cnfg) demonstrates various CalcPvr objects with different types of expressions, including use of functions and referencing other variables.
- **Implementation of deadband**: [examples/calc_deadband.cnfg](./examples/calcs_deadband.cnfg) shows how to implement a deadband using CalcPvr and logical expressions.
- **Implementation of a state machine**: [examples/calcs_statemachine.cnfg](./examples/calcs_statemachine.cnfg) demonstrates how to implement a state machine using calculations in a DmmyAppl, where the current state is determined based on defined transitions and can be used in other calculations.

### Layouts of configuration files

- **System layout**: [examples/System.cnfg](./examples/System.cnfg) shows the typical layout of the system configuration file, which usually contains the general configuration of the system.
- **SopcProc layout**: [examples/sopcproc.cnfg](./examples/SopcProc.cnfg) shows the typical layout of a SopcProc file. These files define the input and outputs opc-tags for the MPC.
- **DmmyAppl layout**: [examples/dmmyappl.cnfg](./examples/DmmyAppl.cnfg) shows the typical layout of a DmmyAppl file. These files typically contain calculations and variables for storing calculation results and measurements from the process.
- **MpcAppl layout**: [examples/mpc.cnfg](./examples/MpcAppl.cnfg) shows the typical layout of the main MPC config file, which contains the configuration of the MPC controller and references to the variables and calculations defined in the DmmyAppl and SopcProc files.
- **DmmyApplPost layout**: [examples/dmmyapplpost.cnfg](./examples/DmmyApplPost.cnfg) shows the typical layout of a DmmyApplPost file, which contains calculations that are performed after the main MPC calculations.
- **DisplayGroup layout**: [examples/DspGroup.cnfg](./examples/DspGroup.cnfg) shows example layout of a DisplayGroup file, which contains configuration for the HMI (plotting of variables, tables, etc.).

### SCG

- **SCG/Jinja2 in templates**: [examples/scg.cnfg](./examples/scg.cnfg) shows examples of how to use SCG/Jinja2 syntax in SCG templates for generating Septic config files.

## Guidelines

### 1. Naming Conventions

- Use descriptive names reflecting the variable's purpose
- Use CamelCase for object names and attributes
- Common patterns: `$Area/Equipment$Variable` (e.g., `WellATemprature`)

### 2. Grouping Related Objects

- Group related objects together (e.g., all variables for one equipment)
- Use CalcModl containers for related calculations

### 3. Documentation

- Always fill Text1 and Text2 with meaningful descriptions
- Add comments explaining complex logic or unusual configurations
- Document tag references and their sources

### 4. Calculations

- Keep Alg expressions readable - break complex logic into multiple CalcPvr objects
- Verify referenced variables and functions exist and are correctly named
- Iteratilively validate calculations during development

### 5. SCG Templates

- Parameterize repetitive configurations using SCG
- Validate template output before deployment
- Use descriptive variable names in templates
- Add comments explaining template logic
- Check examples of SCG/Jinja2 syntax in the `examples/` directory when writing in templates

## Code Completion Hints

When suggesting code:

1. **Maintain alignment**: Respect column positions for attributes
2. **Complete attribute sets**: Suggest all common attributes for an object type
3. **Type-appropriate values**: Suggest realistic values for attributes (e.g., PlotMax > PlotMin)
4. **Naming consistency**: Maintain naming patterns within a file
5. **Unit awareness**: Suggest appropriate units for the variable type
6. **Calculation validation**: Ensure Alg expressions reference valid variables and follow syntax rules

**Remember**: Septic is used in safety-critical industrial systems. Accuracy and correctness are paramount. When unsure, suggest conservative approaches and recommend validation.
