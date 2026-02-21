import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { parseCode } from '@/lib/analyzer/parser';
import { computeMetrics } from '@/lib/analyzer/metrics';
import { computeScore, sortIssues } from '@/lib/analyzer/scorer';
import { analyzeText } from '@/lib/analyzer/textAnalyzer';
import { aggregateResults, FileResult } from '@/lib/analyzer/aggregate';
import { GroqProvider } from '@/lib/ai/groq';
import type { AnalysisResult } from '@/lib/analyzer/types';

const ai = new GroqProvider();

const DEEP_EXTENSIONS = new Set(['.js', '.ts', '.jsx', '.tsx']);
const QUICK_EXTENSIONS = new Set([
    '.py', '.java', '.go', '.cpp', '.c', '.cs', '.rs', '.rb',
    '.swift', '.kt', '.php', '.scala', '.r', '.m',
]);
const EXCLUDED_PATHS = ['node_modules', '.next', 'dist', 'build', '.git', 'vendor', '__pycache__'];

function shouldInclude(entryName: string): boolean {
    const lower = entryName.toLowerCase();
    const basename = entryName.split('/').pop() ?? '';
    // Filter macOS resource fork files and __MACOSX metadata directories
    if (basename.startsWith('._')) return false;
    if (lower.includes('/__macosx/') || lower.startsWith('__macosx/')) return false;
    if (EXCLUDED_PATHS.some(p =>
        lower.includes(`/${p}/`) || lower.includes(`\\${p}\\`) || lower.startsWith(`${p}/`)
    )) return false;
    const ext = '.' + lower.split('.').pop();
    return DEEP_EXTENSIONS.has(ext) || QUICK_EXTENSIONS.has(ext);
}

function getMode(filename: string): 'deep' | 'quick' {
    const ext = '.' + filename.toLowerCase().split('.').pop();
    return DEEP_EXTENSIONS.has(ext) ? 'deep' : 'quick';
}

function getLang(filename: string): 'js' | 'ts' {
    return filename.endsWith('.ts') || filename.endsWith('.tsx') ? 'ts' : 'js';
}

async function analyzeFile(
    filename: string,
    code: string,
    mode: 'deep' | 'quick'
): Promise<Omit<AnalysisResult, 'aiExplanation'>> {
    if (mode === 'deep') {
        try {
            const ast = parseCode(code, getLang(filename));
            const { summary, issues: rawIssues } = computeMetrics(ast, code);
            const { score, grade } = computeScore(summary, rawIssues);
            const issues = sortIssues(rawIssues);
            return { score, grade, issues, metrics: summary };
        } catch {
            // fallback to text if AST fails
            return analyzeText(code);
        }
    }
    return analyzeText(code);
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        if (!file.name.endsWith('.zip')) {
            return NextResponse.json({ error: 'Please upload a .zip file.' }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) { // 10 MB limit
            return NextResponse.json({ error: 'ZIP file must be under 10MB.' }, { status: 400 });
        }

        // Extract ZIP
        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries().filter(e =>
            !e.isDirectory && shouldInclude(e.entryName)
        );

        if (entries.length === 0) {
            return NextResponse.json({
                error: 'No analyzable code files found. Supported: .js, .ts, .tsx, .py, .java, .go, .cpp, .cs, .rs, .rb and more.'
            }, { status: 422 });
        }

        if (entries.length > 50) {
            return NextResponse.json({
                error: 'ZIP contains too many files. Limit is 50 files per scan.'
            }, { status: 422 });
        }

        // Analyze each file (cap individual files at 100KB)
        const fileResults: FileResult[] = [];

        for (const entry of entries) {
            const code = entry.getData().toString('utf8');
            if (code.length > 100_000) continue; // skip very large files

            const filename = entry.entryName.split('/').pop() ?? entry.entryName;
            const mode = getMode(entry.entryName);

            const result = await analyzeFile(filename, code, mode);

            fileResults.push({
                filename,
                score: result.score,
                grade: result.grade,
                topIssue: result.issues[0]?.message?.slice(0, 100) ?? null,
                issueCount: result.issues.length,
                metrics: result.metrics,
                mode,
            });
        }

        if (fileResults.length === 0) {
            return NextResponse.json({ error: 'Could not analyze any files in the ZIP.' }, { status: 422 });
        }

        // Get AI explanation for the project-level view
        const worstFile = [...fileResults].sort((a, b) => a.score - b.score)[0];
        const avgScore = Math.round(fileResults.reduce((s, f) => s + f.score, 0) / fileResults.length);

        // Build a condensed metrics summary for the AI
        const projectMetrics = {
            avgCyclomaticComplexity: Math.round(fileResults.reduce((s, f) => s + f.metrics.avgCyclomaticComplexity, 0) / fileResults.length * 10) / 10,
            maxCyclomaticComplexity: Math.max(...fileResults.map(f => f.metrics.maxCyclomaticComplexity)),
            avgFunctionLength: Math.round(fileResults.reduce((s, f) => s + f.metrics.avgFunctionLength, 0) / fileResults.length * 10) / 10,
            maxFunctionLength: Math.max(...fileResults.map(f => f.metrics.maxFunctionLength)),
            maxNestingDepth: Math.max(...fileResults.map(f => f.metrics.maxNestingDepth)),
            duplicationPercentage: Math.round(fileResults.reduce((s, f) => s + f.metrics.duplicationPercentage, 0) / fileResults.length),
            unusedImportCount: fileResults.reduce((s, f) => s + f.metrics.unusedImportCount, 0),
            totalFunctions: fileResults.reduce((s, f) => s + f.metrics.totalFunctions, 0),
            totalLines: fileResults.reduce((s, f) => s + f.metrics.totalLines, 0),
        };

        const aiExplanation = await ai.explain(
            projectMetrics,
            worstFile ? [{ type: 'complexity' as const, severity: 'medium' as const, message: `Weakest file: ${worstFile.filename} (score ${worstFile.score}/100)` }] : [],
            avgScore
        );

        const project = aggregateResults(fileResults, aiExplanation);

        return NextResponse.json(project);
    } catch (err) {
        console.error('[/api/analyze-zip] Error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
