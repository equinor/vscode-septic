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
    TextDocumentPositionParams,
    CompletionItem,
    LocationLink,
    Location,
    DidChangeWatchedFilesNotification,
    CancellationToken,
    Diagnostic,
    FullDocumentDiagnosticReport,
    UnchangedDocumentDiagnosticReport,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { ILanguageService, createLanguageService } from "./language-service";
import { SettingsManager } from "./settings";
import { DocumentProvider } from "./documentProvider";
import * as protocol from "./protocol";
import { ContextManager } from "./contextManager";
import { offsetToPositionRange } from "./util/converter";
import { ScgContext, SepticCnfg, SepticReferenceProvider } from "./septic";
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const settingsManager = new SettingsManager(connection);

const documentProvider = new DocumentProvider(connection, documents);

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

async function computeDiagnosticsContext(
    context: ScgContext,
    token: CancellationToken | undefined = undefined
): Promise<Diagnostic[]> {
    await context.load();
    const diagnosticsPromises = context.files.map(async (file) => {
        let doc = await documentProvider.getDocument(file);
        if (!doc) {
            return [];
        }
        const diagnostics: Diagnostic[] = await langService.provideDiagnostics(
            doc,
            context,
            token
        );
        return diagnostics;
    });

    let diagnostics = await Promise.all(diagnosticsPromises);
    return diagnostics.flat();
}

async function computeDiagnosticsCnfg(
    cnfg: SepticCnfg,
    token: CancellationToken | undefined = undefined
): Promise<Diagnostic[]> {
    let doc = await documentProvider.getDocument(cnfg.uri);
    if (!doc) {
        return [];
    }
    return await langService.provideDiagnostics(doc, cnfg, token);
}

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
            },
            definitionProvider: true,
            referencesProvider: true,
            declarationProvider: true,
            renameProvider: {
                prepareProvider: true,
            },
            hoverProvider: true,
            documentFormattingProvider: true,
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: false,
            },
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

connection.languages.diagnostics.on(
    async (
        params,
        token
    ): Promise<
        FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport
    > => {
        let context: ScgContext | undefined = await contextManager.getContext(
            params.textDocument.uri
        );
        if (context) {
            return {
                items: await computeDiagnosticsContext(context, token),
                kind: "full",
            };
        }
        let cnfg = await langService.cnfgProvider.get(params.textDocument.uri);
        if (!cnfg) {
            return { items: [], kind: "full" };
        }
        return {
            items: await computeDiagnosticsCnfg(cnfg, token),
            kind: "full",
        };
    }
);

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
    const yamlFiles = await connection.sendRequest(protocol.findYamlFiles, {});
    for (const file of yamlFiles) {
        contextManager.createScgContext(file);
    }
});

contextManager.onDidUpdateContext(async (uri) => {
    let context = contextManager.getContextByName(uri);
    if (!context) {
        return;
    }
    computeDiagnosticsContext(context);
});

connection.onDidChangeConfiguration((change) => {
    settingsManager.invalidate();
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
    async (docPos: TextDocumentPositionParams): Promise<CompletionItem[]> => {
        const document = documents.get(docPos.textDocument.uri);
        if (!document) {
            return [];
        }
        let context: SepticReferenceProvider | undefined =
            await contextManager.getContext(docPos.textDocument.uri);
        if (!context) {
            context = await langService.cnfgProvider.get(
                docPos.textDocument.uri
            );
        }

        if (!context) {
            return [];
        }
        return langService.provideCompletion(docPos, document, context);
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

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
