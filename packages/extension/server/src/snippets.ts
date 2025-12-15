import { SepticMetaInfoProvider } from "septic";
import {
    CompletionItem,
    CompletionItemKind,
    InsertTextFormat,
    InsertTextMode,
} from "vscode-languageserver";

export class SepticSnippetProvider {
    private static instance: SepticSnippetProvider;
    private version: string;
    private snippets: CompletionItem[];
    private constructor() {
        this.version = SepticMetaInfoProvider.getVersion();
        this.snippets = this.loadSnippets();
    }
    public static getInstance(): SepticSnippetProvider {
        if (!SepticSnippetProvider.instance) {
            SepticSnippetProvider.instance = new SepticSnippetProvider();
        }
        return SepticSnippetProvider.instance;
    }

    public getSnippets(): CompletionItem[] {
        if (this.version !== SepticMetaInfoProvider.getVersion()) {
            this.version = SepticMetaInfoProvider.getVersion();
            this.snippets = this.loadSnippets();
        }
        return this.snippets;
    }

    private loadSnippets(): CompletionItem[] {
        const metaInfoProvider = SepticMetaInfoProvider.getInstance();
        this.version = SepticMetaInfoProvider.getVersion();
        const objectSnippetInfo = metaInfoProvider.getSnippets();
        const snippets: CompletionItem[] = objectSnippetInfo.map((obj) => {
            return {
                label: obj.prefix,
                kind: CompletionItemKind.Snippet,
                insertTextFormat: InsertTextFormat.Snippet,
                insertText: obj.body
                    .map((line) => line.replace(/\\n/g, "\n"))
                    .join("\n"),
                insertTextMode: InsertTextMode.asIs,
                detail: obj.description,
                sortText: `${obj.prefix}`,
                labelDetails: { detail: ` Object` },
            };
        });
        return snippets;
    }
}
