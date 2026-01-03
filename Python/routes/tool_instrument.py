from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.db import get_connection
from utils.txn_generator import generate_unique_transaction_no   # see next section
from utils.subdoc_parser import parse_sub_documents   # or inline regex

router = APIRouter(prefix="/api/lc", tags=["tool_instrument"])
class ToolInstrumentIn(BaseModel):
    cifno: str
    customer_name: str
    instrument_type: str
    lifecycle: str
    lc_number: str

    variation_code: str = "issuance"  
    UserID: int | None = None              
    Model:str= "LCAnalysis"   
    prompt_id: int | None = None
    prompt_text: str | None = None
    document_hash: str | None = None
    old_document: str | None = None
    given_amendment: str | None = None
    main_document:str |None = None
    new_document: str | None = None
    extracted_amendment: str | None = None
    verified_amendment: str | None = None
    subdocument_category: str | None = None
    sub_documents: str | None = None
    status: str = "Draft"


@router.post("/save-tool-instrument")
def save_tool_instrument(payload: ToolInstrumentIn, db = Depends(get_connection)):

    # Generate transaction number
    transaction_no = generate_unique_transaction_no(db)
    
    cursor = db.cursor()

    cursor.execute("""
        EXEC sp_insert_tool_instrument
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    """, (
        transaction_no,
        payload.lc_number,
        payload.cifno,
        payload.customer_name,
        payload.instrument_type,
        payload.lifecycle,
        payload.variation_code,
        payload.UserID,
        payload.prompt_id,
        payload.prompt_text,
        payload.document_hash,
        payload.old_document,
        payload.given_amendment,
        payload.new_document,
        payload.extracted_amendment,
        payload.verified_amendment,
        payload.main_document,
        payload.sub_documents,
        payload.subdocument_category,
        payload.status,
        payload.Model
    ))

    row = cursor.fetchone()
    db.commit()

    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")

    # RETURN MUST BE LAST
    return {
        "success": True,
        "inserted_id": int(row[0]),
        "transaction_no": transaction_no
    }


@router.put("/update-status/{transaction_no}")
def update_status(transaction_no: str, db = Depends(get_connection)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE dbo.tool_instrument
        SET status = 'Completed',
            updated_at = GETDATE()
        WHERE transaction_no = ?
    """, (transaction_no,))
    db.commit()

    return {"success": True, "status": "Completed"}


def save_llm_response(
    db,
    transaction_no: str,
    request_id: int,
    response_payload: str,
    token_count: int,
    rag_name: str,
    cifno: str | None = None,
    lc_number: str | None = None,
    UserID: int | None = None,
    Model: str | None = None
):
    cursor = db.cursor()

    cursor.execute(
        """
        EXEC Sp_Insert_LLMResponse
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        """,
        (
            transaction_no,       # 1
            int(request_id),      # 2
            response_payload,     # 3
            int(token_count),     # 4
            rag_name,             # 5
            cifno,                # 6
            lc_number,            # 7
            UserID,               # 8
            Model                 # 9
        )
    )

    row = cursor.fetchone()
    db.commit()
    return row[0] if row else None


# -----------------------------------------------------------
# Save LLM Request Into DB
# -----------------------------------------------------------
def save_llm_request(
    db,
    transaction_no: str,
    request_payload: str,
    token_count: int,
    prompt_id: int | None,
    rag_name: str,
    cifno: str | None = None,
    lc_number: str | None = None,
    UserID: int | None = None,
    Model: str | None = None
):
    cursor = db.cursor()

    cursor.execute(
        """
        EXEC Sp_Insert_LLMRequest
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        """,
        (
            transaction_no,      # 1
            request_payload,     # 2
            int(token_count),    # 3
            prompt_id,           # 4
            rag_name,            # 5
            cifno,               # 6
            lc_number,           # 7
            UserID,              # 8
            Model                # 9
        )
    )

    row = cursor.fetchone()
    db.commit()
    return row[0] if row else None


import json
def save_discrepancy(
    db,
    transaction_no: str,
    d: dict,
    cifno: str | None = None,
    lc_number: str | None = None,
    UserID: int | None = None,
    Model: str | None = None
):
    cursor = db.cursor()

    cursor.execute(
        """
        EXEC Sp_Insert_Discrepancy
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        """,
        (
            transaction_no,                                 # 1

            d.get("discrepancy_title"),                     # 2
            d.get("discrepancy_type"),                      # 3

            str(d.get("severity_level") or "Low"),          # 4

            d.get("source_reference"),                      # 5
            json.dumps(d.get("evidence")) if d.get("evidence") else None,  # 6

            d.get("contradiction_issue") or "No issue provided",  # 7
            d.get("why_problematic"),                       # 8
            d.get("impact"),                                # 9

            d.get("governing_rule"),                        # 10
            d.get("validation_rule"),                       #  11 FIXED

            cifno,                                          # 12
            lc_number,                                      # 13
            UserID,                                         # 14
            Model                                           # 15
        )
    )

    row = cursor.fetchone()
    db.commit()
    return row[0] if row else None

def save_cross_document_discrepancy(
    db,
    transaction_no: str,
    d: dict,
    serial_id: int,
    cifno: str | None = None,
    lc_number: str | None = None,
    UserID: int | None = None,
    Model: str | None = None
):
    cursor = db.cursor()

    cursor.execute("""
        EXEC sp_insert_crossDocument_discrepancy
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    """,
    (
        transaction_no,                          # 1  @transaction_no
        d.get("discrepancy_id"),                 # 2  @discrepancy_id
        d.get("base_document"),                  # 3
        d.get("target_document"),                # 4
        d.get("fields"),                         # 5
        d.get("base_value"),                     # 6
        d.get("target_value"),                   # 7
        d.get("issue"),                          # 8
        int(serial_id),                          # 9  @serial_id (INT)
        d.get("discrepancy_type"),               # 10
        d.get("discrepancy_title"),              # 11
        d.get("discrepancy_short_details"),      # 12
        d.get("discrepancy_long_details"),       # 13
        d.get("discrepancy_base_vs_target"),     # 14
        str(d.get("severity_level") or "Low"),   # 15 @severity_level (NVARCHAR )
        d.get("golden_truth_value"),              # 16
        d.get("secondary_document_value"),       # 17
        d.get("impact"),                         # 18
        cifno,                                   # 19
        lc_number,                               # 20
        UserID,                                  # 21
        Model                                    # 22
    ))

    row = cursor.fetchone()
    db.commit()
    return row[0] if row else None


# ==========================================================
# MODE-3 (MULTIHOP) DB SAVERS
# ==========================================================

def save_multihop_discrepancy(
    db,
    d: dict,
    cifno: str,
    transaction_no: str,
    lc_number: str,
    UserID: int,
    Model: str,
):
    cursor = db.cursor()
    cursor.execute(
        """
        EXEC Sp_Insert_Multihop_Discrepancy
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        """,
        (
            transaction_no,
            cifno,
            lc_number,
            UserID,
            Model,
            d["discrepancy_id"],
            d["discrepancy_type"],
            d["lc_requirement"],
            d["document_observation"],
            d["conclusion_impact"],
            d["ucp_isbp_reference"],
            
        )
    )
    cursor.fetchone()
    db.commit()




def insert_tool_instrument_prompt(
    db,
    transaction_no: str,
    cifno: str,
    rag_name: str,
    prompt_id: int | None,
    prompt_text: str,
    status: bool | None,
    lc_number: str | None,
    user_id: int | None,
    model: str | None,
):
    cursor = db.cursor()

    cursor.execute(
        """
        EXEC dbo.sp_insert_tool_instrument_prompt
            @transaction_no = ?,
            @cifno = ?,
            @Rag = ?,
            @prompt_id = ?,
            @prompt_text = ?,
            @status = ?,
            @lc_number = ?,
            @UserID = ?,
            @Model = ?
        """,
        (
            transaction_no,
            cifno,
            rag_name,
            prompt_id,
            prompt_text,
            "ACTIVE" if status else "INACTIVE",
            lc_number,
            user_id,
            model,
        )
    )

    db.commit()

def insert_tool_billing(
    db,
    transaction_no: str,
    cifno: str,
    Model: str,
    instrument: str,
    lifecycle: str,
    lc_number: str,
    variation_code: str | None,
    is_active: bool,
    UserID: int | None
):
    cursor = db.cursor()

    cursor.execute(
        """
        EXEC dbo.InsertToolBilling
            @transaction_no = ?,
            @cifid = ?,
            @module = ?,
            @instrument_type = ?,
            @lifecycle = ?,
            @lc_number = ?,
            @variation = ?,
            @status = ?,
            @userid = ?
        """,
        (
            transaction_no,                 # transaction_no
            cifno,                          # cifid
            Model,                          # module
            instrument,                     # instrument_type
            lifecycle,                      # lifecycle
            lc_number,                      # lc_number
            variation_code,                 # variation
            "ACTIVE" if is_active else "INACTIVE",  # status
            UserID                          # userid
        )
    )

    row = cursor.fetchone()
    db.commit()
    return row[0] if row else None

# def insert_tool_subdocument(
#     db,
#     transaction_no: str,
#     cifno: str,
#     instrument_type: str,
#     lifecycle: str,
#     lc_number: str,
#     UserID: int,
#     Model: str,
#     category: str,
#     document_text: str
# ):
#     cursor = db.cursor()
#     cursor.execute(
#         """
#         EXEC dbo.sp_insert_tool_subdocuments
#             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
#         """,
#         (
#             transaction_no,
#             cifno,
#             instrument_type,
#             lifecycle,
#             lc_number,
#             UserID,
#             Model,
#             category,
#             category,
#             document_text
#         )
#     )

#     # ❌ REMOVE fetchone()
#     db.commit()
