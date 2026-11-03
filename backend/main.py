import os
import uuid
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from models import (
    ComplaintCreate,
    ComplaintResponse,
    QAReviewRequest,
    CEODecisionRequest,
    WarehouseFulfillRequest,
    Customer,
    Product
)
import database
import seed_data
import excel_exporter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app = FastAPI(title="SONAVITH Defective Product Report API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/api/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def on_startup():
    database.init_db()
    seed_data.seed_database_if_empty()

from fastapi.security import OAuth2PasswordRequestForm
from utils.dependencies import get_current_user, get_current_admin
from utils.auth import verify_password, create_access_token

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = database.get_user_by_email(form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user["email"], "is_admin": user.get("is_admin", 0)})
    return {"access_token": access_token, "token_type": "bearer"}

# Stage assignment endpoints
@app.get("/api/stage/{stage}/assignments")
def get_stage_assignments_endpoint(stage: int, admin: dict = Depends(get_current_admin)):
    return database.get_stage_assignments(stage)

@app.put("/api/stage/{stage}/assign")
def assign_user_to_stage_endpoint(stage: int, payload: dict, admin: dict = Depends(get_current_admin)):
    user_id = payload.get('user_id')
    assign = payload.get('assign')
    if assign:
        database.assign_user_to_stage(user_id, stage)
    else:
        database.remove_user_from_stage(user_id, stage)
    return {"status": "success", "stage": stage, "user_id": user_id, "assigned": bool(assign)}

@app.get("/api/users")
def list_users(admin: dict = Depends(get_current_admin)):
    return database.get_all_users()

@app.put("/api/users/{user_id}/role")
def set_user_role(user_id: str, is_admin: int, admin: dict = Depends(get_current_admin)):
    database.update_user_role(user_id, is_admin)
    return {"status": "success", "user_id": user_id, "is_admin": bool(is_admin)}

@app.get("/api/complaints")
def list_complaints(
    status: Optional[str] = None,
    search: Optional[str] = None,
    time_filter: Optional[str] = None,
    date_mode: Optional[str] = "complaint_date",
    date: Optional[str] = None,
    expiry_date: Optional[str] = None,
    shipment_date: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: Optional[str] = "desc",
    ref_date: Optional[str] = None
):
    return database.get_complaints(
        status=status,
        search=search,
        time_filter=time_filter,
        date_mode=date_mode,
        date_filter=date,
        expiry_date_filter=expiry_date,
        shipment_date_filter=shipment_date,
        sort_by=sort_by,
        order=order,
        ref_date=ref_date
    )

@app.get("/api/complaints/export-excel")
def export_complaints_excel(
    status: Optional[str] = None,
    search: Optional[str] = None,
    time_filter: Optional[str] = None,
    date_mode: Optional[str] = "complaint_date",
    date: Optional[str] = None,
    expiry_date: Optional[str] = None,
    shipment_date: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: Optional[str] = "desc",
    ref_date: Optional[str] = None
):
    complaints = database.get_complaints(
        status=status,
        search=search,
        time_filter=time_filter,
        date_mode=date_mode,
        date_filter=date,
        expiry_date_filter=expiry_date,
        shipment_date_filter=shipment_date,
        sort_by=sort_by,
        order=order,
        ref_date=ref_date
    )
    
    parts = []
    if status and status != "All":
        parts.append(f"Status: {status}")
    if time_filter and time_filter != "All time":
        parts.append(f"Period: {time_filter}")
    if date:
        parts.append(f"Complaint Date: {date}")
    if expiry_date:
        parts.append(f"Expiry Date: {expiry_date}")
    if search:
        parts.append(f"Search: '{search}'")
    filter_summary = " | ".join(parts) if parts else "All Complaints"

    buffer = excel_exporter.generate_complaints_excel(complaints, filter_summary=filter_summary)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"SONAVITH_Defective_Product_Reports_{timestamp}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@app.get("/api/complaints/{complaint_id}")
def get_complaint(complaint_id: str):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@app.post("/api/complaints")
def create_new_complaint(data: ComplaintCreate):
    new_complaint = database.create_complaint(data.dict())
    return new_complaint

@app.post("/api/complaints/{complaint_id}/qa")
def submit_qa_review(complaint_id: str, data: QAReviewRequest):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    updated = database.update_qa_review(complaint_id, payload)
    return updated

@app.post("/api/complaints/{complaint_id}/ceo")
def submit_ceo_decision(complaint_id: str, data: CEODecisionRequest):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    updated = database.update_ceo_decision(complaint_id, payload)
    return updated

@app.post("/api/complaints/{complaint_id}/warehouse")
def submit_warehouse_fulfillment(complaint_id: str, data: WarehouseFulfillRequest):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    updated = database.update_warehouse_fulfillment(complaint_id, payload)
    return updated

@app.get("/api/metrics")
def get_metrics(
    time_filter: Optional[str] = None,
    date_mode: Optional[str] = "complaint_date",
    sort_by: Optional[str] = None,
    order: Optional[str] = "desc",
    ref_date: Optional[str] = None
):
    return database.get_metrics_data(
        time_filter=time_filter,
        date_mode=date_mode,
        sort_by=sort_by,
        order=order,
        ref_date=ref_date
    )

@app.get("/api/customers")
def get_customers():
    return database.get_customers()

@app.post("/api/customers")
def add_customer(data: Customer):
    database.add_customer(data.dict() if hasattr(data, 'dict') else data.model_dump())
    return {"status": "success", "message": "Customer added"}

@app.post("/api/customers/bulk")
def add_customers_bulk(data: List[Customer]):
    raw_list = [item.dict() if hasattr(item, 'dict') else item.model_dump() for item in data]
    count = database.add_customers_bulk(raw_list)
    return {"status": "success", "message": f"{count} customers processed"}

@app.delete("/api/customers/clear")
def clear_all_customers():
    count = database.clear_customers()
    return {"status": "success", "message": f"{count} customers deleted"}

@app.delete("/api/customers/{customer_id}")
def remove_customer(customer_id: str):
    database.remove_customer(customer_id)
    return {"status": "success", "message": "Customer removed"}

@app.get("/api/products")
def get_products():
    return database.get_products()

@app.post("/api/products")
def add_product(data: Product):
    database.add_product(data.dict() if hasattr(data, 'dict') else data.model_dump())
    return {"status": "success", "message": "Product added"}

@app.post("/api/products/bulk")
def add_products_bulk(data: List[Product]):
    raw_list = [item.dict() if hasattr(item, 'dict') else item.model_dump() for item in data]
    count = database.add_products_bulk(raw_list)
    return {"status": "success", "message": f"{count} products processed"}

@app.delete("/api/products/{product_id}")
def remove_product(product_id: str):
    database.remove_product(product_id)
    return {"status": "success", "message": "Product removed"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1] or ".png"
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOADS_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/{safe_filename}", "filename": safe_filename}

@app.post("/api/reset-data")
def reset_data():
    conn = database.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM complaints")
    conn.commit()
    conn.close()
    for item in seed_data.SEED_COMPLAINTS:
        database.create_complaint(item)
    for item in seed_data.get_current_seed_complaints():
        database.create_complaint(item)
    return {"status": "success", "message": "Data reset to initial reference records"}

DIST_DIR = os.path.join(BASE_DIR, "..", "frontend", "dist")
if os.path.isdir(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
