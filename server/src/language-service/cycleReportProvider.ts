import { DocumentProvider } from "../documentProvider";
import { SepticReferenceProvider } from "../septic";

const spacesToLink = 40;

export class CycleReportProvider {
    readonly docProvider: DocumentProvider;

    constructor(docProvider: DocumentProvider) {
        this.docProvider = docProvider;
    }

    public async generateCycleReport(
        name: string,
        refProvider: SepticReferenceProvider
    ): Promise<string> {
        const reports: string[] = [`Cycle Report:  ${name}`];
        const cycles = refProvider.findAlgCycles();
        cycles.sort((a, b) => b.nodes.length - a.nodes.length);
        for (let cycle of cycles) {
            reports.push(
                "\n" +
                    [...cycle.nodes, cycle.nodes[0]]
                        .map((node) => node.name)
                        .join("->")
            );
            for (let node of cycle.nodes) {
                let nodeStr = `CalcPvr: ${node.calcpvr}`;
                let nodeObj = refProvider.getObjectByIdentifierAndType(
                    node.calcpvr,
                    "CalcPvr"
                );
                if (!nodeObj) {
                    reports.push(nodeStr);
                    continue;
                }
                let doc = await this.docProvider.getDocument(nodeObj.uri);
                if (!doc) {
                    reports.push(nodeStr);
                    continue;
                }
                let position = doc.positionAt(nodeObj.identifier!.start);
                let numSpaces = Math.max(1, spacesToLink - nodeStr.length);
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
