import { AlgVisitor } from './algParser';
import { SepticObject } from './septicElements';

interface SepticFunctionNode {
	obj: SepticObject;
	name: string;
	parents: SepticFunctionNode[];
	children: SepticFunctionNode[];
	inputs: string[];
	visited: boolean;
}

export interface SepticFunction {
	name: string;
	lines: SepticFunctionLine[];
	inputs: string[];
}

export interface SepticFunctionLine {
	name: string;
	alg: string;
	doc: string;
}

export function getFunctionsFromCalcPvrs(calcPvrs: SepticObject[]): SepticFunction[] {
	const nodes = calcPvrs.filter((child) => child.identifier?.id).map((child) => {
		return {
			obj: child,
			name: child.identifier!.id,
			parents: [],
			children: [],
			inputs: [],
			visited: false,
			root: false
		};
	});
	const functionNodes = nodes.map((node) => {
		const text2 = node.obj.getAttribute("Text2")?.getValue();
		const match = text2?.match(/^#([a-zA-Z_][a-zA-Z0-9_]*)(?:\((\d+)\))?/);
		if (match) {
			const functionName = match[1];
			const depth = match[2] ? parseInt(match[2], 10) : undefined;
			return {
				node: node,
				name: functionName,
				depth: depth
			}
		}
	}).filter((node) => !!node);
	nodes.reverse();
	for (const node of functionNodes) {
		visitNode(node.node, nodes, []);
	}
	const functions: SepticFunction[] = functionNodes.map((node) => createFunctionFromNode(node.name, node.node, node.depth));
	return functions;
}

function visitNode(node: SepticFunctionNode, allNodes: SepticFunctionNode[], ancestors: string[]) {
	if (node.visited) {
		return;
	}
	node.visited = true;
	const parsedAlg = node.obj.parseAlg();
	if (!parsedAlg) {
		return;
	}
	const visitor = new AlgVisitor();
	visitor.visit(parsedAlg.algExpr);
	visitor.variables.forEach((xvr) => {
		const name = xvr.value.split(".")[0];
		const refNode = allNodes.find((n) => n.name === name);
		if (refNode) {
			refNode.parents.push(node);
			if (ancestors.includes(refNode.name)) {
				node.inputs.push(refNode.name);
			} else {
				node.children.push(refNode);
				visitNode(refNode, allNodes, [...ancestors, node.name]);
			}
		} else {
			node.inputs.push(name);
		}
	});
}

function createFunctionFromNode(name: string, node: SepticFunctionNode, maxDepth: number | undefined = undefined): SepticFunction {
	const visited = new Set<SepticFunctionNode>();
	const sorted: SepticFunctionNode[] = [];
	const inputs = new Set<string>();
	function visit(n: SepticFunctionNode, depth: number) {
		if (visited.has(n)) return;

		visited.add(n);
		if (maxDepth && depth == maxDepth) {
			n.children.forEach((child) => {
				inputs.add(child.name);
			});
		} else {
			for (const child of n.children) {
				visit(child, depth + 1);
			}
		}
		sorted.push(n);
	}
	visit(node, 0);

	const lines = sorted.map((child) => {
		return {
			name: child.name,
			alg: child.obj.getAttribute("Alg")?.getValue() || "",
			doc: child.obj.getAttribute("Text1")?.getValue() || "",
		};
	});
	sorted.forEach((child) => {
		child.inputs.forEach((i) => inputs.add(i));
	});
	return {
		name: name,
		lines: lines,
		inputs: Array.from(inputs),
	};
}

export function printFunctionInfo(func: SepticFunction) {
	console.log(`function ${func.name}(${func.inputs.join(", ")})`);
	func.lines.forEach((line, idx) => {
		if (idx === func.lines.length - 1) {
			// Last line: print as return statement
			const textLine = line.doc
				? `   return ${line.alg} #${line.doc}`
				: `   return ${line.alg}`;
			console.log(textLine);
		} else {
			const textLine = line.doc
				? `   ${line.name} = ${line.alg} #${line.doc}`
				: `   ${line.name} = ${line.alg}`;
			console.log(textLine);
		}
	});
}