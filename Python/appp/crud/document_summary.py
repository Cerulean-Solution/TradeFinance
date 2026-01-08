from core.db import get_connection_OCR
from datetime import datetime


def insert_document_summary(
    case_id,
    doc_id,
    file_path,
    document_name,
    product,
    document_list,
    documents_json,
    approved_version,
    approved_by
):
    with get_connection_OCR() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "{CALL sp_insert_document_summary (?, ?, ?, ?, ?, ?, ?, ?, ?)}",
            (
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
        )
        conn.commit()


def insert_magic_box(
    case_id,
    doc_id,
    file_path,
    document_name,
    product,
    document_list,
    documents_json,
    approved_version,
    approved_by,
    customer_data
):
    created_at = datetime.now()
    approved_at = datetime.now() if approved_by else None
    with get_connection_OCR() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "{CALL sp_insert_magic_box (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)}",
            (
                case_id,
                doc_id,
                file_path,
                document_name,
                product,
                document_list,
                documents_json,
                approved_version,
                approved_by,
                
                approved_at,
                created_at,

                customer_data["sessionId"],
                customer_data["cifno"],
                customer_data["customer_ID"],
                customer_data["customer_name"],
                customer_data["accountName"],
                customer_data["customer_type"],
                customer_data.get("lc_number"),
                customer_data.get("instrument"),
                customer_data.get("lifecycle"),

            )
        )
        conn.commit()

def get_all_magic_box():
    with get_connection_OCR() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                id,
                case_id,
                doc_id,
                file_path,
                document_name,
                product,
                document_list,
                documents_json,
                approved_version,
                approved_by,
                approved_at,
                created_at,
                sessionId,
                cifno,
                customer_ID,
                customer_name,
                accountName,
                customer_type,
                lc_number,
                instrument,
                lifecycle
            FROM magic_box
            ORDER BY created_at DESC
            """
        )

        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()

        return [dict(zip(columns, row)) for row in rows]
