from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router
from routes.tool_instrument import router as tool_instrument_router  
from routes.tool_billing import router as tool_billing_router
from routes.tool_subdocuments import router as tool_subdocuments_router
from routes.MTConverter import router as mt_converter_router
from routes.amendment import router as Amenment 
from routes.instrument import router as instrument
import traceback
from fastapi.responses import JSONResponse
from fastapi import Request, APIRouter,HTTPException

from dotenv import load_dotenv
load_dotenv()
import sys
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

app = FastAPI(
    title="TF_genie API",
    version="1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------
# GLOBAL EXCEPTION HANDLER
# (ONLY PLACE WHERE IT IS ALLOWED)
# ---------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error"
        }
    )


app.include_router(analyze_router)
app.include_router(tool_instrument_router) 
app.include_router(tool_billing_router)
app.include_router(tool_subdocuments_router)
app.include_router(mt_converter_router)
app.include_router(Amenment)
app.include_router(instrument)
@app.get("/")
def root():
    return {"message": "TF_genie FastAPI Running Successfully"}

# -------------------------------------------------
# UVICORN SERVER (for standalone python run)
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

