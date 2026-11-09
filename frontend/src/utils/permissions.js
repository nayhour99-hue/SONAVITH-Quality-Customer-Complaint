/**
 * SONAVITH Role & Stage Permission Utilities
 * 
 * Rules:
 * 1. Overview Insights & Analysis PDF:
 *    Allowed ONLY for CEO, Admin, and QA.
 * 2. Stage-Level Reports & File Exports:
 *    Every Stage Owner can export file and print report for their own stage:
 *    - Stage 01 (Sales Intake): Sale (+ Admin, CEO)
 *    - Stage 02 (QA Inspection): QA (+ Admin, CEO)
 *    - Stage 03 (CEO Approval): CEO (+ Admin)
 *    - Stage 04 (Warehouse Fulfillment): Warehouse (+ Admin, CEO)
 *    - Stage 05 (Stock Return Control): Warehouse & QA (+ Admin, CEO)
 *    - Stage 06 (Disposal Action): Finance (+ Admin, CEO)
 */

export const normalizeRole = (role) => (role || '').trim().toLowerCase();

/**
 * Check if user is authorized to print the Overview Insights & Analytics PDF report
 * Allowed ONLY for CEO, Admin, and QA
 */
export const canPrintInsightReport = (userRole, userPermissions = null) => {
  const norm = normalizeRole(userRole);
  return ['admin', 'ceo', 'qa'].includes(norm);
};

/**
 * Check if the user is the owner of a given stage/tab.
 * Stage owners have full authority to print reports and export records for their stage.
 */
export const isStageOwner = (stageOrTabId, userRole, userPermissions = null) => {
  const norm = normalizeRole(userRole);
  if (norm === 'admin' || norm === 'ceo') return true;

  // Check granular custom permissions if configured
  if (userPermissions && Array.isArray(userPermissions.can_edit)) {
    if (stageOrTabId === 'stock_return') {
      if (
        userPermissions.can_edit.includes('stock_return') ||
        userPermissions.can_edit.includes('stock_return_action') ||
        userPermissions.can_edit.includes('stock_return_signoff')
      ) {
        return true;
      }
    }
    if (userPermissions.can_edit.includes(stageOrTabId)) {
      return true;
    }
  }

  // Built-in department stage ownership defaults
  switch (stageOrTabId) {
    case 'sales':
      return norm === 'sale';
    case 'qa':
      return norm === 'qa';
    case 'ceo':
      return norm === 'ceo';
    case 'warehouse':
      return norm === 'warehouse';
    case 'stock_return':
      return norm === 'warehouse' || norm === 'qa';
    case 'disposal':
      return norm === 'finance';
    case 'overview':
      // Overview summary export/print is executive/QA level
      return ['admin', 'ceo', 'qa'].includes(norm);
    default:
      return false;
  }
};

/**
 * Check if user can export files for the given tab
 */
export const canExportStage = (stageOrTabId, userRole, userPermissions = null) => {
  return isStageOwner(stageOrTabId, userRole, userPermissions);
};

/**
 * Check if user can print stage report for the given tab
 */
export const canPrintStageReport = (stageOrTabId, userRole, userPermissions = null) => {
  return isStageOwner(stageOrTabId, userRole, userPermissions);
};

/**
 * Get human-readable stage header and department metadata for printed reports
 */
export const getStagePrintMetadata = (stageOrTabId) => {
  switch (stageOrTabId) {
    case 'sales':
      return {
        stageNumber: '01',
        title: 'Stage 01: Sales Intake & Customer Claims Queue',
        department: 'Sales & Customer Accounts',
        badge: 'Sales Intake',
        color: '#0284c7',
        roleSignOff: 'Sales Representative / Account Lead',
      };
    case 'qa':
      return {
        stageNumber: '02',
        title: 'Stage 02: QA Quality Inspection & Laboratory Evaluation Queue',
        department: 'Quality Assurance Department',
        badge: 'QA Inspection',
        color: '#059669',
        roleSignOff: 'QA Inspection Team',
      };
    case 'ceo':
      return {
        stageNumber: '03',
        title: 'Stage 03: Executive CEO Compensation Approval Queue',
        department: 'Executive Office (CEO)',
        badge: 'CEO Decision',
        color: '#1b4d3e',
        roleSignOff: 'Executive Office (CEO)',
      };
    case 'warehouse':
      return {
        stageNumber: '04',
        title: 'Stage 04: Warehouse Replacement Fulfillment & Delivery Manifest',
        department: 'Warehouse & Logistics Operations',
        badge: 'Fulfillment Dispatch',
        color: '#d97706',
        roleSignOff: 'Warehouse Operations Manager',
      };
    case 'stock_return':
      return {
        stageNumber: '05',
        title: 'Stage 05: Defective Stock Return Intake & Bin Quarantine Register',
        department: 'Stock Return Control (Warehouse & QA)',
        badge: 'Stock Return Control',
        color: '#b45309',
        roleSignOff: 'Stock Controller & QA Verification Officer',
      };
    case 'disposal':
      return {
        stageNumber: '06',
        title: 'Stage 06: Finance Disposal Action & GDT Tax Destruction Manifest',
        department: 'Finance & Tax Administration',
        badge: 'Disposal & Tax Verification',
        color: '#6d28d9',
        roleSignOff: 'Finance Manager & GDT Tax Auditor',
      };
    case 'overview':
    default:
      return {
        stageNumber: 'All',
        title: 'Defective Product Master Register & Incident Queue',
        department: 'Operations & Quality Management',
        badge: 'Master Register',
        color: '#0f766e',
        roleSignOff: 'Quality Assurance & Operations Lead',
      };
  }
};
