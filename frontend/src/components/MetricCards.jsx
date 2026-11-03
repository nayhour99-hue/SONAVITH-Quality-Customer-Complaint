import React from 'react';

export default function MetricCards({ kpis }) {
  const cards = [
    { label: 'Total complaints', value: kpis?.total_complaints ?? 0 },
    { label: 'Total approved', value: kpis?.total_approved ?? 0 },
    { label: 'Pending decision', value: kpis?.pending_decision ?? 0 },
    { label: 'Rejected', value: kpis?.rejected ?? 0 },
    { label: 'Completed', value: kpis?.completed ?? 0 },
  ];

  return (
    <section className="metrics-grid" aria-label="KPI Summary">
      {cards.map((card, idx) => (
        <div key={idx} className="metric-card">
          <span className="metric-number">{card.value}</span>
          <span className="metric-label">{card.label}</span>
        </div>
      ))}
    </section>
  );
}
