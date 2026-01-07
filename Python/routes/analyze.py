from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os 
from datetime import datetime
from analyzers.lc_document_analyzer import LCDocumentAnalyzer
from analyzers.cross_document_analyzer import CrossDocumentAnalyzer
from analyzers.multi_hop_analyzer import MultiHopAnalyzer
from core.db import get_connection
from utils.txn_generator import generate_unique_transaction_no
from routes.tool_instrument import insert_tool_instrument_prompt,save_llm_response ,save_llm_request,save_discrepancy,save_cross_document_discrepancy,save_multihop_discrepancy,insert_tool_billing,save_whole_discrepancy
from analyzers.cross_document_analyzer import (
    extract_table_rows_from_markdown,
    extract_detailed_discrepancies,
    merge_table_and_details,
    extract_multihop_discrepancy_rows,

)
from Prompts.multi_hops_prompts import (
    QUESTION_ANALYSIS_PROMPT,
    MULTI_QUERY_PLANNING_PROMPT,
    CONTEXT_ASSESSMENT_PROMPT,
    DECISION_MAKING_PROMPT,
    ENHANCED_SYNTHESIS_PROMPT,
    ADVANCED_VERIFICATION_PROMPT,
    USER_PROMPT
)
import re


from Prompts.prompts import (
    SYSTEM_PROMPT
)
from Prompts.sysprompt import SYSTEM_PROMPT, SYSTEM_DETAIL_PROMPT
router = APIRouter(prefix="/api/lc", tags=["Analysis"])

RESULT_DIR = "analysis_results"
# -----------------------------------------------------------
# Request from React
# -----------------------------------------------------------
class AnalysisRequest(BaseModel):
    cifno: str
    transaction_id: str 
    instrument: str
    lifecycle: str
    prompt: str
    lc_document: str
    sub_documents: str | None = None
    prompt_id: int | None = None   
    is_active: bool | None = None
    UserID: int | None = None
    Model: str | None = None 
    lc_number: str


def build_prompt_text(
    rag_name: str,
    ui_prompt: str,
):
    """
    Returns the correct prompt_text based on RAG name
    """

    if rag_name == "LLM Rag against standards":
        # MODE 1
        return f"""
custom_prompt = {ui_prompt}
""".strip()

    elif rag_name == "Cross Document Validation":
        # MODE 2
        return f"""
system_prompt = {SYSTEM_PROMPT}

system_detail_prompt = {SYSTEM_DETAIL_PROMPT}
""".strip()

    elif rag_name == "MultiHop RAG":
        # MODE 3
        return f"""
m3 = MultiHopAnalyzer(
    lc_type = instrument_code,
    system_prompt = {SYSTEM_PROMPT},
    question_analysis_prompt = {QUESTION_ANALYSIS_PROMPT},
    multi_query_planning_prompt = {MULTI_QUERY_PLANNING_PROMPT},
    context_assessment_prompt = {CONTEXT_ASSESSMENT_PROMPT},
    decision_making_prompt = {DECISION_MAKING_PROMPT},
    enhanced_synthesis_prompt = {ENHANCED_SYNTHESIS_PROMPT},
    advanced_verification_prompt = {ADVANCED_VERIFICATION_PROMPT},
    user_prompt = {USER_PROMPT},
)
""".strip()

    else:
        return ""

# -----------------------------------------------------------
# Normalize LLM Output
# -----------------------------------------------------------
def normalize(result_raw):
    if isinstance(result_raw, str):
        return {
            "request": "",
            "response": result_raw,
            "analysis": result_raw,
            "tokens": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            }
        }

    if isinstance(result_raw, dict):
        return {
            "request": result_raw.get("request", ""),
            "response": result_raw.get("response", result_raw.get("analysis", "")),
            "analysis": result_raw.get("analysis", ""),
            "tokens": result_raw.get("tokens", {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            })
        }

    return {
        "request": "",
        "response": str(result_raw),
        "analysis": str(result_raw),
        "tokens": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
    }


def save_mode_result_to_txt(
    transaction_id: str,
    mode_name: str,
    file_name: str,
    result: dict,
    instrument: str,
    lifecycle: str
):
    os.makedirs(RESULT_DIR, exist_ok=True)

    file_path = os.path.join(RESULT_DIR, f"{transaction_id}_{file_name}")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(f"MODE           : {mode_name}\n")
        f.write(f"TRANSACTION ID : {transaction_id}\n")
        f.write(f"INSTRUMENT     : {instrument}\n")
        f.write(f"LIFECYCLE      : {lifecycle}\n")
        f.write(f"TIMESTAMP      : {datetime.now()}\n")
        f.write("\n" + "=" * 80 + "\n\n")

        f.write("RESPONSE\n")
        f.write("-" * 80 + "\n")
        f.write(result.get("response", "") + "\n\n")



def extract_mode1_issues_only(text: str) -> str:
    """
    Extract Mode-1 ISSUE content ONLY.
    Everything AFTER '### TABULAR SUMMARY ###' is removed.
    """

    # 1️⃣ Cut content before TABULAR SUMMARY
    split_text = re.split(r"\n###\s+TABULAR\s+SUMMARY\s+###", text, flags=re.IGNORECASE)
    issue_part = split_text[0]

    # 2️⃣ Clean trailing spaces
    return issue_part.strip()


# def extract_mode2_serials_only(text: str) -> str:
#     """
#     Extract:
#     - Report title
#     - TOTAL DISCREPANCIES FOUND
#     - ALL #### Serial ID blocks
#     """

#     parts = []

#     # 1️⃣ Report title
#     title_match = re.search(
#         r"# Trade Finance Compliance Cross Document Validation Analysis Report",
#         text
#     )
#     if title_match:
#         parts.append(title_match.group(0))

#     # 2️⃣ Total discrepancies
#     total_match = re.search(
#         r"\*\*TOTAL DISCREPANCIES FOUND:\*\*\s*\d+",
#         text
#     )
#     if total_match:
#         parts.append("\n" + total_match.group(0))

#     # 3️⃣ Serial ID blocks
#     serial_blocks = re.findall(
#         r"(#### Serial ID:\s*\d+[\s\S]*?)(?=\n#### Serial ID:\s*\d+|\Z)",
#         text
#     )

#     if serial_blocks:
#         parts.append("\n---\n" + "\n\n---\n\n".join(block.strip() for block in serial_blocks))

#     return "\n\n".join(parts).strip()


def extract_mode2_serials_only(text: str) -> str:
    """
    Extract Mode-2 output excluding ONLY the Markdown Table of Discrepancies.
    Keeps:
    - Report header
    - Documents Processed
    - Detailed Analysis
    - TOTAL DISCREPANCIES FOUND
    - ALL #### Serial ID blocks
    """

    # 1️⃣ Remove Markdown Table section completely
    text_no_table = re.sub(
        r"### Markdown Table of Discrepancies[\s\S]*?---",
        "",
        text,
        flags=re.IGNORECASE
    )

    parts = []

    # 2️⃣ Header + documents processed
    header_match = re.search(
        r"#Trade Finance Compliance Cross Document Validation Analysis Report[\s\S]*?"
        r"## Documents Processed:[\s\S]*?---",
        text_no_table
    )
    if header_match:
        parts.append(header_match.group(0).strip())

    # 3️⃣ TOTAL DISCREPANCIES FOUND
    total_match = re.search(
        r"\*\*TOTAL DISCREPANCIES FOUND:\*\*\s*\d+",
        text_no_table
    )
    if total_match:
        parts.append(total_match.group(0))

    # 4️⃣ Serial ID blocks
    serial_blocks = re.findall(
        r"(#### Serial ID:\s*\d+[\s\S]*?)(?=\n#### Serial ID:\s*\d+|\Z)",
        text_no_table
    )

    if serial_blocks:
        parts.append("\n---\n".join(block.strip() for block in serial_blocks))

    return "\n\n".join(parts).strip()

@router.post("/analyze-lc")
def analyze_lc(data: AnalysisRequest):
    print("start analysis")

    try:
        db = get_connection()
        transaction_id = data.transaction_id
        instrument_code = data.instrument
        # lifecycle_code = data.lifecycle
        lifecycle_code = data.lifecycle.strip().lower()

        if lifecycle_code == "issuance":
            model_name = "LCAnalysis"
            variation_code = "ISSUANCE"
        elif lifecycle_code == "amendment":
            model_name = "Amendment"
            variation_code = "AMENDMENT"
        else:
            raise ValueError(f"Unsupported lifecycle: {data.lifecycle}")

        ui_prompt = data.prompt.strip()
        lc_text = data.lc_document.strip()
        sub_text = (data.sub_documents or "").strip()


        if not lc_text:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "LC document is empty"}
            )

        # ---------------- MODE 1 ---------------------
        m1 = LCDocumentAnalyzer(
            lc_type=instrument_code,
            lc_code=instrument_code,
            lifecycle_code=lifecycle_code,
            custom_prompt=ui_prompt
        )

        mode1_raw = m1.analyze(lc_text)
        mode1 = normalize(mode1_raw)
        save_mode_result_to_txt(
            transaction_id=transaction_id,
            mode_name="Mode 1 – Against Own Standards",
            file_name="against_own_standards_result.txt",
            result=mode1,
            instrument=instrument_code,
            lifecycle=lifecycle_code
        )


        request_id_m1 = save_llm_request(
            db=db,
            transaction_no=transaction_id,
            request_payload=mode1["request"],
            token_count=mode1["tokens"]["prompt_tokens"],
            prompt_id=data.prompt_id,
            rag_name="LLM Rag against standards",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )

        rag_name = "LLM Rag against standards"

        prompt_text = build_prompt_text(
            rag_name=rag_name,
            ui_prompt=ui_prompt,
        )

        insert_tool_instrument_prompt(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            rag_name=rag_name,
            prompt_id=data.prompt_id,
            prompt_text=prompt_text,
            status=data.is_active,
            lc_number=data.lc_number,
            user_id=data.UserID,
            model=model_name,
        )

        save_llm_response(
            db=db,
            transaction_no=transaction_id,
            request_id=request_id_m1,
            response_payload=mode1["response"],
            token_count=mode1["tokens"]["completion_tokens"],
            rag_name="LLM Rag against standards",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )

                
        # # ---------------------------------------------------------
        # # ⭐ INSERT DISCREPANCIES (MODE-1 ONLY)
        # # ---------------------------------------------------------
        import json
        try:
            response_text = mode1["response"]

            # Extract JSON inside ```json ... ```
            if "```json" in response_text:
                json_block = response_text.split("```json")[1].split("```")[0].strip()
                data_json = json.loads(json_block)
            else:
                data_json = None

            # Insert each discrepancy row
            if data_json and "discrepancies" in data_json:
                serial = 1
                for d in data_json["discrepancies"]:
                    save_discrepancy(
                        db=db,
                        transaction_no=transaction_id,
                        d=d,
                        cifno=data.cifno,
                        lc_number=data.lc_number,
                        UserID=data.UserID,
                        Model=model_name
                    )


        except Exception as err:
            print("DISCREPANCY INSERT ERROR:", err)

        # ---------------- MODE 2 ---------------------
        m2 = CrossDocumentAnalyzer(
            lc_type=instrument_code,
            lc_code=instrument_code,
            lifecycle_code=lifecycle_code,
            system_prompt=SYSTEM_PROMPT,
            system_detail_prompt=SYSTEM_DETAIL_PROMPT
        )

        mode2_raw = m2.analyze(lc_text, presented_documents=sub_text)
        mode2 = normalize(mode2_raw)
        save_mode_result_to_txt(
            transaction_id=transaction_id,
            mode_name="Mode 2 – Cross Document Validation",
            file_name="cross_document_result.txt",
            result=mode2,
            instrument=instrument_code,
            lifecycle=lifecycle_code
        )

        # ---------------------------------------------------------
        # INSERT MODE-2 CROSS DOCUMENT DISCREPANCIES
        # ---------------------------------------------------------
        try:
            
            md_text = mode2["response"]

            # 1. table rows
            table_rows = extract_table_rows_from_markdown(md_text)

            # 2. detailed rows
            detail_rows = extract_detailed_discrepancies(md_text)

            # 3. merged complete rows
            final_rows = merge_table_and_details(table_rows, detail_rows)

            serial = 1
            for r in final_rows:
                save_cross_document_discrepancy(
                    db=db,
                    transaction_no=transaction_id,
                    d=r,
                    serial_id=serial,
                    cifno=data.cifno,
                    lc_number=data.lc_number,
                    UserID=data.UserID,
                    Model=model_name
                )
                serial += 1



        except Exception as err:
            print("MODE-2 DISCREPANCY INSERT ERROR:", err)


        request_id_m2 = save_llm_request(
            db=db,
            transaction_no=transaction_id,
            request_payload=mode2["request"],
            token_count=mode2["tokens"]["prompt_tokens"],
            prompt_id=data.prompt_id,
            rag_name="Cross Document Validation",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )
        rag_name = "Cross Document Validation"

        prompt_text = build_prompt_text(
            rag_name=rag_name,
            ui_prompt=ui_prompt,
        )

        insert_tool_instrument_prompt(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            rag_name=rag_name,
            prompt_id=data.prompt_id,
            prompt_text=prompt_text,
            status=data.is_active,
            lc_number=data.lc_number,
            user_id=data.UserID,
            model=model_name,
        )


        save_llm_response(
            db=db,
            transaction_no=transaction_id,
            request_id=request_id_m2,
            response_payload=mode2["response"],
            token_count=mode2["tokens"]["completion_tokens"],
            rag_name="Cross Document Validation",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )

        # ---------------- MODE 3 ---------------------
        m3 = MultiHopAnalyzer(
        lc_type=instrument_code,
        system_prompt=SYSTEM_PROMPT,
        question_analysis_prompt=QUESTION_ANALYSIS_PROMPT,
        multi_query_planning_prompt=MULTI_QUERY_PLANNING_PROMPT,
        context_assessment_prompt=CONTEXT_ASSESSMENT_PROMPT,
        decision_making_prompt=DECISION_MAKING_PROMPT,
        enhanced_synthesis_prompt=ENHANCED_SYNTHESIS_PROMPT,
        advanced_verification_prompt=ADVANCED_VERIFICATION_PROMPT,
        user_prompt=USER_PROMPT,
    )


        mode3_raw = m3.analyze(lc_text, presented_documents=sub_text)
        mode3 = normalize(mode3_raw)

        save_mode_result_to_txt(
            transaction_id=transaction_id,
            mode_name="Mode 3 – MultiHop RAG",
            file_name="multihop_result.txt",
            result=mode3,
            instrument=instrument_code,
            lifecycle=lifecycle_code
        )



        request_id_m3 = save_llm_request(
            db=db,
            transaction_no=transaction_id,
            request_payload=mode3["request"],
            token_count=mode3["tokens"]["prompt_tokens"],
            prompt_id=data.prompt_id,
            rag_name="MultiHop RAG",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )
        rag_name = "MultiHop RAG"

        prompt_text = build_prompt_text(
            rag_name=rag_name,
            ui_prompt=ui_prompt,
        )

        insert_tool_instrument_prompt(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            rag_name=rag_name,
            prompt_id=data.prompt_id,
            prompt_text=prompt_text,
            status=data.is_active,
            lc_number=data.lc_number,
            user_id=data.UserID,
            model=model_name,
        )


        save_llm_response(
            db=db,
            transaction_no=transaction_id,
            request_id=request_id_m3,
            response_payload=mode3["response"],
            token_count=mode3["tokens"]["completion_tokens"],
            rag_name="MultiHop RAG",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )
        # ==========================================================
        # SAVE WHOLE DISCREPANCY (ONE ROW)
        # ==========================================================

        try:
            own_issues_text = extract_mode1_issues_only(mode1["response"])
            cross_serials_text = extract_mode2_serials_only(mode2["response"])
            multihop_full_text = mode3["response"]

            save_whole_discrepancy(
                db=db,
                transaction_no=transaction_id,
                cifno=data.cifno,
                lc_number=data.lc_number,
                UserID=data.UserID,

                own_discrepancy=own_issues_text,
                cross_discrepancy=cross_serials_text,
                multihop_discrepancy=multihop_full_text,

                main_document=lc_text,        # ⭐ FIXED
                sub_document=sub_text,        # ⭐ FIXED

                Model=model_name,
                Status="pending"
            )


        except Exception as err:
            print("WHOLE DISCREPANCY INSERT ERROR:", err)



        inserted_billing_id = insert_tool_billing(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            Model=model_name,
            instrument=instrument_code,
            lifecycle=lifecycle_code,
            lc_number=data.lc_number,
            variation_code=variation_code,
            is_active=data.is_active,
            UserID=data.UserID
        )
        # Return to React
        return {
            "success": True,
            "transaction_id": transaction_id,
            "instrument": instrument_code,
            "lifecycle": lifecycle_code,
            "prompt_used": ui_prompt,
            "billing_id": inserted_billing_id,
            "mode1": mode1,
            "mode2": mode2,
            "mode3": mode3,
        }

            # After Mode 3 response is saved
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )