'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AnalysisResult } from '@/lib/analyzer/types';
import ScoreGauge from '@/components/analyzer/ScoreGauge';
import IssueList from '@/components/analyzer/IssueList';
import MetricsGrid from '@/components/analyzer/MetricsGrid';
import AIInsight from '@/components/analyzer/AIInsight';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function AnalyzePage() {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const router = useRouter();

    useEffect(() => {
        const raw = sessionStorage.getItem('cv_result');
        if (!raw) {
            router.replace('/');
            return;
        }
        try {
            setResult(JSON.parse(raw) as AnalysisResult);
        } catch {
            router.replace('/');
        }
    }, [router]);

    if (!result) {
        return (
            <div className="analyze-loading">
                <div className="loading-ring" />
                <span>Loading analysis…</span>
            </div>
        );
    }

    const highCount = result.issues.filter((i) => i.severity === 'high').length;
    const mediumCount = result.issues.filter((i) => i.severity === 'medium').length;
    const lowCount = result.issues.filter((i) => i.severity === 'low').length;

    return (
        <main className="analyze-main">
            {/* ── Navbar ─────────────────────────────────────────────── */}
            <nav className="cv-nav">
                <div className="cv-nav-logo">
                    <span className="cv-logo-dot" />
                    CodeVitals
                </div>
                <div className="cv-nav-actions">
                    <button className="nav-back-btn" onClick={() => router.push('/')}>
                        <ArrowLeft size={14} /> New Analysis
                    </button>
                </div>
            </nav>

            {/* ── Page Header ────────────────────────────────────────── */}
            <div className="analyze-header">
                <h1 className="analyze-title">Analysis Report</h1>
                <div className="analyze-issue-summary">
                    {highCount > 0 && <span className="pill pill-high">{highCount} Worth Fixing</span>}
                    {mediumCount > 0 && <span className="pill pill-medium">{mediumCount} Nice to Fix</span>}
                    {lowCount > 0 && <span className="pill pill-low">{lowCount} Minor Polish</span>}
                    {result.issues.length === 0 && <span className="pill pill-clean">Looks Clean ✓</span>}
                </div>
            </div>

            {/* ── Top Row: Score + AI Insight ────────────────────────── */}
            <div className="top-row">
                {/* Score Card */}
                <div className="glass-card score-card">
                    <h2 className="card-title">Health Score</h2>
                    <ScoreGauge score={result.score} grade={result.grade} />
                    <div className="score-meta">
                        <div className="score-meta-item">
                            <span className="meta-label">Functions</span>
                            <span className="meta-value">{result.metrics.totalFunctions}</span>
                        </div>
                        <div className="score-meta-item">
                            <span className="meta-label">Lines</span>
                            <span className="meta-value">{result.metrics.totalLines}</span>
                        </div>
                        <div className="score-meta-item">
                            <span className="meta-label">To Refine</span>
                            <span className="meta-value">{result.issues.length}</span>
                        </div>
                    </div>
                </div>

                {/* AI Card */}
                <div className="glass-card ai-card">
                    <h2 className="card-title">AI Insight</h2>
                    <AIInsight explanation={result.aiExplanation} />
                </div>
            </div>

            {/* ── Metrics Grid ───────────────────────────────────────── */}
            <div className="glass-card metrics-section">
                <h2 className="card-title">Metrics Breakdown</h2>
                <MetricsGrid metrics={result.metrics} />
            </div>

            {/* ── Issues ─────────────────────────────────────────────── */}
            <div className="glass-card issues-section">
                <h2 className="card-title">
                    Areas to Refine
                    <span className="issues-count">{result.issues.length}</span>
                </h2>
                <IssueList issues={result.issues} />
            </div>

            {/* ── CTA ────────────────────────────────────────────────── */}
            <div className="analyze-cta">
                <button className="analyze-btn" onClick={() => router.push('/')}>
                    <RefreshCw size={15} /> Analyze Another File
                </button>
            </div>

            <footer className="cv-footer">
                CodeVitals · AI-powered code health analysis
            </footer>
        </main>
    );
}
