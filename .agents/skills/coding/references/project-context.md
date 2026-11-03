# Project Domain & Context: SONAVITH Defective Product Report

This document records the business requirements, data structures, and UI specifications for the dairy product complaint tracking system represented in `sample_UI_img/`.

---

## 1. System Overview

- **Application Name**: SONAVITH - Defective Product Report
- **Tagline / Purpose**: *"Complaint intake through sales, quality inspection, CEO approval and warehouse exchange — one record, four stages."*
- **Core Workflow**: A single defective product complaint flows sequentially across four departments:
  1. **Sales**: Complaint intake from customer, initial details, product information, and photos.
  2. **QA (Quality Assurance)**: Inspection, batch verification, root-cause assessment, and recommendation.
  3. **CEO**: Executive review and approval / rejection of the compensation or exchange.
  4. **Warehouse**: Exchange fulfillment, inventory write-off, and case completion.

---

## 2. Views & Navigation

The application navigation supports 5 primary views via segmented tabs:
1. **Overview**: Executive dashboard showing KPI summary metrics, status breakdowns, top defect donut chart, defective quantity by product bar chart, complaint trends, and manufacturing code/expiry summary.
2. **Sales**: Complaint intake interface, "+ New complaint" modal trigger, and active complaint listings.
3. **QA**: Queue of complaints pending quality inspection with QA review actions.
4. **CEO**: Decision queue for complaints awaiting executive approval or rejection.
5. **Warehouse**: Exchange/replacement fulfillment queue and completed records.

---

## 3. Data Schema & Fields

### Complaint Record
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` / `complaintId` | String | Formatted ID (e.g. `FFCM-20260919-001`), generated from product short code + date + sequence |
| `salesRepName` | String | Name of the sales representative submitting the ticket |
| `customerName` | String | Name of the customer / cafe / supermarket |
| `customerLocation`| String | Delivery address or Google Maps URL |
| `customerContact` | String | Phone number or email |
| `complaintDate` | Date/String | Date the complaint was logged (YYYY-MM-DD) |
| `productName` | String | e.g., `2000cc Farm Fresh Cows Milk`, `Farm Fresh AusFresh` |
| `productShortCode`| String | Short identifier (e.g., `FFCM`, `FFAF`, `FFCF`) |
| `defectType` | Enum | `Off smell/taste`, `Physical damage`, `Packaging leak`, `Curdling`, etc. |
| `defectQuantity` | Number | Quantity of defective units |
| `unitOfMeasure` | Enum | `2L-BTL`, `1L-BTL`, `L`, `Box`, `Carton` |
| `productExpiryDate`| Date/String| Expiry date on the packaging (YYYY-MM-DD) |
| `manufacturingCode`| String | Code printed on bottle/carton (e.g., `MAC`) |
| `productionBatch` | String | Production time or batch number (e.g., `12:00`, `12:00 AM`, `1:00`) |
| `priceDiscount`   | String | Sales price discount or discount agreement (e.g., `10%`, `$5.00`) |
| `storageTemp`     | String | Customer storage temperature recorded during sales intake (e.g., `2–6 °C`) |
| `shipmentDate`    | Date/String| Delivery / shipment dispatch date (YYYY-MM-DD) |
| `photoUrl` | String | URL / path / base64 thumbnail of defective product photo |
| `status` | Enum | `Pending QA`, `Pending approval`, `Approved`, `Rejected`, `Completed` |

---

## 4. UI Design Specifications

- **Theme Palette**:
  - Primary Action / Brand: Dark Forest Teal (`#1b4d3e` / `#164032`)
  - Accent / Warnings: Amber Gold (`#d97706` / `#f59e0b`)
  - Status Badges:
    - *Pending QA / Pending approval*: Light Amber pill badge with border (`#fef3c7`, text `#b45309`, border `#fde68a`)
    - *Approved*: Soft Emerald badge (`#dcfce7`, text `#15803d`, border `#bbf7d0`)
    - *Rejected*: Soft Rose badge (`#ffe4e6`, text `#be123c`, border `#fecdd3`)
    - *Completed*: Slate / Neutral badge (`#f1f5f9`, text `#475569`, border `#cbd5e1`)
  - Background: Crisp off-white (`#fcfaf7` / `#f8fafc`) with pure white (`#ffffff`) cards
  - Card Styling: Rounded corners (`border-radius: 12px`), subtle border (`#e5e7eb`), gentle elevation
- **Responsive Layout**:
  - Top header with logo, title, subtitle, and segmented tab switcher
  - Metric summary cards in a 5-column grid (Total complaints, Total approved, Pending decision, Rejected, Completed)
  - Search input with time range filter pills (All time, Day, Week, Month) and date picker
  - Clean data table with zebra row hover, image thumbnails, and status pills
  - Modal dialog for "+ New complaint" with 2-column responsive form layout
