import {
    CancellationToken,
    CancellationTokenSource,
} from "vscode-languageserver";

export class CancellationTokenManager {
    private ctsMap: Map<string, CancellationTokenSource> = new Map<
        string,
        CancellationTokenSource
    >();

    public cancel(key: string): void {
        const cts = this.ctsMap.get(key);
        if (!cts) {
            return;
        }
        cts.cancel();
        cts.dispose();
    }

    public token(key: string): CancellationToken {
        let cts = this.ctsMap.get(key);
        if (cts && !cts.token.isCancellationRequested) {
            return cts.token;
        }
        let newCts = new CancellationTokenSource();
        this.ctsMap.set(key, newCts);
        return newCts.token;
    }

    public delete(key: string) {
        this.ctsMap.delete(key);
    }

    public hasActiveToken(key: string): boolean {
        let cts = this.ctsMap.get(key);
        if (cts && !cts.token.isCancellationRequested) {
            return true;
        }
        return false;
    }
}
