from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Body,
    HTTPException,
    Query,
    BackgroundTasks
)
from pydantic import BaseModel
from loguru import logger
import os

# Services
from appp.services.case_id_service import generate_case_id
from appp.services.doc_id_service import generate_doc_id
from appp.services.document_processor import process_document_task
from appp.services.document_summary_service import create_document_summary

# Workers / Jobs
from appp.workers.document_worker import submit_document_job
from appp.crud.job_status import create_job
from appp.crud.document_summary import get_all_magic_box


# Draft / OCR
from appp.crud.draft import (
    get_drafts_by_session,
    get_ocr_by_draft_id,
    get_classification_by_draft_id,
    get_final_ocr_by_draft_id,
    get_summary_by_draft_id
)

# Review
from appp.crud.final_ocr import (
    get_final_ocr,
    update_final_ocr,
    approve_final_ocr
)

# Audit
from appp.crud.audit_log import write_audit_log

# Session / Customer
from appp.crud.session import (
    create_session,
    get_all_sessions,
    create_customer,
    get_customer
)

# Lifecycle
from appp.crud.lifecycle import (
    get_all_lifecycles,
    add_documents_to_lifecycle,
    delete_document_from_lifecycle
)

# DB
from core.db import get_connection_OCR


router = APIRouter(
    prefix="/api/lc",
    tags=["OCR"]
)


# ----------------------------------------------------
# File storage
# ----------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ----------------------------------------------------
# Models
# ----------------------------------------------------
class TextUploadRequest(BaseModel):
    session_id: str
    product: str
    document_name: str
    content: str


# ----------------------------------------------------
# Upload APIs
# ----------------------------------------------------
@router.post("/upload-text-json")
async def upload_text(payload: TextUploadRequest):
    case_id = generate_case_id(payload.product)
    doc_id = generate_doc_id(case_id)

    filename = f"{doc_id}_{payload.document_name}.txt"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(payload.content)

    create_job(doc_id, case_id, file_path)

    submit_document_job(
        process_document_task,
        case_id,
        doc_id,
        file_path,
        payload.document_name,
        payload.session_id
    )

    return {
        "case_id": case_id,
        "doc_id": doc_id,
        "status": "QUEUED",
        "source": "TEXT"
    }


@router.post("/upload-bulk")
async def upload_documents(
    product: str = Form(...),
    files: list[UploadFile] = File(...),
    session_id: str = Form(...)
):
    logger.info(f"📌 Received session_id: {session_id}")
    case_id = generate_case_id(product)
    response = []

    for file in files:
        doc_id = generate_doc_id(case_id)
        filename = f"{doc_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        create_job(doc_id, case_id, file_path)

        submit_document_job(
            process_document_task,
            case_id,
            doc_id,
            file_path,
            file.filename,
            session_id
        )

        response.append({
            "doc_id": doc_id,
            "file_name": file.filename,
            "status": "QUEUED"
        })

    return {"case_id": case_id, "documents": response}


# ----------------------------------------------------
# Draft / OCR GET APIs
# ----------------------------------------------------
@router.get("/drafts/current/{session_id}")
def get_current_draft(session_id: str):
    draft = get_drafts_by_session(session_id)
    if not draft:
        raise HTTPException(status_code=404, detail="No draft found")
    return draft


@router.get("/ocr/current/{session_id}")
def get_ocr(session_id: str):
    return get_ocr_by_draft_id(session_id) or []


@router.get("/classification/current/{session_id}")
def get_classification(session_id: str):
    return get_classification_by_draft_id(session_id) or []


@router.get("/final-ocr/current/{session_id}")
def get_final_ocr_current(session_id: str):
    return get_final_ocr_by_draft_id(session_id) or []


@router.get("/summary/current/{session_id}")
def get_summary(session_id: str):
    return get_summary_by_draft_id(session_id) or []


# ----------------------------------------------------
# Sessions / Customers
# ----------------------------------------------------
@router.post("/sessions")
def create_session_api(payload: dict):
    return create_session(payload)


@router.get("/sessions")
def list_sessions(user_id: str | None = None):
    return get_all_sessions(user_id)


@router.post("/save-customers")
def create_customer_api(payload: dict):
    return create_customer(payload)


@router.get("/get-customer")
def get_customer_api(
    cifno: str | None = Query(None),
    customer_ID: str | None = Query(None)
):
    return get_customer(cifno, customer_ID)


# ----------------------------------------------------
# Lifecycle
# ----------------------------------------------------
@router.get("/lifecycles")
def list_lifecycles():
    return get_all_lifecycles()


@router.post("/{id}/add-documents")
def add_documents(id: int, payload: dict):
    docs = payload.get("required_documents")
    if not docs:
        raise HTTPException(400, "At least one document required")
    return add_documents_to_lifecycle(id, docs)


@router.delete("/{id}/delete-document")
def delete_document(id: int, payload: dict):
    document_name = payload.get("document_name")
    if not document_name:
        raise HTTPException(400, "Missing document_name")
    delete_document_from_lifecycle(id, document_name)
    return {"message": "Document deleted"}


# ----------------------------------------------------
# Master Documents
# ----------------------------------------------------
@router.get("/master-documents")
def get_master_documents():
    conn = get_connection_OCR()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT DocumentID, DocumentCode, DocumentName
        FROM masterdocuments
        WHERE IsActive = 1
        ORDER BY DocumentName
    """)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {"id": r[0], "code": r[1], "name": r[2]}
        for r in rows
    ]



@router.get("/review/{doc_id}")
def fetch_for_review(doc_id: str):
    return get_final_ocr(doc_id)


@router.put("/review/{doc_id}")
def save_edits(doc_id: str, documents_json: str = Body(...), user: str = Body(...)):
    update_final_ocr(doc_id, documents_json, user)
    write_audit_log(None, doc_id, "FINAL_OCR_EDITED", "Reviewer updated OCR", user)
    return {"status": "SAVED"}


def get_customer_by_doc_id(doc_id: str):
    with get_connection_OCR() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                c.sessionId,
                c.cifno,
                c.customer_ID,
                c.customer_name,
                c.accountName,
                c.customer_type,
                c.lc_number,
                c.instrument,
                c.lifecycle
            FROM OF_Customer_details c
            JOIN OF_draft d
                ON c.sessionId = d.session_id
            WHERE d.doc_id = ?
        """, (doc_id,))

        row = cursor.fetchone()
        if not row:
            return None

        return {
            "sessionId": row[0],
            "cifno": row[1],
            "customer_ID": row[2],
            "customer_name": row[3],
            "accountName": row[4],
            "customer_type": row[5],
            "lc_number": row[6],
            "instrument": row[7],
            "lifecycle": row[8],
        }


@router.post("/review/{doc_id}/approve")
def approve(doc_id: str, user: str = Body(...)):

    # 1️⃣ Approve final OCR
    approve_final_ocr(doc_id, user)

    # 2️⃣ Fetch customer snapshot for this document
    customer_data = get_customer_by_doc_id(doc_id)

    if not customer_data:
        raise HTTPException(
            status_code=404,
            detail="Customer details not found for this document"
        )

    # 3️⃣ Create document summary + magic box
    create_document_summary(doc_id, customer_data)

    # 4️⃣ Audit log
    write_audit_log(
        None,
        doc_id,
        "FINAL_OCR_APPROVED",
        "Approved and locked",
        user
    )

    return {"status": "APPROVED"}


@router.get("/magic-box")
def get_magic_box():
    data = get_all_magic_box()
    return {
        "status": "success",
        "count": len(data),
        "data": data
    }