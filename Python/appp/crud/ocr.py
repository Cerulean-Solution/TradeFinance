from core.db import get_connection_OCR

def insert_ocr_page(
    case_id, doc_id, file_path,
    page_no, extracted_text, signature_stamp
):
    with get_connection_OCR() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "{CALL sp_insert_ocr_page (?, ?, ?, ?, ?, ?)}",
            (
                case_id,
                doc_id,
                file_path,
                page_no,
                extracted_text,
                signature_stamp
            )
        )
        conn.commit()
