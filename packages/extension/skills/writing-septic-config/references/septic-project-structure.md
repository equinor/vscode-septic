# Overview

This document give an overview of the typically used project structure used for Septic applications.

## Workspace structure

The workspace has the following layout for a given asset. A singel asset can have multiple applications.

```txt
	septic-ASSET\                     # Name of asset, e.g. "Njord", so "septic-Njord"
	├─ MyApplication\                 # Name of application, e.g. "NJAPO"
	│  ├─ scg\
	│  │  ├─ sources\
	│  │  |  └─ MyApplication.csv
	│  │  ├─ templates_hmi\           # Contains all templates for hmi application
	│  │  ├─ templates_main\          # Contains all templates for main application
	│  │  ├─ templates_opc\           # Contains all templates for opc taglist
	│  │  ├─ templates_sim\           # Contains all templates for sim application
	│  │  ├─ MyApplication.yaml       # E.g. "NJAPO.yaml"
	│  │  ├─ MyApplicationHmi.yaml
	│  │  ├─ MyApplicationSim.yaml    # E.g. "NJAPO_sim.yaml"
	│  │  ├─ make.bat                 # Script for automating make process
	│  │  └─ OPC.yaml
	│  ├─ run\
	│  │  ├─ run_hmi\                 # Septic work directory for hmi application
	│  │  ├─ run_main\                # Septic work directory for main application
	│  │  │  └─ models\
	│  │  ├─ run_sim\                 # Septic work directory for sim application
	│  │  ├─ makeandstart.bat         # Script for automating make and start process
	│  │  ├─ start.bat                # Script for automating start process
	│  │  └─ stop.bat                 # Script for automating stop process
	│  └─ README.md                   # Describe application here
	└─ README.md                      # Describe asset here
```

## Application development structure

The following structure is used for developing an applicaiton. The Septic Config Generator (SCG) is used for generating the application.

The development structure consist of the following sub-applications:

- **Main**: The main MPC application that controls the process. Reads measurements and operator signals from the process/HMI simulators and writes outputs to the controllers and statuses to the HMI. The scg config is named `MyApplication.yaml` and the templates are located in `templates_main\`
- **Sim**: The process simulator used to test the application during development. Implements calulations for a process simulator and publish the measurements to the OPC server. The scg config is named `MyApplicationSim.yaml` and the templates are located in `templates_sim\`
- **Hmi**: The HMI simulator used to mimic the HMI used by the operator and implement process control logic. Reads measurement from the process simulator and writes operator input to the main application. The SCG config is named `MyApplicationHmi.yaml` and the templates are located in `templates_hmi\`.
- **Opc**: Configuration of the OPC server that is used for communication between applications. Generates all the OPC tags that are used by the different instances using the SCG tool. The SCG config is typically named `OPC.yaml` and the templates are located in `templates_opc\`

```txt
MyApplication\                 # Name of application, e.g. "NJAPO"
	│  ├─ scg\
	│  │  ├─ sources\
	│  │  |  └─ MyApplication.csv
	│  │  ├─ templates_hmi\           # Contains all templates for hmi application
	│  │  ├─ templates_main\          # Contains all templates for main application
	│  │  ├─ templates_opc\           # Contains all templates for opc taglist
	│  │  ├─ templates_sim\           # Contains all templates for sim application
	│  │  ├─ MyApplication.yaml       # E.g. "NJAPO.yaml"
	│  │  ├─ MyApplicationHmi.yaml
	│  │  ├─ MyApplicationSim.yaml    # E.g. "NJAPO_sim.yaml"
	│  │  ├─ make.bat                 # Script for automating make process
	│  │  └─ OPC.yaml
	└─ README.md
```

## Main application layout

The typical layout of the SCG config for the main application is shown below:

```yaml
outputfile: MyApplication.cnfg

templatepath: templates_main

verifycontent: false

sources:
    - filename: sources/Wells.csv
      id: wells

layout:
    - name: 01_System.cnfg
    - name: 11_SopcProc.cnfg # Configuration of the OPC client
    - name: 12_SopcProcWell.cnfg # Configuration of the OPC singals for each well
      source: wells
    - name: 21_DmmyApplSystem.cnfg # General variables (Evr, Tvr) and calculations for the system
    - name: 22_DmmyApplWell.cnfg # Variables and calculation for each well
      source: wells
    - name: 31_SmpcAppl.cnfg # Configuration of the MPC application/solver. General Mvrs and Cvrs
    - name: 32_SmpcApplWell.cnfg # List of Mvrs, Cvrs and Dvrs for each well. Tuning for the different variables-
      source: wells
    - name: 41_ExprModl.cnfg # Expermimental models for MPC
    - name: 51_DmmyApplPost.cnfg # Calculations that are performed after the execution of the optimizer
    - name: 52_DmmyApplPostWell.cnfg # Calculations that are performed after the execution of the optimizer per well
      source: wells
    - name: 61_DspGroupOverview.cnfg # General displaygroup to get overview of application status and all Mvrs/Cvrs
    - name: 62_DspGroupWell.cnfg # Displaygroup for each well to get overview of the Mvrs/Cvrs/Tvrs for each well and list of calculations
      source: wells
```
