export type Grade = 'Excellent' | 'Good' | 'Fair' | 'Critical';
export type Severity = 'high' | 'medium' | 'low';
export type IssueType =
  | 'complexity'
  | 'length'
  | 'nesting'
  | 'duplication'
  | 'unused_imports';

export interface Issue {
  type: IssueType;
  severity: Severity;
  message: string;
  line?: number;
  name?: string; // function / block name if applicable
}

export interface MetricsSummary {
  avgCyclomaticComplexity: number;
  maxCyclomaticComplexity: number;
  avgFunctionLength: number;
  maxFunctionLength: number;
  maxNestingDepth: number;
  duplicationPercentage: number;
  unusedImportCount: number;
  totalFunctions: number;
  totalLines: number;
}

export interface AnalysisResult {
  score: number;
  grade: Grade;
  issues: Issue[];
  metrics: MetricsSummary;
  aiExplanation: string;
}
