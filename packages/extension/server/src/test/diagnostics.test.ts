import { expect } from "chai";
import {
    CancellationToken,
    CancellationTokenSource,
    Connection,
    DidChangeWatchedFilesParams,
    Emitter,
    FileChangeType,
    TextDocumentChangeEvent,
    TextDocuments,
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SepticConfigProvider } from "../configProvider";
import { DocumentProvider } from "../documentProvider";
import { DiagnosticProvider } from "../language-service/diagnosticsProvider";
import { SettingsManager } from "../settings";
import { DiagnosticPublicationTracker } from "../util/diagnosticPublication";
import {
    ScgContext,
    SepticCnfg,
    SepticDiagnosticCode,
} from "@equinor/septic-config-lib";
import { parseSepticForTest } from "./util";

describe("Diagnostic publication tracking", () => {
    it("invalidates older requests after an edit or a newer publication", () => {
        const tracker = new DiagnosticPublicationTracker();
        const uri = "file:///test.cnfg";
        const first = tracker.begin(uri);
        expect(tracker.isCurrent(uri, first)).to.equal(true);

        tracker.invalidate(uri);
        expect(tracker.isCurrent(uri, first)).to.equal(false);

        const second = tracker.begin(uri);
        const third = tracker.begin(uri);
        expect(tracker.isCurrent(uri, second)).to.equal(false);
        expect(tracker.isCurrent(uri, third)).to.equal(true);
        tracker.finish(uri, third);
        expect(tracker.isCurrent(uri, third)).to.equal(false);
    });

    it("invalidates every pending publication in a changed SCG context", () => {
        const tracker = new DiagnosticPublicationTracker();
        const contextUri = "file:///project/scg.yaml";
        const firstFile = "file:///project/templates/first.cnfg";
        const secondFile = "file:///project/templates/second.cnfg";
        tracker.registerContext(contextUri, [firstFile, secondFile]);
        const contextPublication = tracker.begin(contextUri);
        const firstPublication = tracker.begin(firstFile);
        const secondPublication = tracker.begin(secondFile);

        tracker.invalidate(firstFile);

        expect(tracker.isCurrent(firstFile, firstPublication)).to.equal(false);
        expect(tracker.isCurrent(secondFile, secondPublication)).to.equal(
            false,
        );
        expect(tracker.isCurrent(contextUri, contextPublication)).to.equal(
            false,
        );
    });
});

describe("Diagnostics configuration", () => {
    it("exposes the current in-memory document version", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        const connection = {
            onDidChangeWatchedFiles: () => {},
        } as unknown as Connection;
        const provider = new DocumentProvider(
            connection,
            documents,
            {} as SettingsManager,
        );
        const document = TextDocument.create(
            "file:///test.cnfg",
            "septic",
            5,
            "Evr: Before\n",
        );
        opened.fire({ document });
        const wrapped = await provider.getDocument(document.uri);
        expect(wrapped?.version).to.equal(5);
        TextDocument.update(document, [{ text: "Evr: After\n" }], 6);
        changed.fire({ document });
        expect(wrapped?.version).to.equal(6);
        opened.dispose();
        changed.dispose();
        closed.dispose();
    });

    it("returns to on-disk contents when an unsaved document closes", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        const connection = {
            onDidChangeWatchedFiles: () => {},
            sendRequest: async () => Array.from(Buffer.from("Evr: OnDisk\n")),
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const documentProvider = new DocumentProvider(
            connection,
            documents,
            settings,
        );
        const provider = new SepticConfigProvider(documentProvider);
        const uri = "file:///test.cnfg";
        await documentProvider.getDocument(uri);
        const document = TextDocument.create(
            uri,
            "septic",
            2,
            "Evr: Unsaved\n",
        );
        opened.fire({ document });
        expect(
            (await provider.get(uri))?.objects[0]?.identifier?.name,
        ).to.equal("Unsaved");
        closed.fire({ document });
        expect(
            (await provider.get(uri))?.objects[0]?.identifier?.name,
        ).to.equal("OnDisk");
        opened.dispose();
        changed.dispose();
        closed.dispose();
    });

    it("reloads a saved file when it closes without a disk snapshot", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        let reads = 0;
        const connection = {
            onDidChangeWatchedFiles: () => {},
            sendRequest: async () => {
                reads++;
                return Array.from(Buffer.from("Evr: Saved\n"));
            },
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const provider = new DocumentProvider(connection, documents, settings);
        const loaded = Promise.withResolvers<void>();
        const listener = provider.onDidCreateDoc(() => loaded.resolve());
        const uri = "file:///saved.cnfg";
        const document = TextDocument.create(uri, "septic", 1, "Evr: Saved\n");
        opened.fire({ document });

        closed.fire({ document });

        expect(reads).to.equal(1);
        await loaded.promise;
        expect((await provider.getDocument(uri))?.getText()).to.equal(
            "Evr: Saved\n",
        );
        listener.dispose();
        opened.dispose();
        changed.dispose();
        closed.dispose();
    });

    it("keeps open editor contents when the on-disk file changes", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const watched = new Emitter<DidChangeWatchedFilesParams>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        const connection = {
            onDidChangeWatchedFiles: watched.event,
            sendRequest: async () => Array.from(Buffer.from("Evr: OnDisk\n")),
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const documentProvider = new DocumentProvider(
            connection,
            documents,
            settings,
        );
        const provider = new SepticConfigProvider(documentProvider);
        const uri = "file:///test.cnfg";
        const document = TextDocument.create(
            uri,
            "septic",
            2,
            "Evr: Unsaved\n",
        );
        opened.fire({ document });
        expect((await provider.get(uri))?.getText()).to.equal("Evr: Unsaved\n");

        const notified = Promise.withResolvers<void>();
        const listener = documentProvider.onDidChangeDoc(() =>
            notified.resolve(),
        );
        watched.fire({ changes: [{ uri, type: FileChangeType.Changed }] });
        await notified.promise;
        expect((await provider.get(uri))?.getText()).to.equal("Evr: Unsaved\n");
        closed.fire({ document });
        expect((await provider.get(uri))?.getText()).to.equal("Evr: OnDisk\n");
        listener.dispose();
        opened.dispose();
        changed.dispose();
        closed.dispose();
        watched.dispose();
    });

    it("keeps a pending disk refresh when an open document closes", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const watched = new Emitter<DidChangeWatchedFilesParams>();
        const refreshed = Promise.withResolvers<number[]>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        let reads = 0;
        const connection = {
            onDidChangeWatchedFiles: watched.event,
            sendRequest: async () => {
                reads++;
                return reads === 1
                    ? Array.from(Buffer.from("Evr: Before\n"))
                    : refreshed.promise;
            },
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const provider = new DocumentProvider(connection, documents, settings);
        const uri = "file:///test.cnfg";
        const wrapped = await provider.getDocument(uri);
        const document = TextDocument.create(uri, "septic", 2, "Evr: Saved\n");
        opened.fire({ document });

        let changes = 0;
        const update = Promise.withResolvers<void>();
        const listener = provider.onDidChangeDoc(() => {
            changes++;
            if (changes === 2) {
                update.resolve();
            }
        });
        watched.fire({ changes: [{ uri, type: FileChangeType.Changed }] });
        expect(reads).to.equal(2);
        closed.fire({ document });
        refreshed.resolve(Array.from(Buffer.from("Evr: AfterSave\n")));
        await update.promise;

        expect(wrapped?.getText()).to.equal("Evr: AfterSave\n");
        listener.dispose();
        opened.dispose();
        changed.dispose();
        closed.dispose();
        watched.dispose();
    });

    it("keeps a pending disk refresh when a cached document opens", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const watched = new Emitter<DidChangeWatchedFilesParams>();
        const refreshed = Promise.withResolvers<number[]>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        let reads = 0;
        const connection = {
            onDidChangeWatchedFiles: watched.event,
            sendRequest: async () => {
                reads++;
                return reads === 1
                    ? Array.from(Buffer.from("Evr: Before\n"))
                    : refreshed.promise;
            },
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const provider = new DocumentProvider(connection, documents, settings);
        const uri = "file:///test.cnfg";
        const wrapped = await provider.getDocument(uri);

        let changes = 0;
        const update = Promise.withResolvers<void>();
        const listener = provider.onDidChangeDoc(() => {
            changes++;
            if (changes === 2) {
                update.resolve();
            }
        });
        watched.fire({ changes: [{ uri, type: FileChangeType.Changed }] });
        expect(reads).to.equal(2);
        const document = TextDocument.create(
            uri,
            "septic",
            2,
            "Evr: Unsaved\n",
        );
        opened.fire({ document });
        refreshed.resolve(Array.from(Buffer.from("Evr: AfterSave\n")));
        await update.promise;
        closed.fire({ document });

        expect(wrapped?.getText()).to.equal("Evr: AfterSave\n");
        listener.dispose();
        opened.dispose();
        changed.dispose();
        closed.dispose();
        watched.dispose();
    });

    it("does not cache a disk read that completes after deletion", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const watched = new Emitter<DidChangeWatchedFilesParams>();
        const read = Promise.withResolvers<number[]>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        const connection = {
            onDidChangeWatchedFiles: watched.event,
            sendRequest: async () => read.promise,
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const documentProvider = new DocumentProvider(
            connection,
            documents,
            settings,
        );
        const uri = "file:///test.cnfg";
        const pending = documentProvider.getDocument(uri);
        watched.fire({ changes: [{ uri, type: FileChangeType.Deleted }] });
        read.resolve(Array.from(Buffer.from("Evr: Deleted\n")));
        expect(await pending).to.equal(undefined);
        expect(documentProvider.getAllDocumentUris()).to.deep.equal([]);
        opened.dispose();
        changed.dispose();
        closed.dispose();
        watched.dispose();
    });

    it("returns a newer cached disk document when an old read finishes", async () => {
        const opened = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const changed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const closed = new Emitter<TextDocumentChangeEvent<TextDocument>>();
        const watched = new Emitter<DidChangeWatchedFilesParams>();
        const oldRead = Promise.withResolvers<number[]>();
        const newRead = Promise.withResolvers<number[]>();
        const documents = {
            onDidOpen: opened.event,
            onDidChangeContent: changed.event,
            onDidClose: closed.event,
            get: () => undefined,
        } as unknown as TextDocuments<TextDocument>;
        let reads = 0;
        const connection = {
            onDidChangeWatchedFiles: watched.event,
            sendRequest: async () =>
                reads++ === 0 ? oldRead.promise : newRead.promise,
        } as unknown as Connection;
        const settings = {
            getSettings: async () => ({ encoding: "utf8" }),
        } as unknown as SettingsManager;
        const provider = new DocumentProvider(connection, documents, settings);
        const created = Promise.withResolvers<void>();
        const listener = provider.onDidCreateDoc(() => created.resolve());
        const uri = "file:///test.cnfg";
        const oldDocument = provider.getDocument(uri);

        watched.fire({ changes: [{ uri, type: FileChangeType.Created }] });
        expect(reads).to.equal(2);
        newRead.resolve(Array.from(Buffer.from("Evr: New\n")));
        await created.promise;
        const current = await provider.getDocument(uri);
        oldRead.resolve(Array.from(Buffer.from("Evr: Old\n")));

        expect(await oldDocument).to.equal(current);
        expect(current?.getText()).to.equal("Evr: New\n");
        listener.dispose();
        opened.dispose();
        changed.dispose();
        closed.dispose();
        watched.dispose();
    });

    it("does not return a cancelled parse as an empty configuration", async () => {
        const documents = {
            onDidChangeDoc: () => {},
            onDidCreateDoc: () => {},
            onDidLoadDoc: () => {},
            onDidDeleteDoc: () => {},
        } as unknown as DocumentProvider;
        const provider = new SepticConfigProvider(documents);
        const document = TextDocument.create(
            "file:///test.cnfg",
            "septic",
            1,
            "Evr: Before\n",
        );
        const cancellation = new CancellationTokenSource();
        const pending = provider.getValue(document, cancellation.token);
        cancellation.cancel();
        expect(await pending).to.equal(undefined);

        const valid = await provider.getValue(document, CancellationToken.None);
        expect(valid?.objects[0]?.identifier?.name).to.equal("Before");
        const empty = TextDocument.create(
            "file:///empty.cnfg",
            "septic",
            1,
            "",
        );
        expect(
            (await provider.getValue(empty, CancellationToken.None))?.objects,
        ).to.deep.equal([]);
        cancellation.dispose();
    });

    it("retries a cancelled parse using a stable current document snapshot", async () => {
        const document = TextDocument.create(
            "file:///test.cnfg",
            "septic",
            1,
            "Evr: Before\n",
        );
        const changes = new Emitter<string>();
        const getText = document.getText.bind(document);
        let changed = false;
        document.getText = (range) => {
            const text = getText(range);
            if (!changed) {
                changed = true;
                queueMicrotask(() => {
                    TextDocument.update(
                        document,
                        [{ text: "Evr: After\n" }],
                        2,
                    );
                    changes.fire(document.uri);
                });
            }
            return text;
        };
        const documents = {
            onDidChangeDoc: changes.event,
            onDidCreateDoc: () => {},
            onDidLoadDoc: () => {},
            onDidDeleteDoc: () => {},
            getDocument: async () => document,
        } as unknown as DocumentProvider;
        const provider = new SepticConfigProvider(documents);
        const current = await provider.get(document.uri);
        expect(current?.getText()).to.equal("Evr: After\n");
        expect(current?.version).to.equal(2);
        expect(current?.objects[0]?.identifier?.name).to.equal("After");

        TextDocument.update(document, [{ text: "Evr: Later\n" }], 3);
        expect(current?.getText()).to.equal("Evr: After\n");
        changes.dispose();
    });

    it("does not resurrect a document deleted while it is loading", async () => {
        const uri = "file:///test.cnfg";
        const document = TextDocument.create(uri, "septic", 1, "Evr: Before\n");
        const deleted = new Emitter<string>();
        const load = Promise.withResolvers<TextDocument | undefined>();
        let exists = true;
        const documents = {
            onDidChangeDoc: () => {},
            onDidCreateDoc: () => {},
            onDidLoadDoc: () => {},
            onDidDeleteDoc: deleted.event,
            getDocument: async () => (exists ? load.promise : undefined),
        } as unknown as DocumentProvider;
        const provider = new SepticConfigProvider(documents);
        const pending = provider.get(uri);
        exists = false;
        deleted.fire(uri);
        load.resolve(document);
        expect(await pending).to.equal(undefined);
        expect(await provider.get(uri)).to.equal(undefined);
        deleted.dispose();
    });

    it("shares a parse between concurrent requests for the same document", async () => {
        const document = TextDocument.create(
            "file:///test.cnfg",
            "septic",
            1,
            "Evr: Shared\n",
        );
        const load = Promise.withResolvers<TextDocument | undefined>();
        const documents = {
            onDidChangeDoc: () => {},
            onDidCreateDoc: () => {},
            onDidLoadDoc: () => {},
            onDidDeleteDoc: () => {},
            getDocument: async () => load.promise,
        } as unknown as DocumentProvider;
        let parses = 0;
        const provider = new SepticConfigProvider(documents, async (doc) => {
            parses++;
            const cnfg = new SepticCnfg(doc);
            cnfg.parse(undefined);
            return cnfg;
        });
        const first = provider.get(document.uri);
        const second = provider.get(document.uri);
        load.resolve(document);
        const [firstResult, secondResult] = await Promise.all([first, second]);
        expect(parses).to.equal(1);
        expect(firstResult).to.equal(secondResult);
    });

    it("uses the same standalone configuration for diagnostics and references", async () => {
        const captured = parseSepticForTest("Unknown: Old");
        const current = parseSepticForTest("System: New");
        let loads = 0;
        const provider = new DiagnosticProvider(
            {
                get: async () => {
                    loads++;
                    return current;
                },
            },
            {
                getSettings: async () => ({ diagnostics: { enabled: true } }),
            } as unknown as SettingsManager,
        );

        const diagnostics = await provider.provideDiagnostics(
            captured.uri,
            captured,
        );
        expect(loads).to.equal(0);
        expect(
            diagnostics.some(
                (diagnostic) =>
                    diagnostic.code === SepticDiagnosticCode.unknownObjectType,
            ),
        ).to.equal(true);
    });

    it("uses a coherent SCG hierarchy when a template changes", async () => {
        const uri = "file:///project/templates/test.cnfg";
        const parse = (identifier: string) => {
            const text = `System: Root\nDmmyAppl: Test\nEvr: ${identifier}\n`;
            const cnfg = new SepticCnfg(
                TextDocument.create(uri, "septic", 1, text),
            );
            cnfg.parse(undefined);
            return cnfg;
        };
        let current: SepticCnfg | undefined = parse("Before");
        const configs = { get: async () => current };
        const context = new ScgContext(
            "test",
            "file:///project/scg.yaml",
            {
                templatepath: "templates",
                sources: [],
                layout: [{ name: "test.cnfg" }],
            },
            configs,
        );
        const provider = new DiagnosticProvider(configs, {
            getSettings: async () => ({ diagnostics: { enabled: true } }),
        } as unknown as SettingsManager);
        await context.updateObjectParents();
        current = parse("After");
        const actual = await provider.provideDiagnostics(uri, context);
        await context.updateObjectParents();
        const expected = await provider.provideDiagnostics(uri, context);
        expect(actual).to.deep.equal(expected);

        current = undefined;
        await context.load();
        expect(context.getCachedConfig(uri)).to.equal(undefined);
        expect(context.getObjectsByIdentifier("After")).to.deep.equal([]);
    });

    it("updates cross-file references when an SCG template changes", async () => {
        const sourceUri = "file:///project/templates/source.cnfg";
        const calcUri = "file:///project/templates/calc.cnfg";
        const parse = (uri: string, text: string) => {
            const cnfg = new SepticCnfg(
                TextDocument.create(uri, "septic", 1, text),
            );
            cnfg.parse(undefined);
            return cnfg;
        };
        const configs = new Map([
            [
                sourceUri,
                parse(sourceUri, "System: Root\nDmmyAppl: Test\nEvr: Shared\n"),
            ],
            [
                calcUri,
                parse(
                    calcUri,
                    'CalcModl: Calc\nCalcPvr: Result\n Alg= "Shared"\n',
                ),
            ],
        ]);
        const configProvider = { get: async (uri: string) => configs.get(uri) };
        const context = new ScgContext(
            "test",
            "file:///project/scg.yaml",
            {
                templatepath: "templates",
                sources: [],
                layout: [{ name: "source.cnfg" }, { name: "calc.cnfg" }],
            },
            configProvider,
        );
        const provider = new DiagnosticProvider(configProvider, {
            getSettings: async () => ({ diagnostics: { enabled: true } }),
        } as unknown as SettingsManager);
        const missingShared = (
            diagnostics: Awaited<
                ReturnType<DiagnosticProvider["provideDiagnostics"]>
            >,
        ) =>
            diagnostics.some(
                (diagnostic) =>
                    diagnostic.code === "W501" &&
                    typeof diagnostic.message === "string" &&
                    diagnostic.message.includes("Shared"),
            );

        expect(
            missingShared(await provider.provideDiagnostics(calcUri, context)),
        ).to.equal(false);
        configs.set(
            sourceUri,
            parse(sourceUri, "System: Root\nDmmyAppl: Test\nEvr: Renamed\n"),
        );
        expect(
            missingShared(await provider.provideDiagnostics(calcUri, context)),
        ).to.equal(true);
        configs.set(
            sourceUri,
            parse(sourceUri, "System: Root\nDmmyAppl: Test\nEvr: Shared\n"),
        );
        expect(
            missingShared(await provider.provideDiagnostics(calcUri, context)),
        ).to.equal(false);
    });

    it("relinks a prepared SCG context without reloading it", async () => {
        const uri = "file:///project/templates/test.cnfg";
        const cnfg = parseSepticForTest("Evr: Prepared");
        const context = new ScgContext(
            "test",
            "file:///project/scg.yaml",
            {
                templatepath: "templates",
                sources: [],
                layout: [{ name: "test.cnfg" }],
            },
            { get: async () => cnfg },
        );
        await context.updateObjectParents();
        let loads = 0;
        let parentUpdates = 0;
        const load = context.load.bind(context);
        const updateParents = context.updateLoadedObjectParents.bind(context);
        context.load = async () => {
            loads++;
            await load();
        };
        context.updateLoadedObjectParents = () => {
            parentUpdates++;
            updateParents();
        };
        const provider = new DiagnosticProvider({ get: async () => cnfg }, {
            getSettings: async () => ({ diagnostics: { enabled: true } }),
        } as unknown as SettingsManager);

        await provider.provideDiagnostics(uri, context, true);
        expect(loads).to.equal(0);
        expect(parentUpdates).to.equal(1);

        await provider.provideDiagnostics(uri, context);
        expect(loads).to.equal(1);
        expect(parentUpdates).to.equal(2);
    });
});

