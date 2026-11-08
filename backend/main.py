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
    StockReturnRequest,
    StockReturnQASignOffRequest,
    DisposalRequest,
    BatchDisposalRequest,
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
    user = database.get_user_by_email(form_data.username.strip().lower())
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    user_role = user.get("role") or ("Admin" if user.get("is_admin") else "Sale")
    formatted_user = database.get_user_by_id(user["id"])
    perms = formatted_user.get("permissions") if formatted_user else database.get_default_permissions_for_role(user_role)
    access_token = create_access_token(data={
        "sub": user["email"],
        "is_admin": user.get("is_admin", 0),
        "role": user_role
    })
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user["email"],
        "is_admin": user.get("is_admin", 0),
        "role": user_role,
        "permissions": perms
    }

# User and Stage Management Endpoints
@app.get("/api/users")
def list_users():
    return database.get_all_users()

@app.post("/api/users")
def add_user(payload: dict):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password")
    role = payload.get("role") or "Sale"
    is_admin = 1 if payload.get("is_admin") or role == "Admin" else 0
    if not email:
        raise HTTPException(status_code=400, detail="Google Email is required")
    if not (email.endswith("@gmail.com") or email.endswith("@googlemail.com")):
        raise HTTPException(status_code=400, detail="Must be a valid Google email address (@gmail.com)")
    if not password or len(password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password assigned by admin must be at least 6 characters")
    existing = database.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail=f"User with Google email '{email}' already exists")
    user = database.create_user(email=email, password=password.strip(), role=role, is_admin=is_admin)
    return user

@app.put("/api/users/{user_id}/access")
def update_user_access_endpoint(user_id: str, payload: dict):
    role = payload.get("role", "Sale")
    is_admin = 1 if payload.get("is_admin") or role == "Admin" else 0
    new_password = payload.get("password")
    database.update_user_access(user_id, is_admin, role, password=new_password)
    return {"status": "success", "user_id": user_id, "is_admin": is_admin, "role": role}

@app.put("/api/users/{user_id}/permissions")
def update_permissions_endpoint(user_id: str, payload: dict):
    perms = {
        "can_view": payload.get("can_view", []),
        "can_edit": payload.get("can_edit", [])
    }
    updated = database.update_user_permissions(user_id, perms)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "user": updated}

@app.delete("/api/users/{user_id}")
def delete_user_endpoint(user_id: str):
    database.delete_user(user_id)
    return {"status": "success", "message": "User deleted"}

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

@app.post("/api/complaints/{complaint_id}/stock-return")
def submit_stock_return(complaint_id: str, data: StockReturnRequest):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    updated = database.update_stock_return(complaint_id, payload)
    return updated

@app.post("/api/complaints/{complaint_id}/stock-return/sign-off")
def submit_stock_return_qa_signoff(complaint_id: str, data: StockReturnQASignOffRequest):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    updated = database.update_stock_return_qa_signoff(complaint_id, payload)
    return updated

@app.post("/api/complaints/batch-disposal")
def submit_batch_disposal(data: BatchDisposalRequest):
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    complaint_ids = payload.get("complaint_ids") or []
    if not complaint_ids:
        raise HTTPException(status_code=400, detail="No complaints specified for batch disposal")
    updated_list = database.update_batch_disposal(complaint_ids, payload)
    return {"status": "success", "updated_count": len(updated_list), "complaints": updated_list}

@app.post("/api/complaints/{complaint_id}/disposal")
def submit_disposal(complaint_id: str, data: DisposalRequest):
    complaint = database.get_complaint_by_id(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    payload = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    updated = database.update_disposal(complaint_id, payload)
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

# Defect Types Masterlist Endpoints
@app.get("/api/defect-types")
def get_defect_types():
    return database.get_defect_types()

@app.post("/api/defect-types")
def add_defect_type(payload: dict):
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Defect type name is required")
    created = database.add_defect_type(payload)
    return created

@app.post("/api/defect-types/bulk")
def add_defect_types_bulk(data: List[dict]):
    count = database.add_defect_types_bulk(data)
    return {"status": "success", "message": f"{count} defect types processed"}

@app.delete("/api/defect-types/{defect_id}")
def delete_defect_type(defect_id: str):
    database.delete_defect_type(defect_id)
    return {"status": "success", "message": "Defect type deleted"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    raw_ext = (os.path.splitext(file.filename or "")[1] or ".png").lower()
    safe_filename = f"{uuid.uuid4().hex}{raw_ext}"
    file_path = os.path.join(UPLOADS_DIR, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Automatically convert HEIC / HEIF / HEC images to browser-compatible JPEG
    if raw_ext in (".heic", ".heif", ".hec"):
        try:
            import pillow_heif
            from PIL import Image
            pillow_heif.register_heif_opener()
            jpg_filename = f"{os.path.splitext(safe_filename)[0]}.jpg"
            jpg_path = os.path.join(UPLOADS_DIR, jpg_filename)
            with Image.open(file_path) as img:
                rgb_img = img.convert("RGB")
                rgb_img.save(jpg_path, format="JPEG", quality=90)
            try:
                os.remove(file_path)
            except Exception:
                pass
            safe_filename = jpg_filename
        except Exception as e:
            print(f"Notice: HEIC conversion fallback for {safe_filename}: {e}")

    return {"url": f"/uploads/{safe_filename}", "filename": safe_filename}

@app.post("/api/reset-data")
def reset_data(admin: dict = Depends(get_current_admin)):
    # Protect live data: allow disabling reset-data in production environment
    if os.getenv("DISABLE_RESET_DEMO", "false").lower() in ("true", "1", "yes"):
        raise HTTPException(
            status_code=403,
            detail="Reset Demo function is disabled in production to protect live data."
        )
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
