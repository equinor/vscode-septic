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
import { ContextManager } from "./contextManager";
import { offsetToPositionRange } from "./util/converter";
import {
    ScgContext,
    SepticContext,
    SepticMetaInfoProvider,
    SepticCnfg,
} from "./septic";
import { getIgnorePatterns, getIgnoredCodes } from "./ignorePath";
import { validateStandAloneCalc } from './language-service/diagnosticsProvider';

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

const contextManager = new ContextManager(
    documentProvider,
    langService.cnfgProvider,
    connection
);

let hasConfigurationCapability = true;
let hasWorkspaceFolderCapability = false;

async function publishDiagnosticsContext(context: ScgContext): Promise<void> {
    await context.load();
    const ignorePatterns = await getIgnorePatterns(connection, settingsManager);
    await context.updateObjectParents(
        SepticMetaInfoProvider.getInstance().getObjectHierarchy()
    );
    const diagnosticsPromises = context.files.map(async (uri) => {
        const codes = getIgnoredCodes(uri, ignorePatterns);
        if (codes !== undefined && codes.length == 0) {
            connection.sendDiagnostics({ uri: uri, diagnostics: [] });
            return;
        }
        let diagnostics = await langService.provideDiagnostics(uri, context);
        if (codes) {
            diagnostics = diagnostics.filter((diag) => diag.code && !codes.includes(diag.code as string));
        }
        connection.sendDiagnostics({ uri: uri, diagnostics: diagnostics });
    });

    await Promise.all(diagnosticsPromises);
}

async function publishDiagnosticsCnfg(uri: string): Promise<void> {
    const ignorePatterns = await getIgnorePatterns(connection, settingsManager);
    const codes = getIgnoredCodes(uri, ignorePatterns);
    if (codes !== undefined && codes.length == 0) {
        connection.sendDiagnostics({ uri: uri, diagnostics: [] });
        return;
    }
    const cnfg = await langService.cnfgProvider.get(uri);
    if (!cnfg) {
        return;
    }
    await cnfg.updateObjectParents(
        SepticMetaInfoProvider.getInstance().getObjectHierarchy()
    );
    let diagnostics = await langService.provideDiagnostics(uri, cnfg);
    if (codes) {
        diagnostics = diagnostics.filter((diag) => diag.code && !codes.includes(diag.code as string));
    }
    connection.sendDiagnostics({ uri: uri, diagnostics: diagnostics });
}

async function publishDiagnostics(uri: string) {
    const context: ScgContext | undefined = await contextManager.getContext(uri);
    if (context) {
        publishDiagnosticsContext(context);
        return;
    }
    publishDiagnosticsCnfg(uri);
}

async function updateAllDiagnostics() {
    updateDiagnosticsAllContexts();
    updateDiagnosticsAllStandaloneCnfgs();
}

async function updateDiagnosticsAllContexts() {
    for (const context of contextManager.getAllContexts()) {
        publishDiagnosticsContext(context);
    }
}

async function updateDiagnosticsAllStandaloneCnfgs() {
    for (const uri of documentProvider.getAllDocumentUris()) {
        const context = await contextManager.getContext(uri);
        if (!context) {
            publishDiagnostics(uri);
        }
    }
}

connection.onRequest(protocol.opcTagList, async (param) => {
    let context: SepticContext | undefined =
        await contextManager.getContextByName(param.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(param.uri);
        if (!context) {
            return "";
        }
    }
    const list = langService.provideOpcTagList(context);
    return list;
});

connection.onRequest(protocol.cylceReport, async (param) => {
    let context: SepticContext | undefined =
        await contextManager.getContextByName(param.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(param.uri);
        if (!context) {
            return "";
        }
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
    const contexts = contextManager.getAllContexts().map((val) => val.name);
    for (const uri of documentProvider.getAllDocumentUris()) {
        const context = await contextManager.getContext(uri);
        if (!context && uri.endsWith(".cnfg")) {
            contexts.push(uri);
        }
    }
    return contexts;
});

connection.onRequest(protocol.getContext, async (param) => {
    const context = await contextManager.getContext(param.uri);
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
    let context: SepticContext | undefined =
        await contextManager.getContext(param.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(param.uri);
        if (!context) {
            return undefined;
        }
    }
    return context.getObjectsByType("Evr", "Cvr", "Dvr", "Tvr", "Mvr").map((xvr) => {
        const description: string = xvr.getAttribute("Text1")?.getAttrValue()?.getValue() ?? "None";
        return { name: xvr.identifier?.id, description: description, type: xvr.type };
    });
}
)

connection.onRequest(protocol.validateAlg, async (param) => {
    let context: SepticContext | undefined =
        await contextManager.getContext(param.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(param.uri);
        if (!context) {
            return [];
        }
    }
    return validateStandAloneCalc(param.calc, context);
});

connection.onRequest(protocol.getFunctions.method, async (param) => {
    const cnfg: SepticCnfg | undefined = await langService.cnfgProvider.get(param.uri);
    if (!cnfg) {
        return [];
    }
    let context: SepticContext | undefined = await contextManager.getContext(param.uri);
    if (context) {
        await context.load();
    } else {
        context = cnfg;
    }
    const functions = cnfg.getFunctions();

    return await Promise.all(functions.map(async (func) => {
        const inputs = await Promise.all(func.inputs.map(async (input) => {
            const xvr = context.getObjectsByIdentifier(input).filter((obj) => obj.isXvr)[0];
            if (xvr) {
                const doc = await documentProvider.getDocument(xvr.uri);
                return {
                    name: input,
                    type: xvr.type,
                    pos: doc?.positionAt(xvr.start),
                    uri: xvr.uri
                };
            }
        }))
        const lines = await Promise.all(func.lines.map(async (line) => {
            const doc = await documentProvider.getDocument(param.uri);
            return { name: line.name, alg: line.alg, doc: line.doc, pos: doc?.positionAt(line.offset), uri: line.uri };
        }));
        return {
            name: func.name,
            lines: lines,
            inputs: inputs.filter((i) => !!i)
        };
    }));


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
        contextManager.createScgContext(file);
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

contextManager.onDidUpdateContext(async (uri) => {
    const context = contextManager.getContextByName(uri);
    if (!context) {
        return;
    }
    publishDiagnosticsContext(context);
    updateDiagnosticsAllStandaloneCnfgs();
});

contextManager.onDidDeleteContext(async () => {
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

connection.onDocumentSymbol(
    async (params): Promise<DocumentSymbol[]> => {
        return langService.provideDocumentSymbols(params);
    }
);

connection.onCompletion(
    async (params: CompletionParams): Promise<CompletionItem[]> => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }
        let context: SepticContext | undefined =
            await contextManager.getContext(params.textDocument.uri);
        if (!context) {
            context = await langService.cnfgProvider.get(
                params.textDocument.uri
            );
        }

        if (!context) {
            return [];
        }
        return langService.provideCompletion(params, document, context);
    }
);

connection.onDefinition(async (params) => {
    let context: SepticContext | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return [];
    }

    const refsOffset = await langService.provideDefinition(
        params,
        context
    );
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
    let context: SepticContext | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return [];
    }
    const refsOffset = await langService.provideDeclaration(
        params,
        context
    );
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
    let context: SepticContext | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return [];
    }
    const refsOffset = await langService.provideReferences(
        params,
        context
    );

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
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return undefined;
    }

    let context: SepticContext | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return undefined;
    }
    return await langService.provideRename(params, document, context);
});

connection.onPrepareRename((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    return langService.providePrepareRename(params, document);
});

connection.onHover(async (params) => {
    let context: SepticContext | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

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
    const context: ScgContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        const cnfg = await langService.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return undefined;
        }
        cnfg.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
    } else {
        context.updateObjectParents(
            SepticMetaInfoProvider.getInstance().getObjectHierarchy()
        );
    }

    const codeActions = await langService.provideCodeAction(params);
    return codeActions;
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
