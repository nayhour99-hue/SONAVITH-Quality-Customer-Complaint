from datetime import datetime, timedelta
from database import get_connection, create_complaint

def get_current_seed_complaints():
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")
    today_id = f"FFCM-{today.strftime('%Y%m%d')}-001"

    # Week sample (e.g. 2 days ago if within same week, or Monday of current week)
    days_back = min(2, today.weekday()) if today.weekday() > 0 else 0
    week_date = today - timedelta(days=days_back)
    week_str = week_date.strftime("%Y-%m-%d")
    week_id = f"FFAF-{week_date.strftime('%Y%m%d')}-002"

    # Month sample (1st of current month)
    month_date = today.replace(day=1)
    month_str = month_date.strftime("%Y-%m-%d")
    month_id = f"FFCF-{month_date.strftime('%Y%m%d')}-003"

    items = [
        {
            "id": today_id,
            "sales_rep_name": "Sophea Chea",
            "customer_name": "Babaris coffee",
            "customer_location": "Tekthla Condo",
            "customer_contact": "012-984-231",
            "complaint_date": today_str,
            "product_name": "2000cc Farm Fresh Cows Milk",
            "product_short_code": "FFCM",
            "defect_type": "Off smell/taste",
            "defect_quantity": 6,
            "unit_of_measure": "2L-BTL",
            "product_expiry_date": (today + timedelta(days=7)).strftime("%Y-%m-%d"),
            "manufacturing_code": "MAC",
            "production_batch": "12:00",
            "price_discount": "5% Promo",
            "storage_temp": "3.5°C",
            "shipment_date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            "photo_url": "/api/static/sample1.svg",
            "status": "Pending QA",
            "created_at": f"{today_str}T08:30:00"
        }
    ]

    if week_id != today_id:
        items.append({
            "id": week_id,
            "sales_rep_name": "Dara Sok",
            "customer_name": "BROWN BKK",
            "customer_location": "https://maps.google.com/?q=Brown+Coffee+BKK1+Phnom+Penh",
            "customer_contact": "023-215-688",
            "complaint_date": week_str,
            "product_name": "Farm Fresh AusFresh",
            "product_short_code": "FFAF",
            "defect_type": "Packaging leak",
            "defect_quantity": 12,
            "unit_of_measure": "2L-BTL",
            "product_expiry_date": (week_date + timedelta(days=7)).strftime("%Y-%m-%d"),
            "manufacturing_code": "MAC",
            "production_batch": "09:00 AM",
            "photo_url": "/api/static/sample2.svg",
            "status": "Pending approval",
            "created_at": f"{week_str}T10:15:00",
            "qa_review": {
                "inspector_name": "Dr. Chanreth",
                "customer_storage_temperature": "4.0°C",
                "storage_temperature_photo_url": "/api/static/sample_storage_temp.svg",
                "confirmed_defect_quantity": 12,
                "batch_status": "Batch seal micro-fracture confirmed",
                "root_cause_notes": "Chilled chain stable at 4.0°C; bottle cap seal micro-tear during shipping",
                "recommendation": "Recommend Exchange"
            }
        })

    if month_id != today_id and month_id != week_id:
        items.append({
            "id": month_id,
            "sales_rep_name": "Chanthy Mao",
            "customer_name": "Bong Tho",
            "customer_location": "Sensok",
            "customer_contact": "098-771-209",
            "complaint_date": month_str,
            "product_name": "Farm Fresh Cow Fresh",
            "product_short_code": "FFCF",
            "defect_type": "Physical damage",
            "defect_quantity": 5,
            "unit_of_measure": "1L-BTL",
            "product_expiry_date": (month_date + timedelta(days=7)).strftime("%Y-%m-%d"),
            "manufacturing_code": "MAC",
            "production_batch": "02:00 PM",
            "photo_url": "/api/static/sample3.svg",
            "status": "Approved",
            "created_at": f"{month_str}T14:20:00",
            "qa_review": {
                "inspector_name": "Dr. Chanreth",
                "customer_storage_temperature": "3.8°C",
                "storage_temperature_photo_url": "/api/static/sample_storage_temp.svg",
                "confirmed_defect_quantity": 5,
                "batch_status": "External carton deformation verified",
                "root_cause_notes": "Carton collapse under pallet weight during unloading; verified storage cold room 3.8°C",
                "recommendation": "Recommend Exchange"
            },
            "ceo_decision": {
                "reviewer_name": "Executive Director",
                "decision": "Approved",
                "comments": "Approved replacement of 5 1L-BTL based on QA confirmed quantity and verified proper storage."
            }
        })

    return items

SEED_COMPLAINTS = [
    {
        "id": "FFCM-20260919-001",
        "sales_rep_name": "Sophea Chea",
        "customer_name": "Babaris coffee",
        "customer_location": "Tekthla Condo",
        "customer_contact": "012-984-231",
        "complaint_date": "2026-09-19",
        "product_name": "2000cc Farm Fresh Cows Milk",
        "product_short_code": "FFCM",
        "defect_type": "Off smell/taste",
        "defect_quantity": 7,
        "unit_of_measure": "2L-BTL",
        "product_expiry_date": "2026-09-26",
        "manufacturing_code": "MAC",
        "production_batch": "12:00",
        "photo_url": "/api/static/sample1.svg",
        "status": "Pending QA",
        "created_at": "2026-09-19T08:30:00"
    },
    {
        "id": "FFCM-20260917-004",
        "sales_rep_name": "Dara Sok",
        "customer_name": "BROWN BKK",
        "customer_location": "https://maps.google.com/?q=Brown+Coffee+BKK1+Phnom+Penh",
        "customer_contact": "023-215-688",
        "complaint_date": "2026-09-17",
        "product_name": "2000cc Farm Fresh Cows Milk",
        "product_short_code": "FFCM",
        "defect_type": "Off smell/taste",
        "defect_quantity": 130,
        "unit_of_measure": "2L-BTL",
        "product_expiry_date": "2026-09-22",
        "manufacturing_code": "MAC",
        "production_batch": "12:00 AM",
        "photo_url": "/api/static/sample2.svg",
        "status": "Pending QA",
        "created_at": "2026-09-17T14:15:00"
    },
    {
        "id": "FFAF-20260917-003",
        "sales_rep_name": "Chanthy Mao",
        "customer_name": "Bong Tho",
        "customer_location": "Sensok",
        "customer_contact": "098-771-209",
        "complaint_date": "2026-09-17",
        "product_name": "Farm Fresh AusFresh",
        "product_short_code": "FFAF",
        "defect_type": "Physical damage",
        "defect_quantity": 11,
        "unit_of_measure": "2L-BTL",
        "product_expiry_date": "2026-09-27",
        "manufacturing_code": "MAC",
        "production_batch": "1:00",
        "photo_url": "/api/static/sample3.svg",
        "status": "Pending QA",
        "created_at": "2026-09-17T11:40:00"
    },
    {
        "id": "FFCF-20260917-001",
        "sales_rep_name": "Sophea Chea",
        "customer_name": "Lyneath",
        "customer_location": "No. A49, Street Camko, Sangkat Toul Sangke, Khan Russey Keo, Phnom Penh, Cambodia.",
        "customer_contact": "077-440-182",
        "complaint_date": "2026-09-17",
        "product_name": "Farm Fresh Cow Fresh",
        "product_short_code": "FFCF",
        "defect_type": "Off smell/taste",
        "defect_quantity": 2,
        "unit_of_measure": "L",
        "product_expiry_date": "2026-09-22",
        "manufacturing_code": "MAC",
        "production_batch": "12:00 AM",
        "photo_url": "/api/static/sample4.svg",
        "status": "Pending QA",
        "created_at": "2026-09-17T09:20:00"
    },
    {
        "id": "FFCM-20260917-001",
        "sales_rep_name": "Piseth Yun",
        "customer_name": "Leapp",
        "customer_location": "BKK",
        "customer_contact": "081-332-901",
        "complaint_date": "2026-09-17",
        "product_name": "Farm Fresh Cow Milk",
        "product_short_code": "FFCM",
        "defect_type": "Physical damage",
        "defect_quantity": 4,
        "unit_of_measure": "2L-BTL",
        "product_expiry_date": "2026-09-22",
        "manufacturing_code": "MAC",
        "production_batch": "12:00",
        "photo_url": "/api/static/sample5.svg",
        "status": "Pending QA",
        "created_at": "2026-09-17T08:10:00"
    },
    {
        "id": "DPR-20260916-6A9K",
        "sales_rep_name": "Dara Sok",
        "customer_name": "Leap",
        "customer_location": "Tekthla",
        "customer_contact": "011-550-429",
        "complaint_date": "2026-09-16",
        "product_name": "Fresh Milk Cow Milk",
        "product_short_code": "DPR",
        "defect_type": "Physical damage",
        "defect_quantity": 6,
        "unit_of_measure": "—",
        "product_expiry_date": "2026-09-22",
        "manufacturing_code": "MAC",
        "production_batch": "12:00",
        "photo_url": "/api/static/sample6.svg",
        "status": "Pending QA",
        "created_at": "2026-09-16T16:05:00"
    }
]

def seed_database_if_empty():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM complaints")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        print(f"Seeding reference complaints into database...")
        for item in SEED_COMPLAINTS:
            create_complaint(item)
        for item in get_current_seed_complaints():
            create_complaint(item)
        print("Database seeding completed.")
