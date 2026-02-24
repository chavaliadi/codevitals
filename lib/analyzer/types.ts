export type Grade = 'Excellent' | 'Good' | 'Fair' | 'Critical';
export type Severity = 'high' | 'medium' | 'low';
export type Priority = 'quick-win' | 'structural';
export type IssueType =
  | 'complexity'
  | 'length'
  | 'nesting'
  | 'duplication'
  | 'unused_imports'
  | 'empty_catch'
  | 'redundant_else'
  | 'bool_comparison'
  | 'long_params'
  | 'condition_chain';

export interface Issue {
  type: IssueType;
  severity: Severity;
  priority: Priority;
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
  estimatedImprovement?: number; // pts if quick wins addressed
}
