import os
import io
import json
import base64
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as OpenpyxlImage
from PIL import Image as PILImage, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Brand color palette
COLOR_PRIMARY_DARK = "1B4D3E"    # SONAVITH Teal
COLOR_PRIMARY_MID  = "236451"
COLOR_PRIMARY_LIGHT= "E8F4F0"
COLOR_ACCENT_AMBER = "D97706"
COLOR_HEADER_QA    = "0369A1"    # QA Ocean Blue
COLOR_HEADER_CEO   = "4338CA"    # CEO Indigo
COLOR_HEADER_WH    = "B45309"    # Warehouse Amber
COLOR_BORDER_LIGHT = "D1D5DB"
COLOR_ZEBRA_ROW    = "F9FAFB"

STATUS_STYLES = {
    "Pending QA": {
        "fill": PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"),
        "font": Font(name="Segoe UI", size=10, bold=True, color="92400E"),
    },
    "Pending approval": {
        "fill": PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"),
        "font": Font(name="Segoe UI", size=10, bold=True, color="B45309"),
    },
    "Approved": {
        "fill": PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid"),
        "font": Font(name="Segoe UI", size=10, bold=True, color="166534"),
    },
    "Rejected": {
        "fill": PatternFill(start_color="FFE4E6", end_color="FFE4E6", fill_type="solid"),
        "font": Font(name="Segoe UI", size=10, bold=True, color="9F1239"),
    },
    "Completed": {
        "fill": PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid"),
        "font": Font(name="Segoe UI", size=10, bold=True, color="334155"),
    },
}

def create_placeholder_thumbnail(label: str = "Defect Proof", size: Tuple[int, int] = (90, 65)) -> io.BytesIO:
    """Generate a clean branded placeholder thumbnail when an image is vector SVG or unavailable."""
    width, height = size
    im = PILImage.new("RGB", (width, height), color=(235, 243, 240))
    draw = ImageDraw.Draw(im)
    
    # Outer rounded-look border
    draw.rectangle([1, 1, width - 2, height - 2], outline=(180, 205, 198), width=1)
    
    # Inner badge
    draw.rectangle([10, 8, width - 10, height - 24], fill=(27, 77, 62))
    
    # Text
    short_label = (label or "EVIDENCE")[:10].upper()
    draw.text((width // 2, 16), "SONAVITH", fill=(255, 255, 255), anchor="mm")
    draw.text((width // 2, 28), short_label, fill=(245, 158, 11), anchor="mm")
    draw.text((width // 2, height - 12), "PHOTO ATTACHED", fill=(71, 85, 105), anchor="mm")
    
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    buf.seek(0)
    return buf

def resolve_photo_image(photo_str: Optional[str], max_size: Tuple[int, int] = (85, 58)) -> Optional[Tuple[OpenpyxlImage, str]]:
    """
    Resolves a photo string into an Openpyxl Image and display text/link.
    Returns (OpenpyxlImage, display_text) or None.
    """
    if not photo_str or not str(photo_str).strip():
        return None
        
    url = photo_str.split(",")[0].strip()
    img_buf = None
    
    try:
        # Check uploads directory
        if url.startswith("/uploads/"):
            filename = url.replace("/uploads/", "").strip()
            filepath = os.path.join(UPLOADS_DIR, filename)
            if os.path.exists(filepath):
                try:
                    with PILImage.open(filepath) as pil_im:
                        pil_im = pil_im.convert("RGB")
                        pil_im.thumbnail(max_size, PILImage.Resampling.LANCZOS)
                        img_buf = io.BytesIO()
                        pil_im.save(img_buf, format="PNG", optimize=True)
                        img_buf.seek(0)
                except Exception:
                    img_buf = create_placeholder_thumbnail(os.path.splitext(filename)[0][:8])
                    
        # Check static directory
        elif url.startswith("/api/static/") or url.startswith("/static/"):
            filename = url.replace("/api/static/", "").replace("/static/", "").strip()
            filepath = os.path.join(STATIC_DIR, filename)
            if os.path.exists(filepath):
                if filename.lower().endswith(".svg") or filename.lower().endswith(".png"):
                    # Check if true raster image
                    try:
                        with PILImage.open(filepath) as pil_im:
                            pil_im = pil_im.convert("RGB")
                            pil_im.thumbnail(max_size, PILImage.Resampling.LANCZOS)
                            img_buf = io.BytesIO()
                            pil_im.save(img_buf, format="PNG", optimize=True)
                            img_buf.seek(0)
                    except Exception:
                        img_buf = create_placeholder_thumbnail(os.path.splitext(filename)[0])
                        
        # Check Base64 data URL
        elif url.startswith("data:image/"):
            header, encoded = url.split(",", 1)
            raw_data = base64.b64decode(encoded)
            with PILImage.open(io.BytesIO(raw_data)) as pil_im:
                pil_im = pil_im.convert("RGB")
                pil_im.thumbnail(max_size, PILImage.Resampling.LANCZOS)
                img_buf = io.BytesIO()
                pil_im.save(img_buf, format="PNG", optimize=True)
                img_buf.seek(0)
                
    except Exception as e:
        print(f"Notice: Failed to process image {url}: {e}")
        img_buf = create_placeholder_thumbnail("SAMPLE")
        
    if img_buf:
        xl_img = OpenpyxlImage(img_buf)
        # Re-inspect size
        with PILImage.open(img_buf) as check_im:
            w, h = check_im.size
            xl_img.width = w
            xl_img.height = h
        img_buf.seek(0)
        return xl_img, url
        
    return None

def parse_all_photos(photo_str: Optional[str]) -> List[str]:
    """Return all photo URLs in a comma-separated string."""
    if not photo_str:
        return []
    return [p.strip() for p in str(photo_str).split(",") if p.strip()]

def generate_complaints_excel(
    complaints: List[Dict[str, Any]],
    filter_summary: Optional[str] = None
) -> io.BytesIO:
    """
    Builds a comprehensive, professionally styled Excel report (.xlsx)
    containing all complaint information across all 4 stages (Sales Intake, QA Review,
    CEO Decision, Warehouse Fulfillment) with embedded photographic evidence thumbnails
    and a dedicated Photo Gallery sheet.
    """
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------------------
    # Styles & Palettes
    # -------------------------------------------------------------------------
    font_title = Font(name="Segoe UI", size=16, bold=True, color="FFFFFF")
    font_sub = Font(name="Segoe UI", size=9, italic=True, color="E2E8F0")
    font_section = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    font_header = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    font_data = Font(name="Segoe UI", size=9.5, color="1F2937")
    font_data_bold = Font(name="Segoe UI", size=9.5, bold=True, color="111827")
    font_link = Font(name="Segoe UI", size=9, underline="single", color="0284C7")
    
    fill_title = PatternFill(start_color=COLOR_PRIMARY_DARK, end_color=COLOR_PRIMARY_DARK, fill_type="solid")
    fill_sec_sales = PatternFill(start_color=COLOR_PRIMARY_MID, end_color=COLOR_PRIMARY_MID, fill_type="solid")
    fill_sec_qa = PatternFill(start_color=COLOR_HEADER_QA, end_color=COLOR_HEADER_QA, fill_type="solid")
    fill_sec_ceo = PatternFill(start_color=COLOR_HEADER_CEO, end_color=COLOR_HEADER_CEO, fill_type="solid")
    fill_sec_wh = PatternFill(start_color=COLOR_HEADER_WH, end_color=COLOR_HEADER_WH, fill_type="solid")
    
    fill_row_even = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    fill_row_odd = PatternFill(start_color=COLOR_ZEBRA_ROW, end_color=COLOR_ZEBRA_ROW, fill_type="solid")
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center", wrap_text=True)
    
    border_thin = Border(
        left=Side(style="thin", color=COLOR_BORDER_LIGHT),
        right=Side(style="thin", color=COLOR_BORDER_LIGHT),
        top=Side(style="thin", color=COLOR_BORDER_LIGHT),
        bottom=Side(style="thin", color=COLOR_BORDER_LIGHT),
    )
    
    # -------------------------------------------------------------------------
    # Sheet 1: Master Complaints Sheet
    # -------------------------------------------------------------------------
    ws_main = wb.active
    ws_main.title = "Complaints Master Record"
    ws_main.views.sheetView[0].showGridLines = True
    
    # Title Banner Rows (Row 1 & 2)
    ws_main.merge_cells("A1:AJ1")
    ws_main["A1"] = "SONAVITH - DEFECTIVE PRODUCT REPORT & RESOLUTION REGISTER"
    ws_main["A1"].font = font_title
    ws_main["A1"].fill = fill_title
    ws_main["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_main.row_dimensions[1].height = 36
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    summary_text = f"Generated: {now_str} | Filter: {filter_summary or 'All Active Records'} | Total Complaints: {len(complaints)} records"
    ws_main.merge_cells("A2:AJ2")
    ws_main["A2"] = summary_text
    ws_main["A2"].font = font_sub
    ws_main["A2"].fill = fill_title
    ws_main["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_main.row_dimensions[2].height = 20
    
    # Section Category Headers (Row 3)
    # 1. Sales & Intake: A3:U3 (21 cols)
    # 2. QA Review: V3:AA3 (6 cols)
    # 3. CEO Decision: AB3:AD3 (3 cols)
    # 4. Warehouse Fulfillment: AE3:AI3 (5 cols)
    # 5. Metadata: AJ3:AJ3 (1 col)
    category_ranges = [
        ("A3:U3", "STAGE 1: SALES INTAKE & DEFECT DETAILS", fill_sec_sales),
        ("V3:AA3", "STAGE 2: QUALITY ASSURANCE (QA) REVIEW", fill_sec_qa),
        ("AB3:AD3", "STAGE 3: CEO EXECUTIVE DECISION", fill_sec_ceo),
        ("AE3:AI3", "STAGE 4: WAREHOUSE REPLACEMENT FULFILLMENT", fill_sec_wh),
        ("AJ3:AJ3", "SYSTEM AUDIT", fill_sec_sales),
    ]
    for cell_range, title, fill in category_ranges:
        ws_main.merge_cells(cell_range)
        first_cell = cell_range.split(":")[0]
        ws_main[first_cell] = title
        ws_main[first_cell].font = font_section
        ws_main[first_cell].fill = fill
        ws_main[first_cell].alignment = align_center
    ws_main.row_dimensions[3].height = 26
    
    # Column Field Headers (Row 4)
    columns_spec = [
        # (Col Index, Header Name, Width, Alignment)
        (1, "ID", 22, align_center),
        (2, "Status", 17, align_center),
        (3, "Com.Date", 15, align_center),
        (4, "Sales Rep", 18, align_left),
        (5, "Customer Name", 26, align_left),
        (6, "Customer Location", 28, align_left),
        (7, "Customer Contact", 16, align_left),
        (8, "Product Name", 30, align_left),
        (9, "Product Code", 14, align_center),
        (10, "Defect Type", 20, align_left),
        (11, "QTY", 13, align_right),
        (12, "UOM", 12, align_center),
        (13, "EXP", 14, align_center),
        (14, "Code", 13, align_center),
        (15, "Pro.Time", 15, align_center),
        (16, "SO #", 16, align_center),
        (17, "Order QTY", 13, align_right),
        (18, "Price Discount", 15, align_center),
        (19, "Shipment Date", 15, align_center),
        (20, "Sales Storage Temp", 18, align_center),
        (21, "Defect Photo", 18, align_center),
        # QA Review
        (22, "QA Inspector", 18, align_left),
        (23, "Customer Storage Temp", 20, align_center),
        (24, "QA Confirmed Qty", 16, align_right),
        (25, "Batch Inspection", 26, align_left),
        (26, "Root Cause Notes", 34, align_left),
        (27, "QA Recommendation", 20, align_center),
        # CEO Decision
        (28, "CEO Reviewer", 18, align_left),
        (29, "CEO Decision", 16, align_center),
        (30, "Executive Comments", 34, align_left),
        # Warehouse Fulfillment
        (31, "Warehouse Officer", 18, align_left),
        (32, "Replacement Batch", 22, align_center),
        (33, "Dispatch Date", 15, align_center),
        (34, "Dispatched Qty", 15, align_right),
        (35, "Delivery Notes", 34, align_left),
        # Audit
        (36, "Logged Timestamp", 20, align_center),
    ]
    
    ws_main.row_dimensions[4].height = 28
    
    for col_idx, col_name, width, _ in columns_spec:
        cell = ws_main.cell(row=4, column=col_idx, value=col_name)
        cell.font = font_header
        cell.alignment = align_center
        cell.border = border_thin
        # Choose header fill based on category
        if col_idx <= 21:
            cell.fill = fill_sec_sales
        elif col_idx <= 27:
            cell.fill = fill_sec_qa
        elif col_idx <= 30:
            cell.fill = fill_sec_ceo
        elif col_idx <= 35:
            cell.fill = fill_sec_wh
        else:
            cell.fill = fill_sec_sales
            
        col_letter = get_column_letter(col_idx)
        ws_main.column_dimensions[col_letter].width = width

    # Enable freeze panes so headers stay visible when scrolling
    ws_main.freeze_panes = "C5"
    
    # -------------------------------------------------------------------------
    # Populate Complaints Data Rows
    # -------------------------------------------------------------------------
    row_idx = 5
    for item in complaints:
        fill_curr = fill_row_even if row_idx % 2 == 1 else fill_row_odd
        ws_main.row_dimensions[row_idx].height = 62  # ample height for photo thumbnail
        
        qa = item.get("qa_review") or {}
        ceo = item.get("ceo_decision") or {}
        wh = item.get("warehouse_fulfillment") or {}
        
        row_values = [
            item.get("id", ""),
            item.get("status", "Pending QA"),
            item.get("complaint_date", ""),
            item.get("sales_rep_name", ""),
            item.get("customer_name", ""),
            item.get("customer_location", ""),
            item.get("customer_contact", ""),
            item.get("product_name", ""),
            item.get("product_short_code", ""),
            item.get("defect_type", ""),
            item.get("defect_quantity", 0),
            item.get("unit_of_measure", ""),
            item.get("product_expiry_date", ""),
            item.get("manufacturing_code", ""),
            item.get("production_batch", ""),
            item.get("so_number", "") or "—",
            item.get("order_quantity") if item.get("order_quantity") is not None else "—",
            item.get("price_discount", "") or "—",
            item.get("shipment_date", "") or "—",
            item.get("storage_temp", "") or "—",
            "", # Photo cell in column 21 (U)
            # QA
            qa.get("inspector_name", "") if qa else "",
            qa.get("customer_storage_temperature", "") if qa else "",
            qa.get("confirmed_defect_quantity", "") if qa else "",
            qa.get("batch_status", "") if qa else "",
            qa.get("root_cause_notes", "") if qa else "",
            qa.get("recommendation", "") if qa else "",
            # CEO
            ceo.get("reviewer_name", "") if ceo else "",
            ceo.get("decision", "") if ceo else "",
            ceo.get("comments", "") if ceo else "",
            # Warehouse
            wh.get("officer_name", "") if wh else "",
            wh.get("replacement_batch", "") if wh else "",
            wh.get("dispatch_date", "") if wh else "",
            wh.get("dispatched_quantity", "") if wh else "",
            wh.get("delivery_notes", "") if wh else "",
            # Audit
            item.get("created_at", ""),
        ]
        
        for col_idx, val in enumerate(row_values, start=1):
            cell = ws_main.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_data
            cell.fill = fill_curr
            cell.border = border_thin
            _, _, _, col_align = columns_spec[col_idx - 1]
            cell.alignment = col_align
            
            # Formatting specials
            if col_idx == 1:
                cell.font = font_data_bold
                
            # Status badge styling
            if col_idx == 2:
                status_str = str(val).strip()
                if status_str in STATUS_STYLES:
                    cell.fill = STATUS_STYLES[status_str]["fill"]
                    cell.font = STATUS_STYLES[status_str]["font"]
                    
            # Numbers
            if col_idx in [11, 17, 24, 34] and isinstance(val, (int, float)):
                cell.number_format = "#,##0"
                
        # Embed Photo Image in Column 21 (U)
        photo_field = item.get("photo_url")
        resolved = resolve_photo_image(photo_field, max_size=(82, 54))
        if resolved:
            xl_img, original_url = resolved
            # Add to cell U{row_idx}
            ws_main.add_image(xl_img, f"U{row_idx}")
        else:
            cell_p = ws_main.cell(row=row_idx, column=21, value="No photo")
            cell_p.font = Font(name="Segoe UI", size=8.5, color="9CA3AF", italic=True)
            cell_p.alignment = align_center

        row_idx += 1
        
    # Auto-filter over all data
    ws_main.auto_filter.ref = f"A4:AJ{max(row_idx - 1, 4)}"

    # -------------------------------------------------------------------------
    # Sheet 2: Photo Evidence Gallery Sheet
    # -------------------------------------------------------------------------
    ws_photos = wb.create_sheet(title="Photo Evidence Gallery")
    ws_photos.views.sheetView[0].showGridLines = True
    
    ws_photos.merge_cells("A1:F1")
    ws_photos["A1"] = "SONAVITH - DEFECTIVE PRODUCT PHOTOGRAPHIC EVIDENCE REPOSITORY"
    ws_photos["A1"].font = font_title
    ws_photos["A1"].fill = fill_title
    ws_photos["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_photos.row_dimensions[1].height = 36
    
    ws_photos.merge_cells("A2:F2")
    ws_photos["A2"] = f"Visual archive of uploaded proof photos for defect verification | Generated {now_str}"
    ws_photos["A2"].font = font_sub
    ws_photos["A2"].fill = fill_title
    ws_photos["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_photos.row_dimensions[2].height = 20
    
    gallery_headers = [
        (1, "Complaint ID", 22, align_center),
        (2, "Customer Name", 26, align_left),
        (3, "Product & Defect", 30, align_left),
        (4, "Photo #", 12, align_center),
        (5, "Visual Evidence Preview", 32, align_center),
        (6, "Direct File Reference", 44, align_left),
    ]
    
    ws_photos.row_dimensions[3].height = 26
    for col_idx, col_name, width, _ in gallery_headers:
        c = ws_photos.cell(row=3, column=col_idx, value=col_name)
        c.font = font_header
        c.fill = fill_sec_sales
        c.alignment = align_center
        c.border = border_thin
        ws_photos.column_dimensions[get_column_letter(col_idx)].width = width
        
    ws_photos.freeze_panes = "A4"
    
    p_row = 4
    has_photos = False
    
    for item in complaints:
        photos = parse_all_photos(item.get("photo_url"))
        if not photos:
            continue
            
        for p_idx, p_url in enumerate(photos, start=1):
            has_photos = True
            fill_p = fill_row_even if p_row % 2 == 1 else fill_row_odd
            ws_photos.row_dimensions[p_row].height = 95
            
            c1 = ws_photos.cell(row=p_row, column=1, value=item.get("id", ""))
            c1.font = font_data_bold
            c1.alignment = align_center
            c1.fill = fill_p
            c1.border = border_thin
            
            c2 = ws_photos.cell(row=p_row, column=2, value=item.get("customer_name", ""))
            c2.font = font_data
            c2.alignment = align_left
            c2.fill = fill_p
            c2.border = border_thin
            
            c3 = ws_photos.cell(row=p_row, column=3, value=f"{item.get('product_name', '')} ({item.get('defect_type', '')})")
            c3.font = font_data
            c3.alignment = align_left
            c3.fill = fill_p
            c3.border = border_thin
            
            c4 = ws_photos.cell(row=p_row, column=4, value=f"{p_idx} of {len(photos)}")
            c4.font = font_data
            c4.alignment = align_center
            c4.fill = fill_p
            c4.border = border_thin
            
            # Photo Preview Cell
            c5 = ws_photos.cell(row=p_row, column=5, value="")
            c5.fill = fill_p
            c5.border = border_thin
            
            # Direct link / URL
            c6 = ws_photos.cell(row=p_row, column=6, value=p_url)
            c6.font = font_link
            c6.alignment = align_left
            c6.fill = fill_p
            c6.border = border_thin
            
            # Embed larger image
            resolved = resolve_photo_image(p_url, max_size=(160, 85))
            if resolved:
                xl_img, _ = resolved
                ws_photos.add_image(xl_img, f"E{p_row}")
                
            p_row += 1

        # Also archive QA Storage Temperature photos if present
        qa_data = item.get("qa_review") or {}
        temp_photo = qa_data.get("storage_temperature_photo_url")
        temp_photos = parse_all_photos(temp_photo) if temp_photo else []
        for tp_idx, tp_url in enumerate(temp_photos, start=1):
            has_photos = True
            fill_p = fill_row_even if p_row % 2 == 1 else fill_row_odd
            ws_photos.row_dimensions[p_row].height = 95
            
            c1 = ws_photos.cell(row=p_row, column=1, value=item.get("id", ""))
            c1.font = font_data_bold
            c1.alignment = align_center
            c1.fill = fill_p
            c1.border = border_thin
            
            c2 = ws_photos.cell(row=p_row, column=2, value=item.get("customer_name", ""))
            c2.font = font_data
            c2.alignment = align_left
            c2.fill = fill_p
            c2.border = border_thin
            
            storage_temp = qa_data.get("customer_storage_temperature", "N/A")
            c3 = ws_photos.cell(row=p_row, column=3, value=f"QA Storage Temp ({storage_temp})")
            c3.font = font_data
            c3.alignment = align_left
            c3.fill = fill_p
            c3.border = border_thin
            
            c4 = ws_photos.cell(row=p_row, column=4, value=f"Temp Proof {tp_idx}/{len(temp_photos)}")
            c4.font = font_data
            c4.alignment = align_center
            c4.fill = fill_p
            c4.border = border_thin
            
            c5 = ws_photos.cell(row=p_row, column=5, value="")
            c5.fill = fill_p
            c5.border = border_thin
            
            c6 = ws_photos.cell(row=p_row, column=6, value=tp_url)
            c6.font = font_link
            c6.alignment = align_left
            c6.fill = fill_p
            c6.border = border_thin
            
            resolved = resolve_photo_image(tp_url, max_size=(160, 85))
            if resolved:
                xl_img, _ = resolved
                ws_photos.add_image(xl_img, f"E{p_row}")
                
            p_row += 1
            
    if not has_photos:
        empty_cell = ws_photos.cell(row=4, column=1, value="No photos attached to the current records.")
        empty_cell.font = Font(name="Segoe UI", size=10, italic=True)
        ws_photos.merge_cells("A4:F4")
        
    ws_photos.auto_filter.ref = f"A3:F{max(p_row - 1, 3)}"

    # -------------------------------------------------------------------------
    # Sheet 3: Executive Summary & Statistics
    # -------------------------------------------------------------------------
    ws_sum = wb.create_sheet(title="Executive Summary")
    ws_sum.views.sheetView[0].showGridLines = True
    
    ws_sum.merge_cells("A1:D1")
    ws_sum["A1"] = "SONAVITH - DEFECTIVE PRODUCT REPORT EXECUTIVE SUMMARY"
    ws_sum["A1"].font = font_title
    ws_sum["A1"].fill = fill_title
    ws_sum["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_sum.row_dimensions[1].height = 36
    
    ws_sum.merge_cells("A2:D2")
    ws_sum["A2"] = f"Statistical breakdown of status, defect types, and fulfillment metrics | As of {now_str}"
    ws_sum["A2"].font = font_sub
    ws_sum["A2"].fill = fill_title
    ws_sum["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_sum.row_dimensions[2].height = 20
    
    # Status Counts
    status_counts = {}
    defect_counts = {}
    total_qty = 0
    
    for c in complaints:
        st = c.get("status") or "Unknown"
        status_counts[st] = status_counts.get(st, 0) + 1
        
        dt = c.get("defect_type") or "Unspecified"
        defect_counts[dt] = defect_counts.get(dt, 0) + 1
        
        try:
            total_qty += int(c.get("defect_quantity") or 0)
        except Exception:
            pass
            
    # Metrics Table 1: Status Distribution
    ws_sum.cell(row=4, column=1, value="Status Breakdown").font = Font(name="Segoe UI", size=12, bold=True, color=COLOR_PRIMARY_DARK)
    ws_sum.cell(row=5, column=1, value="Workflow Stage").font = font_header
    ws_sum.cell(row=5, column=1).fill = fill_sec_sales
    ws_sum.cell(row=5, column=1).alignment = align_left
    ws_sum.cell(row=5, column=2, value="Complaints Count").font = font_header
    ws_sum.cell(row=5, column=2).fill = fill_sec_sales
    ws_sum.cell(row=5, column=2).alignment = align_right
    
    s_row = 6
    for st, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        c1 = ws_sum.cell(row=s_row, column=1, value=st)
        c1.font = font_data
        c1.border = border_thin
        if st in STATUS_STYLES:
            c1.fill = STATUS_STYLES[st]["fill"]
            c1.font = STATUS_STYLES[st]["font"]
            
        c2 = ws_sum.cell(row=s_row, column=2, value=count)
        c2.font = font_data_bold
        c2.alignment = align_right
        c2.border = border_thin
        s_row += 1
        
    # Total row
    c_tot1 = ws_sum.cell(row=s_row, column=1, value="Total Complaints")
    c_tot1.font = font_data_bold
    c_tot1.border = border_thin
    c_tot2 = ws_sum.cell(row=s_row, column=2, value=len(complaints))
    c_tot2.font = font_data_bold
    c_tot2.alignment = align_right
    c_tot2.border = border_thin
    
    # Metrics Table 2: Top Defect Types
    ws_sum.cell(row=4, column=3, value="Defect Types Distribution").font = Font(name="Segoe UI", size=12, bold=True, color=COLOR_PRIMARY_DARK)
    ws_sum.cell(row=5, column=3, value="Defect Category").font = font_header
    ws_sum.cell(row=5, column=3).fill = fill_sec_qa
    ws_sum.cell(row=5, column=3).alignment = align_left
    ws_sum.cell(row=5, column=4, value="Occurrences").font = font_header
    ws_sum.cell(row=5, column=4).fill = fill_sec_qa
    ws_sum.cell(row=5, column=4).alignment = align_right
    
    d_row = 6
    for dt, count in sorted(defect_counts.items(), key=lambda x: x[1], reverse=True):
        c3 = ws_sum.cell(row=d_row, column=3, value=dt)
        c3.font = font_data
        c3.border = border_thin
        c4 = ws_sum.cell(row=d_row, column=4, value=count)
        c4.font = font_data_bold
        c4.alignment = align_right
        c4.border = border_thin
        d_row += 1
        
    c_dtot3 = ws_sum.cell(row=d_row, column=3, value="Total Units Reported")
    c_dtot3.font = font_data_bold
    c_dtot3.border = border_thin
    c_dtot4 = ws_sum.cell(row=d_row, column=4, value=total_qty)
    c_dtot4.font = font_data_bold
    c_dtot4.alignment = align_right
    c_dtot4.border = border_thin
    
    ws_sum.column_dimensions["A"].width = 28
    ws_sum.column_dimensions["B"].width = 20
    ws_sum.column_dimensions["C"].width = 30
    ws_sum.column_dimensions["D"].width = 20
    
    # Output to in-memory buffer
    output_buffer = io.BytesIO()
    wb.save(output_buffer)
    output_buffer.seek(0)
    return output_buffer
