import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List

def auto_format_discount(v: Any) -> str:
    if v is None:
        return ""
    val_str = str(v).strip()
    if not val_str:
        return ""
    # Pure integer or decimal number e.g. "10", "10.5", "5" -> "10%"
    if re.match(r"^-?\d+(\.\d+)?$", val_str):
        return f"{val_str}%"
    return val_str

def auto_format_temp(v: Any) -> str:
    if v is None:
        return ""
    val_str = str(v).strip()
    if not val_str:
        return ""
    # Single number or range like "2", "4.5", "2-6", "2 - 6", "+4", "-2" -> "2°C", "2-6°C"
    if re.match(r"^[+-]?\d+(\.\d+)?(\s*-\s*[+-]?\d+(\.\d+)?)?$", val_str):
        return f"{val_str}°C"
    # Ends with C or c without degree symbol e.g. "4C" -> "4°C"
    if re.match(r"^[+-]?\d+(\.\d+)?(\s*-\s*[+-]?\d+(\.\d+)?)?\s*[cC]$", val_str):
        return re.sub(r"\s*[cC]$", "°C", val_str)
    return val_str

class Customer(BaseModel):
    id: Optional[Any] = Field(default="", example="C001")
    name: Any = Field(..., example="Babaris coffee")
    location: Optional[Any] = Field(default="", example="Tekthla Condo")
    contact: Optional[Any] = Field(default="", example="+855 12 345 678")

    @field_validator("id", "name", "location", "contact", mode="before")
    @classmethod
    def coerce_customer_fields(cls, v):
        if v is None:
            return ""
        return str(v).strip()

class Product(BaseModel):
    id: Optional[Any] = Field(default="", example="P001")
    name: Any = Field(..., example="2000cc Farm Fresh Cows Milk")
    short_code: Optional[Any] = Field(default="", example="FFCM")
    unit_of_measure: Optional[Any] = Field(default="", example="2L-BTL")

    @field_validator("id", "name", "short_code", "unit_of_measure", mode="before")
    @classmethod
    def coerce_product_fields(cls, v):
        if v is None:
            return ""
        return str(v).strip()

class ComplaintBase(BaseModel):
    sales_rep_name: str = Field(..., example="Sophea Chea")
    customer_name: str = Field(..., example="Babaris coffee")
    customer_location: str = Field(..., example="Tekthla Condo")
    customer_contact: Optional[str] = Field(default="", example="+855 12 345 678")
    complaint_date: str = Field(..., example="2026-09-19")
    product_name: str = Field(..., example="2000cc Farm Fresh Cows Milk")
    product_short_code: Optional[str] = Field(default="", example="FFCM")
    defect_type: str = Field(..., example="Off smell/taste")
    defect_quantity: int = Field(..., ge=1, example=7)
    unit_of_measure: str = Field(..., example="2L-BTL")
    product_expiry_date: str = Field(..., example="2026-09-26")
    manufacturing_code: str = Field(..., example="MAC")
    production_batch: str = Field(..., example="12:00")
    photo_url: Optional[str] = Field(default="", example="")
    price_discount: Optional[str] = Field(default="", example="10%", description="Sales discount or price concession applied")
    storage_temp: Optional[str] = Field(default="", example="2-6°C", description="Customer storage temperature recorded at sales intake")
    shipment_date: Optional[str] = Field(default="", example="2026-09-18", description="Date products were delivered / shipped to customer")
    so_number: Optional[str] = Field(default="", example="SO-2026-0891", description="Sales Order (SO) Number")
    order_quantity: Optional[int] = Field(default=None, example=50, description="Original Order Quantity from customer SO")

    @field_validator("price_discount", mode="before")
    @classmethod
    def validate_discount(cls, v):
        return auto_format_discount(v)

    @field_validator("storage_temp", mode="before")
    @classmethod
    def validate_storage_temp(cls, v):
        return auto_format_temp(v)

class ComplaintCreate(ComplaintBase):
    pass

class QAReviewRequest(BaseModel):
    inspector_name: str = Field(..., example="QA Team")
    customer_storage_temperature: Optional[str] = Field(default="", example="4°C", description="Customer storage temperature measured during QA inspection")
    storage_temperature_photo_url: Optional[str] = Field(default="", example="/api/static/sample_storage_temp.svg", description="Photo proof of customer storage temperature or thermometer reading")

    @field_validator("customer_storage_temperature", mode="before")
    @classmethod
    def validate_qa_temp(cls, v):
        return auto_format_temp(v)
    confirmed_defect_quantity: Optional[int] = Field(default=None, ge=0, example=7, description="Confirmed defective quantity verified by QA")
    confirmed_defect_type: Optional[str] = Field(default="", example="Physical damage", description="Defect type confirmed by QA inspection")
    defect_placement: Optional[str] = Field(default="At Store", example="At Store", description="Placement of defect: At Store or Customer Returned")
    storage_hygiene: Optional[int] = Field(default=5, ge=1, le=5, example=4, description="Storage hygiene rating from 1-5")
    improvement_point: Optional[str] = Field(default="Keep going", example="Improve storage temp", description="Point to improvement: Improve storage temp, Improve hygiene, Keep space for airflow, Standard delivery, Keep going")
    batch_status: str = Field(..., example="Confirmed out-of-spec acidity")
    root_cause_notes: str = Field(..., example="Storage temperature fluctuation during distributor transit")
    recommendation: str = Field(..., example="Recommend Exchange") # Recommend Exchange, Recommend Credit Note, Reject

class CEODecisionRequest(BaseModel):
    reviewer_name: str = Field(..., example="Executive Director")
    decision: str = Field(..., example="Approved") # Approved or Rejected
    approved_quantity: Optional[int] = Field(default=None, ge=0, example=1, description="Quantity approved by CEO for replacement/credit")
    comments: Optional[str] = Field(default="", example="Approved full batch replacement based on QA confirmed quantity")

class WarehouseFulfillRequest(BaseModel):
    officer_name: str = Field(..., example="Vicheka Kem")
    replacement_batch: Optional[str] = Field(default="N/A", example="MAC-20260928-BATCH2")
    dispatch_date: str = Field(..., example="2026-09-20")
    dispatched_quantity: Optional[int] = Field(default=None, ge=0, example=7, description="Quantity dispatched by warehouse matching QA confirmed defect quantity")
    delivery_notes: Optional[str] = Field(default="", example="Dispatched confirmed units with morning chilled route")

class StockReturnRequest(BaseModel):
    bin_location: Optional[str] = Field(default="", example="Room 2 - Cold Bin 04", description="Name of room number or actual bin location (for physical warehouse stock)")
    photo_url: Optional[str] = Field(default="", example="/uploads/sample_return.png", description="Photo reference of physical stock return")
    returned_quantity: float = Field(..., ge=0, example=1.0, description="Total returned quantity from customer (Physical + Virtual sum)")
    disposition_status: str = Field(default="Write Off", example="Write Off", description="Status (Write Off/Rework)")
    confirmed_write_off_quantity: float = Field(default=0.0, ge=0, example=1.0, description="Confirmed Write Off QTY (Physical Write Off + Virtual Site Write Off)")
    confirmed_rework_quantity: float = Field(default=0.0, ge=0, example=0.0, description="Confirmed Rework/Saleable QTY")
    write_off_batch: Optional[str] = Field(default="", example="WO-20261106-B01", description="Write Off Batch code / reference")
    
    # Two-category breakdown fields:
    physical_returned_quantity: Optional[float] = Field(default=0.0, ge=0, example=1.0, description="Physical stock returned and received at warehouse")
    physical_write_off_quantity: Optional[float] = Field(default=0.0, ge=0, example=1.0, description="Physical write off quantity at warehouse")
    physical_rework_quantity: Optional[float] = Field(default=0.0, ge=0, example=0.0, description="Physical rework / saleable quantity at warehouse")
    
    virtual_returned_quantity: Optional[float] = Field(default=0.0, ge=0, example=0.0, description="Virtual stock written off directly at customer site / province")
    virtual_location: Optional[str] = Field(default="", example="Battambang Province Site", description="Location or province where virtual on-site write off occurred")
    virtual_video_url: Optional[str] = Field(default="", example="/uploads/writeoff_video.mp4", description="Video or media reference recording of write off at customer place")
    virtual_notes: Optional[str] = Field(default="", example="Stock destroyed at customer site under video verification")
    
    controller_name: Optional[str] = Field(default="", example="Stock Controller")
    notes: Optional[str] = Field(default="", example="Stock inspected and quarantined")
    recorded_date: Optional[str] = Field(default="", example="2026-11-04")
    qa_signed_off: Optional[str] = Field(default="No", example="Yes", description="Yes or No QA sign-off")
    qa_signed_off_by: Optional[str] = Field(default="", example="QA Team")
    qa_signed_off_date: Optional[str] = Field(default="", example="2026-11-04")
    qa_signed_off_notes: Optional[str] = Field(default="", example="")

class StockReturnQASignOffRequest(BaseModel):
    signed_off: str = Field(..., example="Yes", description="Yes or No")
    qa_name: Optional[str] = Field(default="QA Team", example="QA Team")
    notes: Optional[str] = Field(default="", example="QA verified physical return")

class DisposalRequest(BaseModel):
    disposal_letter_issue_date: Optional[str] = Field(default="", example="2026-11-07", description="Date the disposal letter was issued")
    finance_manager_name: Optional[str] = Field(default="Finance Manager", example="Finance Manager", description="Finance Manager controlling the disposal")
    disposal_date: str = Field(..., example="2026-11-07", description="Disposal Date when tax counted stock and stock was cut")
    tax_officer_name: Optional[str] = Field(default="Tax Authority Representative", example="Tax Officer / Customs Dept", description="Tax authority representative or inspection reference")
    tax_count_status: Optional[str] = Field(default="Counted & Approved by Tax Authority", example="Counted & Approved by Tax Authority", description="Status of tax stock count verification")
    disposed_quantity: Optional[float] = Field(default=0.0, ge=0, example=1.0, description="Quantity written off and cut to disposal")
    disposal_method: Optional[str] = Field(default="Physical Destruction / Dump", example="Physical Destruction / Dump", description="Method of stock disposal")
    write_off_batch_codes: Optional[str] = Field(default="", example="Batch-01 & Batch-02", description="Write off batch code(s) included in this disposal action")
    status: Optional[str] = Field(default="Closed", example="Closed", description="Closed or Open status set by Finance Manager")
    notes: Optional[str] = Field(default="", example="Tax count completed. Written-off stock officially cut to disposal.", description="Disposal and tax minutes notes")
    photo_url: Optional[str] = Field(default="", example="", description="Disposal destruction / tax counting photo proof")

class BatchDisposalRequest(DisposalRequest):
    complaint_ids: List[str] = Field(..., description="List of complaint IDs belonging to the selected write-off batch(es)")

class ComplaintResponse(ComplaintBase):
    id: str
    status: str
    created_at: str
    qa_review: Optional[Dict[str, Any]] = None
    ceo_decision: Optional[Dict[str, Any]] = None
    warehouse_fulfillment: Optional[Dict[str, Any]] = None
    stock_return: Optional[Dict[str, Any]] = None
    disposal: Optional[Dict[str, Any]] = None
