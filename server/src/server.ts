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
    Diagnostic,
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
    SepticReferenceProvider,
    SepticMetaInfoProvider,
    SepticCnfg,
} from "./septic";
import { getIgnorePatterns, isPathIgnored } from "./ignorePath";

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
let hasDiagnosticRelatedInformationCapability = false;

async function publishDiagnosticsContext(context: ScgContext): Promise<void> {
    await context.load();
    const ignorePatterns = await getIgnorePatterns(connection, settingsManager);
    await context.updateObjectParents(
        SepticMetaInfoProvider.getInstance().getObjectHierarchy()
    );
    const diagnosticsPromises = context.files.map(async (file) => {
        if (isPathIgnored(file, ignorePatterns)) {
            connection.sendDiagnostics({ uri: file, diagnostics: [] });
            return;
        }
        let doc = await documentProvider.getDocument(file);
        if (!doc) {
            return null;
        }
        const diagnostics = await langService.provideDiagnostics(doc, context!);
        connection.sendDiagnostics({ uri: file, diagnostics: diagnostics });
    });

    await Promise.all(diagnosticsPromises);
}

async function publishDiagnosticsCnfg(uri: string): Promise<void> {
    const ignorePatterns = await getIgnorePatterns(connection, settingsManager);
    if (isPathIgnored(uri, ignorePatterns)) {
        connection.sendDiagnostics({ uri: uri, diagnostics: [] });
        return;
    }
    let cnfg = await langService.cnfgProvider.get(uri);
    if (!cnfg) {
        return;
    }
    let doc = await documentProvider.getDocument(uri);
    if (!doc) {
        return;
    }
    await cnfg.updateObjectParents(
        SepticMetaInfoProvider.getInstance().getObjectHierarchy()
    );
    let diagnostics = await langService.provideDiagnostics(doc, cnfg);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: diagnostics });
}

async function publishDiagnostics(uri: string) {
    let context: ScgContext | undefined = await contextManager.getContext(uri);
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
        let context = await contextManager.getContext(uri);
        if (!context) {
            publishDiagnostics(uri);
        }
    }
}

connection.onRequest(protocol.opcTagList, async (param) => {
    let context: SepticReferenceProvider | undefined =
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
    let context: SepticReferenceProvider | undefined =
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
    let prevCnfg: SepticCnfg | undefined = await langService.cnfgProvider.get(
        param.prevVersion
    );
    let currentCnfg: SepticCnfg | undefined =
        await langService.cnfgProvider.get(param.currentVersion);
    if (!prevCnfg || !currentCnfg) {
        return "";
    }
    return langService.provideCnfgComparison(prevCnfg, currentCnfg);
});

connection.onRequest(protocol.contexts, async () => {
    let contexts = contextManager.getAllContexts().map((val) => val.name);
    for (const uri of documentProvider.getAllDocumentUris()) {
        let context = await contextManager.getContext(uri);
        if (!context && uri.endsWith(".cnfg")) {
            contexts.push(uri);
        }
    }
    return contexts;
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
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
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
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
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
    let context = contextManager.getContextByName(uri);
    if (!context) {
        return;
    }
    publishDiagnosticsContext(context);
    updateDiagnosticsAllStandaloneCnfgs();
});

contextManager.onDidDeleteContext(async (uri) => {
    updateAllDiagnostics();
});

connection.onDidChangeConfiguration((change) => {
    settingsManager.invalidate();
    updateAllDiagnostics();
});

connection.onFoldingRanges(async (params, token): Promise<FoldingRange[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    await settingsManager.getSettings();
    return langService.provideFoldingRanges(document, token);
});

connection.onDocumentSymbol(
    async (params, token): Promise<DocumentSymbol[]> => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }
        return langService.provideDocumentSymbols(document, token);
    }
);

connection.onCompletion(
    async (params: CompletionParams): Promise<CompletionItem[]> => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }
        let context: SepticReferenceProvider | undefined =
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

connection.onDefinition(async (params, token) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    let context: SepticReferenceProvider | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return [];
    }

    let refsOffset = await langService.provideDefinition(
        params,
        document,
        context
    );
    const refs: LocationLink[] = [];
    for (let ref of refsOffset) {
        let doc = await documentProvider.getDocument(ref.targetUri);
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
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    let context: SepticReferenceProvider | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return [];
    }
    let refsOffset = await langService.provideDeclaration(
        params,
        document,
        context
    );
    const refs: LocationLink[] = [];
    for (let ref of refsOffset) {
        let doc = await documentProvider.getDocument(ref.targetUri);
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
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    let context: SepticReferenceProvider | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return [];
    }
    let refsOffset = await langService.provideReferences(
        params,
        document,
        context
    );

    const refs: Location[] = [];
    for (let ref of refsOffset) {
        let doc = await documentProvider.getDocument(ref.uri);
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

    let context: SepticReferenceProvider | undefined =
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
    let doc = await documentProvider.getDocument(params.textDocument.uri);
    if (!doc) {
        return undefined;
    }

    let context: SepticReferenceProvider | undefined =
        await contextManager.getContext(params.textDocument.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(params.textDocument.uri);
    }

    if (!context) {
        return undefined;
    }
    return langService.provideHover(params, doc, context);
});

connection.onDocumentFormatting(async (params) => {
    let settings = await settingsManager.getSettings();
    if (!settings?.formatting.enabled) {
        return [];
    }
    let doc = documents.get(params.textDocument.uri);
    if (!doc) {
        return [];
    }
    return langService.provideFormatting(doc);
});

connection.onSignatureHelp(async (params) => {
    let doc = await documentProvider.getDocument(params.textDocument.uri);
    if (!doc) {
        return undefined;
    }
    return langService.provideSignatureHelp(params, doc);
});

connection.onCodeAction(async (params) => {
    let context: ScgContext | undefined = await contextManager.getContext(
        params.textDocument.uri
    );
    if (!context) {
        let cnfg = await langService.cnfgProvider.get(params.textDocument.uri);
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

    let codeActions = await langService.provideCodeAction(params);
    return codeActions;
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
