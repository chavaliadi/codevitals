import { NextRequest, NextResponse } from 'next/server';
import { GroqProvider } from '@/lib/ai/groq';
import type { Issue } from '@/lib/analyzer/types';

const ai = new GroqProvider();

// Only offer deep AI fix for languages with AST support
const DEEP_LANGUAGES = new Set(['js', 'ts']);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            issue: Issue;
            codeSnippet: string;
            language: string;
        };

        const { issue, codeSnippet, language } = body;

        if (!issue || !codeSnippet || !language) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        if (codeSnippet.length > 5000) {
            return NextResponse.json(
                { error: 'Snippet too large. Please send a focused section of code.' },
                { status: 400 }
            );
        }

        // For Quick Scan languages, return a friendly not-available response
        if (!DEEP_LANGUAGES.has(language)) {
            return NextResponse.json({
                available: false,
                message: 'Suggest Fix is available for JS/TS Deep Analysis. Quick Scan languages show metrics only.',
            });
        }

        const fix = await ai.suggestFix(issue, codeSnippet, language);

        if (!fix) {
            return NextResponse.json({
                available: false,
                message: 'AI suggestion temporarily unavailable. Core analysis is unaffected.',
            });
        }

        return NextResponse.json({ available: true, fix });
    } catch (err) {
        console.error('[/api/suggest-fix] Error:', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
