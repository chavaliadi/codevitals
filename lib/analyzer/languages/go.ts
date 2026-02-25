import type { Issue } from '../types';
import type { LanguageModule } from './index';

function detectIgnoredError(code: string): Issue[] {
    const issues: Issue[] = [];
    // ✅ FIXED: covers both  file, _ :=  and  _ = func(
    const ignoredErrorPattern = /,\s*_\s*:=|_\s*=\s*\w+\(/;

    code.split('\n').forEach((line, idx) => {
        if (ignoredErrorPattern.test(line)) {
            issues.push({
                type: 'ignored_error',
                category: 'language',
                severity: 'high',
                priority: 'quick-win', // ✅ FIXED
                message: 'Error return value ignored. Handle errors properly.',
                line: idx + 1,
            });
        }
    });

    return issues;
}

function detectEmptyErrCheck(code: string): Issue[] {
    const issues: Issue[] = [];
    const errCheckPattern = /if\s+err\s*!=\s*nil\s*\{\s*\}/;

    code.split('\n').forEach((line, idx) => {
        if (errCheckPattern.test(line)) {
            issues.push({
                type: 'empty_err_check',
                category: 'language',
                severity: 'high',
                priority: 'quick-win', // ✅ FIXED
                message: 'Empty error check block. Add error handling logic.',
                line: idx + 1,
            });
        }
    });

    return issues;
}

function detectPanicUsage(code: string): Issue[] {
    const issues: Issue[] = [];
    const panicPattern = /panic\s*\(/;

    code.split('\n').forEach((line, idx) => {
        if (panicPattern.test(line) && !line.includes('//')) {
            issues.push({
                type: 'panic_usage',
                category: 'language',
                severity: 'high',
                priority: 'quick-win', // ✅ FIXED
                message: 'panic() usage found. Return errors for graceful handling.',
                line: idx + 1,
            });
        }
    });

    return issues;
}

function detectLongFunction(code: string): Issue[] {
    const issues: Issue[] = [];
    const lines = code.split('\n');
    let funcStartLine = -1;
    let funcName = '';
    let braceCount = 0;
    let inFunc = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (/^func\s+\(?\w+\)?\s+\w+\s*\(/.test(line)) {
            if (funcStartLine !== -1 && inFunc) {
                const funcLength = i - funcStartLine - 1;
                if (funcLength > 60) {
                    issues.push({
                        type: 'long_function',
                        category: 'language',
                        severity: 'low',
                        priority: 'quick-win', // ✅ FIXED
                        message: `Function "${funcName}" is ${funcLength} lines.`,
                        line: funcStartLine + 1,
                    });
                }
            }

            const match = line.match(/func\s+(?:\(\w+\)\s+)?(\w+)\s*\(/);
            funcName = match ? match[1] : 'unknown';
            funcStartLine = i;
            inFunc = true;
            braceCount = 0;
        }

        if (inFunc) {
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;

            if (braceCount === 0 && funcStartLine !== i) {
                const funcLength = i - funcStartLine - 1;
                if (funcLength > 60) {
                    issues.push({
                        type: 'long_function',
                        category: 'language',
                        severity: 'low',
                        priority: 'quick-win', // ✅ FIXED
                        message: `Function "${funcName}" is ${funcLength} lines.`,
                        line: funcStartLine + 1,
                    });
                }
                inFunc = false;
                funcStartLine = -1;
            }
        }
    }

    return issues;
}

function detectPatterns(code: string): Issue[] {
    const issues: Issue[] = [];
    issues.push(...detectIgnoredError(code));
    issues.push(...detectEmptyErrCheck(code));
    issues.push(...detectPanicUsage(code));
    issues.push(...detectLongFunction(code));

    const seen = new Set<string>();
    return issues.filter((issue) => {
        const key = `${issue.line}-${issue.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getPromptHints(issues: Issue[]): string[] {
    const hints: string[] = [];
    const typeSet = new Set(issues.map((i) => i.type));

    if (typeSet.has('ignored_error')) hints.push('Always check error return values');
    if (typeSet.has('empty_err_check')) hints.push('Add error handling in check blocks');
    if (typeSet.has('panic_usage')) hints.push('Avoid panic, return errors instead');
    if (typeSet.has('long_function')) hints.push('Break long functions into smaller ones');

    return hints.slice(0, 3); // ✅ FIXED: max 3
}

export const goModule: LanguageModule = {
    id: 'go',
    displayName: 'Go',
    extensions: ['.go'],
    detectPatterns,
    getPromptHints,
};