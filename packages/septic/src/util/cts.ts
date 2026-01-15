export interface CancellationToken {
    /**
     * Is `true` when the token has been cancelled, `false` otherwise.
     */
    readonly isCancellationRequested: boolean;

    /**
     * An event which fires upon cancellation.
     * @param listener The listener function will be called when the event happens.
     */
    readonly onCancellationRequested: (listener: () => void) => {
        dispose(): void;
    };
}
