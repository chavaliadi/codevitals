'use client';

import { useEffect, useRef } from 'react';
import type { Grade } from '@/lib/analyzer/types';

interface ScoreGaugeProps {
    score: number;
    grade: Grade;
}

const gradeColors: Record<Grade, { stroke: string; text: string; glow: string }> = {
    Excellent: { stroke: '#22c55e', text: '#22c55e', glow: '0 0 24px #22c55e55' },
    Good: { stroke: '#84cc16', text: '#84cc16', glow: '0 0 24px #84cc1655' },
    Fair: { stroke: '#f59e0b', text: '#f59e0b', glow: '0 0 24px #f59e0b55' },
    Critical: { stroke: '#ef4444', text: '#ef4444', glow: '0 0 24px #ef444455' },
};

const gradeLabels: Record<Grade, string> = {
    Excellent: 'Excellent',
    Good: 'Good',
    Fair: 'Fair',
    Critical: 'Critical',
};

export default function ScoreGauge({ score, grade }: ScoreGaugeProps) {
    const circleRef = useRef<SVGCircleElement>(null);
    const colors = gradeColors[grade];
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const targetOffset = circumference - (score / 100) * circumference;

    useEffect(() => {
        const circle = circleRef.current;
        if (!circle) return;
        // Start fully hidden, animate to score
        circle.style.strokeDashoffset = String(circumference);
        const raf = requestAnimationFrame(() => {
            circle.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
            circle.style.strokeDashoffset = String(targetOffset);
        });
        return () => cancelAnimationFrame(raf);
    }, [score, circumference, targetOffset]);

    return (
        <div className="score-gauge-wrapper">
            <svg width="180" height="180" viewBox="0 0 180 180">
                {/* Track */}
                <circle
                    cx="90" cy="90" r={radius}
                    fill="none"
                    stroke="#ffffff10"
                    strokeWidth="10"
                />
                {/* Progress */}
                <circle
                    ref={circleRef}
                    cx="90" cy="90" r={radius}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    transform="rotate(-90 90 90)"
                    style={{ filter: `drop-shadow(${colors.glow})` }}
                />
                {/* Score number */}
                <text
                    x="90" y="84"
                    textAnchor="middle"
                    fontSize="36"
                    fontWeight="700"
                    fill={colors.text}
                    fontFamily="inherit"
                >
                    {score}
                </text>
                {/* /100 */}
                <text
                    x="90" y="102"
                    textAnchor="middle"
                    fontSize="13"
                    fill="#ffffff50"
                    fontFamily="inherit"
                >
                    / 100
                </text>
            </svg>
            <div className="score-grade" style={{ color: colors.text }}>
                {gradeLabels[grade]}
            </div>
        </div>
    );
}
