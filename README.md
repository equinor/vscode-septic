# VSCode Septic

Repo for the VSCode Septic Extension with a monorepo structure.

## Development

[pnpm](https://pnpm.io/) is used as package manager for the project and manage the workspaces. To install:

```bash
npm install -g pnpm
```

After installing `pnpm` install all packages by running the following command in the root:

```bash
pnpm install
```

All packages can be built by running the following command from in the root:

```bash
pnpm -r build
```

[Septic](./packages/septic/) is a dependency for the [VSCode extension](./packages/extension/). A built package setup using workspace and project references is used to manage dependencies between the different packages in the workspace (some info can be found [here](https://monorepo.tools/typescript)).

Before developing the [septic](./packages/septic/) package, run the following command in a seperate termninal to ensure that the latest updates are included when running the extension:

```bash
pnpm dev
```
