import { NextRequest, NextResponse } from 'next/server';
import { parseCode } from '@/lib/analyzer/parser';
import { computeMetrics } from '@/lib/analyzer/metrics';
import { computeScore, sortIssues } from '@/lib/analyzer/scorer';
import { analyzeText } from '@/lib/analyzer/textAnalyzer';
import { GroqProvider } from '@/lib/ai/groq';
import type { AnalysisResult } from '@/lib/analyzer/types';

const ai = new GroqProvider();

// Languages that get full AST deep analysis
const DEEP_LANGUAGES = new Set(['js', 'ts']);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code, language = 'ts' } = body as { code: string; language: string };

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'No code provided.' }, { status: 400 });
        }
        if (code.trim().length < 10) {
            return NextResponse.json({ error: 'Code is too short to analyze.' }, { status: 400 });
        }
        if (code.length > 100_000) {
            return NextResponse.json({ error: 'Code exceeds 100KB limit. Try a smaller snippet.' }, { status: 400 });
        }

        const isDeep = DEEP_LANGUAGES.has(language);
        let analysisBase: Omit<AnalysisResult, 'aiExplanation'>;

        if (isDeep) {
            // 🔬 Deep Mode — full AST analysis for JS/TS
            let ast;
            try {
                ast = parseCode(code, language as 'js' | 'ts');
            } catch {
                return NextResponse.json({ error: 'Failed to parse code. Check for syntax errors.' }, { status: 422 });
            }
            const { summary, issues: rawIssues } = computeMetrics(ast, code);
            const { score, grade } = computeScore(summary, rawIssues);
            const issues = sortIssues(rawIssues);
            analysisBase = { score, grade, issues, metrics: summary };
        } else {
            // ⚡ Quick Scan Mode — text-based for all other languages
            analysisBase = analyzeText(code);
        }

        // AI explanation (always)
        const aiExplanation = await ai.explain(analysisBase.metrics, analysisBase.issues, analysisBase.score);

        const result: AnalysisResult = {
            ...analysisBase,
            aiExplanation,
        };

        return NextResponse.json(result);
    } catch (err) {
        console.error('[/api/analyze] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
