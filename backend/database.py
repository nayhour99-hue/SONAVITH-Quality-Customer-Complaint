import sqlite3
import json
import os
import calendar
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "complaints.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    # Existing complaints table
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS complaints (
        id TEXT PRIMARY KEY,
        sales_rep_name TEXT,
        customer_name TEXT,
        customer_location TEXT,
        customer_contact TEXT,
        complaint_date TEXT,
        product_name TEXT,
        product_short_code TEXT,
        defect_type TEXT,
        defect_quantity INTEGER,
        unit_of_measure TEXT,
        product_expiry_date TEXT,
        manufacturing_code TEXT,
        production_batch TEXT,
        photo_url TEXT,
        status TEXT,
        created_at TEXT,
        qa_review TEXT,
        ceo_decision TEXT,
        warehouse_fulfillment TEXT,
        price_discount TEXT,
        storage_temp TEXT,
        shipment_date TEXT,
        so_number TEXT,
        order_quantity INTEGER,
        stock_return TEXT,
        disposal TEXT
    )
    """)
    # Migration: add new columns if missing (no error if already exists)
    for col_def in [
        "ALTER TABLE complaints ADD COLUMN price_discount TEXT",
        "ALTER TABLE complaints ADD COLUMN storage_temp TEXT",
        "ALTER TABLE complaints ADD COLUMN shipment_date TEXT",
        "ALTER TABLE complaints ADD COLUMN so_number TEXT",
        "ALTER TABLE complaints ADD COLUMN order_quantity INTEGER",
        "ALTER TABLE complaints ADD COLUMN stock_return TEXT",
        "ALTER TABLE complaints ADD COLUMN disposal TEXT",
        "ALTER TABLE users ADD COLUMN permissions TEXT",
    ]:
        try:
            cursor.execute(col_def)
        except Exception:
            pass
    # Users table and default admin seed
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        role TEXT NOT NULL DEFAULT '',
        permissions TEXT
    );
    """)
    from utils.auth import get_password_hash
    default_users = [
        ("admin-1", "nayhour99@gmail.com", "admin123", 1, "Admin"),
        ("user-sales1", "sales_rep@sonavith.com", "admin123", 0, "Sale"),
        ("user-sales2", "sales.staff@gmail.com", "admin123", 0, "Sale"),
        ("user-qa1", "lyneat8899@gmail.com", "admin123", 0, "QA"),
        ("user-wh1", "thonsreytho97@gmail.com", "admin123", 0, "Warehouse"),
        ("user-ceo1", "saosokleap8888@gmail.com", "admin123", 0, "CEO"),
        ("user-finance1", "finance.manager@gmail.com", "admin123", 0, "Finance"),
    ]
    for uid, uemail, upass, uadmin, urole in default_users:
        cursor.execute("SELECT id, role, is_admin FROM users WHERE email = ?", (uemail,))
        existing_u = cursor.fetchone()
        if not existing_u:
            hashed = get_password_hash(upass)
            cursor.execute(
                "INSERT INTO users (id, email, hashed_password, is_admin, role) VALUES (?, ?, ?, ?, ?)",
                (uid, uemail, hashed, uadmin, urole)
            )
        else:
            # Ensure role and is_admin are properly aligned
            cursor.execute("UPDATE users SET is_admin = ?, role = ? WHERE email = ?", (uadmin, urole, uemail))

    # Stage assignments table
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS stage_assignments (
        user_id TEXT NOT NULL,
        stage INTEGER NOT NULL,
        PRIMARY KEY (user_id, stage),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        short_code TEXT,
        unit_of_measure TEXT
    );
    """)

    # Defect types masterlist table
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS defect_types (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        created_at TEXT
    );
    """)

    # Seed default defect types if empty
    cursor.execute("SELECT COUNT(*) FROM defect_types")
    if cursor.fetchone()[0] == 0:
        default_defects = [
            ("DEF-001", "Physical damage", "Broken seal, crushed carton, dented bottle or cap damage", datetime.now().isoformat()),
            ("DEF-002", "Off smell/taste", "Sour odor, abnormal smell or unpalatable taste deviation", datetime.now().isoformat()),
            ("DEF-003", "Packaging leak", "Fluid seepage around seams, spout or puncture", datetime.now().isoformat()),
            ("DEF-004", "Curdling", "Premature separation, coagulation or lumpiness in liquid milk", datetime.now().isoformat()),
            ("DEF-005", "Foreign particle", "Extraneous matter or discolored flecks inside product", datetime.now().isoformat()),
            ("DEF-006", "Short expiry / Out of code", "Delivered close to or past expiration date threshold", datetime.now().isoformat()),
            ("DEF-007", "Temperature abuse / Bloated", "Swollen container due to cold chain interruption", datetime.now().isoformat()),
            ("DEF-008", "Thick Cream", "The concentrated, high-fat portion of milk that rises to the surface before homogenization and appearance is not smooth as normal liquid (Sandy or powdery).", datetime.now().isoformat()),
            ("DEF-009", "Cream Separation.", "The process of partitioning whole raw milk into its two primary physical fractions: fat-rich cream and skim milk. Sometimes the yellow fat appears on the bottleneck.", datetime.now().isoformat()),
            ("DEF-010", "Non-foaming milk", "Milk foam depends on surface-active proteins unfolding to form a flexible, cohesive elastic film around air bubbles.", datetime.now().isoformat()),
        ]
        cursor.executemany("INSERT INTO defect_types (id, name, description, created_at) VALUES (?, ?, ?, ?)", default_defects)
    conn.commit()
    conn.close()

# ---------- User helper functions ----------

def get_default_permissions_for_role(role: str) -> Dict[str, List[str]]:
    defaults = {
        "Admin": {
            "can_view": ["overview", "sales", "qa", "ceo", "warehouse", "stock_return", "disposal", "masterlist", "admin"],
            "can_edit": ["sales", "qa", "ceo", "warehouse", "stock_return_action", "stock_return_signoff", "disposal", "masterlist", "admin"]
        },
        "CEO": {
            "can_view": ["overview", "sales", "qa", "ceo", "warehouse", "stock_return", "disposal", "masterlist"],
            "can_edit": ["ceo"]
        },
        "Sale": {
            "can_view": ["overview", "sales"],
            "can_edit": ["sales"]
        },
        "QA": {
            "can_view": ["overview", "qa", "stock_return"],
            "can_edit": ["qa", "stock_return_signoff"]
        },
        "Warehouse": {
            "can_view": ["overview", "warehouse", "stock_return"],
            "can_edit": ["warehouse", "stock_return_action"]
        },
        "Finance": {
            "can_view": ["overview", "stock_return", "disposal", "masterlist"],
            "can_edit": ["disposal"]
        }
    }
    return defaults.get(role, defaults["Sale"])

def format_user_dict(row) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    d = dict(row)
    # Remove sensitive password hash
    d.pop("hashed_password", None)
    role = d.get("role") or ("Admin" if d.get("is_admin") else "Sale")
    d["role"] = role
    perms = None
    if d.get("permissions"):
        try:
            perms = json.loads(d["permissions"]) if isinstance(d["permissions"], str) else d["permissions"]
        except Exception:
            perms = None
    if not perms or not isinstance(perms, dict):
        perms = get_default_permissions_for_role(role)
    else:
        # Ensure keys exist
        if "can_view" not in perms:
            perms["can_view"] = get_default_permissions_for_role(role)["can_view"]
        if "can_edit" not in perms:
            perms["can_edit"] = get_default_permissions_for_role(role)["can_edit"]
        else:
            # Upgrade legacy 'stock_return' to specific attributes if needed
            can_ed = list(perms["can_edit"])
            if "stock_return" in can_ed and "stock_return_action" not in can_ed and "stock_return_signoff" not in can_ed:
                if role == "QA":
                    can_ed.append("stock_return_signoff")
                elif role == "Warehouse":
                    can_ed.append("stock_return_action")
                elif role == "Admin":
                    can_ed.extend(["stock_return_action", "stock_return_signoff"])
                perms["can_edit"] = can_ed
    d["permissions"] = perms
    return d

def get_all_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, is_admin, role, permissions FROM users")
    rows = cursor.fetchall()
    conn.close()
    return [format_user_dict(r) for r in rows if r]

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return format_user_dict(row)

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_permissions(user_id: str, permissions_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET permissions = ? WHERE id = ?", (json.dumps(permissions_data), user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def create_user(email: str, password: str, role: str = "Sale", is_admin: int = 0) -> Dict[str, Any]:
    import uuid
    from utils.auth import get_password_hash
    conn = get_connection()
    cursor = conn.cursor()
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    hashed = get_password_hash(password)
    perms_json = json.dumps(get_default_permissions_for_role(role))
    cursor.execute(
        "INSERT INTO users (id, email, hashed_password, is_admin, role, permissions) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, email.strip().lower(), hashed, is_admin, role, perms_json)
    )
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def update_user_access(user_id: str, is_admin: int, role: str, password: Optional[str] = None) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    if password and password.strip():
        from utils.auth import get_password_hash
        hashed = get_password_hash(password.strip())
        cursor.execute("UPDATE users SET is_admin = ?, role = ?, hashed_password = ? WHERE id = ?", (is_admin, role, hashed, user_id))
    else:
        cursor.execute("UPDATE users SET is_admin = ?, role = ? WHERE id = ?", (is_admin, role, user_id))
    conn.commit()
    conn.close()

def delete_user(user_id: str) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM stage_assignments WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

def update_user_role(user_id: str, is_admin: int) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_admin = ? WHERE id = ?", (is_admin, user_id))
    conn.commit()
    conn.close()

# ---------- Stage assignment functions ----------

def get_stage_assignments(stage: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT u.id, u.email, u.is_admin FROM users u JOIN stage_assignments sa ON u.id = sa.user_id WHERE sa.stage = ?", (stage,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def assign_user_to_stage(user_id: str, stage: int) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO stage_assignments (user_id, stage) VALUES (?, ?)", (user_id, stage))
    conn.commit()
    conn.close()

def remove_user_from_stage(user_id: str, stage: int) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM stage_assignments WHERE user_id = ? AND stage = ?", (user_id, stage))
    conn.commit()
    conn.close()


def parse_row(row) -> Dict[str, Any]:
    if not row:
        return None
    d = dict(row)
    for field in ["qa_review", "ceo_decision", "warehouse_fulfillment", "stock_return", "disposal"]:
        if d.get(field):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                d[field] = None
        else:
            d[field] = None
    if not d.get("product_id") and d.get("product_name"):
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
                (d["product_name"],)
            )
            prod_row = cursor.fetchone()
            conn.close()
            d["product_id"] = prod_row["id"] if prod_row else (d.get("product_short_code") or "")
        except Exception:
            d["product_id"] = d.get("product_short_code") or ""
    return d

def get_customers() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_products() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_customer(data: Dict[str, Any]) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        import uuid
        customer_id = data.get("id")
        if not customer_id:
            customer_id = str(uuid.uuid4())[:8]
        cursor.execute("""
        INSERT INTO customers (id, name, location, contact) VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET location=excluded.location, contact=excluded.contact
        """, (customer_id, data.get("name"), data.get("location"), data.get("contact")))
        conn.commit()
    except Exception as e:
        print(f"Error adding customer: {e}")
    finally:
        conn.close()

def add_customers_bulk(customers_data: List[Dict[str, Any]]) -> int:
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name FROM customers")
        existing_rows = cursor.fetchall()
        name_to_id = {str(row["name"]).strip().lower(): str(row["id"]).strip() for row in existing_rows}
        id_to_name = {str(row["id"]).strip(): str(row["name"]).strip().lower() for row in existing_rows}
        clean_records = []
        seen_names = set()
        for c in customers_data:
            raw_name = str(c.get("name") or "").strip()
            if not raw_name:
                continue
            name_lower = raw_name.lower()
            if name_lower in seen_names:
                continue
            seen_names.add(name_lower)
            raw_id = str(c.get("id") or "").strip()
            if not raw_id:
                raw_id = name_to_id.get(name_lower) or str(uuid.uuid4())[:8]
            else:
                existing_for_id = id_to_name.get(raw_id)
                if existing_for_id and existing_for_id != name_lower:
                    raw_id = f"{raw_id}-{str(uuid.uuid4())[:4]}"
            loc = str(c.get("location") or "").strip()
            cnt = str(c.get("contact") or "").strip()
            clean_records.append((raw_id, raw_name, loc, cnt))
        cursor.executemany("""
        INSERT INTO customers (id, name, location, contact) VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            id=excluded.id,
            location=excluded.location,
            contact=excluded.contact
        """, clean_records)
        conn.commit()
        return len(clean_records)
    except Exception as e:
        conn.rollback()
        print(f"Error in add_customers_bulk: {e}")
        raise e
    finally:
        conn.close()

def clear_customers() -> int:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM customers")
        count = cursor.rowcount
        conn.commit()
        return count
    finally:
        conn.close()

def remove_customer(customer_id: str) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
        conn.commit()
    except Exception as e:
        print(f"Error removing customer: {e}")
    finally:
        conn.close()

def add_product(data: Dict[str, Any]) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        import uuid
        product_id = str(data.get("id") or "").strip()
        if not product_id:
            product_id = str(uuid.uuid4())[:8]
        cursor.execute("""
        INSERT INTO products (id, name, short_code, unit_of_measure) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            short_code=excluded.short_code,
            unit_of_measure=excluded.unit_of_measure
        """, (product_id, str(data.get("name") or "").strip(), str(data.get("short_code") or "").strip(), str(data.get("unit_of_measure") or "").strip()))
        conn.commit()
    except Exception as e:
        print(f"Error adding product: {e}")
    finally:
        conn.close()

def add_products_bulk(products_data: List[Dict[str, Any]]) -> int:
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, unit_of_measure FROM products")
        existing_rows = cursor.fetchall()
        name_uom_to_id = {
            (str(row["name"]).strip().lower(), str(row["unit_of_measure"]).strip().lower()): str(row["id"]).strip()
            for row in existing_rows
        }
        clean_records = []
        seen_ids = set()
        for p in products_data:
            raw_name = str(p.get("name") or "").strip()
            if not raw_name:
                continue
            code = str(p.get("short_code") or "").strip()
            uom = str(p.get("unit_of_measure") or "").strip()
            raw_id = str(p.get("id") or "").strip()
            if not raw_id:
                key = (raw_name.lower(), uom.lower())
                raw_id = name_uom_to_id.get(key) or f"P-{str(uuid.uuid4())[:8]}"
            id_lower = raw_id.lower()
            if id_lower in seen_ids:
                raw_id = f"{raw_id}-{str(uuid.uuid4())[:4]}"
            seen_ids.add(raw_id.lower())
            clean_records.append((raw_id, raw_name, code, uom))
        cursor.executemany("""
        INSERT INTO products (id, name, short_code, unit_of_measure) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            short_code=excluded.short_code,
            unit_of_measure=excluded.unit_of_measure
        """, clean_records)
        conn.commit()
        return len(clean_records)
    except Exception as e:
        conn.rollback()
        print(f"Error in add_products_bulk: {e}")
        raise e
    finally:
        conn.close()

def remove_product(product_id: str) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
    except Exception as e:
        print(f"Error removing product: {e}")
    finally:
        conn.close()

# ---------- Defect Types Masterlist Functions ----------

def get_defect_types() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, created_at FROM defect_types ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_defect_type(data: Dict[str, Any]) -> Dict[str, Any]:
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    name = str(data.get("name") or "").strip()
    if not name:
        raise ValueError("Defect type name cannot be blank")
    defect_id = str(data.get("id") or "").strip() or f"DEF-{uuid.uuid4().hex[:6].upper()}"
    description = str(data.get("description") or "").strip()
    now_str = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO defect_types (id, name, description, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
        description = excluded.description
    """, (defect_id, name, description, now_str))
    conn.commit()
    conn.close()
    return {"id": defect_id, "name": name, "description": description, "created_at": now_str}

def add_defect_types_bulk(defects_data: List[Dict[str, Any]]) -> int:
    import uuid
    conn = get_connection()
    cursor = conn.cursor()
    try:
        count = 0
        now_str = datetime.now().isoformat()
        for item in defects_data:
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            did = str(item.get("id") or "").strip() or f"DEF-{uuid.uuid4().hex[:6].upper()}"
            desc = str(item.get("description") or "").strip()
            cursor.execute("""
            INSERT INTO defect_types (id, name, description, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET description = excluded.description
            """, (did, name, desc, now_str))
            count += 1
        conn.commit()
        return count
    finally:
        conn.close()

def delete_defect_type(defect_id: str) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM defect_types WHERE id = ?", (defect_id,))
        conn.commit()
    finally:
        conn.close()

def generate_complaint_id(product_short_code: str, complaint_date_str: str) -> str:
    clean_code = (product_short_code or "DPR").strip().upper()
    try:
        date_part = complaint_date_str.replace("-", "")[:8]
    except Exception:
        date_part = datetime.now().strftime("%Y%m%d")
    prefix = f"{clean_code}-{date_part}"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM complaints WHERE id LIKE ?", (f"{prefix}%",))
    count = cursor.fetchone()[0] + 1
    conn.close()
    return f"{prefix}-{count:03d}"

def create_complaint(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    complaint_id = data.get("id") or generate_complaint_id(data.get("product_short_code", "DEF"), data.get("complaint_date", ""))
    created_at = data.get("created_at") or datetime.now().isoformat()
    status = data.get("status") or "Pending QA"
    cursor.execute("""
    INSERT INTO complaints (
        id, sales_rep_name, customer_name, customer_location, customer_contact,
        complaint_date, product_name, product_short_code, defect_type, defect_quantity,
        unit_of_measure, product_expiry_date, manufacturing_code, production_batch,
        photo_url, status, created_at, qa_review, ceo_decision, warehouse_fulfillment,
        price_discount, storage_temp, shipment_date, so_number, order_quantity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        complaint_id,
        data.get("sales_rep_name", ""),
        data.get("customer_name", ""),
        data.get("customer_location", ""),
        data.get("customer_contact", ""),
        data.get("complaint_date", ""),
        data.get("product_name", ""),
        data.get("product_short_code", ""),
        data.get("defect_type", ""),
        data.get("defect_quantity", 0),
        data.get("unit_of_measure", ""),
        data.get("product_expiry_date", ""),
        data.get("manufacturing_code", ""),
        data.get("production_batch", ""),
        data.get("photo_url", ""),
        status,
        created_at,
        json.dumps(data.get("qa_review")) if data.get("qa_review") else None,
        json.dumps(data.get("ceo_decision")) if data.get("ceo_decision") else None,
        json.dumps(data.get("warehouse_fulfillment")) if data.get("warehouse_fulfillment") else None,
        data.get("price_discount", ""),
        data.get("storage_temp", ""),
        data.get("shipment_date", ""),
        data.get("so_number", ""),
        data.get("order_quantity")
    ))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def get_complaint_by_id(complaint_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    conn.close()
    return parse_row(row)

def get_time_filter_clause(
    time_filter: Optional[str],
    date_col: str = "complaint_date",
    ref_date_str: Optional[str] = None
) -> Tuple[str, List[Any]]:
    if not time_filter or time_filter.lower().strip() in ["all", "all time"]:
        return "", []
    tf = time_filter.lower().strip()
    ref_date = datetime.now().date()
    if ref_date_str:
        try:
            ref_date = datetime.strptime(ref_date_str.strip()[:10], "%Y-%m-%d").date()
        except Exception:
            pass
    col_expr = f"substr({date_col}, 1, 10)"
    if tf == "day":
        today_str = ref_date.strftime("%Y-%m-%d")
        return f" AND {col_expr} = ?", [today_str]
    elif tf == "week":
        start_of_week = ref_date - timedelta(days=ref_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        start_str = start_of_week.strftime("%Y-%m-%d")
        end_str = end_of_week.strftime("%Y-%m-%d")
        return f" AND {col_expr} >= ? AND {col_expr} <= ?", [start_str, end_str]
    elif tf == "month":
        month_str = ref_date.strftime("%Y-%m")
        return f" AND substr({date_col}, 1, 7) = ?", [month_str]
    return "", []

def get_complaints(
    status: Optional[str] = None,
    search: Optional[str] = None,
    time_filter: Optional[str] = None,
    date_mode: Optional[str] = "complaint_date",
    date_filter: Optional[str] = None,
    expiry_date_filter: Optional[str] = None,
    shipment_date_filter: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: Optional[str] = "desc",
    ref_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM complaints WHERE 1=1"
    params = []
    if status and status != "All":
        if "," in status:
            statuses = [s.strip() for s in status.split(",") if s.strip()]
            if statuses:
                placeholders = ",".join(["?"] * len(statuses))
                query += f" AND status IN ({placeholders})"
                params.extend(statuses)
        else:
            query += " AND status = ?"
            params.append(status)
    if search:
        query += " AND (customer_name LIKE ? OR id LIKE ? OR product_name LIKE ? OR customer_location LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term, term, term])
    if date_filter:
        query += " AND complaint_date = ?"
        params.append(date_filter)
    if expiry_date_filter:
        query += " AND product_expiry_date = ?"
        params.append(expiry_date_filter)
    if shipment_date_filter:
        query += " AND shipment_date = ?"
        params.append(shipment_date_filter)
    if date_mode == "expiry_date":
        date_col = "product_expiry_date"
    elif date_mode == "shipment_date":
        date_col = "shipment_date"
    else:
        date_col = "complaint_date"
    tf_clause, tf_params = get_time_filter_clause(time_filter, date_col, ref_date)
    if tf_clause:
        query += tf_clause
        params.extend(tf_params)
    order_dir = "ASC" if (order and order.lower() == "asc") else "DESC"
    if sort_by in ["expiry_date", "product_expiry_date"]:
        query += f" ORDER BY CASE WHEN product_expiry_date IS NULL OR product_expiry_date = '' THEN 1 ELSE 0 END, product_expiry_date {order_dir}, created_at DESC"
    elif sort_by in ["shipment_date"]:
        query += f" ORDER BY CASE WHEN shipment_date IS NULL OR shipment_date = '' THEN 1 ELSE 0 END, shipment_date {order_dir}, created_at DESC"
    else:
        query += f" ORDER BY CASE WHEN complaint_date IS NULL OR complaint_date = '' THEN 1 ELSE 0 END, complaint_date {order_dir}, created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [parse_row(r) for r in rows]

def update_qa_review(complaint_id: str, qa_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    new_status = "Rejected" if qa_data.get("recommendation") == "Reject" else "Pending approval"
    cursor.execute("""
    UPDATE complaints
    SET qa_review = ?, status = ?
    WHERE id = ?
    """, (json.dumps(qa_data), new_status, complaint_id))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def update_ceo_decision(complaint_id: str, ceo_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    new_status = "Approved" if ceo_data.get("decision") == "Approved" else "Rejected"
    cursor.execute("""
    UPDATE complaints
    SET ceo_decision = ?, status = ?
    WHERE id = ?
    """, (json.dumps(ceo_data), new_status, complaint_id))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def update_warehouse_fulfillment(complaint_id: str, warehouse_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    new_status = "Completed"
    cursor.execute("""
    UPDATE complaints
    SET warehouse_fulfillment = ?, status = ?
    WHERE id = ?
    """, (json.dumps(warehouse_data), new_status, complaint_id))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def update_stock_return(complaint_id: str, stock_return_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT stock_return FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    if row and row["stock_return"]:
        try:
            existing = json.loads(row["stock_return"]) if isinstance(row["stock_return"], str) else dict(row["stock_return"])
            if "qa_signed_off" not in stock_return_data and "qa_signed_off" in existing:
                stock_return_data["qa_signed_off"] = existing["qa_signed_off"]
                stock_return_data["qa_signed_off_by"] = existing.get("qa_signed_off_by", "")
                stock_return_data["qa_signed_off_date"] = existing.get("qa_signed_off_date", "")
                stock_return_data["qa_signed_off_notes"] = existing.get("qa_signed_off_notes", "")
        except Exception:
            pass
    cursor.execute("""
    UPDATE complaints
    SET stock_return = ?
    WHERE id = ?
    """, (json.dumps(stock_return_data), complaint_id))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def update_stock_return_qa_signoff(complaint_id: str, signoff_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT stock_return FROM complaints WHERE id = ?", (complaint_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    curr_sr = {}
    if row["stock_return"]:
        try:
            curr_sr = json.loads(row["stock_return"]) if isinstance(row["stock_return"], str) else dict(row["stock_return"])
        except Exception:
            curr_sr = {}
    signed_off_val = signoff_data.get("signed_off", "No")
    curr_sr["qa_signed_off"] = signed_off_val
    curr_sr["qa_signed_off_by"] = signoff_data.get("qa_name", "Dr. Chanreth")
    curr_sr["qa_signed_off_date"] = signoff_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    if "notes" in signoff_data:
        curr_sr["qa_signed_off_notes"] = signoff_data.get("notes", "")

    cursor.execute("""
    UPDATE complaints
    SET stock_return = ?
    WHERE id = ?
    """, (json.dumps(curr_sr), complaint_id))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def update_disposal(complaint_id: str, disposal_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Stage 06: Disposal Action (Finance Manager).
    Calls tax to count stock, records disposal date and write-off cut, and closes or leaves open the complaint.
    """
    conn = get_connection()
    cursor = conn.cursor()
    disp_status = str(disposal_data.get("status") or "Closed").strip()
    new_status = "Closed" if disp_status == "Closed" else "Completed"
    cursor.execute("""
    UPDATE complaints
    SET disposal = ?, status = ?
    WHERE id = ?
    """, (json.dumps(disposal_data), new_status, complaint_id))
    conn.commit()
    conn.close()
    return get_complaint_by_id(complaint_id)

def update_batch_disposal(complaint_ids: List[str], disposal_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Stage 06: Batch Disposal Action (Finance Manager).
    Applies disposal record across all complaints in the selected/merged Write Off Batch Code(s)
    and updates their status to 'Closed' (or 'Completed' if Status is 'Open').
    """
    conn = get_connection()
    cursor = conn.cursor()
    disp_status = str(disposal_data.get("status") or "Closed").strip()
    new_status = "Closed" if disp_status == "Closed" else "Completed"

    for cid in complaint_ids:
        cursor.execute("SELECT stock_return, defect_quantity FROM complaints WHERE id = ?", (cid,))
        row = cursor.fetchone()
        if not row:
            continue
        item_disp = dict(disposal_data)
        item_disp.pop("complaint_ids", None)
        if row["stock_return"]:
            try:
                sr = json.loads(row["stock_return"]) if isinstance(row["stock_return"], str) else dict(row["stock_return"])
                if sr.get("confirmed_write_off_quantity") is not None:
                    item_disp["disposed_quantity"] = float(sr["confirmed_write_off_quantity"])
            except Exception:
                pass
        cursor.execute("""
        UPDATE complaints
        SET disposal = ?, status = ?
        WHERE id = ?
        """, (json.dumps(item_disp), new_status, cid))
    conn.commit()
    conn.close()
    return [get_complaint_by_id(cid) for cid in complaint_ids if cid]

def get_metrics_data(
    time_filter: Optional[str] = None,
    date_mode: Optional[str] = "complaint_date",
    sort_by: Optional[str] = None,
    order: Optional[str] = "desc",
    ref_date: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    if date_mode == "expiry_date":
        date_col = "product_expiry_date"
    elif date_mode == "shipment_date":
        date_col = "shipment_date"
    else:
        date_col = "complaint_date"
    time_clause, time_params = get_time_filter_clause(time_filter, date_col, ref_date)
    where_clause = f"WHERE 1=1 {time_clause}"
    cursor.execute(f"SELECT COUNT(*) FROM complaints {where_clause}", time_params)
    total_complaints = cursor.fetchone()[0]
    cursor.execute(f"SELECT COUNT(*) FROM complaints {where_clause} AND status = 'Approved'", time_params)
    total_approved = cursor.fetchone()[0]
    cursor.execute(f"SELECT COUNT(*) FROM complaints {where_clause} AND status IN ('Pending QA', 'Pending approval')", time_params)
    pending_decision = cursor.fetchone()[0]
    cursor.execute(f"SELECT COUNT(*) FROM complaints {where_clause} AND status = 'Rejected'", time_params)
    total_rejected = cursor.fetchone()[0]
    cursor.execute(f"SELECT COUNT(*) FROM complaints {where_clause} AND status = 'Completed'", time_params)
    total_completed = cursor.fetchone()[0]
    cursor.execute(f"SELECT COUNT(*) FROM complaints {where_clause} AND status = 'Closed'", time_params)
    total_closed = cursor.fetchone()[0]
    all_statuses = ["Pending QA", "Pending approval", "Approved", "Rejected", "Completed", "Closed"]
    status_counts = {s: 0 for s in all_statuses}
    cursor.execute(f"SELECT status, COUNT(*) FROM complaints {where_clause} GROUP BY status", time_params)
    for row in cursor.fetchall():
        if row[0] in status_counts:
            status_counts[row[0]] = row[1]
    cursor.execute(f"SELECT defect_type, COUNT(*) FROM complaints {where_clause} GROUP BY defect_type", time_params)
    defect_types = []
    for row in cursor.fetchall():
        defect_types.append({
            "name": row[0],
            "count": row[1],
            "percentage": round((row[1] / total_complaints * 100), 1) if total_complaints > 0 else 0
        })
    cursor.execute(f"SELECT product_name, unit_of_measure, defect_quantity, warehouse_fulfillment FROM complaints {where_clause}", time_params)
    qty_dict = {}
    for row in cursor.fetchall():
        product = row[0]
        uom = row[1]
        try:
            original_qty = int(row[2]) if row[2] is not None else 0
        except (ValueError, TypeError):
            original_qty = 0
        adjusted_qty = 0
        wh_fulfillment = row[3]
        if wh_fulfillment:
            try:
                wh_data = json.loads(wh_fulfillment)
                if wh_data.get("dispatched_quantity") is not None:
                    adjusted_qty = int(wh_data["dispatched_quantity"])
                elif wh_data.get("exchange_quantity") is not None:
                    adjusted_qty = int(wh_data["exchange_quantity"])
                elif wh_data.get("fulfilled_quantity") is not None:
                    adjusted_qty = int(wh_data["fulfilled_quantity"])
            except Exception:
                adjusted_qty = 0
        key = f"{product} ({uom})" if uom else product
        if key not in qty_dict:
            qty_dict[key] = {"original": 0, "adjusted": 0}
        qty_dict[key]["original"] += original_qty
        qty_dict[key]["adjusted"] += adjusted_qty
    qty_by_product = [{"product": k, "original_quantity": v["original"], "adjusted_quantity": v["adjusted"]} for k, v in sorted(qty_dict.items(), key=lambda item: max(item[1]["original"], item[1]["adjusted"]), reverse=True)[:6]]
    order_dir = "ASC" if (order and order.lower() == "asc") else "DESC"
    trend_date_col = "product_expiry_date" if sort_by in ["expiry_date", "product_expiry_date"] else "complaint_date"
    cursor.execute(f"SELECT {trend_date_col}, COUNT(*) FROM complaints {where_clause} GROUP BY {trend_date_col} ORDER BY {trend_date_col} {order_dir}", time_params)
    trend = [{"date": row[0], "shortDate": row[0][5:] if row[0] else "", "count": row[1]} for row in cursor.fetchall()]
    cursor.execute(f"""
    SELECT manufacturing_code, product_expiry_date, COUNT(*) as cnt
    FROM complaints
    {where_clause}
    GROUP BY manufacturing_code, product_expiry_date
    ORDER BY cnt DESC, product_expiry_date ASC
    LIMIT 5
    """, time_params)
    mfg_summary = [{
        "code": f"{row[0]} · exp {row[1]}",
        "count": row[2]
    } for row in cursor.fetchall()]
    conn.close()
    return {
        "kpis": {
            "total_complaints": total_complaints,
            "total_approved": total_approved,
            "pending_decision": pending_decision,
            "rejected": total_rejected,
            "completed": total_completed,
            "total_closed": total_closed,
            "closed": total_closed
        },
        "status_breakdown": [{"status": s, "count": status_counts[s]} for s in all_statuses],
        "defect_types": defect_types,
        "quantity_by_product": qty_by_product,
        "trend": trend,
        "mfg_summary": mfg_summary
    }
