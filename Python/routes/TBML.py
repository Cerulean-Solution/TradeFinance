"""
app.py
------
TBML Screening API
LLM-Enhanced (Entity + Goods + Country + Value)
"""

from fastapi import FastAPI, HTTPException,APIRouter
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from datetime import date

from TBML_matching.db_utils import (
    insert_trade_transaction,
    insert_transaction_items,
    fetch_watchlist,
    insert_transaction_flags,
    insert_watchlist_entry,
    insert_tool_billing,
    fetch_export_control_items,
    insert_export_control_item
)

from TBML_matching.tbml_matching import run_tbml_matching_async

# -----------------------------
# APP SETUP
# -----------------------------
app = FastAPI(title="TBML Screening API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(
    prefix="/api/lc",
    tags=["TBML"]
)
# -----------------------------
# REQUEST MODELS
# -----------------------------
class Transaction(BaseModel):
    exporter_name: str
    exporter_country: str
    importer_name: str
    importer_country: str
    total_value: float
    currency: str
    shipping_route: str


class Item(BaseModel):
    good_code: str
    description: str
    quantity: float
    unit_price: float


class TBMLRequest(BaseModel):
    user_id: int
    transaction: Transaction
    items: List[Item]


class WatchlistCreate(BaseModel):
    name: str
    source: str
    entity_type: str = "Entity"
    aliases: Optional[str] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    dob: Optional[date] = None
    program: Optional[str] = None
    risk_level: str = "High"
    user_id: int


class ExportControlItemCreate(BaseModel):
    source_regulation: str
    source_country: Optional[str] = None
    regulation_version: Optional[str] = None
    control_code: str
    category: Optional[str] = None
    sub_category: Optional[str] = None
    item_description: str
    short_description: Optional[str] = None
    alternative_names: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    cas_number: Optional[str] = None
    is_military: bool = False
    is_dual_use: bool = False
    is_chemical: bool = False
    is_biological: bool = False
    is_nuclear: bool = False
    is_missile: bool = False
    end_use_control: bool = False
    catch_all_control: bool = False
    control_reason: Optional[str] = None
    license_requirement: Optional[str] = None
    legal_citation: Optional[str] = None
    user_id: int


# -----------------------------
# FLAG NORMALIZER
# -----------------------------
def normalize_flags(flags):
    normalized = []

    for f in flags:
        normalized.append({
            "FlagType": f.get("FlagType"),
            "RuleName": f.get("Rule"),
            "RiskLevel": f.get("RiskLevel"),
            "Reason": f.get("Reason"),
            "MatchedValue": f.get("MatchedValue"),
            "Source": f.get("Source"),
            "Score": round(float(f.get("Score", 0)), 2),
            "Technique": f.get("Techniques")
        })

    return normalized


# -----------------------------
# TBML RUN API
# -----------------------------
@router.post("/tbml/run")
async def run_tbml(req: TBMLRequest):
    try:
        print("[API] TBML run started")

        transaction_no = insert_trade_transaction(
            req.transaction.dict(),
            req.user_id
        )
        print(f"[API] Transaction created: {transaction_no}")

        insert_transaction_items(
            transaction_no,
            [i.dict() for i in req.items],
            req.user_id
        )
        print(f"[API] Items inserted for {transaction_no}")

        watchlist = fetch_watchlist()
        export_controls = fetch_export_control_items()
        print(f"[API] Watchlist={len(watchlist)} | ExportControls={len(export_controls)}")

        flags, token_usage = await run_tbml_matching_async(
            transaction=req.transaction.dict(),
            items=[i.dict() for i in req.items],
            watchlist=watchlist,
            export_controls=export_controls
        )

        print("[LLM] Token usage:", token_usage)
        print("[LLM] Raw flags:", flags)

        flags = normalize_flags(flags)

        if flags:
            insert_transaction_flags(transaction_no, flags, req.user_id)
            print(f"[DB] Flags inserted for {transaction_no}")

        insert_tool_billing({
            "transaction_no": transaction_no,
            "cifid": None,
            "module": "TBML",
            "instrument_type": "Trade",
            "lifecycle": "Screening",
            "variation": "LLM",
            "status": "Active",
            "userid": req.user_id,
            "request_tokens": token_usage["prompt_tokens"],
            "response_tokens": token_usage["completion_tokens"]
        })

        return {
            "transaction_ref": transaction_no,
            "status": "HIGH RISK" if flags else "CLEARED",
            "flags": flags
        }

    except Exception as e:
        print("[ERROR] TBML run failed:", str(e))
        raise HTTPException(status_code=500, detail="TBML screening failed")


# -----------------------------
# WATCHLIST ADD
# -----------------------------
@router.post("/watchlist/add")
def add_watchlist(entry: WatchlistCreate):
    try:
        print(f"[API] Adding watchlist entry: {entry.name}")
        insert_watchlist_entry(entry.dict())
        return {"status": "success", "message": "Watchlist entry added"}
    except Exception as e:
        print("[ERROR] Watchlist insert failed:", str(e))
        raise HTTPException(status_code=500, detail="Failed to add watchlist entry")


# -----------------------------
# EXPORT CONTROL ADD
# -----------------------------
@router.post("/export-control/add")
def add_export_control_item(item: ExportControlItemCreate):
    try:
        payload = item.dict()

        payload["alternative_names"] = (
            ", ".join(item.alternative_names)
            if item.alternative_names else None
        )
        payload["keywords"] = (
            ", ".join(item.keywords)
            if item.keywords else None
        )

        print(
            f"[API] Adding Export Control Item | "
            f"Code={item.control_code} | Regulation={item.source_regulation}"
        )

        insert_export_control_item(payload)

        return {
            "status": "success",
            "message": "Export control item added successfully",
            "control_code": item.control_code
        }

    except Exception as e:
        print("[ERROR] Export control insert failed:", str(e))
        raise HTTPException(status_code=500, detail="Failed to add export control item")
