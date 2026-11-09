import React, { useState, useMemo } from 'react';
import { Printer, Layers, Flame, Trash2, Building, Globe, CheckCircle2, ChevronRight, Info, Boxes, Archive, AlertCircle, PackageCheck } from 'lucide-react';

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
  'Closed': {
    fill: '#64748b', // Slate Gray
    dot: '#94a3b8',
    text: '#334155',
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

// ---------------------------------------------------------------------------
// Heatmap dynamic color interpolator for Disposal Summary:
// Blue (#1d4ed8 / #2563eb) for lowest write-off QTY -> Crimson Red (#b91c1c) for highest write-off QTY
// ---------------------------------------------------------------------------
function getDisposalHeatmapColor(qty, minQty, maxQty) {
  const min = Number(minQty) || 0;
  const max = Number(maxQty) || 1;
  const val = Number(qty) || 0;
  if (max <= min) return '#2563eb';
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));

  let r, g, b;
  if (ratio <= 0.25) {
    const t = ratio / 0.25;
    r = Math.round(37 + (2 - 37) * t);
    g = Math.round(99 + (132 - 99) * t);
    b = Math.round(235 + (199 - 235) * t);
  } else if (ratio <= 0.5) {
    const t = (ratio - 0.25) / 0.25;
    r = Math.round(2 + (217 - 2) * t);
    g = Math.round(132 + (119 - 132) * t);
    b = Math.round(199 + (6 - 199) * t);
  } else if (ratio <= 0.75) {
    const t = (ratio - 0.5) / 0.25;
    r = Math.round(217 + (234 - 217) * t);
    g = Math.round(119 + (88 - 119) * t);
    b = Math.round(6 + (12 - 6) * t);
  } else {
    const t = (ratio - 0.75) / 0.25;
    r = Math.round(234 + (185 - 234) * t);
    g = Math.round(88 + (28 - 88) * t);
    b = Math.round(12 + (28 - 12) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function getDisposalHeatmapBg(qty, minQty, maxQty) {
  const min = Number(minQty) || 0;
  const max = Number(maxQty) || 1;
  const val = Number(qty) || 0;
  if (max <= min) return 'rgba(37, 99, 235, 0.08)';
  const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));

  let r, g, b;
  if (ratio <= 0.25) {
    const t = ratio / 0.25;
    r = Math.round(37 + (2 - 37) * t);
    g = Math.round(99 + (132 - 99) * t);
    b = Math.round(235 + (199 - 235) * t);
  } else if (ratio <= 0.5) {
    const t = (ratio - 0.25) / 0.25;
    r = Math.round(2 + (217 - 2) * t);
    g = Math.round(132 + (119 - 132) * t);
    b = Math.round(199 + (6 - 199) * t);
  } else if (ratio <= 0.75) {
    const t = (ratio - 0.5) / 0.25;
    r = Math.round(217 + (234 - 217) * t);
    g = Math.round(119 + (88 - 119) * t);
    b = Math.round(6 + (12 - 6) * t);
  } else {
    const t = (ratio - 0.75) / 0.25;
    r = Math.round(234 + (185 - 234) * t);
    g = Math.round(88 + (28 - 88) * t);
    b = Math.round(12 + (28 - 12) * t);
  }
  return `rgba(${r}, ${g}, ${b}, 0.08)`;
}

export default function InsightsView({ metrics, dateMode, complaints = [], searchQuery = '', timeFilter = 'All time', dateFilter = '' }) {
  const [controlChartPeriod, setControlChartPeriod] = useState('day');
  const [gaugeScope, setGaugeScope] = useState('customer'); // 'customer' | 'all'

  // Bubble chart state: Customer scope, selected product filter, and hover tooltip
  const [bubbleCustomerScope, setBubbleCustomerScope] = useState('all'); // 'all' | 'commercial' | 'warehouse'
  const [bubbleSelectedProduct, setBubbleSelectedProduct] = useState(null);
  const [hoveredBubble, setHoveredBubble] = useState(null);

  // Disposal summary heatmap state: Scope filter, cluster view, and hover tooltip
  const [disposalScope, setDisposalScope] = useState('all'); // 'all' | 'closed' | 'pending'
  const [disposalClusterView, setDisposalClusterView] = useState('all'); // 'all' | 'physical' | 'virtual'
  const [hoveredHeatmapTile, setHoveredHeatmapTile] = useState(null);

  // Remaining stock not on write-off state
  const [remainingStockStageFilter, setRemainingStockStageFilter] = useState('all'); // 'all' | 'pending_qa' | 'pending_approval' | 'completed'
  const [remainingStockSearch, setRemainingStockSearch] = useState('');
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
      const defQty = parseInt(c.defect_quantity, 10) || 0;
      const shipQty = parseInt(c.order_quantity, 10) || 0;
      if (!map[p]) {
        map[p] = { 
          product: p, 
          shipped_quantity: 0, 
          original_quantity: 0, 
          adjusted_quantity: 0,
          defect_rate: '0.0'
        };
      }
      map[p].shipped_quantity += shipQty;
      map[p].original_quantity += defQty;
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
      .map(item => ({
        ...item,
        defect_rate: item.shipped_quantity > 0 
          ? ((item.original_quantity / item.shipped_quantity) * 100).toFixed(1)
          : '0.0'
      }))
      .sort((a, b) => b.original_quantity - a.original_quantity)
      .slice(0, 20);
  }, [filteredComplaints]);

  // Dedicated aggregation for internal warehouse incidents
  const warehouseIncidents = useMemo(() => {
    const whComplaints = filteredComplaints.filter(
      c => (c.customer_name || '').trim().toLowerCase() === 'sonavith warehouse'
    );
    let totalBatchVolume = 0;
    let totalDamagedVolume = 0;
    const byProductMap = {};

    whComplaints.forEach(c => {
      const batchQty = parseInt(c.order_quantity, 10) || 0;
      const dmgQty = parseInt(c.defect_quantity, 10) || 0;
      totalBatchVolume += batchQty;
      totalDamagedVolume += dmgQty;

      const p = c.product_name || 'Unknown';
      if (!byProductMap[p]) {
        byProductMap[p] = { 
          product: p, 
          batch_quantity: 0, 
          damaged_quantity: 0, 
          defect_type: c.defect_type || 'Damage',
          complaint_id: c.id,
          location: c.customer_location || 'Central Warehouse',
          temperature: c.storage_temp || 'Cold Room',
          status: c.status
        };
      }
      byProductMap[p].batch_quantity += batchQty;
      byProductMap[p].damaged_quantity += dmgQty;
    });

    const lossRate = totalBatchVolume > 0 
      ? ((totalDamagedVolume / totalBatchVolume) * 100).toFixed(2)
      : '0.00';

    return {
      complaints: whComplaints,
      count: whComplaints.length,
      totalBatchVolume,
      totalDamagedVolume,
      lossRate,
      byProduct: Object.values(byProductMap)
    };
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

  // Aggregate overall volume and fulfillment metrics
  const totals = useMemo(() => {
    let ordered = 0;
    let defective = 0;
    let qaConfirmed = 0;
    let exchanged = 0;

    filteredComplaints.forEach((c) => {
      const ord = Number(c.order_quantity) || 0;
      const def = Number(c.defect_quantity) || 0;
      const qaDef =
        c.qa_review?.confirmed_defect_quantity !== undefined &&
        c.qa_review?.confirmed_defect_quantity !== null
          ? Number(c.qa_review.confirmed_defect_quantity)
          : def;
      const exch =
        Number(c.warehouse_fulfillment?.dispatched_quantity) ||
        Number(c.warehouse_fulfillment?.exchange_quantity) ||
        0;

      ordered += ord;
      defective += def;
      qaConfirmed += qaDef;
      exchanged += exch;
    });

    const defectRate = ordered > 0 ? ((defective / ordered) * 100).toFixed(2) : '0.00';
    return { ordered, defective, qaConfirmed, exchanged, defectRate };
  }, [filteredComplaints]);

  // Aggregate Customer-only shipment and defect metrics (excluding internal warehouse)
  const customerTotals = useMemo(() => {
    let shipped = 0;
    let defective = 0;
    let qaConfirmed = 0;
    let exchanged = 0;

    const commonComplaints = filteredComplaints.filter(
      (c) => (c.customer_name || '').trim().toLowerCase() !== 'sonavith warehouse'
    );

    commonComplaints.forEach((c) => {
      const ord = Number(c.order_quantity) || 0;
      const def = Number(c.defect_quantity) || 0;
      const qaDef =
        c.qa_review?.confirmed_defect_quantity !== undefined &&
        c.qa_review?.confirmed_defect_quantity !== null
          ? Number(c.qa_review.confirmed_defect_quantity)
          : def;
      const exch =
        Number(c.warehouse_fulfillment?.dispatched_quantity) ||
        Number(c.warehouse_fulfillment?.exchange_quantity) ||
        0;

      shipped += ord;
      defective += def;
      qaConfirmed += qaDef;
      exchanged += exch;
    });

    const defectRate = shipped > 0 ? ((defective / shipped) * 100).toFixed(2) : '0.00';
    return { shipped, defective, qaConfirmed, exchanged, defectRate, count: commonComplaints.length };
  }, [filteredComplaints]);

  // ---------------------------------------------------------------------------
  // Disposal & Write-Off Summary Heatmap Data
  // Grouped by Write-Off Code, clustered into Physical and Virtual Write-Off
  // Dynamic color scale: Blue (low qty) to Crimson Red (high qty)
  // ---------------------------------------------------------------------------
  const disposalHeatmapData = useMemo(() => {
    const groups = {};
    const allItemQuantities = [];
    let totalPhysicalQty = 0;
    let totalVirtualQty = 0;
    let totalOverallQty = 0;
    let totalComplaintsCount = 0;

    filteredComplaints.forEach((c) => {
      const sr = c.stock_return || {};
      const disp = c.disposal || {};

      const confirmedWo = parseFloat(sr.confirmed_write_off_quantity || 0);
      let physWo = parseFloat(sr.physical_write_off_quantity || 0);
      let virtWo = parseFloat(sr.virtual_returned_quantity || sr.virtual_write_off_quantity || 0);
      const dispQty = parseFloat(disp.disposed_quantity || 0);

      // If no write-off quantities recorded, skip
      if (confirmedWo <= 0 && physWo <= 0 && virtWo <= 0 && dispQty <= 0) {
        return;
      }

      // Default distribution if not explicitly separated
      if (physWo === 0 && virtWo === 0) {
        if (confirmedWo > 0) physWo = confirmedWo;
        else if (dispQty > 0) physWo = dispQty;
      }

      // Filter by disposal scope if selected
      const isClosed = disp.status === 'Closed' || c.status === 'Closed';
      if (disposalScope === 'closed' && !isClosed) return;
      if (disposalScope === 'pending' && isClosed) return;

      // Determine batch write-off code
      let batchCode = sr.write_off_batch;
      if (!batchCode || !batchCode.trim()) {
        const mfg = (c.manufacturing_code || '').trim();
        const batch = (c.production_batch || '').trim();
        if (mfg && batch) {
          batchCode = `${mfg}-${batch}`;
        } else if (mfg) {
          batchCode = mfg;
        } else if (disp.write_off_batch_codes) {
          batchCode = disp.write_off_batch_codes;
        } else {
          batchCode = 'WO-GENERAL';
        }
      }
      batchCode = batchCode.trim();

      const prodId = c.product_id || c.product_short_code || '1-PROD-UNASSIGNED';
      const prodName = c.product_name || 'Unspecified Product';
      const uom = c.uom || 'units';

      if (!groups[batchCode]) {
        groups[batchCode] = {
          code: batchCode,
          physical: {},
          virtual: {},
          totalQty: 0,
          totalPhysicalQty: 0,
          totalVirtualQty: 0,
          complaints: [],
          taxCountStatus: disp.tax_count_status || 'Under Tax Review',
          disposalMethod: disp.disposal_method || 'Physical Destruction / Dump',
          financeManager: disp.finance_manager_name || 'Bong Tolo',
          taxOfficer: disp.tax_officer_name || 'Kakada',
          status: disp.status || c.status || 'Active',
        };
      }

      if (!groups[batchCode].complaints.includes(c.id)) {
        groups[batchCode].complaints.push(c.id);
        totalComplaintsCount += 1;
      }

      // Add to physical cluster
      if (physWo > 0) {
        if (!groups[batchCode].physical[prodId]) {
          groups[batchCode].physical[prodId] = {
            productId: prodId,
            productName: prodName,
            qty: 0,
            uom,
            complaints: [],
            location: sr.bin_location || 'Warehouse Cold Room',
          };
        }
        groups[batchCode].physical[prodId].qty += physWo;
        if (!groups[batchCode].physical[prodId].complaints.includes(c.id)) {
          groups[batchCode].physical[prodId].complaints.push(c.id);
        }
        groups[batchCode].totalPhysicalQty += physWo;
        groups[batchCode].totalQty += physWo;
        totalPhysicalQty += physWo;
        totalOverallQty += physWo;
      }

      // Add to virtual cluster
      if (virtWo > 0) {
        if (!groups[batchCode].virtual[prodId]) {
          groups[batchCode].virtual[prodId] = {
            productId: prodId,
            productName: prodName,
            qty: 0,
            uom,
            complaints: [],
            location: sr.virtual_location || 'Customer On-Site',
          };
        }
        groups[batchCode].virtual[prodId].qty += virtWo;
        if (!groups[batchCode].virtual[prodId].complaints.includes(c.id)) {
          groups[batchCode].virtual[prodId].complaints.push(c.id);
        }
        groups[batchCode].totalVirtualQty += virtWo;
        groups[batchCode].totalQty += virtWo;
        totalVirtualQty += virtWo;
        totalOverallQty += virtWo;
      }
    });

    const groupList = Object.values(groups).sort((a, b) => b.totalQty - a.totalQty);
    groupList.forEach((g) => {
      Object.values(g.physical).forEach((p) => allItemQuantities.push(p.qty));
      Object.values(g.virtual).forEach((v) => allItemQuantities.push(v.qty));
    });

    const minQty = allItemQuantities.length > 0 ? Math.min(...allItemQuantities) : 0;
    const maxQty = allItemQuantities.length > 0 ? Math.max(...allItemQuantities) : 0;

    return {
      groups: groupList,
      totalBatches: groupList.length,
      totalPhysicalQty,
      totalVirtualQty,
      totalOverallQty,
      totalComplaintsCount,
      minQty,
      maxQty,
    };
  }, [filteredComplaints, disposalScope]);

  // ---------------------------------------------------------------------------
  // Remaining Stock Not on Write-Off Yet Data
  // Identifies stock across complaints that has NOT been written off / disposed yet.
  // Grouped by Batch (Manufacturing Code + Production Batch) with full product ID and quantity details.
  // ---------------------------------------------------------------------------
  const remainingStockData = useMemo(() => {
    const batchesMap = {};
    let totalRemainingQty = 0;
    let totalReworkQty = 0;
    let totalIncidentsCount = 0;
    let pendingQaQty = 0;
    let pendingApprovalQty = 0;
    let completedExchangedQty = 0;
    let approvedQty = 0;

    filteredComplaints.forEach((c) => {
      const sr = c.stock_return || {};
      const disp = c.disposal || {};

      const defQty = parseFloat(c.defect_quantity || 0);
      const confirmedWo = parseFloat(sr.confirmed_write_off_quantity || 0);
      const dispQty = parseFloat(disp.disposed_quantity || 0);
      const isClosedDisposal = disp.status === 'Closed' || c.status === 'Closed';

      let writtenOffQty = 0;
      if (isClosedDisposal) {
        writtenOffQty = dispQty > 0 ? dispQty : confirmedWo;
      } else if (confirmedWo > 0 && sr.qa_signed_off === 'Yes') {
        writtenOffQty = confirmedWo;
      }

      // Quantity remaining not written off yet
      const remainingQty = isClosedDisposal ? Math.max(0, defQty - writtenOffQty) : defQty;
      const reworkQty = parseFloat(sr.confirmed_rework_quantity || sr.physical_rework_quantity || 0);

      if (remainingQty <= 0 && reworkQty <= 0) {
        return; // Fully disposed/written off with no rework
      }

      // Filter by stage if selected
      const status = c.status || 'Pending QA';
      if (remainingStockStageFilter === 'pending_qa' && status !== 'Pending QA') return;
      if (remainingStockStageFilter === 'pending_approval' && status !== 'Pending approval') return;
      if (remainingStockStageFilter === 'completed' && status !== 'Completed' && status !== 'Approved') return;

      const mfg = (c.manufacturing_code || 'N/A').trim();
      const batch = (c.production_batch || 'General').trim();
      const batchKey = mfg !== 'N/A' && batch !== 'General' ? `${mfg} - ${batch}` : (mfg !== 'N/A' ? mfg : batch);

      const prodId = c.product_id || c.product_short_code || 'SKU-UNASSIGNED';
      const prodName = c.product_name || 'Unspecified Product';
      const uom = c.uom || 'units';

      // Quick search filter
      if (remainingStockSearch) {
        const q = remainingStockSearch.toLowerCase();
        const matchesBatch = batchKey.toLowerCase().includes(q);
        const matchesProd = prodName.toLowerCase().includes(q) || prodId.toLowerCase().includes(q);
        const matchesId = (c.id || '').toLowerCase().includes(q);
        if (!matchesBatch && !matchesProd && !matchesId) return;
      }

      if (!batchesMap[batchKey]) {
        batchesMap[batchKey] = {
          batchKey,
          mfgCode: mfg,
          productionBatch: batch,
          totalQty: 0,
          totalReworkQty: 0,
          complaintsCount: 0,
          productsMap: {},
        };
      }

      batchesMap[batchKey].totalQty += remainingQty;
      batchesMap[batchKey].totalReworkQty += reworkQty;
      batchesMap[batchKey].complaintsCount += 1;
      totalRemainingQty += remainingQty;
      totalReworkQty += reworkQty;
      totalIncidentsCount += 1;

      if (status === 'Pending QA') pendingQaQty += remainingQty;
      else if (status === 'Pending approval') pendingApprovalQty += remainingQty;
      else if (status === 'Completed') completedExchangedQty += remainingQty;
      else if (status === 'Approved') approvedQty += remainingQty;

      // Group by Product ID within the batch
      if (!batchesMap[batchKey].productsMap[prodId]) {
        batchesMap[batchKey].productsMap[prodId] = {
          productId: prodId,
          productName: prodName,
          uom,
          quantity: 0,
          reworkQty: 0,
          incidents: [],
          locations: new Set(),
          statuses: new Set(),
        };
      }
      batchesMap[batchKey].productsMap[prodId].quantity += remainingQty;
      batchesMap[batchKey].productsMap[prodId].reworkQty += reworkQty;
      batchesMap[batchKey].productsMap[prodId].incidents.push({
        id: c.id,
        quantity: remainingQty,
        status,
        customer: c.customer_name || 'Internal Warehouse',
        location: sr.bin_location || c.customer_location || 'Warehouse Quarantine',
        defectType: c.defect_type || 'Defective Stock',
      });
      if (sr.bin_location) batchesMap[batchKey].productsMap[prodId].locations.add(sr.bin_location);
      if (c.customer_location) batchesMap[batchKey].productsMap[prodId].locations.add(c.customer_location);
      batchesMap[batchKey].productsMap[prodId].statuses.add(status);
    });

    const batchList = Object.values(batchesMap).sort((a, b) => b.totalQty - a.totalQty);

    return {
      batches: batchList,
      totalBatches: batchList.length,
      totalRemainingQty,
      totalReworkQty,
      totalIncidentsCount,
      pendingQaQty,
      pendingApprovalQty,
      completedExchangedQty,
      approvedQty,
    };
  }, [filteredComplaints, remainingStockStageFilter, remainingStockSearch]);

  // ---------------------------------------------------------------------------
  // 1. Print Executive Insights Report (PDF / Printable View with ALL Charts)
  // ---------------------------------------------------------------------------
  const handlePrintInsightsReport = () => {
    const esc = (val) =>
      val === undefined || val === null || val === ''
        ? '—'
        : String(val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

    const printWin = window.open('', '_blank', 'width=1080,height=920');
    if (!printWin) {
      window.print();
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // -------------------------------------------------------------------------
    // Chart SVG Generators for High-Resolution Vector Print / PDF Output
    // -------------------------------------------------------------------------

    // 1. Status Breakdown Bars Chart (SVG Vector Chart)
    const generateStatusBarsSvg = () => {
      if (!statusBreakdown || statusBreakdown.length === 0) return '';
      const rowHeight = 24;
      const totalH = statusBreakdown.length * rowHeight + 8;
      const trackX = 145;
      const trackW = 390;
      const maxVal = maxStatus || 1;

      const rows = statusBreakdown.map((item, idx) => {
        const styleConfig = STATUS_STYLES[item.status] || { fill: '#64748b', dot: '#94a3b8' };
        const pct = ((item.count / (totalComplaints || 1)) * 100).toFixed(1);
        const ratio = item.count / maxVal;
        const barW = Math.max(ratio * trackW, item.count > 0 ? 8 : 0);
        const y = 6 + idx * rowHeight;

        return `
          <g>
            <circle cx="10" cy="${y + 6}" r="4" fill="${styleConfig.dot}" />
            <text x="22" y="${y + 10}" font-size="10.5" font-weight="600" fill="#334155">${esc(item.status)}</text>
            <rect x="${trackX}" y="${y}" width="${trackW}" height="12" rx="3" fill="#f1f5f9" />
            <rect x="${trackX}" y="${y}" width="${barW}" height="12" rx="3" fill="${styleConfig.fill}" />
            <text x="${trackX + trackW + 12}" y="${y + 10}" font-size="10.5" font-weight="700" fill="#0f172a">
              ${item.count} <tspan font-size="9" font-weight="500" fill="#64748b">(${pct}%)</tspan>
            </text>
          </g>
        `;
      }).join('');

      return `
        <svg width="100%" height="${totalH}" viewBox="0 0 620 ${totalH}" style="display:block;margin:4px 0;">
          ${rows}
        </svg>
      `;
    };

    // 2. Donut Chart Generator
    const generateDonutSvg = (slices, centerTotal, centerLabel) => {
      const r = 45;
      const circles = (slices || []).map((s) => `
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="${s.color}" stroke-width="16"
          stroke-dasharray="${s.strokeDasharray}" stroke-dashoffset="${s.strokeDashoffset}"
          style="transform: rotate(-90deg); transform-origin: 50% 50%;" />
      `).join('');
      return `
        <svg width="115" height="115" viewBox="0 0 120 120" style="display:block;flex-shrink:0;">
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="16" />
          ${circles}
          <text x="60" y="58" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">${centerTotal}</text>
          <text x="60" y="71" text-anchor="middle" font-size="8" font-weight="600" fill="#64748b">${centerLabel}</text>
        </svg>
      `;
    };

    // 3. Customer Defect Speedometer Gauge Generator
    const generateSpeedometerSvg = () => {
      const maxScale = Math.max(customerTotals.shipped, customerTotals.defective, 1);
      const ratio = Math.min(Math.max(customerTotals.defective / maxScale, 0), 1);
      const cx = 130;
      const cy = 100;
      const rArc = 70;
      const rTickText = 50;
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

      const tickCount = 6;
      const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
        const frac = i / tickCount;
        const deg = startDeg + frac * sweepDeg;
        const val = Math.round(frac * maxScale);
        const pos = polarToCartesian(cx, cy, rTickText, deg);
        const formattedVal = val >= 10000 ? `${(val / 1000).toFixed(1).replace(/\\.0$/, '')}k` : val.toLocaleString();
        return `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" fill="#64748b">${formattedVal}</text>`;
      }).join('');

      return `
        <svg width="220" height="165" viewBox="0 0 260 178" style="display:block;margin:0 auto;">
          <defs>
            <linearGradient id="printSpeedoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0284c7" />
              <stop offset="50%" stop-color="#06b6d4" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
            <linearGradient id="printNeedleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#94a3b8" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
          </defs>
          <path d="${describeArc(cx, cy, rArc, startDeg, endDeg)}" fill="none" stroke="#e2e8f0" stroke-width="12" />
          ${ratio > 0.002 ? `<path d="${describeArc(cx, cy, rArc, startDeg, Math.max(currentDeg, startDeg + 2))}" fill="none" stroke="url(#printSpeedoGrad)" stroke-width="12" />` : ''}
          ${ticks}
          <g transform="translate(${cx}, ${cy}) rotate(${currentDeg.toFixed(2)})">
            <polygon points="5,-3.5 54,-1.2 54,1.2 5,3.5" fill="url(#printNeedleGrad)" />
          </g>
          <circle cx="${cx}" cy="${cy}" r="4.5" fill="#0f172a" />
          <text x="${cx}" y="138" text-anchor="middle" font-size="20" font-weight="800" fill="#0f172a">${customerTotals.defective.toLocaleString()}</text>
          <text x="${cx}" y="152" text-anchor="middle" font-size="9" font-weight="700" fill="#0284c7">Defect Rate (${customerTotals.defectRate}%)</text>
          <text x="${cx}" y="165" text-anchor="middle" font-size="8" font-weight="600" fill="#64748b">${customerTotals.shipped.toLocaleString()} Shipped Units</text>
        </svg>
      `;
    };

    // 4. Customer Product Shipment vs Defective Bar Chart SVG
    const generateCustomerShipmentBarsSvg = () => {
      const topProds = quantityByProduct.slice(0, 8);
      if (topProds.length === 0) return '';
      const BAR_W = 18;
      const BAR_GAP = 3;
      const GROUP_GAP = 20;
      const CHART_H = 140;
      const PADDING_LEFT = 38;
      const PADDING_TOP = 20;
      const groupW = BAR_W * 2 + BAR_GAP;
      const totalW = PADDING_LEFT + topProds.length * (groupW + GROUP_GAP);
      const maxVal = Math.max(...topProds.map(p => Math.max(p.shipped_quantity, p.original_quantity)), 1);

      const yTicks = [0, 0.5, 1].map(f => Math.round(f * maxVal));
      const gridlines = yTicks.map(tick => {
        const y = PADDING_TOP + CHART_H - (tick / maxVal) * CHART_H;
        return `
          <line x1="${PADDING_LEFT}" y1="${y}" x2="${totalW}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
          <text x="${PADDING_LEFT - 4}" y="${y + 3}" text-anchor="end" font-size="8.5" fill="#64748b">${tick}</text>
        `;
      }).join('');

      const bars = topProds.map((item, idx) => {
        const groupX = PADDING_LEFT + idx * (groupW + GROUP_GAP);
        const shipH = Math.max((item.shipped_quantity / maxVal) * CHART_H, item.shipped_quantity > 0 ? 3 : 0);
        const defH = Math.max((item.original_quantity / maxVal) * CHART_H, item.original_quantity > 0 ? 3 : 0);
        const shipY = PADDING_TOP + CHART_H - shipH;
        const defY = PADDING_TOP + CHART_H - defH;
        const labelX = groupX + groupW / 2;
        const shortName = item.product.length > 20 ? item.product.slice(0, 20) + '...' : item.product;
        const rate = item.shipped_quantity > 0 ? ((item.original_quantity / item.shipped_quantity) * 100).toFixed(0) : '0';

        return `
          <g>
            <text x="${labelX}" y="${Math.min(shipY, defY) - 5}" text-anchor="middle" font-size="8" font-weight="800" fill="#dc2626">${rate}%</text>
            <rect x="${groupX}" y="${shipY}" width="${BAR_W}" height="${shipH}" rx="2" fill="#0284c7" />
            <text x="${groupX + BAR_W / 2}" y="${shipY - 2}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#0369a1">${item.shipped_quantity}</text>
            <rect x="${groupX + BAR_W + BAR_GAP}" y="${defY}" width="${BAR_W}" height="${defH}" rx="2" fill="#ef4444" />
            <text x="${groupX + BAR_W + BAR_GAP + BAR_W / 2}" y="${defY - 2}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#b91c1c">${item.original_quantity}</text>
            <text transform="translate(${labelX}, ${PADDING_TOP + CHART_H + 8}) rotate(35)" text-anchor="start" font-size="8.5" fill="#334155">${esc(shortName)}</text>
          </g>
        `;
      }).join('');

      return `
        <svg width="100%" height="225" viewBox="0 0 ${Math.max(totalW + 60, 480)} 225" style="display:block;">
          ${gridlines}
          ${bars}
          <line x1="${PADDING_LEFT}" y1="${PADDING_TOP + CHART_H}" x2="${totalW}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="${PADDING_LEFT}" y1="${PADDING_TOP}" x2="${PADDING_LEFT}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1.5" />
        </svg>
      `;
    };

    // 4B. Internal Warehouse Loss Chart SVG
    const generateWarehouseLossSvg = () => {
      const items = warehouseIncidents.byProduct;
      if (!items || items.length === 0) return '';
      const rowHeight = 38;
      const totalH = items.length * rowHeight + 28;
      const trackX = 185;
      const trackW = 360;

      const rows = items.map((item, idx) => {
        const total = item.batch_quantity || 1;
        const dmgW = Math.max((item.damaged_quantity / total) * trackW, 10);
        const soundW = trackW - dmgW;
        const lossPct = ((item.damaged_quantity / total) * 100).toFixed(1);
        const y = 14 + idx * rowHeight;
        const shortName = item.product.length > 25 ? item.product.slice(0, 25) + '...' : item.product;

        return `
          <g>
            <text x="10" y="${y + 13}" font-size="10.5" font-weight="700" fill="#0f172a">${esc(shortName)}</text>
            <text x="10" y="${y + 25}" font-size="8.5" font-weight="600" fill="#64748b">Defect: ${esc(item.defect_type)}</text>
            
            <rect x="${trackX}" y="${y}" width="${dmgW}" height="18" rx="3" fill="#dc2626" />
            <rect x="${trackX + dmgW}" y="${y}" width="${soundW}" height="18" rx="3" fill="#0d9488" />

            <text x="${trackX + dmgW / 2}" y="${y + 12}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#ffffff">
              ${item.damaged_quantity.toLocaleString()} Damaged (${lossPct}%)
            </text>
            ${soundW > 60 ? `
              <text x="${trackX + dmgW + soundW / 2}" y="${y + 12}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#ffffff">
                ${(item.batch_quantity - item.damaged_quantity).toLocaleString()} Sound Stock
              </text>
            ` : ''}
            <text x="${trackX + trackW + 10}" y="${y + 13}" font-size="10" font-weight="700" fill="#0f172a">
              ${item.batch_quantity.toLocaleString()} <tspan font-size="8" fill="#64748b">Lot QTY</tspan>
            </text>
          </g>
        `;
      }).join('');

      return `
        <svg width="100%" height="${totalH}" viewBox="0 0 650 ${totalH}" style="display:block;margin:4px 0;">
          <g transform="translate(185, 8)">
            <text x="0" y="0" font-size="8.5" font-weight="700" fill="#dc2626">■ Quarantined Damaged Stock</text>
            <text x="160" y="0" font-size="8.5" font-weight="700" fill="#0d9488">■ Sound / Saleable Batch Stock</text>
          </g>
          ${rows}
        </svg>
      `;
    };

    // 5. Customer Pareto Chart SVG
    const generateParetoSvg = () => {
      const topCust = customerComplaints.slice(0, 10);
      if (topCust.length === 0) return '';
      const BAR_W = 28;
      const BAR_GAP = 12;
      const CHART_H = 135;
      const PADDING_LEFT = 36;
      const PADDING_RIGHT = 38;
      const PADDING_TOP = 16;
      const totalCust = topCust.reduce((s, c) => s + c.count, 0) || 1;
      const maxCount = topCust[0]?.count || 1;
      const plotRightX = PADDING_LEFT + topCust.length * (BAR_W + BAR_GAP) - BAR_GAP;
      const totalW = plotRightX + PADDING_RIGHT;

      let cum = 0;
      const cumPoints = topCust.map((c, i) => {
        cum += c.count;
        const cumPct = (cum / totalCust) * 100;
        const x = PADDING_LEFT + i * (BAR_W + BAR_GAP) + BAR_W / 2;
        const y = PADDING_TOP + CHART_H - (cumPct / 100) * CHART_H;
        return { x, y, cumPct };
      });

      const y80 = PADDING_TOP + CHART_H - 0.8 * CHART_H;
      const bars = topCust.map((item, idx) => {
        const barH = Math.max((item.count / maxCount) * CHART_H, 3);
        const x = PADDING_LEFT + idx * (BAR_W + BAR_GAP);
        const y = PADDING_TOP + CHART_H - barH;
        const shortName = item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name;
        return `
          <rect x="${x}" y="${y}" width="${BAR_W}" height="${barH}" rx="2" fill="#0284c7" />
          <text x="${x + BAR_W / 2}" y="${y - 3}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0369a1">${item.count}</text>
          <text transform="translate(${x + BAR_W / 2}, ${PADDING_TOP + CHART_H + 8}) rotate(35)" text-anchor="start" font-size="9" fill="#334155">${esc(shortName)}</text>
        `;
      }).join('');

      const polyPoints = cumPoints.map(p => `${p.x},${p.y}`).join(' ');
      const dots = cumPoints.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="3" fill="#d97706" stroke="#fff" stroke-width="1" />
        <text x="${p.x}" y="${p.y - 5}" text-anchor="middle" font-size="7.5" font-weight="700" fill="#92400e">${p.cumPct.toFixed(0)}%</text>
      `).join('');

      return `
        <svg width="100%" height="225" viewBox="0 0 ${Math.max(totalW + 50, 480)} 225" style="display:block;">
          <line x1="${PADDING_LEFT}" y1="${PADDING_TOP + CHART_H}" x2="${plotRightX}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="${PADDING_LEFT}" y1="${PADDING_TOP}" x2="${PADDING_LEFT}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="${plotRightX}" y1="${PADDING_TOP}" x2="${plotRightX}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3 2" />
          <line x1="${PADDING_LEFT}" y1="${y80}" x2="${plotRightX}" y2="${y80}" stroke="#d97706" stroke-width="1" stroke-dasharray="3 3" />
          <text x="${plotRightX + 4}" y="${y80 + 3}" font-size="8" fill="#d97706" font-weight="700">80%</text>
          ${bars}
          <polyline points="${polyPoints}" fill="none" stroke="#d97706" stroke-width="2" />
          ${dots}
        </svg>
      `;
    };

    // 6. Control Chart (c-Chart) SVG
    const generateControlChartSvg = () => {
      const dataPoints = controlChartData.data.slice(0, 16);
      if (dataPoints.length === 0) return '';
      const CHART_H = 120;
      const PADDING_LEFT = 36;
      const PADDING_RIGHT = 36;
      const PADDING_TOP = 16;
      const totalW = 460;
      const maxY = Math.max(controlChartData.ucl, ...dataPoints.map(d => d.count), 1) * 1.15;

      const yUcl = PADDING_TOP + CHART_H - (controlChartData.ucl / maxY) * CHART_H;
      const yMean = PADDING_TOP + CHART_H - (controlChartData.mean / maxY) * CHART_H;
      const yLcl = PADDING_TOP + CHART_H - (controlChartData.lcl / maxY) * CHART_H;

      const pts = dataPoints.map((p, i) => {
        const x = PADDING_LEFT + ((i + 0.5) / dataPoints.length) * (totalW - PADDING_LEFT - PADDING_RIGHT);
        const y = PADDING_TOP + CHART_H - (p.count / maxY) * CHART_H;
        return { x, y, count: p.count, period: p.period, outOfControl: p.outOfControl };
      });

      const polyPoints = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const circles = pts.map(p => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${p.outOfControl ? '#ef4444' : '#0f172a'}" />
        <text x="${p.x.toFixed(1)}" y="${(p.y - 4).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${p.outOfControl ? '#dc2626' : '#334155'}">${p.count}</text>
      `).join('');

      return `
        <svg width="100%" height="165" viewBox="0 0 ${totalW} 165" style="display:block;">
          <line x1="${PADDING_LEFT}" y1="${PADDING_TOP + CHART_H}" x2="${totalW - PADDING_RIGHT}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="${PADDING_LEFT}" y1="${PADDING_TOP}" x2="${PADDING_LEFT}" y2="${PADDING_TOP + CHART_H}" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="${PADDING_LEFT}" y1="${yUcl.toFixed(1)}" x2="${totalW - PADDING_RIGHT}" y2="${yUcl.toFixed(1)}" stroke="#ef4444" stroke-width="1" stroke-dasharray="3 3" />
          <text x="${totalW - PADDING_RIGHT + 4}" y="${(yUcl + 3).toFixed(1)}" font-size="8" fill="#ef4444" font-weight="700">UCL (${controlChartData.ucl.toFixed(1)})</text>
          <line x1="${PADDING_LEFT}" y1="${yMean.toFixed(1)}" x2="${totalW - PADDING_RIGHT}" y2="${yMean.toFixed(1)}" stroke="#3b82f6" stroke-width="1" stroke-dasharray="3 3" />
          <text x="${totalW - PADDING_RIGHT + 4}" y="${(yMean + 3).toFixed(1)}" font-size="8" fill="#3b82f6" font-weight="700">Mean (${controlChartData.mean.toFixed(1)})</text>
          <polyline points="${polyPoints}" fill="none" stroke="#64748b" stroke-width="1.8" />
          ${circles}
        </svg>
      `;
    };

    // 7. Disposal Summary Heatmap HTML Generator for Executive Print / PDF Report
    const generateDisposalHeatmapPrintHtml = () => {
      if (!disposalHeatmapData.groups || disposalHeatmapData.groups.length === 0) {
        return '<div style="padding:16px;text-align:center;color:#64748b;font-size:10px;">No disposal records recorded in current period.</div>';
      }

      return disposalHeatmapData.groups.map((group) => {
        const physList = Object.values(group.physical);
        const virtList = Object.values(group.virtual);

        const physCards = physList.map((item) => {
          const color = getDisposalHeatmapColor(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
          const bg = getDisposalHeatmapBg(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
          return `
            <div style="border:1.5px solid ${color};background:${bg};border-radius:6px;padding:7px 9px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                  <span style="font-family:monospace;font-size:8.5px;font-weight:700;background:#ffffff;border:1px solid #cbd5e1;padding:1px 5px;border-radius:3px;color:#0f172a;">${esc(item.productId)}</span>
                  <span style="font-size:8px;color:#64748b;font-weight:600;">📍 ${esc(item.location)}</span>
                </div>
                <div style="font-size:9.5px;font-weight:700;color:#0f172a;">${esc(item.productName)}</div>
                <div style="font-size:8px;color:#64748b;margin-top:2px;">Claims: ${item.complaints.map(id => esc(id)).join(', ')}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:12px;">
                <span style="display:inline-block;padding:3px 8px;border-radius:5px;background:${color};color:#ffffff;font-size:11px;font-weight:800;">
                  ${item.qty} ${esc(item.uom)}
                </span>
              </div>
            </div>
          `;
        }).join('');

        const virtCards = virtList.map((item) => {
          const color = getDisposalHeatmapColor(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
          const bg = getDisposalHeatmapBg(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
          return `
            <div style="border:1.5px solid ${color};background:${bg};border-radius:6px;padding:7px 9px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                  <span style="font-family:monospace;font-size:8.5px;font-weight:700;background:#ffffff;border:1px solid #cbd5e1;padding:1px 5px;border-radius:3px;color:#0f172a;">${esc(item.productId)}</span>
                  <span style="font-size:8px;color:#64748b;font-weight:600;">🌐 ${esc(item.location)}</span>
                </div>
                <div style="font-size:9.5px;font-weight:700;color:#0f172a;">${esc(item.productName)}</div>
                <div style="font-size:8px;color:#64748b;margin-top:2px;">Claims: ${item.complaints.map(id => esc(id)).join(', ')}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:12px;">
                <span style="display:inline-block;padding:3px 8px;border-radius:5px;background:${color};color:#ffffff;font-size:11px;font-weight:800;">
                  ${item.qty} ${esc(item.uom)}
                </span>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div style="border:1px solid #cbd5e1;border-radius:8px;padding:9px;margin-bottom:10px;background:#ffffff;">
            <!-- Group Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-family:monospace;font-size:10px;font-weight:800;background:#0f172a;color:#ffffff;padding:2px 7px;border-radius:4px;">
                  Write-Off Code: ${esc(group.code)}
                </span>
                <span style="font-size:8.5px;color:#64748b;">Tax Status: <strong>${esc(group.taxCountStatus)}</strong></span>
              </div>
              <div>
                <span style="font-size:10px;font-weight:800;color:#0f172a;">
                  Batch Write-Off Total: <strong style="color:#b91c1c;">${group.totalQty} units</strong>
                </span>
              </div>
            </div>

            <!-- Two Clusters Grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <!-- Physical Cluster -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed #cbd5e1;">
                  <span style="font-size:9px;font-weight:700;color:#0f766e;">🏢 Physical Write-Off (Warehouse Destruction)</span>
                  <span style="font-size:8.5px;font-weight:700;color:#0f766e;">${group.totalPhysicalQty} units</span>
                </div>
                ${physCards.length > 0 ? physCards : '<div style="font-size:8px;color:#94a3b8;font-style:italic;">No physical write-off items</div>'}
              </div>

              <!-- Virtual Cluster -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed #cbd5e1;">
                  <span style="font-size:9px;font-weight:700;color:#2563eb;">🌐 Virtual Write-Off (Customer On-Site)</span>
                  <span style="font-size:8.5px;font-weight:700;color:#2563eb;">${group.totalVirtualQty} units</span>
                </div>
                ${virtCards.length > 0 ? virtCards : '<div style="font-size:8px;color:#94a3b8;font-style:italic;">No virtual write-off items</div>'}
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    // 8. Remaining Stock Not on Write-Off Print HTML Generator
    const generateRemainingStockPrintHtml = () => {
      if (!remainingStockData.batches || remainingStockData.batches.length === 0) {
        return '<div style="padding:16px;text-align:center;color:#64748b;font-size:10px;">Zero unwritten defect stock remaining in active inventory.</div>';
      }

      return remainingStockData.batches.map((batch) => {
        const prodItems = Object.values(batch.productsMap);
        const rows = prodItems.map((prod) => {
          const reworkTxt = prod.reworkQty > 0 ? ` <span style="color:#059669;font-size:8px;">(+${prod.reworkQty} rework)</span>` : '';
          const statusList = Array.from(prod.statuses).join(', ');
          const locList = Array.from(prod.locations).slice(0, 2).join(' / ');
          const claimIds = prod.incidents.map(i => i.id).join(', ');

          return `
            <tr>
              <td style="font-family:monospace;font-weight:700;color:#0f172a;font-size:9.5px;">${esc(prod.productId)}</td>
              <td>
                <div style="font-weight:700;color:#0f172a;font-size:10px;">${esc(prod.productName)}</div>
                <div style="font-size:8px;color:#64748b;margin-top:1px;">Claims: ${esc(claimIds)}</div>
              </td>
              <td>
                <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:8.5px;font-weight:700;background:#fef3c7;color:#92400e;">
                  ${esc(statusList)}
                </span>
              </td>
              <td style="font-size:8.5px;color:#475569;">${esc(locList || 'Warehouse Quarantine')}</td>
              <td style="text-align:right;font-weight:800;color:#b91c1c;font-size:10px;">
                ${prod.quantity.toLocaleString()} ${esc(prod.uom)}${reworkTxt}
              </td>
            </tr>
          `;
        }).join('');

        return `
          <div style="border:1px solid #cbd5e1;border-radius:8px;margin-bottom:12px;background:#ffffff;overflow:hidden;">
            <div style="background:#f8fafc;border-bottom:1px solid #cbd5e1;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-family:monospace;font-size:10.5px;font-weight:800;background:#0f172a;color:#ffffff;padding:2px 8px;border-radius:4px;">
                  Batch: ${esc(batch.batchKey)}
                </span>
                <span style="font-size:9px;color:#64748b;">${batch.complaintsCount} incident(s)</span>
              </div>
              <div>
                <span style="font-size:10.5px;font-weight:800;color:#0f172a;">
                  Batch Unwritten: <strong style="color:#d97706;">${batch.totalQty.toLocaleString()} units</strong>
                  ${batch.totalReworkQty > 0 ? `<span style="font-size:9px;color:#059669;margin-left:4px;">(+${batch.totalReworkQty} rework)</span>` : ''}
                </span>
              </div>
            </div>
            <table class="data-table" style="margin:0;border:none;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="width:130px;">Product ID</th>
                  <th>Product Description</th>
                  <th style="width:120px;">Holding Stage</th>
                  <th>Quarantine Location</th>
                  <th style="text-align:right;width:110px;">Remaining QTY</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      }).join('');
    };

    // Table rows data
    const topDefectRows = defectTypes.slice(0, 8).map((d) => {
      const qaMatch = qaDefectTypes.items.find((q) => q.name === d.name);
      return `
        <tr>
          <td><strong>${esc(d.name)}</strong></td>
          <td style="text-align:right;">${d.count}</td>
          <td style="text-align:right;color:#0284c7;font-weight:600;">${d.percentage}%</td>
          <td style="text-align:right;">${qaMatch ? qaMatch.count : 0}</td>
          <td style="text-align:right;color:#0f766e;font-weight:600;">${qaMatch ? qaMatch.percentage : '0.0'}%</td>
        </tr>
      `;
    }).join('');

    const topProductRows = quantityByProduct.slice(0, 8).map((p, idx) => {
      const diff = p.original_quantity - p.adjusted_quantity;
      const rate = p.shipped_quantity > 0 ? ((p.original_quantity / p.shipped_quantity) * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td style="text-align:center;font-weight:700;color:#64748b;">#${idx + 1}</td>
          <td><strong>${esc(p.product)}</strong></td>
          <td style="text-align:right;color:#0284c7;font-weight:700;">${p.shipped_quantity > 0 ? p.shipped_quantity.toLocaleString() : '—'}</td>
          <td style="text-align:right;color:#dc2626;font-weight:700;">${p.original_quantity.toLocaleString()}</td>
          <td style="text-align:right;color:#d97706;font-weight:700;">${rate}%</td>
          <td style="text-align:right;color:#15803d;font-weight:700;">${p.adjusted_quantity.toLocaleString()}</td>
          <td style="text-align:right;color:${diff > 0 ? '#b91c1c' : '#475569'};font-weight:600;">${diff > 0 ? `-${diff.toLocaleString()}` : diff === 0 ? 'Balanced' : `+${Math.abs(diff)}`}</td>
        </tr>
      `;
    }).join('');

    const warehouseIncidentRows = warehouseIncidents.complaints.map((c) => {
      const batchQty = parseInt(c.order_quantity, 10) || 0;
      const dmgQty = parseInt(c.defect_quantity, 10) || 0;
      const lossRate = batchQty > 0 ? ((dmgQty / batchQty) * 100).toFixed(1) : '0.0';
      const loc = c.customer_location || 'Central Cold Room';
      const temp = c.storage_temp ? ` (${c.storage_temp})` : '';
      return `
        <tr>
          <td style="font-family:monospace;font-weight:700;color:#0f766e;">${esc(c.id)}</td>
          <td><strong>${esc(c.product_name)}</strong></td>
          <td><span style="display:inline-block;padding:2px 6px;background:#fef2f2;color:#991b1b;border-radius:4px;font-weight:600;font-size:9.5px;">${esc(c.defect_type)}</span></td>
          <td>${esc(loc)}${esc(temp)}</td>
          <td style="text-align:right;color:#334155;font-weight:700;">${batchQty.toLocaleString()}</td>
          <td style="text-align:right;color:#dc2626;font-weight:700;">${dmgQty.toLocaleString()}</td>
          <td style="text-align:right;color:#b91c1c;font-weight:800;">${lossRate}%</td>
          <td><span style="display:inline-block;padding:2px 6px;background:#fef3c7;color:#92400e;border-radius:4px;font-weight:600;font-size:9.5px;">${esc(c.status)} • Quarantined</span></td>
        </tr>
      `;
    }).join('');

    const totalCustCount = customerComplaints.reduce((s, c) => s + c.count, 0) || 1;
    let cumRun = 0;
    const topCustomerRows = customerComplaints.slice(0, 8).map((c, idx) => {
      cumRun += c.count;
      const cumPct = ((cumRun / totalCustCount) * 100).toFixed(1);
      const isUnder80 = parseFloat(cumPct) <= 80.0 || (idx === 0);
      return `
        <tr>
          <td style="text-align:center;font-weight:700;color:#64748b;">#${idx + 1}</td>
          <td><strong>${esc(c.name)}</strong></td>
          <td style="text-align:right;font-weight:700;">${c.count}</td>
          <td style="text-align:right;color:#0369a1;">${c.percentage}%</td>
          <td style="text-align:right;font-weight:800;color:${isUnder80 ? '#b45309' : '#15803d'};">${cumPct}%</td>
        </tr>
      `;
    }).join('');

    const mfgRows = mfgSummary.map((m) => {
      const totalMfg = mfgSummary.reduce((s, i) => s + i.count, 0) || 1;
      const pct = ((m.count / totalMfg) * 100).toFixed(1);
      return `
        <tr>
          <td style="font-family:monospace;font-weight:700;color:#0f766e;">${esc(m.code)}</td>
          <td style="text-align:right;font-weight:700;">${m.count}</td>
          <td style="text-align:right;font-weight:600;">${pct}%</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SONAVITH Quality Insights & Analytics Report - ${esc(todayStr)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 12mm 14mm 12mm; }
    * { 
      box-sizing: border-box; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      color-adjust: exact !important; 
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.45;
      background: #ffffff;
    }
    .no-print {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 14px;
    }
    .btn-print {
      background: #0f766e;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-close {
      background: #e2e8f0;
      color: #334155;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .header-banner {
      border-bottom: 2.5px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 16.5px;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 0.03em;
      margin: 0 0 2px 0;
    }
    .report-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .report-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 12px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .kpi-val {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .section-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f766e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin: 0 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .explanation-box {
      background: #f0fdfa;
      border-left: 3.5px solid #0f766e;
      border-radius: 4px;
      padding: 7px 11px;
      margin: 8px 0 6px 0;
      font-size: 10.5px;
      color: #134e4a;
      line-height: 1.45;
    }
    .chart-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      margin: 8px 0;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin: 6px 0;
    }
    table.data-table th, table.data-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    table.data-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 18px;
      page-break-inside: avoid;
    }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
      background: #fafafa;
    }
    .sig-role {
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 28px;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      padding-top: 4px;
      font-size: 9.5px;
      font-weight: 600;
      color: #0f172a;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">Print Report / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="header-banner">
    <div>
      <div class="brand-title">SONAVITH DEFECTIVE PRODUCT REPORT</div>
      <div class="report-title">Executive Quality Insights, Defect Analytics & CAPA Action Report</div>
      <div class="report-sub">
        Date Generated: <strong>${esc(todayStr)}</strong> • Scope: <strong>${esc(timeFilter)} (${esc(dateMode.replace('_', ' '))})</strong> • Claims Evaluated: <strong>${totalComplaints}</strong>
      </div>
    </div>
    <div style="text-align:right;">
      <span style="display:inline-block;padding:3px 10px;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;border-radius:999px;font-weight:800;font-size:9.5px;">
        CONFIDENTIAL • QA EXECUTIVE REPORT
      </span>
      <div class="report-sub" style="margin-top:4px;">Unified 6-Stage Quality Assurance</div>
    </div>
  </div>

  <!-- Executive KPI Grid -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Customer Complaints</div>
      <div class="kpi-val" style="color:#0284c7;">${customerTotals.count}</div>
      <div style="font-size:9px;color:#64748b;">+ ${warehouseIncidents.count} Internal Warehouse</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Customer Shipped Volume</div>
      <div class="kpi-val" style="color:#0f766e;">${customerTotals.shipped.toLocaleString()} <span style="font-size:9.5px;color:#64748b;">units</span></div>
      <div style="font-size:9px;color:#0f766e;font-weight:600;">External Deliveries</div>
    </div>
    <div class="kpi-card" style="background:#fef2f2;border-color:#fecaca;">
      <div class="kpi-label" style="color:#991b1b;">Customer Defect Rate</div>
      <div class="kpi-val" style="color:#b91c1c;">${customerTotals.defectRate}%</div>
      <div style="font-size:9px;color:#991b1b;font-weight:600;">${customerTotals.defective.toLocaleString()} Claimed / ${customerTotals.exchanged.toLocaleString()} Exchanged</div>
    </div>
    <div class="kpi-card" style="background:#fffaf0;border-color:#fed7aa;">
      <div class="kpi-label" style="color:#9a3412;">Internal Warehouse Loss</div>
      <div class="kpi-val" style="color:#ea580c;">${warehouseIncidents.totalDamagedVolume.toLocaleString()} <span style="font-size:9.5px;color:#9a3412;">units</span></div>
      <div style="font-size:9px;color:#c2410c;font-weight:600;">100% Quarantined in WH</div>
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="section-card" style="background:#f8fafc;">
    <div class="section-title">
      <span>Executive Summary & Overall Quality Health</span>
      <span style="font-size:9.5px;color:#64748b;font-weight:600;">High-Level Assessment</span>
    </div>
    <div style="font-size:10.5px;color:#334155;line-height:1.5;">
      During the analyzed evaluation window, a total of <strong>${totalComplaints} quality incidents</strong> were audited:
      <strong>${customerTotals.count} customer quality complaints</strong> across <strong>${customerTotals.shipped.toLocaleString()} shipped units</strong> (yielding an actual customer defect rate of <strong>${customerTotals.defectRate}%</strong>), and <strong>${warehouseIncidents.count} internal facility incidents</strong> representing <strong>${warehouseIncidents.totalDamagedVolume.toLocaleString()} damaged units</strong> out of <strong>${warehouseIncidents.totalBatchVolume.toLocaleString()} audited warehouse lot units</strong>.
      All internal warehouse damages were fully quarantined with <strong>zero customer distribution impact</strong>. Warehouse fulfillment has completed <strong>${customerTotals.exchanged.toLocaleString()} physical replacements</strong> for customer accounts, while internal quarantined stock proceeds through Stage 5 Stock Return and Stage 6 Finance tax disposal.
    </div>
  </div>

  <!-- Section 1: Workflow Stages & Resolution Pipeline (With Status Bar Chart) -->
  <div class="section-card">
    <div class="section-title">
      <span>1. Workflow Pipeline & Operational Backlog</span>
      <span style="font-size:9.5px;color:#64748b;font-weight:600;">6-Stage Governance</span>
    </div>
    
    <!-- Visual Status Bars Chart -->
    <div class="chart-box">
      <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:8px;">Status Breakdown (Workflow Stages Visual Chart)</div>
      ${generateStatusBarsSvg()}
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Workflow Stage</th>
          <th style="text-align:right;">Incident Count</th>
          <th style="text-align:right;">Share (%)</th>
          <th>Responsible Department</th>
          <th>Status Interpretation</th>
        </tr>
      </thead>
      <tbody>
        ${statusBreakdown.map((s) => {
          const pct = ((s.count / (totalComplaints || 1)) * 100).toFixed(1);
          return `
            <tr>
              <td><strong>${esc(s.status)}</strong></td>
              <td style="text-align:right;font-weight:700;">${s.count}</td>
              <td style="text-align:right;color:#0369a1;font-weight:600;">${pct}%</td>
              <td>${s.status.includes('QA') ? 'Quality Assurance (QA Team)' : s.status.includes('approval') ? 'Executive Office (CEO)' : s.status === 'Approved' ? 'Warehouse Dispatch' : s.status === 'Completed' ? 'Stock Return Control' : s.status === 'Closed' ? 'Finance & Tax Write-Off' : 'Operations'}</td>
              <td>${s.status === 'Closed' ? 'Disposed & tax verified' : s.status === 'Completed' ? 'Warehouse exchanged, return under review' : s.status === 'Pending approval' ? 'QA inspected, awaiting CEO decision' : s.status === 'Pending QA' ? 'Awaiting laboratory inspection' : 'Archived'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <div class="explanation-box">
      <strong>Management Explanation:</strong> The workflow distribution reveals operational velocity across departments. Claims in <em>Pending QA</em> represent incoming sales batches awaiting temperature and acidity verification. The <em>Pending Approval</em> queue represents executive compensation reviews. Maintaining low turnaround time from Stage 1 to Stage 4 is essential for brown coffee and supermarket account satisfaction.
    </div>
  </div>

  <!-- Section 2: Defect Root Causes (With Dual Donut Charts) -->
  <div class="section-card">
    <div class="section-title">
      <span>2. Defect Classification & Root Cause Analysis</span>
      <span style="font-size:9.5px;color:#64748b;font-weight:600;">Sales Intake vs. QA Verification</span>
    </div>

    <!-- Dual Donut Charts: Intake vs QA Confirmed -->
    <div class="chart-box" style="display:flex;justify-content:space-around;align-items:center;flex-wrap:wrap;gap:12px;">
      <div style="text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:6px;">Top Defect Types (Initial Intake)</div>
        ${generateDonutSvg(defectDonutSlices, totalComplaints, 'total')}
      </div>
      <div style="text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#0f766e;margin-bottom:6px;">Confirmed Defect Types (QA Team)</div>
        ${generateDonutSvg(qaDefectDonutSlices, qaDefectTypes.totalConfirmed, 'confirmed')}
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Defect Classification</th>
          <th style="text-align:right;">Claimed Count</th>
          <th style="text-align:right;">Claimed Share</th>
          <th style="text-align:right;">QA Confirmed</th>
          <th style="text-align:right;">QA Share</th>
        </tr>
      </thead>
      <tbody>
        ${topDefectRows}
      </tbody>
    </table>
    <div class="explanation-box">
      <strong>Management Explanation:</strong> 
      Defects are segregated into two distinct risk categories:
      <br/>• <strong>Mechanical & Physical Failures (Physical Damage, Packaging Leaks):</strong> Predominantly caused by crate stacking pressure, rough transit on provincial roads, or warehouse handling shock.
      <br/>• <strong>Cold-Chain & Biological Degradation (Off smell/taste, Non-foaming milk, Curdling):</strong> Lab testing confirms that out-of-spec acidity and foaming failures occur when milk is exposed to ambient temperatures (&gt;4°C) during distributor delivery or retailer display chilling.
    </div>
  </div>

  <!-- Section 3: Customer Complaints: QTY Shipped vs. Defective QTY (External Accounts) -->
  <div class="section-card">
    <div class="section-title">
      <span>3. Customer Quality Complaints & Shipment Defect Rate</span>
      <span style="font-size:9.5px;color:#0284c7;font-weight:700;">External Customer Accounts (${customerTotals.count} Claims)</span>
    </div>

    <!-- Speedometer Gauge & Product Bar Chart Side by Side -->
    <div class="chart-box" style="display:grid;grid-template-columns:250px 1fr;gap:14px;align-items:center;">
      <div style="border-right:1px solid #e2e8f0;padding-right:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:4px;">Customer Defect Rate (${customerTotals.defectRate}%)</div>
        ${generateSpeedometerSvg()}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:10px;font-weight:700;color:#334155;">Customer Product Quality: QTY Shipped vs. Defective QTY</div>
          <div style="display:flex;gap:10px;font-size:9px;">
            <span><span style="display:inline-block;width:9px;height:9px;background:#0284c7;border-radius:2px;margin-right:3px;"></span>QTY Shipped</span>
            <span><span style="display:inline-block;width:9px;height:9px;background:#ef4444;border-radius:2px;margin-right:3px;"></span>Customer Defective QTY</span>
          </div>
        </div>
        ${generateCustomerShipmentBarsSvg()}
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align:center;width:28px;">#</th>
          <th>Product Description</th>
          <th style="text-align:right;">QTY Shipped</th>
          <th style="text-align:right;">Customer Defective QTY</th>
          <th style="text-align:right;">Defect Rate (%)</th>
          <th style="text-align:right;">Warehouse Exchanged</th>
          <th style="text-align:right;">Unfulfilled Variance</th>
        </tr>
      </thead>
      <tbody>
        ${topProductRows}
      </tbody>
    </table>
    <div class="explanation-box">
      <strong>Customer Quality Analysis:</strong> Across <strong>${customerTotals.shipped.toLocaleString()} units shipped</strong> to external cafe chains and retailers, customer quality complaints totaled <strong>${customerTotals.defective.toLocaleString()} defective units</strong>, yielding a genuine customer delivery defect rate of <strong>${customerTotals.defectRate}%</strong>. Warehouse operations have fulfilled <strong>${customerTotals.exchanged.toLocaleString()} replacement units</strong>. Top customer defect volume was concentrated in <em>2000cc Farm Fresh Cows Milk</em> (21.2% defect rate, driven by transit chilling variance on Brown BKK batches).
    </div>
  </div>

  <!-- Section 4: Internal Warehouse Storage & Operational Defect Report (Zero Customer Exposure) -->
  <div class="section-card">
    <div class="section-title">
      <span>4. Internal Warehouse Incidents & Storage Loss Analytics</span>
      <span style="font-size:9.5px;color:#dc2626;font-weight:700;">Internal Facility Operations (${warehouseIncidents.count} Incidents • Zero Customer Exposure)</span>
    </div>

    <!-- Warehouse KPI Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:10px;">
      <div style="border:1px solid #fed7aa;border-radius:6px;padding:8px 10px;background:#fffaf0;text-align:center;">
        <div style="font-size:8.5px;color:#9a3412;font-weight:700;text-transform:uppercase;">Warehouse Incidents</div>
        <div style="font-size:16px;font-weight:900;color:#c2410c;margin-top:2px;">${warehouseIncidents.count} Reports</div>
        <div style="font-size:8px;color:#78350f;">Internal facility handling</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;background:#f8fafc;text-align:center;">
        <div style="font-size:8.5px;color:#64748b;font-weight:700;text-transform:uppercase;">Affected Lot Volume</div>
        <div style="font-size:16px;font-weight:900;color:#0f172a;margin-top:2px;">${warehouseIncidents.totalBatchVolume.toLocaleString()}</div>
        <div style="font-size:8px;color:#64748b;">Central warehouse batches</div>
      </div>
      <div style="border:1px solid #fecaca;border-radius:6px;padding:8px 10px;background:#fef2f2;text-align:center;">
        <div style="font-size:8.5px;color:#991b1b;font-weight:700;text-transform:uppercase;">Damaged / Loss Volume</div>
        <div style="font-size:16px;font-weight:900;color:#dc2626;margin-top:2px;">${warehouseIncidents.totalDamagedVolume.toLocaleString()} <span style="font-size:9px;">(${warehouseIncidents.lossRate}%)</span></div>
        <div style="font-size:8px;color:#b91c1c;">100% Quarantined</div>
      </div>
      <div style="border:1px solid #a7f3d0;border-radius:6px;padding:8px 10px;background:#ecfdf5;text-align:center;">
        <div style="font-size:8.5px;color:#065f46;font-weight:700;text-transform:uppercase;">Customer Exposure</div>
        <div style="font-size:16px;font-weight:900;color:#059669;margin-top:2px;">0 Units (0.0%)</div>
        <div style="font-size:8px;color:#047857;">Isolated before dispatch</div>
      </div>
    </div>

    <!-- Visual Chart: Internal Warehouse Defect Distribution -->
    <div class="chart-box">
      <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:6px;">Internal Warehouse Loss Distribution (Damaged Stock vs. Sound Batch Volume)</div>
      ${generateWarehouseLossSvg()}
    </div>

    <!-- Warehouse Incidents Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th>Incident Ref</th>
          <th>Product Description</th>
          <th>Root Cause Defect</th>
          <th>Location & Storage Temp</th>
          <th style="text-align:right;">Batch Volume</th>
          <th style="text-align:right;">Damaged Units</th>
          <th style="text-align:right;">Loss Rate (%)</th>
          <th>Operational Status</th>
        </tr>
      </thead>
      <tbody>
        ${warehouseIncidentRows}
      </tbody>
    </table>
    <div class="explanation-box" style="background:#fff7ed;border-left:3.5px solid #ea580c;color:#9a3412;">
      <strong>Warehouse Incident & Containment Report:</strong> 
      Internal warehouse defects reflect in-facility storage and bulk handling challenges segregated entirely from customer fulfillment:
      <br/>• <strong>Bulk Pallet Collapse (Incident FMFSM-20261105-002):</strong> 6,500 units of <em>2000cc Farm Fresh Ausfresh 100% Australian Milk</em> sustained carton crushing and seal damage due to pallet racking overload during container destuffing in Room 2 Chiller (4°C). 
      <br/>• <strong>Cold-Room Seam Leak (Incident FMFSM-20261105-001):</strong> 5 units of <em>1000cc Chocolate Milk</em> showed seam leaks during pallet breakdown in Room 2 (3°C).
      <br/>• <strong>Containment & Governance:</strong> All 6,505 damaged units were instantly tagged, isolated, and transferred to the quarantine staging zone. Stock is advancing through Stage 5 Stock Return QA review and Stage 6 Finance batch disposal for formal tax-deductible destruction. Zero damaged cartons were released to customers.
    </div>
  </div>

  <!-- Section 5: Customer Pareto Distribution (With Pareto Chart) -->
  <div class="section-card">
    <div class="section-title">
      <span>5. Customer Pareto Analysis (80/20 Rule)</span>
      <span style="font-size:9.5px;color:#64748b;font-weight:600;">Key Account Risk Concentration</span>
    </div>

    <!-- Visual Customer Pareto Chart with 80% line -->
    <div class="chart-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="font-size:10px;font-weight:700;color:#334155;">Pareto Curve — Frequency of Claims & Cumulative % (Top Accounts)</div>
        <div style="display:flex;gap:12px;font-size:9px;">
          <span><span style="display:inline-block;width:9px;height:9px;background:#0284c7;border-radius:2px;margin-right:3px;"></span>Claim Count</span>
          <span><span style="display:inline-block;width:14px;height:2px;background:#d97706;vertical-align:middle;margin-right:3px;"></span>Cumulative %</span>
          <span><span style="display:inline-block;width:14px;height:1px;background:#d97706;border-top:1px dashed #d97706;vertical-align:middle;margin-right:3px;"></span>80% Threshold</span>
        </div>
      </div>
      ${generateParetoSvg()}
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align:center;width:28px;">#</th>
          <th>Customer Account Name</th>
          <th style="text-align:right;">Complaint Count</th>
          <th style="text-align:right;">Account Share (%)</th>
          <th style="text-align:right;">Cumulative (%)</th>
        </tr>
      </thead>
      <tbody>
        ${topCustomerRows}
      </tbody>
    </table>
    <div class="explanation-box">
      <strong>Management Explanation:</strong> Pareto analysis confirms the 80/20 rule: approximately <strong>80% of all complaint frequency is concentrated within the top key accounts</strong> (primarily high-volume cafe chains including BROWN branches and supermarket distributors like NORAK FOOD CO.). Implementing direct cold-chain audits and chiller thermometer calibration at these key accounts will eliminate the majority of customer quality friction.
    </div>
  </div>

  <!-- Section 6: Manufacturing Code (EXP) & SPC Control Chart -->
  <div class="section-card">
    <div class="section-title">
      <span>6. Manufacturing Code Distribution & Statistical Process Control (SPC)</span>
      <span style="font-size:9.5px;color:#64748b;font-weight:600;">Process Capability</span>
    </div>

    <!-- Visual Code Donut & Control Chart Side by Side -->
    <div class="chart-box" style="display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:center;">
      <div style="border-right:1px solid #e2e8f0;padding-right:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:6px;">Code & EXP Distribution</div>
        ${generateDonutSvg(mfgDonutSlices, mfgSummary.reduce((s, m) => s + m.count, 0), 'total')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:10px;font-weight:700;color:#334155;">Control Chart (c-Chart: Daily/Weekly Trend)</div>
          <div style="display:flex;gap:10px;font-size:9px;">
            <span style="color:#ef4444;">-- UCL (${controlChartData.ucl.toFixed(1)})</span>
            <span style="color:#3b82f6;">-- Mean (${controlChartData.mean.toFixed(1)})</span>
          </div>
        </div>
        ${generateControlChartSvg()}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Manufacturing Code</th>
              <th style="text-align:right;">Incidents</th>
              <th style="text-align:right;">Share (%)</th>
            </tr>
          </thead>
          <tbody>
            ${mfgRows}
          </tbody>
        </table>
      </div>
      <div>
        <table class="data-table">
          <thead>
            <tr>
              <th>SPC Parameter (c-Chart)</th>
              <th style="text-align:right;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mean Defect Rate (c̄)</td>
              <td style="text-align:right;font-weight:700;">${controlChartData.mean.toFixed(2)} / period</td>
            </tr>
            <tr>
              <td>Upper Control Limit (UCL = c̄ + 3√c̄)</td>
              <td style="text-align:right;font-weight:700;color:#dc2626;">${controlChartData.ucl.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Lower Control Limit (LCL = max(0, c̄ - 3√c̄))</td>
              <td style="text-align:right;font-weight:700;color:#16a34a;">${controlChartData.lcl.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Out-of-Control Spikes (&gt; UCL)</td>
              <td style="text-align:right;font-weight:800;color:#b91c1c;">${controlChartData.data.filter(d => d.outOfControl).length} Event(s)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="explanation-box">
      <strong>Management Explanation:</strong> The c-chart monitors process stability. Days or weeks where complaint count exceeds the Upper Control Limit (UCL) indicate <em>special-cause variations</em> (e.g., severe transit temperature failure or bulk crate mishandling) requiring formal root-cause incident reviews, rather than normal random fluctuation.
    </div>
  </div>

  <!-- Section 7: Disposal & Write-Off Summary Heatmap -->
  <div class="section-card">
    <div class="section-title">
      <span>7. Disposal & Write-Off Summary Heatmap (Physical & Virtual Clusters)</span>
      <span style="font-size:9.5px;color:#64748b;font-weight:600;">Tax-Audited Destructions (${disposalHeatmapData.totalOverallQty} Units Total)</span>
    </div>

    <!-- Heatmap Scale Legend -->
    <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px;margin-bottom:12px;">
      <span style="font-size:9px;font-weight:700;color:#334155;">Heatmap Quantity Scale:</span>
      <div style="display:flex;align-items:center;gap:8px;flex:1;">
        <span style="font-size:8.5px;font-weight:700;color:#1d4ed8;">Low QTY (${disposalHeatmapData.minQty} units)</span>
        <div style="flex:1;height:8px;border-radius:4px;background:linear-gradient(to right, #1d4ed8, #0284c7, #d97706, #ea580c, #b91c1c);"></div>
        <span style="font-size:8.5px;font-weight:700;color:#b91c1c;">High QTY (${disposalHeatmapData.maxQty} units)</span>
      </div>
    </div>

    ${generateDisposalHeatmapPrintHtml()}

    <div class="explanation-box">
      <strong>Management Explanation:</strong> Write-off stock is categorized into <em>Physical Write-Off</em> (stock returned to central facility and destroyed in the presence of Tax Officer Kakada and Finance Manager Bong Tolo) and <em>Virtual Write-Off</em> (stock destroyed on-site at provincial customer branches under supervisor oversight with video verification). All write-offs are assigned an official Write-Off Code for General Department of Taxation (GDT) deductible expense reconciliation.
    </div>
  </div>

  <!-- Section 8: Remaining Stock Not on Write-Off Yet (Active Quarantine & Pipeline Inventory) -->
  <div class="section-card">
    <div class="section-title">
      <span>8. Remaining Stock Not on Write-Off Yet (Active Quarantine & Pipeline Inventory)</span>
      <span style="font-size:9.5px;color:#d97706;font-weight:700;">${remainingStockData.totalRemainingQty.toLocaleString()} Units Pending Across ${remainingStockData.totalBatches} Batches</span>
    </div>

    <!-- Summary KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:12px;">
      <div style="border:1px solid #fed7aa;border-radius:6px;padding:8px 10px;background:#fffaf0;text-align:center;">
        <div style="font-size:8px;color:#9a3412;font-weight:700;text-transform:uppercase;">Total Unwritten Defect Stock</div>
        <div style="font-size:15px;font-weight:900;color:#c2410c;margin-top:2px;">${remainingStockData.totalRemainingQty.toLocaleString()} <span style="font-size:8.5px;">units</span></div>
        <div style="font-size:7.5px;color:#78350f;">Across ${remainingStockData.totalIncidentsCount} active claims</div>
      </div>
      <div style="border:1px solid #fecaca;border-radius:6px;padding:8px 10px;background:#fef2f2;text-align:center;">
        <div style="font-size:8px;color:#991b1b;font-weight:700;text-transform:uppercase;">Quarantined in Facility (Stage 2)</div>
        <div style="font-size:15px;font-weight:900;color:#dc2626;margin-top:2px;">${remainingStockData.pendingQaQty.toLocaleString()} <span style="font-size:8.5px;">units</span></div>
        <div style="font-size:7.5px;color:#991b1b;">Pending QA Inspection</div>
      </div>
      <div style="border:1px solid #bfdbfe;border-radius:6px;padding:8px 10px;background:#eff6ff;text-align:center;">
        <div style="font-size:8px;color:#1e40af;font-weight:700;text-transform:uppercase;">Executive Decision (Stage 3)</div>
        <div style="font-size:15px;font-weight:900;color:#2563eb;margin-top:2px;">${remainingStockData.pendingApprovalQty.toLocaleString()} <span style="font-size:8.5px;">units</span></div>
        <div style="font-size:7.5px;color:#1e40af;">Pending CEO Approval</div>
      </div>
      <div style="border:1px solid #bbf7d0;border-radius:6px;padding:8px 10px;background:#f0fdf4;text-align:center;">
        <div style="font-size:8px;color:#166534;font-weight:700;text-transform:uppercase;">Warehouse Exchanged (Stage 4)</div>
        <div style="font-size:15px;font-weight:900;color:#15803d;margin-top:2px;">${remainingStockData.completedExchangedQty.toLocaleString()} <span style="font-size:8.5px;">units</span></div>
        <div style="font-size:7.5px;color:#166534;">Awaiting Stage 5 Return</div>
      </div>
    </div>

    ${generateRemainingStockPrintHtml()}

    <div class="explanation-box" style="background:#fffbeb;border-left:3.5px solid #d97706;color:#92400e;">
      <strong>Pipeline Inventory Governance:</strong> A total of <strong>${remainingStockData.totalRemainingQty.toLocaleString()} units</strong> across <strong>${remainingStockData.totalBatches} production batches</strong> represent active quality defect inventory not yet closed into Stage 06 Write-Off. The bulk volume is dominated by Batch <em>MAC - 12:00 AM to 19:00 PM (6,500 units)</em> from internal container destuffing damage currently secured under quarantine protocol. Remaining units proceed through Stage 03 CEO sign-off and Stage 04 warehouse physical replacements prior to final tax batching.
    </div>
  </div>

  <!-- Section 9: Corrective & Preventative Actions (CAPA) -->
  <div class="section-card" style="background:#fefce8;border-color:#fde047;">
    <div class="section-title" style="color:#854d0e;border-color:#fef08a;">
      <span>9. Strategic Quality Action Plan (CAPA)</span>
      <span style="font-size:9.5px;color:#854d0e;font-weight:700;">Mandatory Quality Directives</span>
    </div>
    <div style="font-size:10.5px;color:#713f12;line-height:1.55;">
      <strong>1. Cold-Chain Verification:</strong> Mandate digital temperature data-logger checks at receiving dock (2°C–4°C standard).
      <br/><strong>2. Packaging Reinforcement:</strong> Review crate nesting and vehicle divider strapping to minimize carton crushing during provincial road distribution.
      <br/><strong>3. Customer Chiller Audits:</strong> Sales reps must conduct 3-point temperature inspection (Bottom/Upper/Side) at customer display fridges during intake.
      <br/><strong>4. Fast-Track Disposal:</strong> Finance and Warehouse must conduct monthly Stage 06 batch disposal closures to reconcile write-off inventory with tax authorities.
    </div>
  </div>

  <!-- Signatures -->
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-role">Prepared by: Quality Assurance</div>
      <div class="sig-line">QA Team</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Reviewed by: Warehouse Operations</div>
      <div class="sig-line">Warehouse Manager</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Approved by: Finance & Tax</div>
      <div class="sig-line">Finance Manager</div>
    </div>
    <div class="sig-box">
      <div class="sig-role">Executive Endorsement: CEO</div>
      <div class="sig-line">Executive CEO Approval</div>
    </div>
  </div>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 280);
  };

  return (
    <div className="insights-section">
      <div
        className="insights-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 className="insights-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Quality Insights & Analytics
          </h2>
          <span className="insights-subtitle" style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            {totalComplaints} complaints in view • Defect analysis, customer Pareto, process stability & fulfillment metrics
          </span>
        </div>

        {/* Action Button: Print Report (PDF) with full visual charts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handlePrintInsightsReport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid #0f766e',
              background: '#f0fdfa',
              color: '#0f766e',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.15)',
              transition: 'all 0.15s ease',
            }}
            title="Open comprehensive printable quality report with all visual charts and executive explanations (Print or Save as PDF)"
          >
            <Printer size={16} />
            <span>Print Report (PDF)</span>
          </button>
        </div>
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
              <h3 className="insight-card-title">Customer Quality: QTY Shipped vs. Defective QTY by Product</h3>
              <div className="insight-card-subtitle">Shipped order volume vs. customer defect complaints & warehouse exchanges (External customers only)</div>
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
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#0284c7', display: 'inline-block' }} />
              QTY Shipped
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
              Customer Defective QTY
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#16a34a', display: 'inline-block' }} />
              Warehouse Exchanged QTY
            </span>
          </div>

          {quantityByProduct.length > 0 ? (() => {
            const BAR_W = 20;
            const BAR_GAP = 3;
            const CHART_H = 220;
            const maxProdLen = Math.max(...quantityByProduct.map(p => (p.product || '').length), 15);
            const LABEL_H = Math.max(150, Math.ceil(maxProdLen * 4.5) + 20);
            const PADDING_LEFT = 42;
            const PADDING_TOP = 18;
            const groupW = BAR_W * 3 + BAR_GAP * 2;
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
            const maxVal = Math.max(...quantityByProduct.map(p => Math.max(p.shipped_quantity, p.original_quantity, p.adjusted_quantity)), 1);
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
                    const shipH = Math.max((item.shipped_quantity / maxVal) * CHART_H, item.shipped_quantity > 0 ? 4 : 0);
                    const defH = Math.max((item.original_quantity / maxVal) * CHART_H, item.original_quantity > 0 ? 4 : 0);
                    const adjH = Math.max((item.adjusted_quantity / maxVal) * CHART_H, item.adjusted_quantity > 0 ? 4 : 0);
                    const shipY = PADDING_TOP + CHART_H - shipH;
                    const defY = PADDING_TOP + CHART_H - defH;
                    const adjY = PADDING_TOP + CHART_H - adjH;
                    const labelX = groupX + groupW / 2;
                    const labelY = PADDING_TOP + CHART_H + 10;

                    return (
                      <g key={idx}>
                        {/* Shipped qty bar */}
                        <rect x={groupX} y={shipY} width={BAR_W} height={shipH} rx="3" fill="#0284c7">
                          <title>{`${item.product}\nShipped: ${item.shipped_quantity}`}</title>
                        </rect>
                        {item.shipped_quantity > 0 && (
                          <text x={groupX + BAR_W / 2} y={shipY - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0369a1">{item.shipped_quantity}</text>
                        )}

                        {/* Customer Defective qty bar */}
                        <rect x={groupX + BAR_W + BAR_GAP} y={defY} width={BAR_W} height={defH} rx="3" fill="#ef4444">
                          <title>{`${item.product}\nCustomer Defective: ${item.original_quantity} (${item.defect_rate}%)`}</title>
                        </rect>
                        {item.original_quantity > 0 && (
                          <text x={groupX + BAR_W + BAR_GAP + BAR_W / 2} y={defY - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#dc2626">{item.original_quantity}</text>
                        )}

                        {/* Warehouse exchanged bar */}
                        <rect x={groupX + (BAR_W + BAR_GAP) * 2} y={adjY} width={BAR_W} height={adjH} rx="3" fill="#16a34a">
                          <title>{`${item.product}\nWarehouse exchanged: ${item.adjusted_quantity}`}</title>
                        </rect>
                        {item.adjusted_quantity > 0 && (
                          <text x={groupX + (BAR_W + BAR_GAP) * 2 + BAR_W / 2} y={adjY - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#15803d">{item.adjusted_quantity}</text>
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

        {/* Card 4B: Internal Warehouse Incidents & Storage Defect Analysis */}
        {warehouseIncidents.count > 0 && (
          <div className="insight-card" style={{ gridColumn: '1 / -1', background: '#fffaf0', borderColor: '#fed7aa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <h3 className="insight-card-title" style={{ color: '#9a3412', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  🏢 Internal Warehouse Storage Incidents & Operational Loss
                </h3>
                <div className="insight-card-subtitle" style={{ color: '#c2410c' }}>
                  Facility storage, bulk container destuffing & transit handling defects (100% isolated inside warehouse — zero customer exposure)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                  {warehouseIncidents.totalDamagedVolume.toLocaleString()} Damaged Units ({warehouseIncidents.lossRate}%)
                </span>
                <span style={{ fontSize: '0.78rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                  0 Customer Exposure
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {warehouseIncidents.complaints.map((c, idx) => {
                const batchQty = parseInt(c.order_quantity, 10) || 0;
                const dmgQty = parseInt(c.defect_quantity, 10) || 0;
                const lossPct = batchQty > 0 ? ((dmgQty / batchQty) * 100).toFixed(1) : '0.0';
                return (
                  <div key={idx} style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, color: '#0f766e', fontSize: '0.85rem' }}>{c.id}</span>
                      <span style={{ fontSize: '0.72rem', background: '#fef2f2', color: '#dc2626', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        {c.defect_type}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: 6 }}>
                      {c.product_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '8px 0' }}>
                      <div>Batch Lot: <strong>{batchQty.toLocaleString()} units</strong></div>
                      <div>Damaged: <strong style={{ color: '#dc2626' }}>{dmgQty.toLocaleString()} units</strong></div>
                      <div>Loss Rate: <strong style={{ color: '#b91c1c' }}>{lossPct}%</strong></div>
                      <div>Temp: <strong>{c.storage_temp || 'Cold Room'}</strong></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, color: '#64748b' }}>
                      Status: <strong style={{ color: '#92400e' }}>{c.status} • Quarantined</strong> (Room 2 Chiller)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

      {/* =========================================================================
          Card 9: Disposal Summary Heatmap
          Grouping by Write-Off Code & Clustered into Physical and Virtual Write-Off
          Heatmap dynamic colors: Blue (small write-off) to Red (highest write-off)
          Detail of Product ID and Qty
         ========================================================================= */}
      <div className="insight-card" style={{ marginTop: 20 }}>
        {/* Card Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={20} style={{ color: 'var(--color-brand)' }} />
              <h3 className="insight-card-title">Disposal Summary Heatmap (Physical & Virtual Clusters)</h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  letterSpacing: '0.02em',
                }}
              >
                STAGE 05 & 06 DISPOSAL
              </span>
            </div>
            <div className="insight-card-subtitle" style={{ marginTop: 4 }}>
              Grouping write-offs by <strong>Write-Off Code</strong>, clustered into <strong>Physical Write-Off</strong> (warehouse destruction) and <strong>Virtual Write-Off</strong> (customer on-site), with <strong>Product ID</strong> and defect quantity details.
            </div>
          </div>

          {/* Scope & Cluster View Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Filter:</span>
              <div className="time-pills">
                <button
                  type="button"
                  className={`pill-btn ${disposalScope === 'all' ? 'active' : ''}`}
                  onClick={() => setDisposalScope('all')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  All Write-Offs
                </button>
                <button
                  type="button"
                  className={`pill-btn ${disposalScope === 'closed' ? 'active' : ''}`}
                  onClick={() => setDisposalScope('closed')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  Closed & Disposed
                </button>
                <button
                  type="button"
                  className={`pill-btn ${disposalScope === 'pending' ? 'active' : ''}`}
                  onClick={() => setDisposalScope('pending')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  Active / In-Review
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Cluster:</span>
              <div className="time-pills">
                <button
                  type="button"
                  className={`pill-btn ${disposalClusterView === 'all' ? 'active' : ''}`}
                  onClick={() => setDisposalClusterView('all')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  Both Clusters
                </button>
                <button
                  type="button"
                  className={`pill-btn ${disposalClusterView === 'physical' ? 'active' : ''}`}
                  onClick={() => setDisposalClusterView('physical')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  🏢 Physical Only
                </button>
                <button
                  type="button"
                  className={`pill-btn ${disposalClusterView === 'virtual' ? 'active' : ''}`}
                  onClick={() => setDisposalClusterView('virtual')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  🌐 Virtual Only
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Write-Off Batches</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
              {disposalHeatmapData.totalBatches} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>code groups</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Across {disposalHeatmapData.totalComplaintsCount} complaints</div>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Total Write-Off Volume</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#b91c1c', marginTop: 2 }}>
              {disposalHeatmapData.totalOverallQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: 2 }}>Max cell: {disposalHeatmapData.maxQty} units</div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>🏢 Physical Destruction</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d', marginTop: 2 }}>
              {disposalHeatmapData.totalPhysicalQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: 2 }}>Warehouse quarantined & dumped</div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>🌐 Virtual Destruction</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>
              {disposalHeatmapData.totalVirtualQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#1e40af', marginTop: 2 }}>Customer on-site destruction</div>
          </div>
        </div>

        {/* Dynamic Heatmap Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            background: 'var(--color-bg-subtle, #f8fafc)',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 16px',
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={16} style={{ color: '#ea580c' }} />
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>Write-Off Intensity Scale:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, maxWidth: 540 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>
              Small QTY ({disposalHeatmapData.minQty} units)
            </span>
            <div
              style={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                background: 'linear-gradient(to right, #1d4ed8, #0284c7, #d97706, #ea580c, #b91c1c)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
              }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b91c1c', whiteSpace: 'nowrap' }}>
              Highest QTY ({disposalHeatmapData.maxQty} units)
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
            <span>Dynamic gradient based on audited quantity</span>
          </div>
        </div>

        {/* Heatmap Groups Hierarchy */}
        {disposalHeatmapData.groups.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {disposalHeatmapData.groups.map((group) => {
              const physItems = Object.values(group.physical);
              const virtItems = Object.values(group.virtual);
              const showPhysical = disposalClusterView === 'all' || disposalClusterView === 'physical';
              const showVirtual = disposalClusterView === 'all' || disposalClusterView === 'virtual';

              return (
                <div
                  key={`wo-group-${group.code}`}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    background: 'var(--color-bg-card, #ffffff)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Write-off Code Header */}
                  <div
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '10px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          background: 'rgba(255,255,255,0.16)',
                          padding: '3px 10px',
                          borderRadius: 6,
                          letterSpacing: '0.04em',
                          border: '1px solid rgba(255,255,255,0.25)',
                        }}
                      >
                        Write-Off Code: {group.code}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          background: group.status === 'Closed' ? '#10b981' : '#f59e0b',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        {group.status === 'Closed' ? 'Closed & Tax Verified' : 'In Review'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        Tax Officer: <strong style={{ color: '#ffffff' }}>{group.taxOfficer}</strong> • Finance: <strong style={{ color: '#ffffff' }}>{group.financeManager}</strong>
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          background: '#dc2626',
                          color: '#ffffff',
                          padding: '3px 10px',
                          borderRadius: 6,
                        }}
                      >
                        Batch Total: {group.totalQty} units
                      </div>
                    </div>
                  </div>

                  {/* Components Clusters Container */}
                  <div
                    style={{
                      padding: 14,
                      display: 'grid',
                      gridTemplateColumns: showPhysical && showVirtual ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
                      gap: 14,
                    }}
                  >
                    {/* Component 1: Physical Write-Off */}
                    {showPhysical && (
                      <div
                        style={{
                          border: '1px solid #bbf7d0',
                          borderRadius: 8,
                          background: '#fcfdfd',
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #dcfce7',
                            paddingBottom: 8,
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building size={16} style={{ color: '#15803d' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#14532d' }}>
                              🏢 Physical Write-Off (Warehouse)
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: '#15803d',
                              background: '#dcfce7',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            Subtotal: {group.totalPhysicalQty} units
                          </span>
                        </div>

                        {physItems.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                            {physItems.map((item) => {
                              const heatColor = getDisposalHeatmapColor(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
                              const heatBg = getDisposalHeatmapBg(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
                              const isHovered = hoveredHeatmapTile && hoveredHeatmapTile.productId === item.productId && hoveredHeatmapTile.group === group.code && hoveredHeatmapTile.type === 'Physical';

                              return (
                                <div
                                  key={`phys-${group.code}-${item.productId}`}
                                  style={{
                                    border: `1.5px solid ${heatColor}`,
                                    background: heatBg,
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                                    transform: isHovered ? 'translateY(-2px)' : 'none',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                  }}
                                  onMouseEnter={() => setHoveredHeatmapTile({ ...item, group: group.code, type: 'Physical' })}
                                  onMouseLeave={() => setHoveredHeatmapTile(null)}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <span
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          background: '#ffffff',
                                          color: '#0f172a',
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          border: '1px solid #cbd5e1',
                                        }}
                                      >
                                        {item.productId}
                                      </span>
                                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                        📍 {item.location}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                      {item.productName}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6, borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                      <span>Claims: {item.complaints.join(', ')}</span>
                                    </div>
                                    <div
                                      style={{
                                        background: heatColor,
                                        color: '#ffffff',
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontWeight: 900,
                                        fontSize: '0.98rem',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {item.qty} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{item.uom}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                            No physical write-off items in this batch.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Component 2: Virtual Write-Off */}
                    {showVirtual && (
                      <div
                        style={{
                          border: '1px solid #bfdbfe',
                          borderRadius: 8,
                          background: '#fcfdfd',
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #dbeafe',
                            paddingBottom: 8,
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Globe size={16} style={{ color: '#2563eb' }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af' }}>
                              🌐 Virtual Write-Off (Customer On-Site)
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: '#2563eb',
                              background: '#dbeafe',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            Subtotal: {group.totalVirtualQty} units
                          </span>
                        </div>

                        {virtItems.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                            {virtItems.map((item) => {
                              const heatColor = getDisposalHeatmapColor(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
                              const heatBg = getDisposalHeatmapBg(item.qty, disposalHeatmapData.minQty, disposalHeatmapData.maxQty);
                              const isHovered = hoveredHeatmapTile && hoveredHeatmapTile.productId === item.productId && hoveredHeatmapTile.group === group.code && hoveredHeatmapTile.type === 'Virtual';

                              return (
                                <div
                                  key={`virt-${group.code}-${item.productId}`}
                                  style={{
                                    border: `1.5px solid ${heatColor}`,
                                    background: heatBg,
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                                    transform: isHovered ? 'translateY(-2px)' : 'none',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                  }}
                                  onMouseEnter={() => setHoveredHeatmapTile({ ...item, group: group.code, type: 'Virtual' })}
                                  onMouseLeave={() => setHoveredHeatmapTile(null)}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <span
                                        style={{
                                          fontFamily: 'monospace',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          background: '#ffffff',
                                          color: '#0f172a',
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          border: '1px solid #cbd5e1',
                                        }}
                                      >
                                        {item.productId}
                                      </span>
                                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                        🌐 {item.location}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                      {item.productName}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6, borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                      <span>Claims: {item.complaints.join(', ')}</span>
                                    </div>
                                    <div
                                      style={{
                                        background: heatColor,
                                        color: '#ffffff',
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontWeight: 900,
                                        fontSize: '0.98rem',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {item.qty} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{item.uom}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                            No virtual write-off items in this batch.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '28px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            No disposal or write-off records matching the selected scope.
          </div>
        )}
      </div>

      {/* =========================================================================
          Card 10: Remaining Stock Not on Write-Off Yet
          Comprehensive audit of stock across production batches not yet closed into Stage 05/06 write-off.
          Which batch, product ID, and quantity in detail.
         ========================================================================= */}
      <div className="insight-card" style={{ marginTop: 20 }}>
        {/* Card Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Boxes size={20} style={{ color: '#d97706' }} />
              <h3 className="insight-card-title">Remaining Stock Not on Write-Off Yet</h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  letterSpacing: '0.02em',
                }}
              >
                ACTIVE INVENTORY • PENDING DISPOSAL
              </span>
            </div>
            <div className="insight-card-subtitle" style={{ marginTop: 4 }}>
              Active defective, quarantined, or exchanged stock across production batches that have <strong>NOT been written off or disposed yet</strong> in Stage 05/06. Detail of batch, product ID, status, and physical location.
            </div>
          </div>

          {/* Controls: Filter by Workflow Stage & Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Stage:</span>
              <div className="time-pills">
                <button
                  type="button"
                  className={`pill-btn ${remainingStockStageFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRemainingStockStageFilter('all')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  All Active
                </button>
                <button
                  type="button"
                  className={`pill-btn ${remainingStockStageFilter === 'pending_qa' ? 'active' : ''}`}
                  onClick={() => setRemainingStockStageFilter('pending_qa')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  Stage 2: Pending QA
                </button>
                <button
                  type="button"
                  className={`pill-btn ${remainingStockStageFilter === 'pending_approval' ? 'active' : ''}`}
                  onClick={() => setRemainingStockStageFilter('pending_approval')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  Stage 3: Pending Approval
                </button>
                <button
                  type="button"
                  className={`pill-btn ${remainingStockStageFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setRemainingStockStageFilter('completed')}
                  style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                >
                  Stage 4: Exchanged
                </button>
              </div>
            </div>

            <div style={{ minWidth: 160 }}>
              <input
                type="text"
                placeholder="Search batch or SKU..."
                value={remainingStockSearch}
                onChange={(e) => setRemainingStockSearch(e.target.value)}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Total Unwritten Stock</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#b45309', marginTop: 2 }}>
              {remainingStockData.totalRemainingQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: 2 }}>Across {remainingStockData.totalBatches} batches ({remainingStockData.totalIncidentsCount} claims)</div>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Quarantined in Facility (Stage 2)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626', marginTop: 2 }}>
              {remainingStockData.pendingQaQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: 2 }}>Pending QA temperature/acidity test</div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Executive Review (Stage 3)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2563eb', marginTop: 2 }}>
              {remainingStockData.pendingApprovalQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#1e40af', marginTop: 2 }}>Awaiting CEO compensation decision</div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Exchanged / Retained (Stage 4 & 5)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d', marginTop: 2 }}>
              {remainingStockData.completedExchangedQty.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>units</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: 2 }}>
              Replacement sent {remainingStockData.totalReworkQty > 0 ? `• ${remainingStockData.totalReworkQty} in rework` : ''}
            </div>
          </div>
        </div>

        {/* Detailed Batches List */}
        {remainingStockData.batches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {remainingStockData.batches.map((batch) => {
              const prodList = Object.values(batch.productsMap);

              return (
                <div
                  key={`rem-batch-${batch.batchKey}`}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: 'var(--color-bg-card, #ffffff)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Batch Header Bar */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          background: '#0f172a',
                          color: '#ffffff',
                          padding: '3px 10px',
                          borderRadius: 6,
                          letterSpacing: '0.02em',
                        }}
                      >
                        Batch: {batch.batchKey}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                        {batch.complaintsCount} incident(s) logged
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {batch.totalReworkQty > 0 && (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#065f46',
                            background: '#d1fae5',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          ♻️ {batch.totalReworkQty} unit(s) Rework
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 900,
                          background: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          padding: '3px 10px',
                          borderRadius: 6,
                        }}
                      >
                        Total Unwritten: {batch.totalQty.toLocaleString()} units
                      </span>
                    </div>
                  </div>

                  {/* Products Table inside this Batch */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, border: 'none', width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#fdfdfd', fontSize: '0.74rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ width: 140, padding: '8px 12px' }}>Product ID</th>
                          <th style={{ padding: '8px 12px' }}>Product Description</th>
                          <th style={{ width: 140, padding: '8px 12px' }}>Workflow Stage</th>
                          <th style={{ padding: '8px 12px' }}>Holding / Return Location</th>
                          <th style={{ width: 150, textAlign: 'right', padding: '8px 12px' }}>Remaining QTY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prodList.map((prod) => {
                          const statusList = Array.from(prod.statuses);
                          const locList = Array.from(prod.locations).slice(0, 2).join(' / ');
                          const claimIds = prod.incidents.map((i) => i.id).join(', ');

                          return (
                            <tr key={`rem-prod-${batch.batchKey}-${prod.productId}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ verticalAlign: 'top', padding: '10px 12px' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    border: '1px solid #cbd5e1',
                                    display: 'inline-block',
                                  }}
                                >
                                  {prod.productId}
                                </span>
                              </td>
                              <td style={{ verticalAlign: 'top', padding: '10px 12px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                                  {prod.productName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                                  Linked Claims: <strong style={{ color: '#475569' }}>{claimIds}</strong>
                                </div>
                              </td>
                              <td style={{ verticalAlign: 'top', padding: '10px 12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {statusList.map((st) => (
                                    <span
                                      key={`st-${st}`}
                                      style={{
                                        display: 'inline-block',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        background:
                                          st === 'Pending QA'
                                            ? '#fef3c7'
                                            : st === 'Pending approval'
                                            ? '#eff6ff'
                                            : st === 'Approved'
                                            ? '#f0fdf4'
                                            : st === 'Completed'
                                            ? '#f0fdf4'
                                            : '#f1f5f9',
                                        color:
                                          st === 'Pending QA'
                                            ? '#92400e'
                                            : st === 'Pending approval'
                                            ? '#1e40af'
                                            : st === 'Approved'
                                            ? '#166534'
                                            : st === 'Completed'
                                            ? '#15803d'
                                            : '#475569',
                                        width: 'fit-content',
                                      }}
                                    >
                                      {st}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ verticalAlign: 'top', padding: '10px 12px', fontSize: '0.76rem', color: '#475569' }}>
                                <div>📍 {locList || 'Warehouse Quarantine'}</div>
                              </td>
                              <td style={{ verticalAlign: 'top', textAlign: 'right', padding: '10px 12px' }}>
                                <div
                                  style={{
                                    display: 'inline-block',
                                    fontWeight: 900,
                                    fontSize: '1.02rem',
                                    color: '#b91c1c',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  {prod.quantity.toLocaleString()}{' '}
                                  <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>{prod.uom}</span>
                                </div>
                                {prod.reworkQty > 0 && (
                                  <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                                    +{prod.reworkQty} in rework
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            No unwritten defect stock found matching the filter criteria.
          </div>
        )}
      </div>

    </div>
  );
}
