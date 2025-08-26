---
applyTo: '**/*.cnfg'
---
# Configuration format and calculation syntax

## Configuration file format:

The configuration file is a plain text file that defines the objects and their attributes. 

Configuration of objects:

* A new object is defined by "ObjectType:  ObjectName" 
* An object's attributes are defined by adding lines with "AttributeName= AttributeValue" beneath the object definition. 
* Attribute values are one of the following types: string ("value") int (1, 2)  floats (1.2, 5.3) enums (DEFAULT, BOOL, etc.). It can also be a list of the described data types. List are   defined with the number of items followed by the values space separated 
* Jinja expressions in object names are allowed Example: `{{ Something }}`ObjectName
* Always use camel case when suggesting object names


## Calculation syntax:

Calculations are defined in the configuration file as follows: Alg= "..."

Always follow the following rules and syntax when suggesting code for calculations

### Rules
* Supported operators: +, -, *, /, %
* Supported comparison operators: ==, >, >=, <=, <
* Supported logical functions: and(condition1, condition2, ..., conditionN), or(condition1, condition2, ..., conditionN), not(condition)
* Grouping with parentheses: (...)
* References to objects in the configuration file are allowed by using the object name
* All non-zero values are considered true
* All functions return a float
* Arguments in functions are separated by commas
* Calculations are insensitive to whitespace
* The if function is written as follows: if(condition, true_value, false_value) both true_value and false_value are evaluated, but only the correct one is returned, thus functions that sets values cannot be used within the if function and should instead get the result of the if function as input.