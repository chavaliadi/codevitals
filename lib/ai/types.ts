import type { MetricsSummary, Issue } from '@/lib/analyzer/types';

export interface AIProvider {
    explain(metrics: MetricsSummary, issues: Issue[], score: number): Promise<string>;
}
