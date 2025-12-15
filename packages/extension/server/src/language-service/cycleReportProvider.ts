/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DocumentProvider } from "../documentProvider";
import { findAlgCycles, SepticContext } from "septic";

const spacesToLink = 40;

export class CycleReportProvider {
    readonly docProvider: DocumentProvider;

    constructor(docProvider: DocumentProvider) {
        this.docProvider = docProvider;
    }

    public async generateCycleReport(
        name: string,
        contextProvider: SepticContext,
    ): Promise<string> {
        const reports: string[] = [`Cycle Report:  ${name}`];
        await contextProvider.load();

        const cycles = findAlgCycles(
            contextProvider.getObjectsByType("CalcPvr"),
        );
        cycles.sort((a, b) => b.nodes.length - a.nodes.length);
        for (const cycle of cycles) {
            reports.push(
                "\n" +
                    [...cycle.nodes, cycle.nodes[0]]
                        .map((node) => node.name)
                        .join("->"),
            );
            for (const node of cycle.nodes) {
                let nodeStr = `CalcPvr: ${node.calcpvr}`;
                const nodeObj = contextProvider.getObjectByIdentifierAndType(
                    node.calcpvr,
                    "CalcPvr",
                );
                if (!nodeObj) {
                    reports.push(nodeStr);
                    continue;
                }
                const doc = await this.docProvider.getDocument(nodeObj.uri);
                if (!doc) {
                    reports.push(nodeStr);
                    continue;
                }
                const position = doc.positionAt(nodeObj.identifier!.start);
                const numSpaces = Math.max(1, spacesToLink - nodeStr.length);
                nodeStr +=
                    " ".repeat(numSpaces) +
                    `${nodeObj.uri}#${position.line + 1}`;
                reports.push(nodeStr);
            }
        }
        if (reports.length === 1) {
            reports.push("\nNo cycles detected!");
        }
        return reports.join("\n");
    }
}
