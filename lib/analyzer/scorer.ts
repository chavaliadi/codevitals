import type { MetricsSummary, Issue, Grade } from './types';

interface ScoreBreakdown {
    complexityScore: number;
    lengthScore: number;
    nestingScore: number;
    duplicationScore: number;
    unusedScore: number;
}

function clamp(val: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, val));
}

export function computeScore(metrics: MetricsSummary, issues: Issue[]): {
    score: number;
    breakdown: ScoreBreakdown;
    grade: Grade;
} {
    // Each category scored 0–100, then weighted
    // Cyclomatic complexity (30% weight)
    const complexityScore = clamp(
        100 - (metrics.avgCyclomaticComplexity - 1) * 8
    );

    // Function length (25% weight)
    const lengthScore = clamp(
        100 - Math.max(0, metrics.avgFunctionLength - 20) * 1.2
    );

    // Nesting depth (20% weight)
    const nestingScore = clamp(
        100 - Math.max(0, metrics.maxNestingDepth - 2) * 15
    );

    // Duplication (15% weight)
    const duplicationScore = clamp(100 - metrics.duplicationPercentage * 2);

    // Unused imports (10% weight)
    const unusedScore = clamp(100 - metrics.unusedImportCount * 10);

    const score = Math.round(
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

    return {
        score,
        grade,
        breakdown: { complexityScore, lengthScore, nestingScore, duplicationScore, unusedScore },
    };
}

export function sortIssues(issues: Issue[]): Issue[] {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
}
