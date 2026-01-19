# Septic Config Lib

Septic Config Lib is a package that offers a library for parsing, formatting, linting and analysing Septic configuration files in addition to CLI for common CI workflows like linting and formatting.

## CLI

To use the CLI for Septic on windows, first install Node and NPM by using [node version manager](https://github.com/coreybutler/nvm-windows). After installation install node version 22 and select that version by running:

```bash
nvm install 22
nvm use 22
```

Nvm also install the node package manager (npm). We can install the Septic config library by running:

```bash
npm install -g septic
```

After installation, the Septic config analyzer (SCA) command line tool is available. SCA offers a CLI for doing common CI quality checks such as linting and formatting. Run the following command to get overview of the functionality and use:

```bash
sca --help
```
