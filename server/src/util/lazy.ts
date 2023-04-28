/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface Lazy<T> {
    readonly value: T;
    readonly hasValue: boolean;
}

class LazyValue<T> implements Lazy<T> {
    #value?: T;
    #hasValue = false;

    readonly #getValue: () => T;

    constructor(getValue: () => T) {
        this.#getValue = getValue;
    }

    get value(): T {
        if (!this.#hasValue) {
            this.#hasValue = true;
            this.#value = this.#getValue();
        }
        return this.#value!;
    }

    get hasValue(): boolean {
        return this.#hasValue;
    }
}

export function lazy<T>(getValue: () => T): Lazy<T> {
    return new LazyValue<T>(getValue);
}
