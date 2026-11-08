import React, { useState, useMemo } from 'react';

// Helpers for Control Chart
const STATUS_STYLES = {
  'Pending approval': {
    fill: '#2563eb', // Royal Blue
    dot: '#3b82f6',
    text: '#1e40af',
  },
  'Pending QA': {
    fill: '#d97706', // Warm Amber
    dot: '#f59e0b',
    text: '#92400e',
  },
  'Approved': {
    fill: '#10b981', // Emerald Green
    dot: '#34d399',
    text: '#065f46',
  },
  'Completed': {
    fill: '#0f766e', // Deep Teal
    dot: '#14b8a6',
    text: '#115e59',
  },
  'Rejected': {
    fill: '#ef4444', // Crimson Red
    dot: '#f87171',
    text: '#991b1b',
  },
};

const DEFECT_COLOR_PALETTE = {
  'Physical damage': '#0f172a',
  'Off smell/taste': '#d97706',
  'Curdling': '#0284c7',
  'Packaging leak': '#16a34a',
  'Foreign particle': '#8b5cf6',
  'Out of spec': '#dc2626',
  'Sour taste': '#f97316',
  'Short weight': '#06b6d4',
  'Other': '#64748b',
};

const BUBBLE_PRODUCT_COLORS = [
  '#0284c7', // Sky Blue
  '#059669', // Emerald Green
  '#d97706', // Warm Amber
  '#7c3aed', // Purple
  '#dc2626', // Crimson Red
  '#ea580c', // Tangerine Orange
  '#0f766e', // Deep Teal
  '#db2777', // Magenta / Pink
  '#2563eb', // Royal Blue
  '#ca8a04', // Golden Amber
  '#4f46e5', // Indigo
  '#16a34a', // Grass Green
  '#64748b', // Slate
];

function formatMonthLabel(mKey) {
  if (!mKey || !mKey.includes('-')) return mKey;
  const [y, m] = mKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(m, 10) - 1;
  return `${monthNames[mIdx] || m} ${y}`;
}

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
  const [gaugeScope, setGaugeScope] = useState('customer'); // 'customer' | 'all'

  // Bubble chart state: Customer scope, selected product filter, and hover tooltip
  const [bubbleCustomerScope, setBubbleCustomerScope] = useState('all'); // 'all' | 'commercial' | 'warehouse'
  const [bubbleSelectedProduct, setBubbleSelectedProduct] = useState(null);
  const [hoveredBubble, setHoveredBubble] = useState(null);
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
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }));
  }, [filteredComplaints]);

  const defectTypes = useMemo(() => {
    const map = {};
    filteredComplaints.forEach(c => {
      const d = c.defect_type || 'Other';
      map[d] = (map[d] || 0) + 1;
    });
    const total = filteredComplaints.length || 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, percentage: ((count / total) * 100).toFixed(1) }));
  }, [filteredComplaints]);

  // QA Confirmed Defect Types aggregation
  const qaDefectTypes = useMemo(() => {
    const map = {};
    let totalConfirmed = 0;
    filteredComplaints.forEach(c => {
      if (c.qa_review) {
        const type = c.qa_review.confirmed_defect_type || c.defect_type || 'Other';
        map[type] = (map[type] || 0) + 1;
        totalConfirmed += 1;
      }
    });
    const total = totalConfirmed || 1;
    const items = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalConfirmed > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
      }));
    return { items, totalConfirmed };
  }, [filteredComplaints]);

  const quantityByProduct = useMemo(() => {
    const map = {};
    // Exclude warehouse complaints from common customer defective quantity by product
    const commonComplaints = filteredComplaints.filter(
      c => (c.customer_name || '').trim().toLowerCase() !== 'sonavith warehouse'
    );
    commonComplaints.forEach(c => {
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
    return Object.values(map)
      .sort((a, b) => b.original_quantity - a.original_quantity)
      .slice(0, 20);
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
    // Exclude "SONAVITH Warehouse" from common customers ranking as requested
    const commonComplaints = filteredComplaints.filter(
      c => (c.customer_name || '').trim().toLowerCase() !== 'sonavith warehouse'
    );
    commonComplaints.forEach(c => {
      const cust = (c.customer_name || 'Unknown').trim();
      map[cust] = (map[cust] || 0) + 1;
    });
    const total = commonComplaints.length || 1;
    // Sort descending — top 20 common customers for Pareto chart
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({
        name,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }));
  }, [filteredComplaints]);

  // Track warehouse internal defects separately
  const warehouseComplaintsCount = useMemo(() => {
    return filteredComplaints.filter(
      c => (c.customer_name || '').trim().toLowerCase() === 'sonavith warehouse'
    ).length;
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
        color: DEFECT_COLOR_PALETTE[dt.name] || donutColors[idx % donutColors.length],
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [defectTypes, filteredComplaints.length, circumference]);

  const qaDefectDonutSlices = useMemo(() => {
    let offset = 0;
    const total = qaDefectTypes.totalConfirmed || 1;
    return qaDefectTypes.items.map((dt, idx) => {
      const percent = dt.count / total;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -offset * circumference;
      offset += percent;
      return {
        ...dt,
        color: DEFECT_COLOR_PALETTE[dt.name] || donutColors[idx % donutColors.length],
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [qaDefectTypes, circumference]);

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

  // ---------------------------------------------------------------------------
  // Bubble Chart Calculations:
  // X-Axis: Month-Year
  // Y-Axis: Frequency of happen intotal
  // Bubble Size: Defect QTY in UOM (different product has different UOM)
  // Bubble Color: Product Name
  // ---------------------------------------------------------------------------
  const getProductColor = (productName, productList = []) => {
    const idx = productList.findIndex(p => p.name.toLowerCase() === productName.toLowerCase());
    if (idx !== -1) {
      return BUBBLE_PRODUCT_COLORS[idx % BUBBLE_PRODUCT_COLORS.length];
    }
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = productName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return BUBBLE_PRODUCT_COLORS[Math.abs(hash) % BUBBLE_PRODUCT_COLORS.length];
  };

  const bubbleData = useMemo(() => {
    if (!complaints || complaints.length === 0) {
      return { bubbles: [], months: [], products: [], maxFreq: 0, maxQty: 0, minQty: 0, totalIncidents: 0 };
    }

    // Filter by customer scope: 'all' | 'commercial' | 'warehouse'
    let pool = complaints;
    if (bubbleCustomerScope === 'commercial') {
      pool = complaints.filter(c => (c.customer_name || '').trim().toLowerCase() !== 'sonavith warehouse');
    } else if (bubbleCustomerScope === 'warehouse') {
      pool = complaints.filter(c => (c.customer_name || '').trim().toLowerCase() === 'sonavith warehouse');
    }

    const groupMap = {};
    const monthsSet = new Set();
    const productsMap = {};

    pool.forEach(c => {
      const dateVal = c.complaint_date || c.created_at || '';
      if (!dateVal) return;
      const d = new Date(dateVal);
      if (isNaN(d)) return;

      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);

      const prodName = (c.product_name || 'Unknown').trim();
      const uom = c.unit_of_measure || 'units';
      const qty = (c.qa_review?.confirmed_defect_quantity !== undefined && c.qa_review?.confirmed_defect_quantity !== null)
        ? Number(c.qa_review.confirmed_defect_quantity)
        : Number(c.defect_quantity || 1);

      const key = `${monthKey}|||${prodName}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          id: key,
          monthKey,
          productName: prodName,
          productCode: c.product_short_code || '',
          uom,
          frequency: 0,
          totalDefectQty: 0,
          complaints: [],
          defectTypes: new Set(),
        };
      }
      groupMap[key].frequency += 1;
      groupMap[key].totalDefectQty += qty;
      groupMap[key].complaints.push(c);
      if (c.defect_type) groupMap[key].defectTypes.add(c.defect_type);

      if (!productsMap[prodName]) {
        productsMap[prodName] = { name: prodName, uom, totalQty: 0, totalFreq: 0 };
      }
      productsMap[prodName].totalQty += qty;
      productsMap[prodName].totalFreq += 1;
    });

    const sortedMonths = Array.from(monthsSet).sort();
    const sortedProducts = Object.values(productsMap).sort((a, b) => b.totalQty - a.totalQty);

    const bubbles = Object.values(groupMap);
    const maxFreq = bubbles.length > 0 ? Math.max(...bubbles.map(b => b.frequency)) : 1;
    const allQtys = bubbles.map(b => b.totalDefectQty);
    const maxQty = allQtys.length > 0 ? Math.max(...allQtys) : 1;
    const minQty = allQtys.length > 0 ? Math.min(...allQtys) : 1;
    const totalIncidents = pool.length;

    return {
      bubbles,
      months: sortedMonths,
      products: sortedProducts,
      maxFreq,
      maxQty,
      minQty,
      totalIncidents,
    };
  }, [complaints, bubbleCustomerScope]);

  return (
    <div className="insights-section">
      <div className="insights-header">
        <h2 className="insights-title">Insights</h2>
        <span className="insights-subtitle">
          {totalComplaints} complaints in current view
        </span>
      </div>

      {/* Top Row: Status Breakdown + Top Defect Types (Intake) + QA Confirmed Defect Types */}
      <div className="insights-row-3col">
        {/* Card 1: Status Breakdown */}
        <div className="insight-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <h3 className="insight-card-title" style={{ margin: 0 }}>Status breakdown</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Workflow stages</span>
          </div>
          <div className="bar-chart-list">
            {statusBreakdown.map((item, idx) => {
              const styleConfig = STATUS_STYLES[item.status] || { fill: '#64748b', dot: '#94a3b8' };
              return (
                <div key={idx} className="bar-chart-row">
                  <span
                    className="bar-chart-label"
                    title={item.status}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 110 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: styleConfig.dot,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.status}
                    </span>
                  </span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(item.count / maxStatus) * 100}%`,
                        backgroundColor: styleConfig.fill,
                        minWidth: item.count > 0 ? '8px' : '0',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    ></div>
                  </div>
                  <span className="bar-value" style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {item.count}
                  </span>
                </div>
              );
            })}
            {statusBreakdown.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', padding: '12px 0' }}>
                No complaints recorded
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Top Defect Types (Initial Intake) */}
        <div className="insight-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 className="insight-card-title" style={{ margin: 0 }}>Top defect types</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Initial intake</span>
          </div>
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

            <div className="donut-legend" style={{ maxWidth: 180, maxHeight: 155, overflowY: 'auto' }}>
              {defectDonutSlices.map((dt, idx) => (
                <div key={idx} className="donut-legend-item">
                  <span
                    className="legend-color-box"
                    style={{ backgroundColor: dt.color, flexShrink: 0 }}
                  ></span>
                  <span
                    style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={dt.name}
                  >
                    {dt.name}
                  </span>
                  <strong style={{ marginLeft: 'auto', paddingLeft: 4, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
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

        {/* Card 3: Confirmed Defect Types (QA Inspection) */}
        <div className="insight-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h3 className="insight-card-title" style={{ margin: 0 }}>Confirmed defect types</h3>
            <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>QA confirmed</span>
          </div>
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
                {qaDefectTypes.totalConfirmed > 0 &&
                  qaDefectDonutSlices.map((slice, idx) => (
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
                  {qaDefectTypes.totalConfirmed}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                  confirmed
                </div>
              </div>
            </div>

            <div className="donut-legend" style={{ maxWidth: 180, maxHeight: 155, overflowY: 'auto' }}>
              {qaDefectDonutSlices.map((dt, idx) => (
                <div key={idx} className="donut-legend-item">
                  <span
                    className="legend-color-box"
                    style={{ backgroundColor: dt.color, flexShrink: 0 }}
                  ></span>
                  <span
                    style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={dt.name}
                  >
                    {dt.name}
                  </span>
                  <strong style={{ marginLeft: 'auto', paddingLeft: 4, whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                    {dt.count} ({dt.percentage}%)
                  </strong>
                </div>
              ))}
              {qaDefectDonutSlices.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                  No QA inspections confirmed yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="insights-grid">

        {/* Card 4: Defective Quantity by Product – Grouped Bar Chart */}
        <div className="insight-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className="insight-card-title">Defective quantity by product</h3>
              <div className="insight-card-subtitle">Initial complaint quantity vs. warehouse exchanged quantity (Top 20 products, common customers only)</div>
            </div>
            {warehouseComplaintsCount > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#b45309',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Special case: SONAVITH Warehouse internal defects are excluded from common customer charts"
              >
                🏢 {warehouseComplaintsCount} WH defect{warehouseComplaintsCount > 1 ? 's' : ''} tracked separately
              </span>
            )}
          </div>

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
            const BAR_GAP = 4;
            const CHART_H = 220;
            const maxProdLen = Math.max(...quantityByProduct.map(p => (p.product || '').length), 15);
            const LABEL_H = Math.max(150, Math.ceil(maxProdLen * 4.5) + 20);
            const PADDING_LEFT = 42;
            const PADDING_TOP = 16;
            const groupW = BAR_W * 2 + BAR_GAP;
            const minPlotWidth = 1160;
            const GROUP_GAP = Math.max(
              20,
              quantityByProduct.length > 1
                ? Math.floor((minPlotWidth - quantityByProduct.length * groupW) / quantityByProduct.length)
                : 20
            );
            const plotRightX = Math.max(PADDING_LEFT + quantityByProduct.length * (groupW + GROUP_GAP), minPlotWidth);
            const maxLabelRightX = Math.max(
              ...quantityByProduct.map((item, idx) => PADDING_LEFT + idx * (groupW + GROUP_GAP) + groupW / 2 + Math.ceil((item.product || '').length * 5.2)),
              plotRightX
            );
            const totalW = Math.max(plotRightX + 24, maxLabelRightX + 20, 400);
            const maxVal = Math.max(...quantityByProduct.map(p => Math.max(p.original_quantity, p.adjusted_quantity)), 1);
            // Y-axis ticks
            const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal));

            return (
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <svg
                  width={totalW}
                  height={PADDING_TOP + CHART_H + LABEL_H + 10}
                  style={{ display: 'block', minWidth: '100%' }}
                >
                  {/* Y-axis ticks & gridlines */}
                  {yTicks.map((tick, i) => {
                    const y = PADDING_TOP + CHART_H - (tick / maxVal) * CHART_H;
                    return (
                      <g key={i}>
                        <line x1={PADDING_LEFT} y1={y} x2={plotRightX} y2={y} stroke="#e5e7eb" strokeWidth="1" />
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
                    const labelY = PADDING_TOP + CHART_H + 10;

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
                          fontWeight="500"
                          fill="#334155"
                        >
                          {item.product}
                        </text>
                      </g>
                    );
                  })}

                  {/* Baseline */}
                  <line x1={PADDING_LEFT} y1={PADDING_TOP + CHART_H} x2={plotRightX} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1.5" />
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
        <div className="insight-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 className="insight-card-title">Complaints by customer</h3>
              <div className="insight-card-subtitle">Pareto analysis — top 20 common customers (sorted by frequency with cumulative %)</div>
            </div>
            {warehouseComplaintsCount > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#b45309',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Special case: SONAVITH Warehouse internal defects are excluded from common customer charts"
              >
                🏢 {warehouseComplaintsCount} WH defect{warehouseComplaintsCount > 1 ? 's' : ''} tracked separately
              </span>
            )}
          </div>

          {customerComplaints.length > 0 ? (() => {
            const BAR_W = 36;
            const BAR_GAP = 12;
            const CHART_H = 180;
            const maxCustLen = Math.max(...customerComplaints.map(c => (c.name || '').length), 16);
            // Ensure full vertical clearance for the longest rotated customer name
            const LABEL_H = Math.max(195, Math.ceil(maxCustLen * 4.8) + 26);
            const PADDING_LEFT = 44;
            const PADDING_RIGHT = 52;
            const PADDING_TOP = 20;
            const total = customerComplaints.reduce((s, c) => s + c.count, 0) || 1;
            const maxCount = customerComplaints[0]?.count || 1;
            const plotRightX = Math.max(
              PADDING_LEFT + customerComplaints.length * (BAR_W + BAR_GAP) - BAR_GAP,
              260
            );
            // Ensure full horizontal clearance on the right for long rotated labels near the end of the x-axis
            const maxLabelRightX = Math.max(
              ...customerComplaints.map(
                (item, idx) =>
                  PADDING_LEFT +
                  idx * (BAR_W + BAR_GAP) +
                  BAR_W / 2 +
                  Math.ceil((item.name || '').length * 5.4)
              ),
              plotRightX + PADDING_RIGHT
            );
            const svgW = Math.max(plotRightX + PADDING_RIGHT, maxLabelRightX + 18, 320);

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
              <div style={{ overflowX: 'auto', width: '100%', paddingBottom: 4 }}>
                <svg
                  width={svgW}
                  height={PADDING_TOP + CHART_H + LABEL_H + 12}
                  style={{ display: 'block', fontFamily: 'inherit', minWidth: '100%' }}
                >
                  {/* Gridlines + Left Y-axis ticks */}
                  {leftTicks.map((tick, i) => {
                    const y = PADDING_TOP + CHART_H - (tick / maxCount) * CHART_H;
                    return (
                      <g key={i}>
                        <line x1={PADDING_LEFT} y1={y} x2={plotRightX} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={PADDING_LEFT - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{tick}</text>
                      </g>
                    );
                  })}

                  {/* Right Y-axis % ticks */}
                  {rightTicks.map((pct, i) => {
                    const y = PADDING_TOP + CHART_H - (pct / 100) * CHART_H;
                    return (
                      <text key={i} x={plotRightX + 6} y={y + 4} textAnchor="start" fontSize="10" fill="#d97706">{pct}%</text>
                    );
                  })}

                  {/* 80% reference line */}
                  {(() => {
                    const y80 = PADDING_TOP + CHART_H - 0.8 * CHART_H;
                    return (
                      <line x1={PADDING_LEFT} y1={y80} x2={plotRightX} y2={y80}
                        stroke="#d97706" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                    );
                  })()}
                  <text x={plotRightX + 6} y={PADDING_TOP + CHART_H - 0.8 * CHART_H - 3} fontSize="9" fill="#d97706" opacity="0.8">80%</text>

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
                        {/* Rotated x-axis label — full customer name with complete vertical & horizontal clearance */}
                        <text
                          transform={`translate(${x + BAR_W / 2}, ${PADDING_TOP + CHART_H + 10}) rotate(42)`}
                          textAnchor="start"
                          fontSize="11"
                          fontWeight="500"
                          fill="#1e293b"
                        >
                          <title>{item.name}</title>
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
                  <line x1={PADDING_LEFT} y1={PADDING_TOP + CHART_H} x2={plotRightX} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1.5" />
                  <line x1={plotRightX} y1={PADDING_TOP} x2={plotRightX} y2={PADDING_TOP + CHART_H} stroke="#d1d5db" strokeWidth="1" strokeDasharray="3 2" />

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
                  <text transform={`translate(${plotRightX + 42}, ${PADDING_TOP + CHART_H / 2}) rotate(90)`} textAnchor="middle" fontSize="10" fill="#d97706">Cumulative %</text>
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 20, marginTop: 6, fontSize: '0.76rem', color: '#6b7280', paddingLeft: PADDING_LEFT }}>
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

        {/* Card 6: Code & EXP summary – Donut Chart + Speedometer Gauge below */}
        <div className="insight-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
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

          {/* Speedometer Gauge Chart: Total Ordered/Shipped vs Total Defective QTY */}
          {(() => {
            const sourceRows =
              gaugeScope === 'customer'
                ? filteredComplaints.filter(
                    (c) => (c.customer_name || '').trim().toLowerCase() !== 'sonavith warehouse'
                  )
                : filteredComplaints;

            let totalOrdered = 0;
            let totalDefective = 0;
            let totalQaConfirmed = 0;

            sourceRows.forEach((c) => {
              const ord = Number(c.order_quantity) || 0;
              const def = Number(c.defect_quantity) || 0;
              const qaDef =
                c.qa_review?.confirmed_defect_quantity !== undefined &&
                c.qa_review?.confirmed_defect_quantity !== null
                  ? Number(c.qa_review.confirmed_defect_quantity)
                  : def;
              totalOrdered += ord;
              totalDefective += def;
              totalQaConfirmed += qaDef;
            });

            const maxScale = Math.max(totalOrdered, totalDefective, 1);
            const ratio = Math.min(Math.max(totalDefective / maxScale, 0), 1);
            const defectRatePct = totalOrdered > 0 ? ((totalDefective / totalOrdered) * 100).toFixed(2) : '0.00';

            // Speedometer SVG Geometry (270-degree horseshoe arc from 135° to 405°)
            const cx = 140;
            const cy = 112;
            const rArc = 82;
            const rTickText = 58;
            const startDeg = 135;
            const sweepDeg = 270;
            const endDeg = startDeg + sweepDeg;
            const currentDeg = startDeg + ratio * sweepDeg;

            const toRad = (deg) => (deg * Math.PI) / 180;
            const polarToCartesian = (centerX, centerY, radiusVal, angleInDegrees) => {
              const rad = toRad(angleInDegrees);
              return {
                x: centerX + radiusVal * Math.cos(rad),
                y: centerY + radiusVal * Math.sin(rad),
              };
            };

            const describeArc = (x, y, radiusVal, startAngle, endAngle) => {
              const start = polarToCartesian(x, y, radiusVal, startAngle);
              const end = polarToCartesian(x, y, radiusVal, endAngle);
              const diff = endAngle - startAngle;
              const largeArcFlag = diff <= 180 ? '0' : '1';
              return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radiusVal} ${radiusVal} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
            };

            const describeSector = (x, y, radiusVal, startAngle, endAngle) => {
              if (endAngle - startAngle <= 0.5) return '';
              const start = polarToCartesian(x, y, radiusVal, startAngle);
              const end = polarToCartesian(x, y, radiusVal, endAngle);
              const diff = endAngle - startAngle;
              const largeArcFlag = diff <= 180 ? '0' : '1';
              return `M ${x} ${y} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radiusVal} ${radiusVal} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
            };

            // 9 scale labels from 0 to totalOrdered
            const tickCount = 8;
            const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
              const frac = i / tickCount;
              const deg = startDeg + frac * sweepDeg;
              const val = Math.round(frac * maxScale);
              const pos = polarToCartesian(cx, cy, rTickText, deg);
              const isPassed = frac <= ratio + 0.001;
              const formattedVal =
                val >= 10000 ? `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k` : val.toLocaleString();
              return { deg, val, formattedVal, x: pos.x, y: pos.y, isPassed };
            });

            // Tapered needle coordinates (rotated around cx, cy)
            const needleTipLen = 64;
            const needleBaseOffset = 8;
            const needleHalfBase = 4.8;
            const needleHalfTip = 1.8;

            return (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <h3 className="insight-card-title" style={{ margin: 0 }}>
                      Ordered / Shipped vs. Defective QTY
                    </h3>
                    <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Total defective measure against total ordered / shipped scale
                    </div>
                  </div>
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 6, padding: 2, gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => setGaugeScope('customer')}
                      style={{
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: gaugeScope === 'customer' ? '#ffffff' : 'transparent',
                        color: gaugeScope === 'customer' ? '#0284c7' : '#64748b',
                        boxShadow: gaugeScope === 'customer' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      }}
                      title="Commercial customer orders only (excludes SONAVITH Warehouse)"
                    >
                      Customer Shipped
                    </button>
                    <button
                      type="button"
                      onClick={() => setGaugeScope('all')}
                      style={{
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: gaugeScope === 'all' ? '#ffffff' : 'transparent',
                        color: gaugeScope === 'all' ? '#0284c7' : '#64748b',
                        boxShadow: gaugeScope === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      }}
                      title="Include all records including internal warehouse stock"
                    >
                      All Orders
                    </button>
                  </div>
                </div>

                {/* Speedometer Gauge SVG + Summary Metrics */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <svg
                    width="225"
                    height="185"
                    viewBox="0 0 280 215"
                    style={{ display: 'block', flexShrink: 0 }}
                  >
                    <defs>
                      <linearGradient id="speedoArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0095ff" />
                        <stop offset="50%" stopColor="#00e1ff" />
                        <stop offset="100%" stopColor="#5effc3" />
                      </linearGradient>
                      <radialGradient id="speedoInnerGlow" cx="50%" cy="52%" r="48%">
                        <stop offset="0%" stopColor="#00e1ff" stopOpacity="0.0" />
                        <stop offset="65%" stopColor="#00e1ff" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.22" />
                      </radialGradient>
                      <linearGradient id="speedoNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.15" />
                        <stop offset="45%" stopColor="#64748b" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.98" />
                      </linearGradient>
                    </defs>

                    {/* Soft cyan inner glow sector under active measure */}
                    {ratio > 0.005 && (
                      <path
                        d={describeSector(cx, cy, rArc - 7, startDeg, currentDeg)}
                        fill="url(#speedoInnerGlow)"
                      />
                    )}

                    {/* Full background track arc (Total Ordered / Shipped capacity) */}
                    <path
                      d={describeArc(cx, cy, rArc, startDeg, endDeg)}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                      strokeLinecap="butt"
                    />

                    {/* Active filled arc (Total Defective QTY measure) */}
                    {ratio > 0.002 && (
                      <path
                        d={describeArc(cx, cy, rArc, startDeg, Math.max(currentDeg, startDeg + 1.5))}
                        fill="none"
                        stroke="url(#speedoArcGrad)"
                        strokeWidth="16"
                        strokeLinecap="butt"
                        style={{ transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                    )}

                    {/* Scale tick numbers around inner rim */}
                    {ticks.map((t, i) => (
                      <text
                        key={i}
                        x={t.x}
                        y={t.y + 3.5}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="700"
                        fill={t.isPassed ? '#334155' : '#94a3b8'}
                      >
                        {t.formattedVal}
                      </text>
                    ))}

                    {/* Tapered Speedometer Needle */}
                    <g
                      transform={`translate(${cx}, ${cy}) rotate(${currentDeg})`}
                      style={{ transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <polygon
                        points={`${needleBaseOffset},${-needleHalfBase} ${needleTipLen},${-needleHalfTip} ${needleTipLen},${needleHalfTip} ${needleBaseOffset},${needleHalfBase}`}
                        fill="url(#speedoNeedleGrad)"
                      />
                    </g>

                    {/* Digital Measure Readout at bottom center */}
                    <text
                      x={cx}
                      y={168}
                      textAnchor="middle"
                      fontSize="28"
                      fontWeight="300"
                      fill="#334155"
                      style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                    >
                      {totalDefective.toLocaleString()}
                    </text>

                    {/* Bottom Unit & Rate Label */}
                    <g transform={`translate(${cx}, 192)`}>
                      <circle cx="-54" cy="-4" r="7.5" fill="none" stroke="#06b6d4" strokeWidth="1.6" />
                      <path
                        d="M -54 -8 L -54 -1 M -57 -3.5 L -54 -0.5 L -51 -3.5"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <text
                        x="-41"
                        y="0"
                        textAnchor="start"
                        fontSize="11.5"
                        fontWeight="600"
                        fill="#64748b"
                      >
                        Defective ({defectRatePct}%)
                      </text>
                    </g>
                  </svg>

                  {/* Right-hand Breakdown Pills */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minWidth: 148,
                      flex: '1 1 140px',
                      maxWidth: 195,
                    }}
                  >
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '8px 11px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                        Total Ordered / Shipped
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                        {totalOrdered.toLocaleString()}{' '}
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>QTY</span>
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#f0fdfa',
                        border: '1px solid #99f6e4',
                        borderRadius: 8,
                        padding: '8px 11px',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#0f766e', fontWeight: 700 }}>
                        Total Defective Measure
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 1 }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0284c7' }}>
                          {totalDefective.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#0f766e',
                            background: '#ccfbf1',
                            padding: '1px 6px',
                            borderRadius: 999,
                          }}
                        >
                          {defectRatePct}%
                        </span>
                      </div>
                      {totalQaConfirmed !== totalDefective && (
                        <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: 2 }}>
                          QA Confirmed: <strong>{totalQaConfirmed.toLocaleString()}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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

      {/* =========================================================================
          Card 8: Independent Bubble Chart
          Highlighting:
          - X-Axis: Month-Year
          - Y-Axis: Frequency of happen intotal
          - Bubble Size: Defect QTY in UOM (different product has different UOM)
          - Bubble Color: Product Name
         ========================================================================= */}
      <div className="insight-card" style={{ marginTop: 20 }}>
        {/* Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="insight-card-title">Defect Distribution by Product & Month (Bubble Chart)</h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--color-brand)',
                  background: 'var(--color-brand-light)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  letterSpacing: '0.02em',
                }}
              >
                MULTI-ATTRIBUTE INSIGHT
              </span>
            </div>
            <div className="insight-card-subtitle" style={{ marginTop: 4 }}>
              Tracking <strong>Frequency of happen in total</strong> (Y-Axis) over <strong>Month-Year</strong> (X-Axis), with <strong>Defect QTY in UOM</strong> (Bubble Size) and <strong>Product Name</strong> (Bubble Color).
            </div>
          </div>

          {/* Scope Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Scope:</span>
            <div className="time-pills">
              <button
                type="button"
                className={`time-pill-btn ${bubbleCustomerScope === 'all' ? 'active' : ''}`}
                onClick={() => setBubbleCustomerScope('all')}
                title="Include both commercial customers and internal SONAVITH Warehouse defects"
              >
                All Incidents
              </button>
              <button
                type="button"
                className={`time-pill-btn ${bubbleCustomerScope === 'commercial' ? 'active' : ''}`}
                onClick={() => setBubbleCustomerScope('commercial')}
                title="Common customers only (excludes SONAVITH Warehouse)"
              >
                Common Customers
              </button>
              <button
                type="button"
                className={`time-pill-btn ${bubbleCustomerScope === 'warehouse' ? 'active' : ''}`}
                onClick={() => setBubbleCustomerScope('warehouse')}
                title="Only internal SONAVITH Warehouse findings"
              >
                SONAVITH Warehouse Only
              </button>
            </div>
          </div>
        </div>

        {/* Chart Content Area */}
        {bubbleData.bubbles.length > 0 ? (() => {
          const BUBBLE_CHART_H = 280;
          const BUBBLE_PADDING_TOP = 32;
          const BUBBLE_PADDING_BOTTOM = 55;
          const BUBBLE_PADDING_LEFT = 60;
          const BUBBLE_PADDING_RIGHT = 45;
          const monthCount = Math.max(bubbleData.months.length, 1);
          const BUBBLE_COL_WIDTH = Math.max(180, Math.floor(700 / monthCount));
          const BUBBLE_TOTAL_W = Math.max(
            BUBBLE_PADDING_LEFT + monthCount * BUBBLE_COL_WIDTH + BUBBLE_PADDING_RIGHT,
            760
          );
          const BUBBLE_SVG_H = BUBBLE_PADDING_TOP + BUBBLE_CHART_H + BUBBLE_PADDING_BOTTOM;
          const maxY = Math.max(bubbleData.maxFreq + 1, 4);

          // Generate integer ticks for Y-axis (Frequency)
          const yTicks = [];
          for (let i = 0; i <= maxY; i++) {
            yTicks.push(i);
          }

          return (
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <svg
                  width={BUBBLE_TOTAL_W}
                  height={BUBBLE_SVG_H}
                  style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
                >
                  <defs>
                    <filter id="bubble-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Horizontal Y-Axis Gridlines & Labels */}
                  {yTicks.map((tick) => {
                    const y = BUBBLE_PADDING_TOP + BUBBLE_CHART_H - (tick / maxY) * BUBBLE_CHART_H;
                    return (
                      <g key={`ytick-${tick}`}>
                        <line
                          x1={BUBBLE_PADDING_LEFT}
                          y1={y}
                          x2={BUBBLE_TOTAL_W - BUBBLE_PADDING_RIGHT}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray={tick === 0 ? 'none' : '3 3'}
                          strokeWidth={tick === 0 ? '1.5' : '1'}
                        />
                        <text
                          x={BUBBLE_PADDING_LEFT - 12}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill="#64748b"
                          fontWeight={tick === 0 ? '600' : '400'}
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {/* Left Y-Axis Title */}
                  <text
                    transform={`translate(16, ${BUBBLE_PADDING_TOP + BUBBLE_CHART_H / 2}) rotate(-90)`}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#475569"
                    letterSpacing="0.02em"
                  >
                    Frequency of happen intotal (Complaints)
                  </text>

                  {/* Bottom X-Axis Title */}
                  <text
                    x={BUBBLE_PADDING_LEFT + (BUBBLE_TOTAL_W - BUBBLE_PADDING_LEFT - BUBBLE_PADDING_RIGHT) / 2}
                    y={BUBBLE_SVG_H - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#475569"
                    letterSpacing="0.02em"
                  >
                    Month-Year
                  </text>

                  {/* X-Axis Month Columns & Bubbles */}
                  {bubbleData.months.map((mKey, mIdx) => {
                    const colCenterX = BUBBLE_PADDING_LEFT + (mIdx + 0.5) * BUBBLE_COL_WIDTH;
                    const monthBubbles = bubbleData.bubbles.filter((b) => b.monthKey === mKey);
                    const monthIncidents = monthBubbles.reduce((acc, b) => acc + b.frequency, 0);

                    // Group bubbles in this month by frequency to avoid center overlap
                    const freqBuckets = {};
                    monthBubbles.forEach((b) => {
                      if (!freqBuckets[b.frequency]) freqBuckets[b.frequency] = [];
                      freqBuckets[b.frequency].push(b);
                    });

                    return (
                      <g key={`month-col-${mKey}`}>
                        {/* Vertical guideline */}
                        <line
                          x1={colCenterX}
                          y1={BUBBLE_PADDING_TOP}
                          x2={colCenterX}
                          y2={BUBBLE_PADDING_TOP + BUBBLE_CHART_H}
                          stroke="#f1f5f9"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />

                        {/* Month Label */}
                        <text
                          x={colCenterX}
                          y={BUBBLE_PADDING_TOP + BUBBLE_CHART_H + 20}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="700"
                          fill="#0f172a"
                        >
                          {formatMonthLabel(mKey)}
                        </text>
                        <text
                          x={colCenterX}
                          y={BUBBLE_PADDING_TOP + BUBBLE_CHART_H + 34}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#94a3b8"
                        >
                          {monthIncidents} incident{monthIncidents > 1 ? 's' : ''}
                        </text>

                        {/* Bubbles in this Month */}
                        {Object.entries(freqBuckets).map(([freqStr, bList]) => {
                          const freqNum = Number(freqStr);
                          const cy = BUBBLE_PADDING_TOP + BUBBLE_CHART_H - (freqNum / maxY) * BUBBLE_CHART_H;
                          const N = bList.length;

                          return bList.map((bubble, k) => {
                            // Symmetrical horizontal offset when multiple bubbles share same (month, frequency)
                            const xOffset = N > 1 ? (k - (N - 1) / 2) * 36 : 0;
                            const cx = colCenterX + xOffset;

                            // Scale radius between 14px and 38px
                            const minR = 14;
                            const maxR = 38;
                            const range = bubbleData.maxQty - bubbleData.minQty;
                            let r = 22;
                            if (range > 0) {
                              r = minR + Math.sqrt((bubble.totalDefectQty - bubbleData.minQty) / range) * (maxR - minR);
                            }

                            const isSelected = !bubbleSelectedProduct || bubble.productName === bubbleSelectedProduct;
                            const isHovered = hoveredBubble?.id === bubble.id;
                            if (isHovered) r += 3;

                            const prodColor = getProductColor(bubble.productName, bubbleData.products);

                            return (
                              <g
                                key={bubble.id}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredBubble({ ...bubble, cx, cy, color: prodColor })}
                                onMouseLeave={() => setHoveredBubble(null)}
                                onClick={() =>
                                  setBubbleSelectedProduct(
                                    bubbleSelectedProduct === bubble.productName ? null : bubble.productName
                                  )
                                }
                              >
                                {/* Glow backdrop on hover */}
                                {isHovered && (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={r + 4}
                                    fill="none"
                                    stroke={prodColor}
                                    strokeWidth="3"
                                    opacity="0.4"
                                  />
                                )}

                                {/* Main Bubble */}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={r}
                                  fill={prodColor}
                                  fillOpacity={isHovered ? 0.95 : (isSelected ? 0.72 : 0.18)}
                                  stroke={prodColor}
                                  strokeWidth={isHovered ? 3 : 2}
                                  strokeOpacity={isSelected ? 1.0 : 0.3}
                                  filter="url(#bubble-glow)"
                                  style={{ transition: 'all 0.18s ease-in-out' }}
                                />

                                {/* Text Label inside Bubble */}
                                {r >= 16 && isSelected && (
                                  <text
                                    x={cx}
                                    y={cy + 4}
                                    textAnchor="middle"
                                    fontSize={r >= 26 ? '11' : '9'}
                                    fontWeight="700"
                                    fill="#ffffff"
                                    pointerEvents="none"
                                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}
                                  >
                                    {bubble.totalDefectQty} {bubble.uom.replace('-BTL', '').slice(0, 4)}
                                  </text>
                                )}
                              </g>
                            );
                          });
                        })}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Interactive Tooltip Card */}
              {hoveredBubble && (
                <div
                  style={{
                    position: 'absolute',
                    left: Math.min(Math.max(hoveredBubble.cx - 110, 20), BUBBLE_TOTAL_W - 240),
                    top: Math.max(hoveredBubble.cy - 120, 10),
                    background: 'rgba(15, 23, 42, 0.96)',
                    color: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: 8,
                    boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
                    zIndex: 60,
                    pointerEvents: 'none',
                    minWidth: 230,
                    maxWidth: 290,
                    fontSize: '0.78rem',
                    lineHeight: 1.45,
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: hoveredBubble.color,
                        flexShrink: 0,
                        border: '1px solid #ffffff',
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{hoveredBubble.productName}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 6 }}>
                    📅 {formatMonthLabel(hoveredBubble.monthKey)}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 6,
                      background: 'rgba(255,255,255,0.08)',
                      padding: '6px 8px',
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.67rem' }}>Frequency</div>
                      <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {hoveredBubble.frequency} incident{hoveredBubble.frequency > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: '0.67rem' }}>Defect QTY in UOM</div>
                      <div style={{ fontWeight: 700, color: '#34d399' }}>
                        {hoveredBubble.totalDefectQty} {hoveredBubble.uom}
                      </div>
                    </div>
                  </div>
                  {hoveredBubble.defectTypes.size > 0 && (
                    <div style={{ fontSize: '0.70rem', color: '#cbd5e1', marginBottom: 4 }}>
                      <strong>Defects:</strong> {Array.from(hoveredBubble.defectTypes).join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: '0.67rem', color: '#94a3b8' }}>
                    IDs: {hoveredBubble.complaints.map((c) => c.id).slice(0, 3).join(', ')}
                    {hoveredBubble.complaints.length > 3 ? ` +${hoveredBubble.complaints.length - 3} more` : ''}
                  </div>
                </div>
              )}

              {/* Product Legend & Filtering */}
              <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    Bubble Color: Product Name & Volume (Click to isolate product):
                  </span>
                  {bubbleSelectedProduct && (
                    <button
                      type="button"
                      onClick={() => setBubbleSelectedProduct(null)}
                      style={{
                        fontSize: '0.70rem',
                        color: '#0284c7',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        textDecoration: 'underline',
                        fontWeight: 600,
                      }}
                    >
                      Clear product filter (Show all)
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {bubbleData.products.map((p) => {
                    const color = getProductColor(p.name, bubbleData.products);
                    const isActive = !bubbleSelectedProduct || bubbleSelectedProduct === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          setBubbleSelectedProduct(bubbleSelectedProduct === p.name ? null : p.name)
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.74rem',
                          background: isActive ? '#f8fafc' : '#f1f5f9',
                          border: isActive ? `1.5px solid ${color}` : '1.5px solid #e2e8f0',
                          opacity: isActive ? 1 : 0.45,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                        <span style={{ fontWeight: isActive ? 700 : 500, color: '#0f172a' }}>{p.name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.70rem' }}>({p.totalQty} {p.uom})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bubble Size Scale Indicator & Footer Metrics */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>Bubble Size:</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #64748b', display: 'inline-block' }} />
                    Small ({bubbleData.minQty} units)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #64748b', display: 'inline-block' }} />
                    Medium ({Math.round((bubbleData.minQty + bubbleData.maxQty) / 2)} units)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #64748b', display: 'inline-block' }} />
                    Large ({bubbleData.maxQty} units)
                  </span>
                </div>
                <div>
                  <span>
                    Total: <strong>{bubbleData.bubbles.length}</strong> product-month groups across <strong>{bubbleData.totalIncidents}</strong> incidents
                  </span>
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            No complaints found for the selected bubble chart scope.
          </div>
        )}
      </div>

    </div>
  );
}
