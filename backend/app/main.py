from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.locations.router import router as locations_router
from app.importer.router import router as importer_router

app = FastAPI(title="Timeline Viewer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(locations_router, prefix="/locations", tags=["locations"])
app.include_router(importer_router, prefix="/import", tags=["import"])
