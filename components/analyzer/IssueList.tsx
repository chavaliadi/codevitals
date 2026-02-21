'use client';

import type { Issue, Severity } from '@/lib/analyzer/types';
import { AlertTriangle, AlertCircle, Info, Zap, Copy, Layers, FileX } from 'lucide-react';

interface IssueListProps {
    issues: Issue[];
}

const severityConfig: Record<Severity, { label: string; color: string; bg: string }> = {
    high: { label: 'Worth Fixing', color: '#f87171', bg: '#ef444412' },
    medium: { label: 'Nice to Fix', color: '#fbbf24', bg: '#f59e0b12' },
    low: { label: 'Minor Polish', color: '#9ca3af', bg: '#6b728012' },
};

const typeIcons: Record<string, React.ReactNode> = {
    complexity: <Zap size={15} />,
    length: <Layers size={15} />,
    nesting: <AlertTriangle size={15} />,
    duplication: <Copy size={15} />,
    unused_imports: <FileX size={15} />,
};

const typeLabels: Record<string, string> = {
    complexity: 'Complexity',
    length: 'Function Length',
    nesting: 'Deep Nesting',
    duplication: 'Repeated Logic',
    unused_imports: 'Unused Import',
};

export default function IssueList({ issues }: IssueListProps) {
    if (issues.length === 0) {
        return (
            <div className="issue-list-empty">
                <AlertCircle size={20} color="#22c55e" />
                <span>Looks great — no refinements needed here!</span>
            </div>
        );
    }

    return (
        <div className="issue-list">
            {issues.map((issue, idx) => {
                const sev = severityConfig[issue.severity];
                return (
                    <div
                        key={idx}
                        className="issue-item"
                        style={{ borderLeft: `3px solid ${sev.color}`, background: sev.bg }}
                    >
                        <div className="issue-header">
                            <span className="issue-type-badge" style={{ color: sev.color }}>
                                {typeIcons[issue.type]}
                                {typeLabels[issue.type] ?? issue.type}
                            </span>
                            <span className="issue-severity" style={{ color: sev.color }}>
                                {sev.label}
                            </span>
                            {issue.line && (
                                <span className="issue-line">Line {issue.line}</span>
                            )}
                        </div>
                        <p className="issue-message">{issue.message}</p>
                    </div>
                );
            })}
        </div>
    );
}
