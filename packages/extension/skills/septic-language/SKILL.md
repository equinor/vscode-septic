---
name: septic-language
description: Guide for the syntax and semantics of the Septic configuration language (.cnfg), including best practices and examples.
---

# Septic Configuration Language Skill

This skill helps you understand the Septic configuration language and how to use this for writing and maintaining Septic config files (`.cnfg`). It covers syntax rules, common object types, attributes, and best practices for structuring your config files effectively.

## Overview

Septic is a domain-specific configuration language for configuring Model Predictive Control (MPC) applications.

## When to Use This Skill

Activate this skill when working with:

- Files with `.cnfg` extension (Septic configuration files)
- `scg.yaml` configuration files

## Language Characteristics

### File Encoding

- **Encoding**: Windows-1252 or UTF-8

### Object Structure

Septic uses an object structured syntax, where each object is defined by its type and name, followed by a set of attributes. The general structure is as follows:

```septic
  ObjectType:    ObjectName
         Attr1=  value1
         Attr2=  value2
```

#### Object Syntax Rules:

1. **Object Declaration**: `ObjectType: ObjectName` (2 spaces indent, colon separator)
2. **Attributes**: Right-aligned attribute names followed by `=` and value
3. **Indentation**: 2 spaces for object type, attributes aligned to column 16
4. **Alignment**: Attribute values align after `=` sign
5. **Case Sensitivity**: Object types and attribute names are case-sensitive

#### Attribute Value Types

The attributes can have the following types of values:

- **String**: Enclosed in double quotes (e.g., `"Description of variable"`)
- **Number**: Integer or floating-point (e.g., `100`, `3.14`, `-1`, `1e-5`)
- **Enums**: `ON`, `OFF`, `DOUBLE`
- **Variables**: Referencing other objects (e.g., `OtherVariable`)
- **BitMasks**: binary string of a given length (e.g., `0000000000000000000000000000001` or `10000011`)
- **Lists**: Multiple string, numberi og variable values. The number of values is the first number after the attribute name (e.g., `3` in `Xvrs= 3 "Option1" "Option2" "Option3"`)

### Object Hiarchy

Septic objects are organized in an object hiarchy, where some objects are contained within others. For example, `CalcPvr` objects are contained within a `CalcModl` object. The hiarchy is defined by the order of the objects in the file.

A description of the different objects and their respective parent objects on yaml format can be found in [objects.yaml](./references/objects.yaml).

### Variables

Variables are used for storing data and can be referenced in other parts of the config file globally. Variable follow the same structure as other objects.

Variable types:

- **Mvr**: Manipulated variable, typically representing a process variable that can be manipulated
- **Cvr**: Controlled variable, typically representing a variable that is manipulated by the controller
- **Tvr**: Trending variable, typically measurements that are read from the process and used for trending and diagnostics
- **Evr**: Environment variable, used for storing calculations results, constants and writting data
- **Dvr**: Disturbance variable, measured disturbances to the process

### Input/Output

The inputs and outputs of the MPC controller is defined in the SopcProc/UAProc objects. Sopc-objects or UA-objects are used to define the external tags that the controller reads from or writes to. The tags can be defined using the `CvrTag`, `MeasTag`, `SpTag` attributes, depending on the object type.

The data is written to the object with the same name as the Sopc or UA object. For example, if you have a `SopcCvr` object named `Temperature` the data will be written to the `Cvr` object named `Temperature`.

### Comment Styles

Septic supports multiple comment styles:

```septic
// Line comment (C++ style)

/* Block comment
   (C style) */

{# Jinja-style comment
   (used in SCG templates) #}
```

### Calculations and Expressions

Septic language supports defining calculations using `CalcPvr` objects, which can reference other variables and perform mathematical and logical operations. The `Alg` attribute of a `CalcPvr` object contains the expression to be evaluated. Related calculations can be grouped under a `CalcModl` object.

CalcPvr objects support mathematical and logical expressions in the `Alg` attribute:

```septic
  CalcPvr:       CalculatedValue
         Text1=  "Flow rate calculation"
         Text2=  "Calculated as flow measurement times density"
           Alg=  "FlowMeas * Density / 1000"
```

The result of the calculation can be stored in a variable and used as an input to other calculations. The result is stored in the variable with the same name as the `CalcPvr` object (`CalculatedValue` in the example above). Only a single expression is allowed in the `Alg` attribute, but it can reference other variables and calculations.

To implement more complex calculations, you can break down the logic into multiple `CalcPvr` objects and reference them in a hierarchical manner. For example, you can have one `CalcPvr` that calculates an intermediate value, and another `CalcPvr` that uses that intermediate value in its calculation.

#### Supported Operations:

- **Arithmetic**: `+`, `-`, `*`, `/`
- **Comparison**: `>`, `<`, `>=`, `<=`, `==`,
- **Logical**: `and(expression1, expression2, ...)`, `or(expression1, expression2, ...)`, `not(expression)`
- **Functions**: To get the list of available functions, use the `getFunctions` tool.

#### Example Complex Expression:

```septic
  CalcPvr:       ClippedPressure
         Text1=  "Clipped pressure"
           Alg=  "if(Temperature > 80, max(Pressure, 5), min(Pressure, 3))"
```

Examples of commonly used calculations can be found in [references/calc\_\*.cnfg](./references/).

### Formatting Conventions

#### Alignment Rules:

1. Object types start at column 3 (2-space indent)
2. Object names start at column 17
3. Attribute names right-aligned to column 16
4. Equals sign at column 17
5. Values start at column 20

### Multi-line Attributes

Some attributes (like lists) span multiple lines:

```septic
     UserEnums=  3
                 "Option1" "Option2" "Option3" (max 5 items pr line)
```

### Diagnostic Suppression

Suppress specific diagnostics using special comments:

```septic
  Mvr:           TestMvr  // noqa
         Text1=  ""
        MvrTag=  ""  // noqa: E001
```

## Guidelines

### 1. Naming Conventions

- Use descriptive names reflecting the variable's purpose
- Use CamelCase for object names and attributes
- Common patterns: `$Area/Equipment$Variable` (e.g., `WellATemprature`)
- Suffixes often indicate type: `_SP` (setpoint), `_PV` (process value)

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

### 5. SCG Templates

- Parameterize repetitive configurations using SCG
- Validate template output before deployment
- Use descriptive variable names in templates
- Add comments explaining template logic

## Best Practices

### 1. Adding a calculation

When adding a complex calculation, follow these steps:

- Check the available functions and operators for use in Alg expressions (using the `getFunctions` tool)
- Check the existing variables and calculations to see if any can be reused or referenced (using the `getVariables` tool)
- Plan the calculation logic and break it down into intermediate steps if needed
- Create a new `Evr` variable to store the intermediate or final result
- Define a `CalcPvr` object with the appropriate `Alg` expression
- Verify the calculation logic and ensure all referenced variables and functions are valid

### 2. Adding a variable

When adding a variable, follow these steps:

- Choose the appropriate variable type (Mvr, Cvr, Tvr, Evr, Dvr) based on its purpose
- Use a descriptive name that reflects the variable's purpose
- Fill in the Text1 and Text2 attributes with meaningful descriptions
- If the variable is an input or output, ensure it is properly referenced in the corresponding Sopc or UA object

## Code Completion Hints

When suggesting code:

1. **Maintain alignment**: Respect column positions for attributes
2. **Complete attribute sets**: Suggest all common attributes for an object type
3. **Type-appropriate values**: Suggest realistic values for attributes (e.g., PlotMax > PlotMin)
4. **Naming consistency**: Maintain naming patterns within a file
5. **Unit awareness**: Suggest appropriate units for the variable type
6. **Calculation validation**: Ensure Alg expressions reference valid variables and follow syntax rules

## Integration Points

- **VSCode Extension**: Provides IntelliSense, diagnostics, formatting
- **CLI Tool (sca)**: Command-line linting and formatting
- **SCG**: Template-based configuration generation

## Related Files

- Configuration files: `*.cnfg`
- SCG configuration: `scg.yaml`
- SCG templates: `scg/templates/*.cnfg`
- Data sources: `*.csv`, `*.yaml` (for SCG)

**Remember**: Septic is used in safety-critical industrial systems. Accuracy and correctness are paramount. When unsure, suggest conservative approaches and recommend validation.
