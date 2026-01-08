from core.db import get_connection_OCR
from appp.crud.document_summary import insert_document_summary, insert_magic_box
from appp.crud.session import create_customer
from datetime import datetime

def detect_product(document_codes: set) -> str:
    trade_docs = {
        "letter_of_credit", "bill_of_lading", "bill_of_exchange",
        "invoice", "packing_list", "certificate_of_origin",
        "air_waybill", "sea_way_bill"
    }

    insurance_docs = {
        "POL", "POLICY", "INS_POLICY", "INS_CERT",
        "CLAIM", "CLAIM_FORM", "ENDORSEMENT"
    }

    rfo_docs = {
        "KYC", "APPLICATION", "CONSENT", "UNDERTAKING"
    }

    if document_codes & trade_docs:
        return "Trade Finance"
    if document_codes & insurance_docs:
        return "Insurance"
    if document_codes & rfo_docs:
        return "RFO"
    return "Unknown"

def create_document_summary(doc_id: str, customer_data: dict):
    """
    Creates immutable document summary after approval
    and inserts into magic box with full customer snapshot.
    """
    with get_connection_OCR() as conn:
        cursor = conn.cursor()

        # 0️⃣ Prevent duplicate summary
        cursor.execute("SELECT 1 FROM OF_document_summary WHERE doc_id = ?", (doc_id,))
        if cursor.fetchone():
            return

        # 1️⃣ Job metadata
        cursor.execute("SELECT case_id, file_path FROM OF_document_job_status WHERE doc_id = ?", (doc_id,))
        case_row = cursor.fetchone()
        if not case_row:
            raise RuntimeError(f"Document job not found for doc_id {doc_id}")
        case_id, file_path = case_row

        # 2️⃣ Document name
        cursor.execute("SELECT document_name FROM OF_draft WHERE doc_id = ?", (doc_id,))
        row = cursor.fetchone()
        document_name = row[0] if row else ""

        # 3️⃣ Classification → product & list
        cursor.execute("""
            SELECT DISTINCT classified_name
            FROM OF_classification
            WHERE doc_id = ? AND classified_name <> 'unknown'
        """, (doc_id,))
        document_names = {r[0].lower() for r in cursor.fetchall()}
        document_list = ",".join(sorted(document_names))
        product = detect_product(document_names)

        # 4️⃣ Approved OCR snapshot
        cursor.execute("""
            SELECT documents_json, version, last_edited_by
            FROM OF_final_ocr
            WHERE doc_id = ? AND status = 'APPROVED'
        """, (doc_id,))
        row = cursor.fetchone()
        if not row:
            raise RuntimeError("Document not approved yet")
        documents_json, approved_version, approved_by = row

        # 5️⃣ Ensure session exists in SB_TF_ingestion_Box
        cursor.execute("SELECT 1 FROM SB_TF_ingestion_Box WHERE id = ?", (customer_data["sessionId"],))
        if not cursor.fetchone():
            raise RuntimeError(f"Session {customer_data['sessionId']} does not exist in SB_TF_ingestion_Box")

    # 6️⃣ Create customer (if not already in OF_Customer_details)
    customer = create_customer(customer_data)

    # Helper to safely parse dates
    customer_safe = customer.copy()

    # 7️⃣ Insert immutable document summary
    insert_document_summary(
        case_id,
        doc_id,
        file_path,
        document_name,
        product,
        document_list,
        documents_json,
        approved_version,
        approved_by
    )

    # 8️⃣ Insert into magic box (full customer snapshot) using customer_safe
    insert_magic_box(
        case_id=case_id,
        doc_id=doc_id,
        file_path=file_path,
        document_name=document_name,
        product=product,
        document_list=document_list,
        documents_json=documents_json,
        approved_version=approved_version,
        approved_by=approved_by,
        customer_data=customer_safe  
    )