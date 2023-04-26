import { SepticObject } from "../parser";

export interface HierarchySettings {
	readonly defaultLevel: number;
	readonly defaultVariableLevel: number;
	readonly level1: string[];
	readonly level2: string[];
	readonly level3: string[];
}

export const defaultHierarchySettings: HierarchySettings = {
	defaultLevel: 3,
	defaultVariableLevel: 2,
	level1: ["system", "sopcproc", "dmmyappl", "smpcappl", "displaygroup"],
	level2: [
		"exprmodl",
		"calcmodl",
		"table",
		"appl",
		"spacer",
		"heading",
		"mvrlist",
		"cvrlist",
		"dvrlist",
		"xvrplot",
		"image",
		"calctable",
		"modelmatrix",
	],
	level3: ["imagestatuslabel", "calcpvr"],
};

export function getHierarchyLevel(
	obj: SepticObject,
	settings: HierarchySettings
): number {
	let type: string = obj.name.toLowerCase();

	if (settings.level1.includes(type)) {
		return 1;
	} else if (settings.level2.includes(type)) {
		return 2;
	} else if (settings.level3.includes(type)) {
		return 3;
	}

	const regexVariable = /[a-zA-Z]+vr/;

	if (regexVariable.test(type)) {
		return settings.defaultVariableLevel;
	}

	return settings.defaultLevel;
}
