import { removeSpaces } from "../util";
import {
    AlgBinary,
    AlgExpr,
    AlgCalc,
    AlgGrouping,
    AlgLiteral,
    AlgTokenType,
    AlgUnary,
    IAlgVisitor,
    parseAlg,
} from "./algParser";

export class CycleDetectorVisitor implements IAlgVisitor {
    variables: AlgLiteral[] = [];
    nodes: Node[] = [];
    currentNode: Node | undefined = undefined;

    visit(expr: AlgExpr) {
        expr.accept(this);
    }

    visitBinary(expr: AlgBinary): void {
        expr.left.accept(this);
        expr.right?.accept(this);
    }

    visitLiteral(expr: AlgLiteral): void {
        if (expr.type !== AlgTokenType.identifier) {
            return;
        }
        if (this.currentNode) {
            this.currentNode.neighbors.add(expr.value);
        }
        this.variables.push(expr);
    }

    visitGrouping(expr: AlgGrouping): void {
        expr.expr.accept(this);
    }

    visitCalc(expr: AlgCalc): void {
        let sliceIndex = 0;
        if (expr.identifier === "setgood") {
            return;
        }
        if (expr.identifier === "setmeas") {
            let name = "";
            if (
                expr.params.length &&
                expr.params[0] instanceof AlgLiteral &&
                expr.params[0].type === AlgTokenType.identifier
            ) {
                name = expr.params[0].value;
            }
            if (name) {
                this.currentNode = {
                    name: name,
                    neighbors: new Set<string>(),
                    calcpvr: "",
                };
                sliceIndex = 1;
            }
        }
        expr.params.slice(sliceIndex).forEach((param) => {
            param.accept(this);
        });
        if (this.currentNode && expr.identifier === "setmeas") {
            this.nodes.push(this.currentNode);
            this.currentNode = undefined;
        }
    }

    visitUnary(expr: AlgUnary): void {
        expr.right.accept(this);
    }
}

export interface Alg {
    calcPvrName: string;
    content: string;
}

export interface Cycle {
    nodes: Node[];
}

interface Node {
    name: string;
    neighbors: Set<string>;
    calcpvr: string;
}

export function findAlgCycles(algs: Alg[]): Cycle[] {
    const graph: Map<string, Node> = new Map<string, Node>();
    for (let alg of algs) {
        let expr;
        try {
            expr = parseAlg(alg.content);
        } catch {
            continue;
        }
        let cycleVisitor = new CycleDetectorVisitor();
        cycleVisitor.visit(expr);
        for (let measNode of cycleVisitor.nodes) {
            let existingNode = graph.get(measNode.name);
            if (!existingNode) {
                existingNode = {
                    name: measNode.name,
                    neighbors: new Set<string>(),
                    calcpvr: alg.calcPvrName,
                };
                graph.set(existingNode.name, existingNode);
            }
            for (let variable of measNode.neighbors) {
                let node = graph.get(variable);
                if (!node) {
                    node = {
                        name: variable,
                        neighbors: new Set<string>(),
                        calcpvr: alg.calcPvrName,
                    };
                    graph.set(node.name, node);
                }
                node.neighbors.add(measNode.name);
            }
        }
        for (let variable of cycleVisitor.variables) {
            let node = graph.get(variable.value);
            if (!node) {
                node = {
                    name: variable.value,
                    neighbors: new Set<string>(),
                    calcpvr: alg.calcPvrName,
                };
                graph.set(node.name, node);
            }
            node.neighbors.add(alg.calcPvrName);
        }
        let algNode = graph.get(alg.calcPvrName);
        if (algNode) {
            algNode.calcpvr = alg.calcPvrName;
        }
    }

    const visited: Map<string, boolean> = new Map<string, boolean>();
    const cycles: Cycle[] = [];
    for (let node of graph.values()) {
        if (!visited.get(node.name)) {
            dfs(graph, node, visited, [], cycles);
        }
    }
    return cycles;
}

function dfs(
    graph: Map<string, Node>,
    node: Node,
    visited: Map<string, boolean>,
    stack: Node[],
    cycles: Cycle[]
) {
    visited.set(node.name, true);
    stack.push(node);
    for (let neighbor of node.neighbors) {
        let neighborNode = graph.get(neighbor);
        if (!neighborNode) {
            continue;
        }
        if (!visited.get(neighbor)) {
            dfs(graph, neighborNode, visited, stack, cycles);
        } else if (stack.includes(neighborNode)) {
            cycles.push({
                nodes: stack.slice(stack.indexOf(neighborNode)),
            });
        }
    }
    stack.pop();
}
