#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { formatCommand } from "./format";
import { lintCommand } from "./lint";
import { compareCommand } from "./compare";

yargs(hideBin(process.argv))
    .scriptName("sca")
    .command(formatCommand)
    .command(lintCommand)
    .command(compareCommand)
    .demandCommand(1, "You need to specify a command")
    .help()
    .version()
    .strict()
    .parse();
