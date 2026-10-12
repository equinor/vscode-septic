# Python helper scripts

## Setup

1. Install `uv`, then create the Python 3.11 environment and install dependencies from the repository root:

   ```pwsh
   uv sync --project scripts
   ```

2. Create GitHub API Access Token by following this [guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
   - Resource Owner: equinor
   - Repository access: Only select repositories -> equinor/Septic
   - Permissions: Contents, Read-only
3. Create a `.env` file in `/scripts` and add the personal access token to the file like this: `API_TOKEN=YOUR_PERSONAL_TOKEN`

## Updating the documentation

1. Set the desired branch to pull the documentation from for both calcs and objects by updating the variables in the top of `/scripts/main.py`
2. Update the desired output path for both calcs and objects by updating the variables in the top of `/scripts/main.py`
3. Run the script from the root of the project in the terminal or by using the VSCode Launch script `Update Documentation`:

   ```pwsh
   uv run --project scripts python scripts/main.py latest
   ```

4. Check the terminal for error messages

## Generating example files from snippets

The `generate_examples.py` script automatically creates example `.cnfg` files for each object type defined in the `snippets.yaml` file.

### Usage

```bash
# Generate examples from the latest version (default)
uv run --project scripts python scripts/generate_examples.py

# Generate examples from a specific version
uv run --project scripts python scripts/generate_examples.py v3_0

# Specify custom output directory
uv run --project scripts python scripts/generate_examples.py latest --output custom/path
```

### What it does

1. Reads the `snippets.yaml` file from the specified Septic version folder
2. Parses each snippet definition (object type)
3. Removes VSCode placeholder syntax (e.g., `${1:Name}`)
4. Creates a `.cnfg` file for each snippet named `{prefix}.cnfg`
5. Adds a comment with the object description at the top of each file
6. Removes any existing `.cnfg` files in the output directory that are not in the snippets list

The generated files are placed in `packages/extension/skills/writing-septic-config/objects/` by default and can be used as reference examples for each Septic object type.
