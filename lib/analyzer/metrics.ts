import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { File } from '@babel/types';
import type { Issue, MetricsSummary } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

function countLines(node: t.Node): number {
    if (!node.loc) return 0;
    return node.loc.end.line - node.loc.start.line + 1;
}

/** Count decision points in a node subtree for cyclomatic complexity */
function computeComplexity(path: { node: t.Node }): number {
    let complexity = 1; // base path
    const node = path.node;

    // We do a quick recursive walk of children
    const decisionTypes = new Set([
        'IfStatement',
        'ConditionalExpression',
        'LogicalExpression',
        'ForStatement',
        'ForInStatement',
        'ForOfStatement',
        'WhileStatement',
        'DoWhileStatement',
        'SwitchCase',
        'CatchClause',
        'BinaryExpression',
    ]);

    function walk(n: t.Node) {
        if (!n || typeof n !== 'object') return;
        if (decisionTypes.has(n.type)) {
            // Only count && and || for LogicalExpression / BinaryExpression
            if (n.type === 'LogicalExpression' || n.type === 'BinaryExpression') {
                const op = (n as t.LogicalExpression | t.BinaryExpression).operator;
                if (op === '&&' || op === '||' || op === '??') complexity++;
            } else {
                complexity++;
            }
        }
        for (const key of Object.keys(n)) {
            const child = (n as unknown as Record<string, unknown>)[key];
            if (Array.isArray(child)) {
                child.forEach((c) => { if (c && typeof c === 'object' && 'type' in c) walk(c as t.Node); });
            } else if (child && typeof child === 'object' && 'type' in child) {
                walk(child as t.Node);
            }
        }
    }

    walk(node);
    return complexity;
}

/** Measure max nesting depth of block statements */
function measureMaxDepth(ast: t.File): number {
    let globalMax = 0;

    traverse(ast, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        BlockStatement(path: any) {
            let depth = 0;
            let current = path.parentPath;
            while (current) {
                if (current.isBlockStatement()) depth++;
                current = current.parentPath;
            }
            if (depth > globalMax) globalMax = depth;
        },
    });

    return globalMax;
}

/** Simple line-hash duplication detection */
function detectDuplication(code: string): number {
    const lines = code.split('\n').map((l) => l.trim()).filter((l) => l.length > 4);
    const windowSize = 5;
    const seen = new Map<string, number>();
    let duplicateWindows = 0;
    let totalWindows = 0;

    for (let i = 0; i <= lines.length - windowSize; i++) {
        const block = lines.slice(i, i + windowSize).join('\n');
        const count = seen.get(block) ?? 0;
        seen.set(block, count + 1);
        totalWindows++;
        if (count > 0) duplicateWindows++;
    }

    if (totalWindows === 0) return 0;
    return Math.round((duplicateWindows / totalWindows) * 100);
}

/** Collect declared imports vs actual usages */
function detectUnusedImports(ast: t.File): string[] {
    const imported: Map<string, number> = new Map(); // name -> line
    const usedIdentifiers = new Set<string>();

    traverse(ast, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ImportDeclaration(path: any) {
            for (const spec of path.node.specifiers) {
                const name =
                    t.isImportDefaultSpecifier(spec) || t.isImportNamespaceSpecifier(spec)
                        ? spec.local.name
                        : (spec as t.ImportSpecifier).local.name;
                imported.set(name, path.node.loc?.start.line ?? 0);
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Identifier(path: any) {
            // Skip the import declarations themselves
            if (path.parentPath?.isImportSpecifier() || path.parentPath?.isImportDefaultSpecifier()) return;
            usedIdentifiers.add(path.node.name);
        },
        // JSX elements like <Zap /> use JSXIdentifier nodes, NOT regular Identifier nodes
        // Without this, every imported React component would be falsely flagged as unused
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        JSXIdentifier(path: any) {
            usedIdentifiers.add(path.node.name);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        JSXMemberExpression(path: any) {
            usedIdentifiers.add(path.node.object.name);
        },
    });

    return Array.from(imported.keys()).filter((name) => !usedIdentifiers.has(name));
}

// ─── main export ─────────────────────────────────────────────────────────────

export interface RawMetrics {
    summary: MetricsSummary;
    issues: Issue[];
}

export function computeMetrics(ast: t.File, code: string): RawMetrics {
    const issues: Issue[] = [];
    const functionComplexities: number[] = [];
    const functionLengths: number[] = [];

    // ── function-level metrics ──
    traverse(ast, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path: any) {
            const node = path.node as t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression;
            const lines = countLines(node);
            const complexity = computeComplexity(path);

            functionComplexities.push(complexity);
            functionLengths.push(lines);

            // name heuristic
            let fnName = 'anonymous';
            if (t.isFunctionDeclaration(node) && node.id) {
                fnName = node.id.name;
            } else if (
                path.parentPath?.isVariableDeclarator() &&
                t.isIdentifier((path.parentPath.node as t.VariableDeclarator).id)
            ) {
                fnName = ((path.parentPath.node as t.VariableDeclarator).id as t.Identifier).name;
            } else if (
                path.parentPath?.isObjectProperty() &&
                t.isIdentifier((path.parentPath.node as t.ObjectProperty).key)
            ) {
                fnName = ((path.parentPath.node as t.ObjectProperty).key as t.Identifier).name;
            }

            const startLine = node.loc?.start.line;

            if (complexity >= 10) {
                issues.push({
                    type: 'complexity',
                    severity: complexity >= 15 ? 'high' : 'medium',
                    message: `"${fnName}" has ${complexity} decision paths through it. Splitting it into smaller focused functions would make it easier to read and test.`,
                    line: startLine,
                    name: fnName,
                });
            }

            if (lines > 50) {
                issues.push({
                    type: 'length',
                    severity: lines > 100 ? 'high' : 'medium',
                    message: `"${fnName}" is ${lines} lines long. Breaking it into 2–3 smaller functions would make it much easier to scan and maintain.`,
                    line: startLine,
                    name: fnName,
                });
            }
        },
    });

    // ── nesting depth ──
    const maxDepth = measureMaxDepth(ast);
    if (maxDepth >= 4) {
        issues.push({
            type: 'nesting',
            severity: maxDepth >= 6 ? 'high' : 'medium',
            message: `Some logic here is nested ${maxDepth} levels deep, which can be tricky to follow. Early returns or small helper functions could make this much clearer.`,
        });
    }

    // ── duplication ──
    const dupePct = detectDuplication(code);
    if (dupePct > 15) {
        issues.push({
            type: 'duplication',
            severity: dupePct > 30 ? 'high' : 'medium',
            message: `About ${dupePct}% of code blocks look similar to each other. Pulling shared logic into a helper function would reduce repetition and make future edits easier.`,
        });
    }

    // ── unused imports ──
    const unused = detectUnusedImports(ast);
    if (unused.length > 0) {
        unused.forEach((name) => {
            issues.push({
                type: 'unused_imports',
                severity: 'low',
                message: `"${name}" is imported but not used anywhere. Removing it keeps things tidy and slightly reduces bundle size.`,
                name,
            });
        });
    }

    const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    const max = (arr: number[]) => (arr.length === 0 ? 0 : Math.max(...arr));

    const summary: MetricsSummary = {
        avgCyclomaticComplexity: avg(functionComplexities),
        maxCyclomaticComplexity: max(functionComplexities),
        avgFunctionLength: avg(functionLengths),
        maxFunctionLength: max(functionLengths),
        maxNestingDepth: maxDepth,
        duplicationPercentage: dupePct,
        unusedImportCount: unused.length,
        totalFunctions: functionComplexities.length,
        totalLines: code.split('\n').length,
    };

    return { summary, issues };
}
