# Overview

Septic is a domain-specific configuration language for configuring Model Predictive Control (MPC) applications

## Object Structure

Septic uses an object structured syntax, where each object is defined by its type and name, followed by a set of attributes. The general structure is as follows:

```septic
  ObjectType:    ObjectName
		 Attr1=  value1
		 Attr2=  value2
```

### Object Syntax Rules:

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

To get overview of available variables use the `getVariables` tool.

To implement more complex calculations, you can break down the logic into multiple `CalcPvr` objects and reference them in a hierarchical manner. For example, you can have one `CalcPvr` that calculates an intermediate value, and another `CalcPvr` that uses that intermediate value in its calculation.

#### Supported Operations:

- **Arithmetic**: `+`, `-`, `*`, `/`
- **Comparison**: `>`, `<`, `>=`, `<=`, `==`,
- **Logical**: `and(expression1, expression2, ...)`, `or(expression1, expression2, ...)`, `not(expression)`
- **Functions**: To get the list of available functions, use the `getFunctions` tool.

### Comment Styles

Septic supports multiple comment styles:

```septic
// Line comment (C++ style)

/* Block comment
   (C style) */

{# Jinja-style comment
   (used in SCG templates) #}
```

Suppress specific diagnostics using special comments:

```septic
  Mvr:           TestMvr  // noqa
         Text1=  ""
        MvrTag=  ""  // noqa: E001
```
