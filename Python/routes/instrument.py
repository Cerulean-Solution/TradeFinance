from fastapi import APIRouter, HTTPException,Query
from pydantic import BaseModel, Field
from datetime import datetime
import random, string, json

from core.db import get_connection

# router = APIRouter()
from fastapi import APIRouter,HTTPException
router = APIRouter(
    prefix="/api/lc",
    tags=["Instrument"]
)

# -------------------------------------------------------------
# Pydantic Schemas (UNCHANGED)
# -------------------------------------------------------------
class InstrumentDraft(BaseModel):
    cifno: str | None = None
    customer_name: str | None = None
    instrument_type: str | None = None
    lifecycle: str | None = None
    prompt_text: str | None = None
    prompt_id: int | None = None
    status: str | None = None
    lc_number: str | None = None
    variation_code: str | None = None
    userID: int | None = None
    model_name: str | None = Field(None, alias="model")

    class Config:
        populate_by_name = True


class DocumentUpload(BaseModel):
    old_document: str | None = None
    given_amendment: str | None = None
    new_document: str | None = None
    extracted_amendment: dict | None = None
    verified_amendment: dict | None = None


class InstrumentFullUpdate(InstrumentDraft, DocumentUpload):
    pass


# -------------------------------------------------------------
# Helper: Transaction Generator (UNCHANGED LOGIC)
# -------------------------------------------------------------
def generate_unique_transaction_no():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        while True:
            random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            ym = datetime.now().strftime("%Y%m")
            txn_no = f"TXN-{ym}-{random_str}"

            cursor.execute(
                "SELECT 1 FROM tool_instrument WHERE transaction_no = ?",
                txn_no
            )
            if not cursor.fetchone():
                return txn_no
    finally:
        conn.close()


# -------------------------------------------------------------
# Create Draft (SAME API)
# -------------------------------------------------------------
@router.post("/instruments/draft", response_model=dict)
def create_draft(data: InstrumentDraft):
    txn_no = generate_unique_transaction_no()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO tool_instrument (
            cifno,
            customer_name,
            instrument_type,
            lifecycle,
            prompt_text,
            prompt_id,
            transaction_no,
            status,
            lc_number,
            variation_code,
            UserID,
            Model
        )

        OUTPUT INSERTED.id
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
                (
            data.cifno or "",
            data.customer_name or "",
            data.instrument_type or "",
            data.lifecycle or "",
            data.prompt_text,
            int(data.prompt_id) if data.prompt_id else None,
            txn_no,
            "draft",
            data.lc_number,
            data.variation_code,
            int(data.userID) if data.userID else None,
            data.model_name or "amendment_v1"
        )

    ))

    inserted_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()

    return {"id": inserted_id, "transaction_no": txn_no}


# -------------------------------------------------------------
# Update Draft (BY ID) – SAME BEHAVIOR
# -------------------------------------------------------------
@router.put("/instruments/draft/{draft_id}", response_model=dict)
def update_draft(draft_id: int, data: InstrumentDraft):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT transaction_no FROM tool_instrument WHERE id = ? AND status = 'draft'",
        draft_id
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Draft not found")

    updates = data.model_dump(exclude_unset=True, by_alias=True)
    for key, value in updates.items():
        cursor.execute(
            f"UPDATE tool_instrument SET {key} = ? WHERE id = ?",
            value,
            draft_id
        )

    conn.commit()
    conn.close()

    return {"id": draft_id, "transaction_no": row[0]}

# -------------------------------------------------------------
# Update by Transaction No (FIXES YOUR 404)
# -------------------------------------------------------------
@router.put("/instruments/by-txn/{transaction_no}")
def update_by_transaction_no(transaction_no: str, data: InstrumentFullUpdate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM tool_instrument WHERE transaction_no = ?",
        transaction_no
    )
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Record not found")

    updates = data.model_dump(exclude_unset=True, by_alias=True)

    COLUMN_MAP = {
        "userID": "UserID",
        "model": "Model"
    }

    for key, value in updates.items():
        column = COLUMN_MAP.get(key, key)

        if isinstance(value, dict):
            value = json.dumps(value)

        cursor.execute(
            f"UPDATE tool_instrument SET {column} = ? WHERE transaction_no = ?",
            value,
            transaction_no
        )


    conn.commit()
    conn.close()

    return {"transaction_no": transaction_no, "status": "updated"}

@router.get("/instruments")
def get_instruments():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("EXEC sp_GetInstrumentTypes")
    rows = cursor.fetchall()

    return [
        {"instrument_type": row.instrument_type, "full_name": row.full_name}
        for row in rows
    ]

@router.get("/lifecycle-stages")
def get_life_cycles():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("EXEC sp_GetLifeCycleStages")
    rows = cursor.fetchall()

    return [
        {
            "lifecycle_stage": row.lifecycle_stage,
            "display_name": row.display_name
        }
        for row in rows
    ]
@router.get("/prompts")
def get_prompt(instrument_type: str = Query(...), lifecycle_stage: str = Query(...)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT TOP 1 prompt_id,prompt_text, description,is_active
        FROM prompts
        WHERE instrument_type = ?
        AND lifecycle_stage = ?
        AND is_active = 1
    """, (instrument_type, lifecycle_stage))

    row = cursor.fetchone()

    if not row:
        return {"prompt_text": "", "description": ""}

    return {
        "prompt_text": row.prompt_text,
        "description": row.description,
        "prompt_id":row.prompt_id,
        "is_active":row.is_active
    }

@router.get("/master-documents")

def get_master_documents():

    """
    Returns list of all active master documents:
    - DocumentID
    - DocumentCode
    - DocumentName
    - Description
    - IsActive
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        query = """
        SELECT DocumentID, DocumentCode, DocumentName, Description, IsActive
        FROM MasterDocuments
        WHERE IsActive = 1
        ORDER BY DocumentName
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        documents = []
        for row in rows:
            documents.append({
            "documentId": row.DocumentID,
            "documentCode": row.DocumentCode,
            "documentName": row.DocumentName,
            "description": row.Description,
            "isActive": row.IsActive,
        })


        return documents

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
