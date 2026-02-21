'use client';

import type { MetricsSummary } from '@/lib/analyzer/types';
import { Zap, GitBranch, Layers, Copy, FileX, Code2 } from 'lucide-react';

interface MetricsGridProps {
    metrics: MetricsSummary;
}

interface MetricCard {
    label: string;
    value: string | number;
    sublabel: string;
    icon: React.ReactNode;
    status: 'ok' | 'warn' | 'bad';
}

function getStatus(value: number, warnAt: number, badAt: number): 'ok' | 'warn' | 'bad' {
    if (value >= badAt) return 'bad';
    if (value >= warnAt) return 'warn';
    return 'ok';
}

const statusColors = {
    ok: { color: '#22c55e', bg: '#22c55e12' },
    warn: { color: '#f59e0b', bg: '#f59e0b12' },
    bad: { color: '#ef4444', bg: '#ef444412' },
};

export default function MetricsGrid({ metrics }: MetricsGridProps) {
    const cards: MetricCard[] = [
        {
            label: 'Avg Complexity',
            value: metrics.avgCyclomaticComplexity,
            sublabel: `Max: ${metrics.maxCyclomaticComplexity}`,
            icon: <Zap size={18} />,
            status: getStatus(metrics.avgCyclomaticComplexity, 7, 12),
        },
        {
            label: 'Max Nesting',
            value: metrics.maxNestingDepth,
            sublabel: 'Block depth',
            icon: <GitBranch size={18} />,
            status: getStatus(metrics.maxNestingDepth, 4, 6),
        },
        {
            label: 'Avg Fn Length',
            value: `${metrics.avgFunctionLength} lines`,
            sublabel: `Max: ${metrics.maxFunctionLength} lines`,
            icon: <Layers size={18} />,
            status: getStatus(metrics.avgFunctionLength, 30, 60),
        },
        {
            label: 'Duplication',
            value: `${metrics.duplicationPercentage}%`,
            sublabel: 'Of code blocks',
            icon: <Copy size={18} />,
            status: getStatus(metrics.duplicationPercentage, 15, 30),
        },
        {
            label: 'Unused Imports',
            value: metrics.unusedImportCount,
            sublabel: 'Dead imports',
            icon: <FileX size={18} />,
            status: getStatus(metrics.unusedImportCount, 2, 5),
        },
        {
            label: 'Total Functions',
            value: metrics.totalFunctions,
            sublabel: `${metrics.totalLines} total lines`,
            icon: <Code2 size={18} />,
            status: 'ok',
        },
    ];

    return (
        <div className="metrics-grid">
            {cards.map((card) => {
                const style = statusColors[card.status];
                return (
                    <div
                        key={card.label}
                        className="metric-card"
                        style={{ background: style.bg, borderColor: `${style.color}30` }}
                    >
                        <div className="metric-icon" style={{ color: style.color }}>
                            {card.icon}
                        </div>
                        <div className="metric-value" style={{ color: style.color }}>
                            {card.value}
                        </div>
                        <div className="metric-label">{card.label}</div>
                        <div className="metric-sublabel">{card.sublabel}</div>
                    </div>
                );
            })}
        </div>
    );
}
