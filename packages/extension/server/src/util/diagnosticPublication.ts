export class DiagnosticPublicationTracker {
    private readonly current = new Map<string, symbol>();
    private readonly contextFiles = new Map<string, Set<string>>();

    public begin(uri: string): symbol {
        const publication = Symbol();
        this.current.set(uri, publication);
        return publication;
    }

    public invalidate(uri: string): void {
        this.current.delete(uri);
        const contextFiles = this.contextFiles.get(uri);
        if (contextFiles) {
            this.contextFiles.delete(uri);
            for (const file of contextFiles) {
                this.current.delete(file);
            }
        }
        for (const [contextUri, files] of this.contextFiles) {
            if (files.has(uri)) {
                this.current.delete(contextUri);
                for (const file of files) {
                    this.current.delete(file);
                }
            }
        }
    }

    public registerContext(uri: string, files: string[]): void {
        const previous = this.contextFiles.get(uri);
        const current = new Set(files);
        if (previous) {
            for (const file of previous) {
                if (!current.has(file)) {
                    this.current.delete(file);
                }
            }
        }
        this.contextFiles.set(uri, current);
    }

    public isCurrent(uri: string, publication: symbol): boolean {
        return this.current.get(uri) === publication;
    }

    public finish(uri: string, publication: symbol): void {
        if (this.isCurrent(uri, publication)) {
            this.current.delete(uri);
        }
    }
}
