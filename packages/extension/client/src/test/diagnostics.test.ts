/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getDocUri, activate } from "./helper";
import { expect } from "chai";

suite("Test diagnostics scg", async () => {
    let originalContentScgConfig: string;
    let configUri: vscode.Uri;

    setup(async () => {
        await vscode.commands.executeCommand(
            "workbench.action.closeAllEditors",
        );
        await activate();
        configUri = getDocUri("scg/scg.yaml");
        const doc = await vscode.workspace.openTextDocument(configUri);
        originalContentScgConfig = doc.getText();
    });

    teardown(async () => {
        // Restore original content regardless of test outcome
        try {
            const doc = await vscode.workspace.openTextDocument(configUri);
            const editor = await vscode.window.showTextDocument(doc);
            await editor.edit((eb) => {
                eb.replace(
                    new vscode.Range(0, 0, doc.lineCount, 0),
                    originalContentScgConfig,
                );
            });
            await doc.save();
            await vscode.commands.executeCommand(
                "workbench.action.closeAllEditors",
            );
        } catch (error) {
            console.error("Failed to restore original content:", error);
        }
    });

    async function expectPathDiagnostic(
        content: string,
        filename: string,
        code: string,
    ) {
        const doc = await vscode.workspace.openTextDocument(configUri);
        const editor = await vscode.window.showTextDocument(doc);

        await editor.edit((eb) => {
            eb.replace(new vscode.Range(0, 0, doc.lineCount, 0), content);
        });
        await doc.save();

        const expectedOffset = doc.getText().indexOf(filename);
        const expectedSeverity = code.startsWith("E")
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
            if (
                vscode.languages
                    .getDiagnostics(configUri)
                    .some(
                        (diagnostic) =>
                            diagnostic.code === code &&
                            diagnostic.severity === expectedSeverity &&
                            doc.offsetAt(diagnostic.range.start) ===
                                expectedOffset,
                    )
            ) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error(`Did not receive ${code} at offset ${expectedOffset}`);
    }

    test("Diagnostics is updated when scg config is updated", async () => {
        const docUri = getDocUri("scg/templates/61_DspGroupTables.cnfg");
        const dependentDocUri = getDocUri("scg/templates/62_DspGroupWell.cnfg");

        // Initial diagnostics check
        const diagnosticsBeforeEdit = vscode.languages.getDiagnostics(docUri);
        expect(diagnosticsBeforeEdit.length).to.equal(0);
        const diagnosticsBeforeEditDependentFile =
            vscode.languages.getDiagnostics(dependentDocUri);
        expect(diagnosticsBeforeEditDependentFile.length).to.equal(0);

        const doc = await vscode.workspace.openTextDocument(configUri);
        const editor = await vscode.window.showTextDocument(doc);

        editor.edit((eb) => {
            eb.replace(new vscode.Range(21, 0, 22, 0), "");
        });

        await doc.save();
        // Wait for diagnostics to update
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Simulate editing the document to introduce an error
        const diagnosticsAfterEdit = vscode.languages.getDiagnostics(docUri);
        expect(diagnosticsAfterEdit.length).to.greaterThan(0);

        const diagnosticsAfterEditDependentFile =
            vscode.languages.getDiagnostics(dependentDocUri);
        expect(diagnosticsAfterEditDependentFile.length).to.greaterThan(0);
    });

    async function expectSimultaneousDiagnostics(docs: vscode.TextDocument[]) {
        let listener: vscode.Disposable | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const offsets = docs.map((doc) => doc.getText().length);
            const ready = new Promise<void>((resolve, reject) => {
                timer = setTimeout(
                    () =>
                        reject(new Error("Timed out waiting for diagnostics")),
                    5000,
                );
                listener = vscode.languages.onDidChangeDiagnostics(() => {
                    const complete = docs.every((doc, index) =>
                        vscode.languages
                            .getDiagnostics(doc.uri)
                            .some(
                                (diagnostic) =>
                                    diagnostic.code === "E103" &&
                                    doc.offsetAt(diagnostic.range.start) >=
                                        offsets[index]!,
                            ),
                    );
                    if (complete) resolve();
                });
            });
            const edit = new vscode.WorkspaceEdit();
            docs.forEach((doc) =>
                edit.insert(
                    doc.uri,
                    doc.positionAt(doc.getText().length),
                    "\nUnknownBench: Test\n",
                ),
            );
            expect(await vscode.workspace.applyEdit(edit)).to.equal(true);
            await ready;
        } finally {
            listener?.dispose();
            clearTimeout(timer);
            for (const doc of docs) {
                if (doc.isClosed) continue;
                await vscode.window.showTextDocument(doc);
                await vscode.commands.executeCommand(
                    doc.isDirty
                        ? "workbench.action.revertAndCloseActiveEditor"
                        : "workbench.action.closeActiveEditor",
                );
            }
        }
    }

    test("Diagnostics are updated for simultaneous edits in separate files", async () => {
        const uris = [
            getDocUri("test.cnfg"),
            getDocUri("scg/templates/61_DspGroupTables.cnfg"),
        ];
        const docs = await Promise.all(
            uris.map((uri) => vscode.workspace.openTextDocument(uri)),
        );
        await expectSimultaneousDiagnostics(docs);
    });

    test("Diagnostics are updated for simultaneous edits in one SCG context", async () => {
        const uris = ["61_DspGroupTables.cnfg", "62_DspGroupWell.cnfg"].map(
            (name) => getDocUri(`scg/templates/${name}`),
        );
        const docs = await Promise.all(
            uris.map((uri) => vscode.workspace.openTextDocument(uri)),
        );
        await expectSimultaneousDiagnostics(docs);
    });

    test("Rapid edits do not publish inconsistent standalone diagnostics", async () => {
        const uri = getDocUri("test.cnfg");
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const objects = Array.from(
            { length: 4500 },
            (_, index) => `Evr: V${index}\n Text1= "Value ${index}"\n`,
        ).join("");
        const calculations = Array.from(
            { length: 1500 },
            (_, index) =>
                `CalcPvr: V${index}\n Alg= "V${index}.Meas + V${index + 1}.Meas"\n`,
        ).join("");
        const text = `System: Root\nDmmyAppl: Test\n${objects}CalcModl: Calc\n${calculations}CalcPvr: Result\n Alg= "getappln()"\n`;
        const functionOffset = text.indexOf("getappln");
        const unexpected: string[] = [];
        let listener: vscode.Disposable | undefined;

        const waitFor = async (condition: () => boolean) => {
            const deadline = Date.now() + 10000;
            while (Date.now() < deadline) {
                if (condition()) return;
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            throw new Error("Timed out waiting for diagnostics");
        };

        try {
            expect(
                await editor.edit((builder) => {
                    builder.replace(
                        new vscode.Range(
                            doc.positionAt(0),
                            doc.positionAt(doc.getText().length),
                        ),
                        text,
                    );
                }),
            ).to.equal(true);
            await waitFor(() =>
                vscode.languages
                    .getDiagnostics(uri)
                    .some((diagnostic) => diagnostic.code === "W503"),
            );
            await new Promise((resolve) => setTimeout(resolve, 300));
            listener = vscode.languages.onDidChangeDiagnostics((event) => {
                if (
                    !event.uris.some(
                        (changed) => changed.toString() === uri.toString(),
                    )
                ) {
                    return;
                }
                const diagnostics = vscode.languages.getDiagnostics(uri);
                if (!diagnostics.length) unexpected.push("empty diagnostics");
                if (
                    diagnostics.some((diagnostic) => diagnostic.code === "W402")
                ) {
                    unexpected.push("missing parent");
                }
                if (
                    diagnostics.some(
                        (diagnostic) =>
                            diagnostic.code === "W501" &&
                            diagnostic.message.startsWith(
                                "Reference to undefined variable: V",
                            ),
                    )
                ) {
                    unexpected.push("missing reference");
                }
            });

            for (const interval of [35, 120]) {
                const name = "x".repeat(20) + "getappln";
                for (let index = 0; index < 20; index++) {
                    expect(
                        await editor.edit((builder) =>
                            builder.insert(
                                doc.positionAt(functionOffset + index),
                                "x",
                            ),
                        ),
                    ).to.equal(true);
                    if (index < 19) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, interval),
                        );
                    }
                }
                await waitFor(() =>
                    vscode.languages
                        .getDiagnostics(uri)
                        .some(
                            (diagnostic) =>
                                diagnostic.code === "E202" &&
                                diagnostic.message ===
                                    `Unknown function: ${name}`,
                        ),
                );
                await new Promise((resolve) => setTimeout(resolve, 300));
                expect(
                    await editor.edit((builder) =>
                        builder.delete(
                            new vscode.Range(
                                doc.positionAt(functionOffset),
                                doc.positionAt(functionOffset + 20),
                            ),
                        ),
                    ),
                ).to.equal(true);
                await waitFor(
                    () =>
                        !vscode.languages
                            .getDiagnostics(uri)
                            .some(
                                (diagnostic) =>
                                    diagnostic.code === "E202" &&
                                    diagnostic.message ===
                                        `Unknown function: ${name}`,
                            ),
                );
            }
            expect(unexpected).to.deep.equal([]);
        } finally {
            listener?.dispose();
            await vscode.window.showTextDocument(doc);
            await vscode.commands.executeCommand(
                "workbench.action.revertAndCloseActiveEditor",
            );
        }
    });

    async function expectSourcePathDiagnostic(
        filenameField: string,
        filename: string,
        code: string,
    ) {
        const content = originalContentScgConfig.replace(
            /sources:[\s\S]*?\nlayout:/,
            `sources:\n  - ${filenameField}\n    id: wells\n    delimiter: ";"\n\nlayout:`,
        );
        await expectPathDiagnostic(content, filename, code);
    }

    test("Publishes W701 for scalar source filename case mismatch", async () => {
        await expectSourcePathDiagnostic(
            "filename: Wells.csv",
            "Wells.csv",
            "W701",
        );
    });

    test("Publishes W701 for list source filename case mismatch", async () => {
        await expectSourcePathDiagnostic(
            "filename:\n      - Wells.csv\n      - other.csv",
            "Wells.csv",
            "W701",
        );
    });

    test("Publishes E701 for a missing layout file", async () => {
        const content = originalContentScgConfig.replace(
            /name: 01_(?:System|system)\.cnfg/,
            "name: missing.cnfg",
        );
        await expectPathDiagnostic(content, "missing.cnfg", "E701");
    });

    test("Publishes E701 for a missing scalar source file", async () => {
        await expectSourcePathDiagnostic(
            "filename: missing.csv",
            "missing.csv",
            "E701",
        );
    });

    test("Publishes E701 for a missing source file in a list", async () => {
        await expectSourcePathDiagnostic(
            "filename:\n      - missing.csv\n      - wells.csv",
            "missing.csv",
            "E701",
        );
    });
});

