import type { AnalysisResult, Issue, MetricsSummary, Grade } from './types';

// ─── Language detection ───────────────────────────────────────────────────────

// Language family patterns — one regex set covers all
const FUNCTION_PATTERNS: RegExp[] = [
    // JS/TS (handled by AST, but usable as fallback)
    /\bfunction\s+\w+\s*\(/g,
    /\bconst\s+\w+\s*=\s*(async\s*)?\(/g,
    /\bconst\s+\w+\s*=\s*(async\s*)?(\w+\s*)=>/g,
    // Python
    /^\s*def\s+\w+\s*\(/gm,
    /^\s*async\s+def\s+\w+\s*\(/gm,
    // Go
    /\bfunc\s+\w+\s*\(/g,
    /\bfunc\s*\(\w+\s+\w+\)\s+\w+\s*\(/g,
    // Java / C# / C++
    /\b(public|private|protected|static|void|int|string|bool|auto)\s+\w+\s*\(/g,
    // Rust
    /\bfn\s+\w+\s*\(/g,
    // Ruby
    /^\s*def\s+\w+/gm,
];

const COMPLEXITY_KEYWORDS = /\b(if|else\s+if|elif|for|while|switch|case|catch|&&|\|\||and\b|or\b|unless\b|\?\?)\b/g;

// ─── Core text analysis ───────────────────────────────────────────────────────

function measureNestingDepth(code: string): number {
    // Works for brace-based AND indentation-based languages
    let maxBraceDepth = 0;
    let depth = 0;
    for (const ch of code) {
        if (ch === '{') { depth++; maxBraceDepth = Math.max(maxBraceDepth, depth); }
        else if (ch === '}') depth = Math.max(0, depth - 1);
    }

    // Also check indentation depth (for Python & Ruby)
    let maxIndentDepth = 0;
    for (const line of code.split('\n')) {
        const spaces = line.match(/^(\s+)/)?.[1]?.length ?? 0;
        const indentLevel = Math.floor(spaces / 4); // assume 4-space indent
        maxIndentDepth = Math.max(maxIndentDepth, indentLevel);
    }

    return Math.max(maxBraceDepth, maxIndentDepth);
}

function detectFunctions(code: string): { count: number; lengths: number[] } {
    // Find function start lines via any pattern
    const lines = code.split('\n');
    const functionStartLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FUNCTION_PATTERNS) {
            pattern.lastIndex = 0;
            if (pattern.test(line)) {
                functionStartLines.push(i);
                break;
            }
        }
    }

    if (functionStartLines.length === 0) {
        return { count: 0, lengths: [] };
    }

    // Estimate function lengths by gap to next function (or end of file)
    const lengths: number[] = functionStartLines.map((startLine, idx) => {
        const endLine = idx + 1 < functionStartLines.length
            ? functionStartLines[idx + 1] - 1
            : lines.length - 1;
        return endLine - startLine + 1;
    });

    return { count: functionStartLines.length, lengths };
}

function detectDuplication(code: string): number {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 4);
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
    return totalWindows === 0 ? 0 : Math.round((duplicateWindows / totalWindows) * 100);
}

function countComplexity(code: string): number {
    const matches = code.match(COMPLEXITY_KEYWORDS);
    return (matches?.length ?? 0) + 1; // +1 base path
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function analyzeText(code: string): Omit<AnalysisResult, 'aiExplanation'> {
    const lines = code.split('\n');
    const totalLines = lines.length;

    const nestingDepth = measureNestingDepth(code);
    const { count: totalFunctions, lengths: fnLengths } = detectFunctions(code);
    const duplicationPercentage = detectDuplication(code);
    const totalComplexity = countComplexity(code);

    const avg = (arr: number[]) => arr.length === 0 ? 0 :
        Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10;

    const avgFunctionLength = avg(fnLengths);
    const maxFunctionLength = fnLengths.length > 0 ? Math.max(...fnLengths) : 0;
    // Distribute total complexity across functions
    const avgComplexity = totalFunctions > 0
        ? Math.round((totalComplexity / totalFunctions) * 10) / 10
        : totalComplexity;

    const metrics: MetricsSummary = {
        avgCyclomaticComplexity: avgComplexity,
        maxCyclomaticComplexity: avgComplexity, // text-based can't isolate per-function
        avgFunctionLength,
        maxFunctionLength,
        maxNestingDepth: nestingDepth,
        duplicationPercentage,
        unusedImportCount: 0, // language-agnostic detection too noisy — skip
        totalFunctions,
        totalLines,
    };

    // Issues
    const issues: Issue[] = [];

    if (nestingDepth >= 4) {
        issues.push({
            type: 'nesting',
            severity: nestingDepth >= 6 ? 'high' : 'medium',
            message: `Some logic here is nested ${nestingDepth} levels deep, which can be tricky to follow. Early returns or small helper functions could make this much clearer.`,
        });
    }

    if (avgFunctionLength > 50) {
        issues.push({
            type: 'length',
            severity: avgFunctionLength > 100 ? 'high' : 'medium',
            message: `Functions average ${avgFunctionLength} lines. Breaking longer ones into 2–3 smaller functions would make them much easier to scan and maintain.`,
        });
    }

    if (avgComplexity >= 10) {
        issues.push({
            type: 'complexity',
            severity: avgComplexity >= 15 ? 'high' : 'medium',
            message: `The code has roughly ${avgComplexity} decision paths on average. Simplifying conditional logic would improve readability and testability.`,
        });
    }

    if (duplicationPercentage > 15) {
        issues.push({
            type: 'duplication',
            severity: duplicationPercentage > 30 ? 'high' : 'medium',
            message: `About ${duplicationPercentage}% of code blocks look similar. Pulling shared logic into a helper would reduce repetition and make future edits easier.`,
        });
    }

    // Scoring (same weighted formula as AST scorer)
    function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))); }

    const complexityScore = clamp(100 - (avgComplexity - 1) * 8);
    const lengthScore = clamp(100 - Math.max(0, avgFunctionLength - 20) * 1.2);
    const nestingScore = clamp(100 - Math.max(0, nestingDepth - 2) * 15);
    const duplicationScore = clamp(100 - duplicationPercentage * 2);
    const unusedScore = 100; // unused imports skipped in text mode

    const score = clamp(
        complexityScore * 0.30 +
        lengthScore * 0.25 +
        nestingScore * 0.20 +
        duplicationScore * 0.15 +
        unusedScore * 0.10
    );

    const grade: Grade =
        score >= 90 ? 'Excellent' :
            score >= 70 ? 'Good' :
                score >= 50 ? 'Fair' :
                    'Critical';

    // Sort issues by severity
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => order[a.severity] - order[b.severity]);

    return { score, grade, issues, metrics };
}
