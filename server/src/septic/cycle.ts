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

    visit(expr: AlgExpr) {
        expr.accept(this);
    }

    visitBinary(expr: AlgBinary): void {
        expr.left.accept(this);
        expr.right?.accept(this);
    }

    visitLiteral(expr: AlgLiteral): void {
        if (expr.type === AlgTokenType.identifier) {
            this.variables.push(expr);
        }
    }

    visitGrouping(expr: AlgGrouping): void {
        expr.expr.accept(this);
    }

    visitCalc(expr: AlgCalc): void {
        if (expr.identifier === "setgood") {
            return;
        }
        expr.params.forEach((param) => {
            param.accept(this);
        });
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
        for (let variable of cycleVisitor.variables) {
            let node = graph.get(variable.value);
            if (!node) {
                node = {
                    name: variable.value,
                    neighbors: new Set<string>(),
                };
                graph.set(node.name, node);
            }
            node.neighbors.add(alg.calcPvrName);
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
