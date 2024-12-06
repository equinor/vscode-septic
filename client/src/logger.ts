/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs';

export class FileTelemetrySender implements vscode.TelemetrySender {
	private logFilePath: string;

	constructor(logFilePath: string) {
		this.logFilePath = logFilePath;
	}

	sendEventData(eventName: string, data?: Record<string, any>): void {
		this.writeLog('Event', eventName, data);
	}

	sendErrorData(error: Error, data?: Record<string, any>): void {
		this.writeLog('Error', error.message, data);
	}

	flush(): void | Thenable<void> {
		// Implement any necessary cleanup here
	}

	private writeLog(type: string, message: string, data?: Record<string, any>): void {
		const logEntry = {
			timestamp: new Date().toISOString(),
			type,
			message,
			data,
		};
		fs.appendFileSync(this.logFilePath, JSON.stringify(logEntry) + '\n');
	}
}