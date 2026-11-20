import uuid
import time
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.logging import setup_logging
from backend.app.core.errors import LARAError
from backend.app.api.routes import auth, tasks, graph, policies, approvals, evolution, audit, health, tools

setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Correlation and Trace ID Middleware
@app.middleware("http")
async def add_correlation_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
    trace_id = request.headers.get("X-Trace-ID") or f"trc_{uuid.uuid4().hex[:16]}"
    request.state.request_id = request_id
    request.state.trace_id = trace_id
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Trace-ID"] = trace_id
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    return response

# Structured Error Handling
@app.exception_handler(LARAError)
async def lara_exception_handler(request: Request, exc: LARAError):
    request_id = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex[:12]}")
    trace_id = getattr(request.state, "trace_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": request_id,
                "trace_id": trace_id,
                "details": exc.details
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", f"req_{uuid.uuid4().hex[:12]}")
    trace_id = getattr(request.state, "trace_id", None)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "request_id": request_id,
                "trace_id": trace_id
            }
        }
    )

# Include API Routers under /api/v1
API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(tasks.router, prefix=API_PREFIX)
app.include_router(graph.router, prefix=API_PREFIX)
app.include_router(policies.router, prefix=API_PREFIX)
app.include_router(approvals.router, prefix=API_PREFIX)
app.include_router(evolution.router, prefix=API_PREFIX)
app.include_router(audit.router, prefix=API_PREFIX)
app.include_router(tools.router, prefix=API_PREFIX)

# Also expose health checks at root for Cloud Run default probe compatibility
app.include_router(health.router)

@app.get("/")
def root():
    return {
        "service": "LARA Runtime Backend",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": "/api/v1"
    }
