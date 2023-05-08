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
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { ILanguageService, createLanguageService } from "./language-service";
import { SettingsManager } from "./settings";
import { DocumentProvider } from "./documentProvider";
import * as protocol from "./protocol";
import { ContextManager } from "./contextManager";
import { offsetToPositionRange } from "./util/converter";
import { SepticReferenceProvider } from "./septic";
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
    const yamlFiles = await connection.sendRequest(protocol.findYamlFiles, {});
    for (const file of yamlFiles) {
        contextManager.createScgContext(file);
    }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.

documents.onDidChangeContent(async (change) => {
    let context: SepticReferenceProvider | undefined =
        await contextManager.getContext(change.document.uri);
    if (!context) {
        context = await langService.cnfgProvider.get(change.document.uri);
    }

    if (context) {
        let diagnostics = await langService.provideDiagnostics(
            change.document,
            context
        );
        connection.sendDiagnostics({
            uri: change.document.uri,
            diagnostics: diagnostics,
        });
    }
});

connection.onDidChangeConfiguration((change) => {
    settingsManager.invalidate();
});

connection.onFoldingRanges(async (params, token): Promise<FoldingRange[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
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

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
