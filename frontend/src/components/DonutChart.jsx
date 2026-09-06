import React from 'react';

// Simple dependency-free SVG donut chart.
// segments: [{ label, value, percent, color }]
export default function DonutChart({ segments, size = 160, strokeWidth = 28 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.percent / 100) * circumference;
    const arc = {
      ...seg,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offset
    };
    offset += dash;
    return arc;
  });

  return (
    <div className="donut-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          {arcs.map((arc, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
            />
          ))}
        </g>
      </svg>
      <div className="donut-legend">
        {segments.map((seg, idx) => (
          <div className="donut-legend-item" key={idx}>
            <span className="donut-legend-dot" style={{ background: seg.color }}></span>
            {seg.label} {seg.percent.toFixed(0)}%
          </div>
        ))}
      </div>
    </div>
  );
}
