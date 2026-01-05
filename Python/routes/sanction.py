from fastapi import FastAPI, HTTPException,APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import json
import time
import traceback

# --------------------------------------------------
# IMPORT UTILITIES
# --------------------------------------------------
from sanction_1.db_utils import (
    test_database_connection,
    test_azure_openai_connection,
    get_sanctions_data,
    add_sanction_entry,
    save_screening_activity,
    retrieve_screening_activity,
    log_message
)

from sanction_1.matching_algorithms import run_all_matching_techniques

# --------------------------------------------------
# APP INIT
# --------------------------------------------------
print("[INIT] Starting Sanctions Screening API")

app = FastAPI(title="Sanctions Screening API", version="4.0")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(
    prefix="/api/lc",
    tags=["sanction"]
)

# --------------------------------------------------
# MODELS
# --------------------------------------------------
class AddSanctionEntryRequest(BaseModel):
    name: str
    country: str
    source: Optional[str] = "Manual Entry"
    user_id: Optional[int] = None


class ScreeningRequest(BaseModel):
    name: str
    lc_number: Optional[str] = ""
    user_id: Optional[int] = None


class RetrieveRequest(BaseModel):
    serial_number: str


# --------------------------------------------------
# ROUTES
# --------------------------------------------------

@router.get("/connectivity")
async def check_connectivity():
    try:
        print("[CONNECTIVITY] Checking DB and Azure")
        db_status, db_msg = test_database_connection()
        ai_status, ai_msg = test_azure_openai_connection()

        return {
            "database": {"status": db_status, "message": db_msg},
            "azure": {"status": ai_status, "message": ai_msg}
        }
    except Exception as e:
        print("[ERROR] /connectivity:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Connectivity check failed")


# --------------------------------------------------

@router.post("/sanction/add")
async def add_sanction_entry_route(request: AddSanctionEntryRequest):
    try:
        print("[SANCTION ADD] Request received:", request.dict())

        if not request.user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        ok, msg = add_sanction_entry(
            request.name,
            request.country,
            request.source,
            request.user_id
        )

        if not ok:
            raise HTTPException(status_code=400, detail=msg)

        print("[SANCTION ADD] Success:", msg)
        return {"message": msg}

    except HTTPException:
        raise
    except Exception as e:
        print("[ERROR] /sanction/add:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to add sanction entry")


# --------------------------------------------------

@router.post("/screening/run")
async def run_screening(request: ScreeningRequest):
    try:
        print("[SCREENING] Started")
        print("[SCREENING] Input:", request.dict())

        if not request.user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        if not request.name:
            raise HTTPException(status_code=400, detail="Name is required for screening")

        start_time = time.time()

        serial = f"SCR-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
        print("[SCREENING] Serial generated:", serial)

        sanctions = get_sanctions_data()
        print(f"[SCREENING] Records fetched: {len(sanctions)}")

        all_matches = []

        for idx, record in enumerate(sanctions, start=1):
            try:
                result = run_all_matching_techniques(request.name, "", record)

                if result.get("any_match"):
                    techniques = [t for t in result["techniques"] if t["match"]]
                    avg_score = (
                        sum(t["score"] for t in techniques) / len(techniques)
                        if techniques else 0
                    )

                    all_matches.append({
                        "matching_name": record.get("name"),
                        "country": record.get("country"),
                        "relevancy_score": f"{avg_score * 100:.1f}%",
                        "match_count": result.get("match_count"),
                        "techniques_used": ", ".join(t["technique"] for t in techniques),
                        "source": record.get("source"),
                    })

            except Exception as inner_err:
                print(f"[WARN] Matching failed for record {idx}:", inner_err)

        duration_seconds = round(time.time() - start_time, 2)

        response_data = {
            "serial": serial,
            "total_records": len(sanctions),
            "matches_found": len(all_matches),
            "results": all_matches
        }

        print("[SCREENING] Matches found:", len(all_matches))
        print("[SCREENING] Duration:", duration_seconds, "seconds")

        # SAVE ACTIVITY
        save_screening_activity(
            serial_number=serial,
            lc_number=request.lc_number,
            input_name=request.name,
            input_address=None,
            matches_data=json.dumps(all_matches),
            total_matches=len(all_matches),
            records_processed=len(sanctions),
            duration_seconds=duration_seconds,
            user_id=request.user_id
        )

        print("[SCREENING] Activity saved")

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        print("[ERROR] /screening/run:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Screening failed")


# --------------------------------------------------

@router.post("/screening/retrieve")
async def retrieve_screening(request: RetrieveRequest):
    try:
        print("[RETRIEVE] Serial:", request.serial_number)

        result = retrieve_screening_activity(request.serial_number)

        if not result:
            raise HTTPException(status_code=404, detail="No history found")

        raw_matches = result.get("matches_data")

        if isinstance(raw_matches, str):
            try:
                parsed_matches = json.loads(raw_matches)
            except Exception:
                parsed_matches = []
        else:
            parsed_matches = raw_matches or []

        response = {
            "serial": result.get("serial_number"),
            "name": result.get("input_name"),
            "address": result.get("input_address"),
            "results": parsed_matches,
            "total_records": len(parsed_matches),
            "matches_found": len(parsed_matches),
            "created_at": result.get("created_at"),
        }

        print("[RETRIEVE] Records returned:", len(parsed_matches))
        return response

    except HTTPException:
        raise
    except Exception as e:
        print("[ERROR] /screening/retrieve:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to retrieve screening")


# --------------------------------------------------

@router.get("/logs")
async def get_logs(limit: int = 10):
    try:
        print("[LOGS] Fetching last", limit, "entries")
        with open("audit_log.txt", "r", encoding="utf-8") as f:
            logs = f.readlines()
        return {"logs": logs[-limit:]}
    except Exception as e:
        print("[ERROR] /logs:", e)
        return {"logs": []}

# --------------------------------------------------
# END OF FILE
# --------------------------------------------------



# # app.py
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from typing import Optional, List
# from datetime import datetime
# import uuid
# import json
# import time


# # Import your existing utility functions
# from sanction_1.db_utils import (
#     test_database_connection,
#     test_azure_openai_connection,
#     get_sanctions_data,
#     add_sanction_entry,
#     save_screening_activity,
#     retrieve_screening_activity,
#     log_message
# )
# from sanction_1.matching_algorithms import run_all_matching_techniques

# app = FastAPI(title="Sanctions Screening API", version="4.0")
# origins = [
#     "http://localhost:5173",  # your React dev server
#     "http://localhost:3000",  # if you serve frontend on 3000
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # -------------------------------
# # MODELS
# # -------------------------------
# class AddSanctionEntryRequest(BaseModel):
#     name: str
#     country: str
#     source: Optional[str] = "Manual Entry"
#     user_id: Optional[int] = None

# class ScreeningRequest(BaseModel):
#     name: str
#     lc_number: Optional[str] = ""
#     user_id: Optional[int] = None
    
# class RetrieveRequest(BaseModel):
#     serial_number: str

# # -------------------------------
# # ROUTES
# # -------------------------------

# @app.get("/connectivity")
# async def check_connectivity():
#     db_status, db_msg = test_database_connection()
#     ai_status, ai_msg = test_azure_openai_connection()
#     return {
#         "database": {"status": db_status, "message": db_msg},
#         "azure": {"status": ai_status, "message": ai_msg}
#     }

# @app.post("/sanction/add")
# async def add_sanction_entry_route(request: AddSanctionEntryRequest):
#     ok, msg = add_sanction_entry(request.name, request.country, request.source,request.user_id)

#     if not request.user_id:
#         raise HTTPException(status_code=401, detail="User not authenticated")

#     if not ok:
#         raise HTTPException(status_code=400, detail=msg)
#     return {"message": msg}

# @app.post("/screening/run")
# async def run_screening(request: ScreeningRequest):

#     if not request.user_id:
#         raise HTTPException(status_code=401, detail="User not authenticated")

#     if not request.name:
#         raise HTTPException(status_code=400, detail="Name is required for screening.")

#     start_time = time.time()

#     serial = f"SCR-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"

#     sanctions = get_sanctions_data()
#     all_matches = []

#     for record in sanctions:
#         result = run_all_matching_techniques(request.name, "", record)
#         if result["any_match"]:
#             techniques = [t for t in result["techniques"] if t["match"]]
#             avg_score = sum(t["score"] for t in techniques)/len(techniques) if techniques else 0

#             all_matches.append({
#                 "matching_name": record["name"],
#                 "country": record["country"],
#                 "relevancy_score": f"{avg_score*100:.1f}%",
#                 "match_count": result["match_count"],
#                 "techniques_used": ", ".join(t["technique"] for t in techniques),
#                 "source": record["source"],
#             })

#     response_data = {
#         "serial": serial,
#         "total_records": len(sanctions),
#         "matches_found": len(all_matches),
#         "results": all_matches
#     }

#     # SAVE ACTIVITY
#     duration_seconds = round(time.time() - start_time, 2)
#     matches_json = json.dumps(all_matches)

#     save_screening_activity(
#         serial_number=serial,
#         lc_number=request.lc_number,
#         input_name=request.name,
#         input_address=None,
#         matches_data=matches_json,
#         total_matches=len(all_matches),
#         records_processed=len(sanctions),
#         duration_seconds=duration_seconds,
#         user_id=request.user_id   
#     )

#     return response_data


# @app.post("/screening/retrieve")
# async def retrieve_screening(request: RetrieveRequest):
#     result = retrieve_screening_activity(request.serial_number)

#     if not result:
#         raise HTTPException(status_code=404, detail="No history found.")

#     # Extract matches_data
#     raw_matches = result.get("matches_data")

#     # Convert JSON string → Python list
#     if isinstance(raw_matches, str):
#         try:
#             parsed_matches = json.loads(raw_matches)
#         except Exception:
#             parsed_matches = []
#     else:
#         parsed_matches = raw_matches if raw_matches else []

#     # Standardize output for frontend
#     response = {
#         "serial": result.get("serial_number"),
#         "name": result.get("input_name"),
#         "address": result.get("input_address"),
#         "results": parsed_matches,
#         "total_records": len(parsed_matches),
#         "matches_found": len(parsed_matches),
#         "created_at": result.get("created_at"),
#     }

#     return response

# @app.get("/logs")
# async def get_logs(limit: int = 10):
#     try:
#         with open("audit_log.txt", "r", encoding="utf-8") as f:
#             logs = f.readlines()
#         return {"logs": logs[-limit:]}
#     except Exception:
#         return {"logs": []}
# # =================================================================
