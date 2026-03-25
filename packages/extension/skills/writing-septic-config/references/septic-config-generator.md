# Septic Config Generator (SCG)

## Overview

Septic Config Generator (SCG) is a command-line tool that generates complete Septic configuration files from reusable templates and structured data sources. By separating static configuration segments from repeating patterns, SCG enables efficient management of complex Septic configs with multiple wells, flowlines, or other repeated entities.

## Key Benefits

- **Rapid propagation of changes**: Modifications to one well can be quickly applied to all wells
- **Simplified well addition**: Adding new wells is as simple as adding a row to a data table
- **Reduced configuration errors**: Maintaining a few templates and a data table is easier and less error-prone than manually editing large config files
- **Version control friendly**: Templates and CSV sources are plain text, making them ideal for Git workflows
- **Powerful templating**: Uses the MiniJinja template engine (based on Jinja2) with support for expressions, conditionals, loops, filters, and custom functions

## How It Works

SCG combines three main components to generate a final Septic config:

1. **Templates**: Septic config segments with placeholder tags (e.g., `{{ WellName }}`, `{{ FlowlineID }}`)
2. **Data Sources**: CSV files containing substitution values organized in tables
3. **Configuration File**: A YAML file (e.g., `scg.yaml`) that defines how templates and sources combine to create the output

### Template Files

Templates are Septic config file fragments containing MiniJinja tags. Static sections (like System headers) are stored as-is, while repeating sections (like per-well SopcXvr definitions) use placeholder variables:

```septic
Xvr: {{ WellName }}
  Ivar: 0
  Desc: "{{ Description }}"
  Group: {{ GroupMask }}
```

### Data Sources

Sources are tables where:

- First row contains column headers (matching template tags)
- First column contains unique row identifiers
- Remaining cells contain values to substitute

**CSV sources** (.csv):

- Plain text format, ideal for version control
- Support type inference (integers, floats, booleans, strings)
- Can combine multiple CSV files into a single source

### Configuration File (YAML)

The YAML config defines the generation workflow:

```yaml
outputfile: myapp.cnfg
templatepath: templates
encoding: windows-1252

sources:
    - filename: wells.csv
      id: wells
    - filename: flowlines.csv
      delimiter: ","
      id: flowlines

layout:
    - name: 01_System.cnfg
    - name: 02_SopcProc_header.cnfg
    - name: 03_SopcProc_well.cnfg
      source: wells
      include:
          - D01
          - D02
    - name: 04_Flowlines.cnfg
      source: flowlines
```

## Main Commands

- **`scg make <config.yaml>`**: Generate config file from templates and sources
- **`scg checklogs <rundir>`**: Inspect Septic log files (.out, .cnc) for errors
- **`scg update`**: Check GitHub for new releases and update if available
- **`scg drawio components`**: Extract coordinates from draw.io diagrams for display group layouts
- **`scg drawio 2png`**: Convert draw.io diagrams to PNG images

## Advanced Features

### MiniJinja Template Engine

Templates support full MiniJinja syntax including:

- **Expressions**: `{{ WellID + 100 }}`, `{{ XPos * 1.5 }}`
- **Conditionals**: `{% if HasPressureSensor %}...{% endif %}`
- **Loops**: `{% for item in wells %}...{% endfor %}`
- **Filters**: `{{ wells | selectattr("Status", "eq", "Active") }}`
- **Includes/Inheritance**: `{% include "common_header.cnfg" %}`

### Custom Filters and Functions

SCG provides specialized functionality:

- **`unpack`**: Extract multiple values from sources into variables
- **`bitmask`**: Convert integers to bitmask strings (e.g., for Group definitions)
- **`gitcommit`** / **`gitcommitlong`**: Insert Git commit hash into config
- **`now()`**: Insert formatted timestamps
- **`scgversion`**: Insert SCG version used for generation
- **Counters**: Auto-incrementing global counters for unique IDs

### Conditional Inclusion

Control which rows from sources are processed:

```yaml
layout:
    - name: 03_ProductionWells.cnfg
      source: wells
      include:
          - if: "WellType == 'Producer'"
          - if: "testing == true"
            then: [D01, D02]
            continue: true
```

### draw.io Integration

Extract component positions and properties from draw.io diagrams:

- Components with `septic_` prefixed properties are detected
- Coordinates (x1, y1, x2, y2) exported to CSV
- Properties extracted with prefix removed (`septic_name` → `name`)
- Use for accurate display group element positioning

## Command-Line Options

- **`--var <name> <value>`**: Define global variables accessible in all templates
- **`--ifchanged`**: Only rebuild if input files are newer than output file

## Resources

- [Full Documentation](https://github.com/equinor/septic-config-generator/blob/main/docs/Howto_SCG.md)
- [GitHub Repository](https://github.com/equinor/septic-config-generator)
- [MiniJinja Documentation](https://docs.rs/minijinja/latest/minijinja/)
