/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [vscode-extension-samples]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    InitializeResult,
    FoldingRange,
    DocumentSymbol,
    CompletionItem,
    LocationLink,
    Location,
    DidChangeWatchedFilesNotification,
    CompletionParams,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { ILanguageService, createLanguageService } from "./language-service";
import { SettingsManager } from "./settings";
import { DocumentProvider } from "./documentProvider";
import * as protocol from "./protocol";
import * as path from "path";
import { ScgContextManager } from "./scgContextManager";
import { offsetToPositionRange } from "./util/converter";
import {
    ScgContext,
    SepticContext,
    SepticMetaInfoProvider,
    SepticCnfg,
} from "./septic";
import { getIgnorePatterns, getIgnoredCodes } from "./ignorePath";
import { validateStandAloneCalc } from "./language-service/diagnosticsProvider";
import { ContextManager } from "./contextManager";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const settingsManager = new SettingsManager(connection);

const documentProvider = new DocumentProvider(
    connection,
    documents,
    settingsManager
);

const langService: ILanguageService = createLanguageService(
    settingsManager,
    documentProvider
);

const scgContextManager = new ScgContextManager(
    documentProvider,
    langService.cnfgProvider,
    connection
);

const contextManager = new ContextManager(
    langService.cnfgProvider,
    scgContextManager,
    documentProvider
);

let hasConfigurationCapability = true;
let hasWorkspaceFolderCapability = false;

async function publishDiagnosticsScgContext(
    context: ScgContext
): Promise<void> {
    await context.load();
    const ignorePatterns = await getIgnorePatterns(connection, settingsManager);
    await context.updateObjectParents();
    const diagnosticsPromises = context.files.map(async (uri) => {
        const codes = getIgnoredCodes(uri, ignorePatterns);
        if (codes !== undefined && codes.length == 0) {
            connection.sendDiagnostics({ uri: uri, diagnostics: [] });
            return;
        }
        let diagnostics = await langService.provideDiagnostics(uri, context);
        if (codes) {
            diagnostics = diagnostics.filter(
                (diag) => diag.code && !codes.includes(diag.code as string)
            );
        }
        connection.sendDiagnostics({ uri: uri, diagnostics: diagnostics });
    });

    await Promise.all(diagnosticsPromises);
}

async function publishDiagnosticsCnfg(cnfg: SepticCnfg): Promise<void> {
    const ignorePatterns = await getIgnorePatterns(connection, settingsManager);
    const codes = getIgnoredCodes(cnfg.uri, ignorePatterns);
    if (codes !== undefined && codes.length == 0) {
        connection.sendDiagnostics({ uri: cnfg.uri, diagnostics: [] });
        return;
    }
    await cnfg.updateObjectParents();
    let diagnostics = await langService.provideDiagnostics(cnfg.uri, cnfg);
    if (codes) {
        diagnostics = diagnostics.filter(
            (diag) => diag.code && !codes.includes(diag.code as string)
        );
    }
    connection.sendDiagnostics({ uri: cnfg.uri, diagnostics: diagnostics });
}

async function publishDiagnostics(uri: string) {
    const context: SepticContext | undefined = await contextManager.getContext(
        uri
    );
    if (!context) {
        return;
    }
    if (context instanceof ScgContext) {
        publishDiagnosticsScgContext(context);
        return;
    }
    publishDiagnosticsCnfg(context as SepticCnfg);
}

async function updateAllDiagnostics() {
    for (const context of await contextManager.getAllContexts()) {
        if (context instanceof ScgContext) {
            publishDiagnosticsScgContext(context);
        } else {
            publishDiagnosticsCnfg(context as SepticCnfg);
        }
    }
}

async function updateDiagnosticsAllStandaloneCnfgs() {
    for (const context of await contextManager.getAllContexts()) {
        if (context instanceof SepticCnfg) {
            publishDiagnosticsCnfg(context);
        }
    }
}

connection.onRequest(protocol.opcTagList, async (param) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        param.uri
    );
    if (!context) {
        return "";
    }
    const list = langService.provideOpcTagList(context);
    return list;
});

connection.onRequest(protocol.cylceReport, async (param) => {
    const context: SepticContext | undefined =
        await scgContextManager.getContext(param.uri);
    if (!context) {
        return "";
    }
    const report = await langService.provideCycleReport(param.uri, context);
    return report;
});

connection.onRequest(protocol.compareCnfg, async (param) => {
    const prevCnfg: SepticCnfg | undefined = await langService.cnfgProvider.get(
        param.prevVersion
    );
    const currentCnfg: SepticCnfg | undefined =
        await langService.cnfgProvider.get(param.currentVersion);
    if (!prevCnfg || !currentCnfg) {
        return "";
    }
    return langService.provideCnfgComparison(
        prevCnfg,
        currentCnfg,
        param.settingsFile
    );
});

connection.onRequest(protocol.contexts, async () => {
    const contexts = scgContextManager.getAllContexts().map((val) => val.name);
    for (const uri of documentProvider.getAllDocumentUris()) {
        const context = await scgContextManager.getContext(uri);
        if (!context && uri.endsWith(".cnfg")) {
            contexts.push(uri);
        }
    }
    return contexts;
});

connection.onRequest(protocol.getContext, async (param) => {
    const context = await scgContextManager.getContext(param.uri);
    if (context) {
        return context.filePath;
    }
    if (param.uri.endsWith(".cnfg")) {
        return param.uri;
    }
    return "";
});

connection.onRequest(protocol.documentation, async () => {
    const metaInfo = SepticMetaInfoProvider.getInstance();
    return {
        objects: metaInfo.getObjectsDoc(),
        calcs: metaInfo.getCalcs(),
    };
});

connection.onRequest(protocol.variables, async (param) => {
    let context: SepticContext | undefined = await scgContextManager.getContext(
        param.uri
    );
    if (!context) {
        context = await langService.cnfgProvider.get(param.uri);
        if (!context) {
            return undefined;
        }
    }
    return context
        .getObjectsByType("Evr", "Cvr", "Dvr", "Tvr", "Mvr")
        .map((xvr) => {
            const description: string =
                xvr.getAttributeFirstValue("Text1") ?? "None";
            return {
                name: xvr.identifier?.id,
                description: description,
                type: xvr.type,
            };
        });
});

connection.onRequest(protocol.validateAlg, async (param) => {
    let context: SepticContext | undefined = await scgContextManager.getContext(
        param.uri
    );
    if (!context) {
        context = await langService.cnfgProvider.get(param.uri);
        if (!context) {
            return [];
        }
    }
    return validateStandAloneCalc(param.calc, context);
});

connection.onRequest(protocol.getFunctions.method, async (param) => {
    const cnfg: SepticCnfg | undefined = await langService.cnfgProvider.get(
        param.uri
    );
    if (!cnfg) {
        return [];
    }
    let context: SepticContext | undefined = await scgContextManager.getContext(
        param.uri
    );
    if (context) {
        await context.load();
    } else {
        context = cnfg;
    }
    const functions = cnfg.getFunctions();

    return await Promise.all(
        functions.map(async (func) => {
            const inputs = await Promise.all(
                func.inputs.map(async (input) => {
                    const xvr = context
                        .getObjectsByIdentifier(input)
                        .filter((obj) => obj.isXvr)[0];
                    if (xvr) {
                        const doc = await documentProvider.getDocument(xvr.uri);
                        return {
                            name: input,
                            type: xvr.type,
                            pos: doc?.positionAt(xvr.start),
                            uri: xvr.uri,
                        };
                    }
                })
            );
            const lines = await Promise.all(
                func.lines.map(async (line) => {
                    const doc = await documentProvider.getDocument(param.uri);
                    return {
                        name: line.name,
                        alg: line.alg,
                        doc: line.doc,
                        pos: doc?.positionAt(line.offset),
                        uri: line.uri,
                    };
                })
            );
            return {
                name: func.name,
                lines: lines,
                inputs: inputs.filter((i) => !!i),
            };
        })
    );
});

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            foldingRangeProvider: true,
            documentSymbolProvider: true,
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ["."],
            },
            definitionProvider: true,
            referencesProvider: true,
            declarationProvider: true,
            renameProvider: {
                prepareProvider: true,
            },
            hoverProvider: true,
            documentFormattingProvider: true,
            signatureHelpProvider: {
                triggerCharacters: [",", "("],
            },
            codeActionProvider: true,
        },
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        };
    }
    return result;
});

connection.onInitialized(async () => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
        connection.client.register(DidChangeWatchedFilesNotification.type);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(() => {
            connection.console.log("Workspace folder change event received.");
        });
    }
    await settingsManager.update();
    const yamlFiles = await connection.sendRequest(protocol.findYamlFiles, {});
    for (const file of yamlFiles) {
        scgContextManager.createScgContext(file);
    }
});

let eventBuffer: string[] = [];

documentProvider.onDidChangeDoc(async (uri) => {
    eventBuffer.push(uri);
});

setInterval(async () => {
    if (eventBuffer.length > 0) {
        const uri = eventBuffer.pop();
        eventBuffer = [];
        publishDiagnostics(uri!);
    }
}, 200);

documentProvider.onDidCreateDoc(async (uri) => {
    publishDiagnostics(uri);
});

documentProvider.onDidDeleteDoc(async (uri) => {
    if (path.extname(uri) === ".cnfg") {
        connection.sendDiagnostics({ uri: uri, diagnostics: [] });
    }
});

scgContextManager.onDidUpdateContext(async (uri) => {
    const context = await scgContextManager.getContext(uri);
    if (!context) {
        return;
    }
    publishDiagnosticsScgContext(context);
    updateDiagnosticsAllStandaloneCnfgs();
});

scgContextManager.onDidDeleteContext(async () => {
    updateAllDiagnostics();
});

connection.onDidChangeConfiguration(() => {
    settingsManager.invalidate();
    updateAllDiagnostics();
});

connection.onFoldingRanges(async (params): Promise<FoldingRange[]> => {
    await settingsManager.getSettings();
    return langService.provideFoldingRanges(params);
});

connection.onDocumentSymbol(async (params): Promise<DocumentSymbol[]> => {
    return langService.provideDocumentSymbols(params);
});

connection.onCompletion(
    async (params: CompletionParams): Promise<CompletionItem[]> => {
        const context: SepticContext | undefined =
            await contextManager.getContext(params.textDocument.uri);
        if (!context) {
            return [];
        }
        return langService.provideCompletion(params, context);
    }
);

connection.onDefinition(async (params) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        return [];
    }
    const refsOffset = await langService.provideDefinition(params, context);
    const refs: LocationLink[] = [];
    for (const ref of refsOffset) {
        const doc = await documentProvider.getDocument(ref.targetUri);
        if (!doc) {
            continue;
        }
        refs.push({
            targetUri: ref.targetUri,
            targetRange: offsetToPositionRange(ref.targetRange, doc),
            targetSelectionRange: offsetToPositionRange(
                ref.targetSelectionRange,
                doc
            ),
        });
    }
    return refs;
});

connection.onDeclaration(async (params) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        return [];
    }
    const refsOffset = await langService.provideDeclaration(params, context);
    const refs: LocationLink[] = [];
    for (const ref of refsOffset) {
        const doc = await documentProvider.getDocument(ref.targetUri);
        if (!doc) {
            continue;
        }
        refs.push({
            targetUri: ref.targetUri,
            targetRange: offsetToPositionRange(ref.targetRange, doc),
            targetSelectionRange: offsetToPositionRange(
                ref.targetSelectionRange,
                doc
            ),
        });
    }
    return refs;
});

connection.onReferences(async (params) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        return [];
    }
    const refsOffset = await langService.provideReferences(params, context);
    const refs: Location[] = [];
    for (const ref of refsOffset) {
        const doc = await documentProvider.getDocument(ref.uri);
        if (!doc) {
            continue;
        }
        refs.push({
            uri: ref.uri,
            range: offsetToPositionRange(ref.range, doc),
        });
    }
    return refs;
});

connection.onRenameRequest(async (params) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        return undefined;
    }
    return await langService.provideRename(params, context);
});

connection.onPrepareRename((params) => {
    return langService.providePrepareRename(params);
});

connection.onHover(async (params) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        return undefined;
    }
    return langService.provideHover(params, context);
});

connection.onDocumentFormatting(async (params) => {
    const settings = await settingsManager.getSettings();
    if (!settings?.formatting.enabled) {
        return [];
    }
    return langService.provideFormatting(params);
});

connection.onSignatureHelp(async (params) => {
    return langService.provideSignatureHelp(params);
});

connection.onCodeAction(async (params) => {
    const context: SepticContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        return undefined;
    }
    context.updateObjectParents();
    const codeActions = await langService.provideCodeAction(params);
    return codeActions;
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
