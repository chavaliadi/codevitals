import Groq from 'groq-sdk';
import type { AIProvider } from './types';
import type { MetricsSummary, Issue } from '@/lib/analyzer/types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildPrompt(metrics: MetricsSummary, issues: Issue[], score: number): string {
    const issuesSummary = issues
        .slice(0, 8)
        .map((i) => `- [${i.severity.toUpperCase()}] ${i.type}: ${i.message}`)
        .join('\n');

    // Build positives to lead with
    const positives: string[] = [];
    if (metrics.avgCyclomaticComplexity <= 5) positives.push('low average complexity');
    if (metrics.maxNestingDepth <= 3) positives.push('well-controlled nesting');
    if (metrics.duplicationPercentage < 10) positives.push('minimal repeated logic');
    if (metrics.unusedImportCount === 0) positives.push('clean imports');
    if (metrics.avgFunctionLength <= 30) positives.push('concise function sizes');

    const positivesText = positives.length > 0
        ? `What's working well: ${positives.join(', ')}.`
        : 'The code has a clear structure to build on.';

    return `You are a supportive senior engineer helping a teammate improve their code.
Your tone is calm, constructive, and encouraging — like a good code reviewer, not a strict grader.
Do NOT use alarmist language. Do NOT fabricate issues not in the METRICS below.
Start by acknowledging what is working, then gently suggest the most impactful improvement.

METRICS:
- Code Health: ${score}/100
- ${positivesText}
- Avg Complexity: ${metrics.avgCyclomaticComplexity} (max: ${metrics.maxCyclomaticComplexity})
- Avg Function Length: ${metrics.avgFunctionLength} lines (max: ${metrics.maxFunctionLength})
- Max Nesting Depth: ${metrics.maxNestingDepth}
- Repeated Logic: ${metrics.duplicationPercentage}%
- Unused Imports: ${metrics.unusedImportCount}
- Total Functions: ${metrics.totalFunctions}

AREAS TO REFINE:
${issuesSummary || 'None — this code looks clean!'}

Respond in this EXACT format (no markdown headers, no extra text):

SUMMARY: <1-2 sentences: start with something positive, then mention the most impactful improvement in a calm, approachable way — reference the specific numbers>

TOP_ACTIONS:
1. <a friendly, specific suggestion referencing the actual measured numbers>
2. <a friendly, specific suggestion>
3. <a friendly, specific suggestion — or omit if fewer than 3 issues>

EFFORT: <Low | Medium | High> — <one encouraging line on why it is manageable>`;
}

export class GroqProvider implements AIProvider {
    async explain(metrics: MetricsSummary, issues: Issue[], score: number): Promise<string> {
        try {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                temperature: 0.2,
                max_tokens: 450,
                messages: [
                    {
                        role: 'user',
                        content: buildPrompt(metrics, issues, score),
                    },
                ],
            });

            return completion.choices[0]?.message?.content ?? 'Analysis complete. No additional AI insight available.';
        } catch (err) {
            console.error('Groq AI error:', err);
            return 'AI insight unavailable right now. Your metrics-based score above is accurate.';
        }
    }
}
