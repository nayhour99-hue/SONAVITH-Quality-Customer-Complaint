import React, { useState, useMemo } from 'react';

// Helpers for Control Chart
function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Unknown';
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getPeriodKey(dateStr, period) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Unknown';
  if (period === 'day') {
    return dateStr.split('T')[0];
  } else if (period === 'week') {
    return getWeekNumber(dateStr);
  } else if (period === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return dateStr;
}

export default function InsightsView({ metrics, dateMode, complaints = [], searchQuery = '', timeFilter = 'All time', dateFilter = '' }) {
  const [controlChartPeriod, setControlChartPeriod] = useState('day');
  // Compute filtered complaints based on search, time, and date filters
  const filteredComplaints = useMemo(() => {
    let data = complaints;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(c =>
        (c.id && c.id.toString().toLowerCase().includes(q)) ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q))
      );
    }
    if (dateFilter) {
      const field = dateMode === 'expiry_date' ? 'product_expiry_date' : 'complaint_date';
      data = data.filter(c => c[field] === dateFilter);
    }
    if (timeFilter && timeFilter !== 'All time') {
      const now = new Date();
      let start;
      if (timeFilter === 'Day') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeFilter === 'Week') {
        const day = now.getDay() || 7;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      } else if (timeFilter === 'Month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const field = dateMode === 'expiry_date' ? 'product_expiry_date' : 'complaint_date';
      data = data.filter(c => {
        const d = new Date(c[field]);
        return d >= start;
      });
    }
    return data;
  }, [complaints, searchQuery, timeFilter, dateFilter, dateMode]);

  // Recalculate metrics from filteredComplaints
  const statusBreakdown = useMemo(() => {
    const map = {};
    filteredComplaints.forEach(c => {
      const s = c.status || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [filteredComplaints]);

  const defectTypes = useMemo(() => {
    const map = {};
    filteredComplaints.forEach(c => {
      const d = c.defect_type || 'Other';
      map[d] = (map[d] || 0) + 1;
    });
    const total = filteredComplaints.length || 1;
    return Object.entries(map).map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(1) }));
  }, [filteredComplaints]);

  const quantityByProduct = useMemo(() => {
    const map = {};
    filteredComplaints.forEach(c => {
      const p = c.product_name || 'Unknown';
      const qty = parseInt(c.defect_quantity, 10) || 0;
      if (!map[p]) map[p] = { product: p, original_quantity: 0, adjusted_quantity: 0 };
      map[p].original_quantity += qty;
      // Pull warehouse exchanged quantity from warehouse_fulfillment
      const wh = c.warehouse_fulfillment;
      if (wh) {
        const dispatched =
          parseInt(wh.dispatched_quantity, 10) ||
          parseInt(wh.exchange_quantity, 10) ||
          parseInt(wh.fulfilled_quantity, 10) ||
          0;
        map[p].adjusted_quantity += dispatched;
      }
    });
    return Object.values(map).sort((a, b) => b.original_quantity - a.original_quantity);
  }, [filteredComplaints]);

  const mfgSummary = useMemo(() => {
    const map = {};
    filteredComplaints.forEach(c => {
      const code = c.manufacturing_code || 'Unknown';
      map[code] = (map[code] || 0) + 1;
    });
    return Object.entries(map).map(([code, count]) => ({ code, count }));
  }, [filteredComplaints]);

  const customerComplaints = useMemo(() => {
    const map = {};
    filteredComplaints.forEach(c => {
      const cust = (c.customer_name || 'Unknown').trim();
      map[cust] = (map[cust] || 0) + 1;
    });
    const total = filteredComplaints.length || 1;
    // Sort descending — all customers, no bucketing, for Pareto chart
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }));
  }, [filteredComplaints]);

  const totalComplaints = filteredComplaints.length;

  // Max calculations for bar percentages (based on filtered data)
  const maxStatus = Math.max(...statusBreakdown.map((s) => s.count), 1);
  const maxProductOrig = Math.max(...quantityByProduct.map((p) => p.original_quantity || 0), 1);
  const maxProductAdj = Math.max(...quantityByProduct.map((p) => p.adjusted_quantity || 0), 1);
  const maxProductQty = Math.max(maxProductOrig, maxProductAdj, 1);
  const maxMfg = Math.max(...mfgSummary.map((m) => m.count), 1);
  const maxCustomer = Math.max(...customerComplaints.map((c) => c.count), 1);

  // Donut chart math
  const donutColors = ['#0f172a', '#0284c7', '#d97706', '#16a34a', '#dc2626'];
  const customerDonutColors = ['#0f766e', '#0284c7', '#8b5cf6', '#d97706', '#ec4899', '#64748b'];
  const mfgDonutColors = ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#64748b'];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const defectDonutSlices = useMemo(() => {
    let offset = 0;
    const total = filteredComplaints.length || 1;
    return defectTypes.map((dt, idx) => {
      const percent = dt.count / total;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -offset * circumference;
      offset += percent;
      return {
        ...dt,
        color: donutColors[idx % donutColors.length],
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [defectTypes, filteredComplaints.length, circumference]);

  const customerDonutSlices = useMemo(() => {
    let offset = 0;
    const total = filteredComplaints.length || 1;
    return customerComplaints.map((item, idx) => {
      const percent = item.count / total;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -offset * circumference;
      offset += percent;
      return {
        ...item,
        color: customerDonutColors[idx % customerDonutColors.length],
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [customerComplaints, filteredComplaints.length, circumference]);

  const mfgDonutSlices = useMemo(() => {
    let offset = 0;
    const total = mfgSummary.reduce((sum, m) => sum + m.count, 0) || 1;
    return mfgSummary.map((item, idx) => {
      const percent = item.count / total;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -offset * circumference;
      offset += percent;
      return {
        ...item,
        percentage: ((item.count / total) * 100).toFixed(1),
        color: mfgDonutColors[idx % mfgDonutColors.length],
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [mfgSummary, circumference]);

  // Control Chart calculations
  const controlChartData = useMemo(() => {
    if (!complaints || complaints.length === 0) return { data: [], mean: 0, ucl: 0, lcl: 0 };
    
    const dateField = dateMode === 'expiry_date' ? 'product_expiry_date' : 'complaint_date';
    
    // Group complaints
    const groups = {};
    complaints.forEach(c => {
      const d = c[dateField];
      if (!d) return;
      const key = getPeriodKey(d, controlChartPeriod);
      groups[key] = (groups[key] || 0) + 1;
    });

    // Sort keys chronologically
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    
    const dataPoints = sortedKeys.map(k => ({
      period: k,
      count: groups[k]
    }));

    const total = dataPoints.reduce((sum, p) => sum + p.count, 0);
    const mean = dataPoints.length > 0 ? total / dataPoints.length : 0;
    
    // c-chart control limits
    const stdDev = Math.sqrt(mean);
    const ucl = mean + 3 * stdDev;
    const lcl = Math.max(0, mean - 3 * stdDev);

    dataPoints.forEach(p => {
      p.outOfControl = p.count > ucl || p.count < lcl;
    });

    return {
      data: dataPoints,
      mean,
      ucl,
      lcl
    };
  }, [complaints, controlChartPeriod, dateMode]);

  const ccMaxY = Math.max(controlChartData.ucl, ...controlChartData.data.map(d => d.count), 1) * 1.15;

  return (
    <div className="insights-section">
      <div className="insights-header">
        <h2 className="insights-title">Insights</h2>
        <span className="insights-subtitle">
          {totalComplaints} complaints in current view
        </span>
      </div>

      <div className="insights-grid">
        {/* Card 1: Status Breakdown */}
        <div className="insight-card">
          <h3 className="insight-card-title">Status breakdown</h3>
          <div className="bar-chart-list">
            {statusBreakdown.map((item, idx) => (
              <div key={idx} className="bar-chart-row">
                <span className="bar-chart-label" title={item.status}>
                  {item.status}
                </span>
                <div className="bar-track">
                  <div
                    className="bar-fill bar-fill-amber"
                    style={{
                      width: `${(item.count / maxStatus) * 100}%`,
                      minWidth: item.count > 0 ? '6px' : '0',
                    }}
                  ></div>
                </div>
                <span className="bar-value">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Top Defect Types */}
        <div className="insight-card">
          <h3 className="insight-card-title">Top defect types</h3>
          <div className="donut-container">
            <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                {totalComplaints > 0 &&
                  defectDonutSlices.map((slice, idx) => (
                    <circle
                      key={idx}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="16"
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dasharray 0.5s ease',
                      }}
                    />
                  ))}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {totalComplaints}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                  total
                </div>
              </div>
            </div>

            <div className="donut-legend" style={{ maxWidth: 210 }}>
              {defectDonutSlices.map((dt, idx) => (
                <div key={idx} className="donut-legend-item">
                  <span
                    className="legend-color-box"
                    style={{ backgroundColor: dt.color, flexShrink: 0 }}
                  ></span>
                  <span>{dt.name}</span>
                  <strong style={{ marginLeft: 'auto', paddingLeft: 6, whiteSpace: 'nowrap' }}>
                    {dt.count} ({dt.percentage}%)
                  </strong>
                </div>
              ))}
              {defectDonutSlices.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                  No defects logged
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Defective Quantity by Product – Grouped Bar Chart */}
        <div className="insight-card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="insight-card-title">Defective quantity by product</h3>
          <div className="insight-card-subtitle">Initial complaint quantity vs. warehouse exchanged quantity per product</div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, marginTop: 10, marginBottom: 8, fontSize: '0.78rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#0ea5e9', display: 'inline-block' }} />
              Initial complaint qty
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#16a34a', display: 'inline-block' }} />
              Warehouse exchanged qty
            </span>
          </div>

          {quantityByProduct.length > 0 ? (() => {
            const BAR_W = 28;
            const GROUP_GAP = 20;
            const BAR_GAP = 4;
            const CHART_H = 220;
            const LABEL_H = 90; // rotated label area
            const PADDING_LEFT = 42;
            const PADDING_TOP = 16;
            const groupW = BAR_W * 2 + BAR_GAP;
            const totalW = PADDING_LEFT + quantityByProduct.length * (groupW + GROUP_GAP);
            const maxVal = Math.max(...quantityByProduct.map(p => Math.max(p.original_quantity, p.adjusted_quantity)), 1);
            // Y-axis ticks
            const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal));

            return (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <svg
                  width={Math.max(totalW, 400)}
                  height={PADDING_TOP + CHART_H + LABEL_H + 10}
                  style={{ display: 'block' }}
                >
                  {/* Y-axis ticks & gridlines */}
                  {yTicks.map((tick, i) => {
                    const y = PADDING_TOP + CHART_H - (tick / maxVal) * CHART_H;
                    return (
                      <g key={i}>
                        <line x1={PADDING_LEFT} y1={y} x2={Math.max(totalW, 400)} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={PADDING_LEFT - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{tick}</text>
                      </g>
                    );
                  })}

                  {/* Bars + X labels */}
                  {quantityByProduct.map((item, idx) => {
                    const groupX = PADDING_LEFT + idx * (groupW + GROUP_GAP);
                    const origH = Math.max((item.original_quantity / maxVal) * CHART_H, item.original_quantity > 0 ? 4 : 0);
                    const adjH = Math.max((item.adjusted_quantity / maxVal) * CHART_H, item.adjusted_quantity > 0 ? 4 : 0);
                    const origY = PADDING_TOP + CHART_H - origH;
                    const adjY = PADDING_TOP + CHART_H - adjH;
                    const labelX = groupX + groupW / 2;
                    const labelY = PADDING_TOP + CHART_H + 8;

                    return (
                      <g key={idx}>
                        {/* Original qty bar */}
                        <rect x={groupX} y={origY} width={BAR_W} height={origH} rx="3" fill="#0ea5e9">
                          <title>{`${item.product}\nInitial: ${item.original_quantity}`}</title>
                        </rect>
                        {item.original_quantity > 0 && (
                          <text x={groupX + BAR_W / 2} y={origY - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0369a1">{item.original_quantity}</text>
                        )}

                        {/* Warehouse exchanged bar */}
                        <rect x={groupX + BAR_W + BAR_GAP} y={adjY} width={BAR_W} height={adjH} rx="3" fill="#16a34a">
                          <title>{`${item.product}\nWarehouse exchanged: ${item.adjusted_quantity}`}</title>
                        </rect>
                        {item.adjusted_quantity > 0 && (
                          <text x={groupX + BAR_W + BAR_GAP + BAR_W / 2} y={adjY - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#15803d">{item.adjusted_quantity}</text>
                        )}

                        {/* Rotated full product name label */}
                        <text
                          transform={`translate(${labelX}, ${labelY}) rotate(40)`}
                          textAnchor="start"
                          fontSize="11"
                          fill="#374151"
                        >
                          {item.product}
                        </text>
                      </g>
                    );
                  })}

                  {/* Baseline */}
                  <line x1={PADDING_LEFT} y1={PADDING_TOP + CHART_H} x2={Math.max(totalW, 400)} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1.5" />
                  {/* Y-axis line */}
                  <line x1={PADDING_LEFT} y1={PADDING_TOP} x2={PADDING_LEFT} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1.5" />
                </svg>
              </div>
            );
          })() : (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              No product data available
            </div>
          )}
        </div>

        {/* Card 5: Complaints by Customer – Pareto Chart */}
        <div className="insight-card">
          <h3 className="insight-card-title">Complaints by customer</h3>
          <div className="insight-card-subtitle">Pareto analysis — sorted by complaint frequency with cumulative %</div>

          {customerComplaints.length > 0 ? (() => {
            const BAR_W = 36;
            const BAR_GAP = 10;
            const CHART_H = 180;
            const LABEL_H = 80;
            const PADDING_LEFT = 44;
            const PADDING_RIGHT = 44;
            const PADDING_TOP = 20;
            const total = customerComplaints.reduce((s, c) => s + c.count, 0) || 1;
            const maxCount = customerComplaints[0]?.count || 1;
            const totalW = PADDING_LEFT + customerComplaints.length * (BAR_W + BAR_GAP) - BAR_GAP + PADDING_RIGHT;

            // Cumulative percentages
            let cumSum = 0;
            const cumPoints = customerComplaints.map((item, i) => {
              cumSum += item.count;
              const cumPct = (cumSum / total) * 100;
              const x = PADDING_LEFT + i * (BAR_W + BAR_GAP) + BAR_W / 2;
              const y = PADDING_TOP + CHART_H - (cumPct / 100) * CHART_H;
              return { x, y, cumPct };
            });

            // Y-axis ticks (left: count, right: %)
            const leftTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxCount));
            const rightTicks = [0, 25, 50, 75, 100];

            return (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <svg
                  width={Math.max(totalW, 300)}
                  height={PADDING_TOP + CHART_H + LABEL_H + 10}
                  style={{ display: 'block', fontFamily: 'inherit' }}
                >
                  {/* Gridlines + Left Y-axis ticks */}
                  {leftTicks.map((tick, i) => {
                    const y = PADDING_TOP + CHART_H - (tick / maxCount) * CHART_H;
                    return (
                      <g key={i}>
                        <line x1={PADDING_LEFT} y1={y} x2={Math.max(totalW, 300) - PADDING_RIGHT} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={PADDING_LEFT - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{tick}</text>
                      </g>
                    );
                  })}

                  {/* Right Y-axis % ticks */}
                  {rightTicks.map((pct, i) => {
                    const y = PADDING_TOP + CHART_H - (pct / 100) * CHART_H;
                    return (
                      <text key={i} x={Math.max(totalW, 300) - PADDING_RIGHT + 6} y={y + 4} textAnchor="start" fontSize="10" fill="#d97706">{pct}%</text>
                    );
                  })}

                  {/* 80% reference line */}
                  {(() => {
                    const y80 = PADDING_TOP + CHART_H - 0.8 * CHART_H;
                    return (
                      <line x1={PADDING_LEFT} y1={y80} x2={Math.max(totalW, 300) - PADDING_RIGHT} y2={y80}
                        stroke="#d97706" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                    );
                  })()}
                  <text x={Math.max(totalW, 300) - PADDING_RIGHT + 6} y={PADDING_TOP + CHART_H - 0.8 * CHART_H - 3} fontSize="9" fill="#d97706" opacity="0.8">80%</text>

                  {/* Bars */}
                  {customerComplaints.map((item, idx) => {
                    const barH = Math.max((item.count / maxCount) * CHART_H, 4);
                    const x = PADDING_LEFT + idx * (BAR_W + BAR_GAP);
                    const y = PADDING_TOP + CHART_H - barH;
                    return (
                      <g key={idx}>
                        <rect x={x} y={y} width={BAR_W} height={barH} rx="3"
                          fill="url(#barGrad)" opacity="0.92">
                          <title>{`${item.name}: ${item.count} (${item.percentage}%)`}</title>
                        </rect>
                        {item.count > 0 && (
                          <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0369a1">
                            {item.count}
                          </text>
                        )}
                        {/* Rotated x-axis label */}
                        <text
                          transform={`translate(${x + BAR_W / 2}, ${PADDING_TOP + CHART_H + 8}) rotate(38)`}
                          textAnchor="start"
                          fontSize="11"
                          fill="#374151"
                        >
                          {item.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Cumulative line */}
                  {cumPoints.length > 1 && (
                    <polyline
                      points={cumPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Cumulative dots + labels */}
                  {cumPoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="#d97706" stroke="#fff" strokeWidth="1.5">
                        <title>{`Cumulative: ${p.cumPct.toFixed(1)}%`}</title>
                      </circle>
                      <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="600">
                        {p.cumPct.toFixed(0)}%
                      </text>
                    </g>
                  ))}

                  {/* Axes */}
                  <line x1={PADDING_LEFT} y1={PADDING_TOP} x2={PADDING_LEFT} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1.5" />
                  <line x1={PADDING_LEFT} y1={PADDING_TOP + CHART_H} x2={Math.max(totalW, 300) - PADDING_RIGHT} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1.5" />
                  <line x1={Math.max(totalW, 300) - PADDING_RIGHT} y1={PADDING_TOP} x2={Math.max(totalW, 300) - PADDING_RIGHT} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 2" />

                  {/* Gradient def */}
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>

                  {/* Left axis label */}
                  <text transform={`translate(12, ${PADDING_TOP + CHART_H / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#6b7280">Count</text>
                  {/* Right axis label */}
                  <text transform={`translate(${Math.max(totalW, 300) - 8}, ${PADDING_TOP + CHART_H / 2}) rotate(90)`} textAnchor="middle" fontSize="10" fill="#d97706">Cumulative %</text>
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 20, marginTop: 4, fontSize: '0.76rem', color: '#6b7280', paddingLeft: PADDING_LEFT }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(#0ea5e9,#0369a1)', display: 'inline-block' }} />
                    Complaint count
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 20, height: 3, background: '#d97706', display: 'inline-block', borderRadius: 2 }} />
                    Cumulative %
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#d97706' }}>
                    <span style={{ width: 20, height: 2, background: '#d97706', display: 'inline-block', opacity: 0.5, borderStyle: 'dashed' }} />
                    80% threshold
                  </span>
                </div>
              </div>
            );
          })() : (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              No customer data available
            </div>
          )}
        </div>

        {/* Card 6: Code & EXP summary – Donut Chart */}
        <div className="insight-card">
          <h3 className="insight-card-title">Code & EXP summary</h3>
          <div className="insight-card-subtitle" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Complaint distribution by manufacturing code
          </div>
          <div className="donut-container">
            <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                {mfgDonutSlices.length > 0 &&
                  mfgDonutSlices.map((slice, idx) => (
                    <circle
                      key={idx}
                      cx="60" cy="60" r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="16"
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dasharray 0.5s ease',
                      }}
                    />
                  ))}
              </svg>
              <div
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {mfgSummary.reduce((s, m) => s + m.count, 0)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>total</div>
              </div>
            </div>

            <div className="donut-legend" style={{ maxWidth: 210 }}>
              {mfgDonutSlices.map((item, idx) => (
                <div key={idx} className="donut-legend-item">
                  <span className="legend-color-box" style={{ backgroundColor: item.color, flexShrink: 0 }}></span>
                  <span
                    style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={item.code}
                  >
                    {item.code}
                  </span>
                  <strong style={{ marginLeft: 'auto', paddingLeft: 6, whiteSpace: 'nowrap' }}>
                    {item.count} ({item.percentage}%)
                  </strong>
                </div>
              ))}
              {mfgDonutSlices.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>No code records</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Chart Full Width */}
      <div className="insight-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 className="insight-card-title">Control Chart</h3>
            <div className="insight-card-subtitle">
              Monitoring complaint frequency ({controlChartPeriod}ly view)
            </div>
          </div>
          <div className="time-pills">
            <button
              className={`time-pill-btn ${controlChartPeriod === 'day' ? 'active' : ''}`}
              onClick={() => setControlChartPeriod('day')}
            >
              Day
            </button>
            <button
              className={`time-pill-btn ${controlChartPeriod === 'week' ? 'active' : ''}`}
              onClick={() => setControlChartPeriod('week')}
            >
              Week
            </button>
            <button
              className={`time-pill-btn ${controlChartPeriod === 'month' ? 'active' : ''}`}
              onClick={() => setControlChartPeriod('month')}
            >
              Month
            </button>
          </div>
        </div>

        {controlChartData.data.length > 0 ? (
          <div style={{ position: 'relative', width: '100%', height: '240px', paddingTop: 20 }}>
            {/* Y-axis Labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
              <span>{Math.round(ccMaxY)}</span>
              <span>{Math.round(ccMaxY / 2)}</span>
              <span>0</span>
            </div>

            {/* Chart Area */}
            <div style={{ position: 'absolute', left: 40, right: 0, top: 0, bottom: 20, borderLeft: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
              {/* Reference Lines */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(controlChartData.ucl / ccMaxY) * 100}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} title={`UCL: ${controlChartData.ucl.toFixed(1)}`} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(controlChartData.mean / ccMaxY) * 100}%`, borderTop: '1px dashed #3b82f6', zIndex: 1 }} title={`Mean: ${controlChartData.mean.toFixed(1)}`} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(controlChartData.lcl / ccMaxY) * 100}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} title={`LCL: ${controlChartData.lcl.toFixed(1)}`} />
              
              <div style={{ position: 'absolute', right: 5, top: `${100 - (controlChartData.ucl / ccMaxY) * 100 - 8}%`, fontSize: '0.65rem', color: '#ef4444', zIndex: 1 }}>UCL</div>
              <div style={{ position: 'absolute', right: 5, top: `${100 - (controlChartData.mean / ccMaxY) * 100 - 8}%`, fontSize: '0.65rem', color: '#3b82f6', zIndex: 1 }}>Mean</div>

              {/* Data points (SVG for lines) */}
              <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', zIndex: 2 }}>
                <polyline
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  points={controlChartData.data.map((p, i) => {
                    const x = `${(i + 0.5) / controlChartData.data.length * 100}%`;
                    const y = `${100 - (p.count / ccMaxY) * 100}%`;
                    return `${(i + 0.5) / controlChartData.data.length * 100},${100 - (p.count / ccMaxY) * 100}`;
                  }).join(' ')}
                  // Because we're mixing % and absolute coords in SVG, a polyline won't map % coordinates without complex setup.
                  // Wait, polyline does not support percentage coordinates natively in points. Let's use standard divs for lines/points.
                  style={{ display: 'none' }} 
                />
                {controlChartData.data.map((p, i) => {
                  const x = `${(i + 0.5) / controlChartData.data.length * 100}%`;
                  const y = `${100 - (p.count / ccMaxY) * 100}%`;
                  const nextP = controlChartData.data[i + 1];
                  let lineEl = null;
                  if (nextP) {
                    const nextX = `${(i + 1.5) / controlChartData.data.length * 100}%`;
                    const nextY = `${100 - (nextP.count / ccMaxY) * 100}%`;
                    lineEl = <line key={`l-${i}`} x1={x} y1={y} x2={nextX} y2={nextY} stroke="#94a3b8" strokeWidth="2" />;
                  }
                  return (
                    <g key={i}>
                      {lineEl}
                      <circle cx={x} cy={y} r="4" fill={p.outOfControl ? "#ef4444" : "#0f172a"} />
                      <title>{`${p.period}: ${p.count}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-axis Labels */}
            <div style={{ position: 'absolute', left: 40, right: 0, bottom: -5, display: 'flex', justifyContent: 'space-around' }}>
              {controlChartData.data.map((p, i) => {
                // Show max 8 labels to prevent crowding
                const showLabel = controlChartData.data.length <= 8 || i % Math.ceil(controlChartData.data.length / 8) === 0 || i === controlChartData.data.length - 1;
                return (
                  <div key={i} style={{ width: 0, position: 'relative' }}>
                    {showLabel && (
                      <span style={{ position: 'absolute', left: '-20px', width: '40px', textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-muted)', top: 5, whiteSpace: 'nowrap' }}>
                        {p.period}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Not enough data to calculate control chart.
          </div>
        )}
      </div>

    </div>
  );
}
