import type { MetricsSummary, Issue } from '@/lib/analyzer/types';

export interface AIFixResponse {
    explanation: string;
    beforeSnippet: string;
    afterSnippet: string;
    whyItHelps: string[];   // bullet list — "Reduces nesting depth", etc.
    disclaimer: string;
}

export interface AIProvider {
    explain(
        metrics: MetricsSummary,
        issues: Issue[],
        score: number,
        context?: { filename?: string; mode?: 'deep' | 'quick' }
    ): Promise<string>;

    suggestFix(
        issue: Issue,
        codeSnippet: string,
        language: string
    ): Promise<AIFixResponse | null>;
}
