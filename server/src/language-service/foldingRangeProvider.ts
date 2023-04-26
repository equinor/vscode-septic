/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Equinor ASA
 *  Copyright (c) Microsoft Corporation. All rights reserved. [markdown-language-features as indicated]
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import { ITextDocument } from "./types/textDocument";
import { SepticCnfg, SepticObject } from "../parser";
import { SepticConfigProvider } from "./septicConfigProvider";
import { SettingsManager } from "../settings";
import {
	HierarchySettings,
	defaultHierarchySettings,
	getHierarchyLevel,
} from "../util";

export class FoldingRangeProvider {
	private readonly cnfgProvider: SepticConfigProvider;
	private readonly settingsManager: SettingsManager;

	constructor(
		cnfgProvider: SepticConfigProvider,
		settingsManager: SettingsManager
	) {
		this.cnfgProvider = cnfgProvider;
		this.settingsManager = settingsManager;
	}

	public provideFoldingRanges(
		doc: ITextDocument,
		token: lsp.CancellationToken
	): lsp.FoldingRange[] {
		console.debug("Started providing folding ranges");
		let cnfg = this.cnfgProvider.get(doc.uri);
		if (!cnfg) {
			return [];
		}

		let settings =
			this.settingsManager.getSettings()?.hierarchy ?? defaultHierarchySettings;

		return getFoldingRanges(doc, cnfg, settings, token);
	}
}

export function getFoldingRanges(
	doc: ITextDocument,
	cnfg: SepticCnfg,
	settings: HierarchySettings,
	token: lsp.CancellationToken | undefined = undefined
): lsp.FoldingRange[] {
	let ranges: lsp.FoldingRange[] = [];

	for (let i = 0; i < cnfg.objects.length; i++) {
		let obj = cnfg.objects[i];
		let end = obj.end;
		let level = getHierarchyLevel(obj, settings);

		let j = i + 1;
		while (j < cnfg.objects.length) {
			if (token?.isCancellationRequested) {
				return [];
			}
			if (getHierarchyLevel(cnfg.objects[j], settings) <= level) {
				break;
			}
			end = cnfg.objects[j].end;
			j += 1;
		}

		ranges.push({
			startLine: doc.positionAt(obj.start).line,
			endLine: doc.positionAt(end).line,
		});
	}

	return ranges;
}
