"""
API Routes - Admin Event Templates endpoints.

CRUD per la gestione dei template evento (specifiche definite dal team).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.event_mgmt.service import (
    create_template,
    update_template,
    delete_template,
    list_templates,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class EventTemplateRequest(BaseModel):
    name: str
    description: str = ""
    category: str
    target_sector: Optional[str] = None
    target_region: Optional[str] = None
    intensity_level: str = "medium"


class EventTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_sector: Optional[str] = None
    target_region: Optional[str] = None
    intensity_level: Optional[str] = None
    active: Optional[bool] = None


@router.get("/event-templates")
def api_list_templates(active_only: bool = False):
    """Lista tutti i template evento."""
    return list_templates(active_only)


@router.post("/event-templates")
def api_create_template(request: EventTemplateRequest):
    """Crea un nuovo template evento."""
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if request.intensity_level not in ("low", "medium", "high"):
        raise HTTPException(status_code=400, detail="intensity_level must be low, medium, or high")
    return create_template(
        name=request.name,
        description=request.description,
        category=request.category,
        target_sector=request.target_sector,
        target_region=request.target_region,
        intensity_level=request.intensity_level,
    )


@router.put("/event-templates/{template_id}")
def api_update_template(template_id: int, request: EventTemplateUpdate):
    """Aggiorna un template evento."""
    updates = request.dict(exclude_unset=True, exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "intensity_level" in updates and updates["intensity_level"] not in ("low", "medium", "high"):
        raise HTTPException(status_code=400, detail="intensity_level must be low, medium, or high")
    result = update_template(template_id, **updates)
    if not result:
        raise HTTPException(status_code=404, detail="Template not found")
    return result


@router.delete("/event-templates/{template_id}")
def api_delete_template(template_id: int):
    """Disattiva (soft delete) un template evento."""
    delete_template(template_id)
    return {"status": "ok", "message": f"Template {template_id} deactivated"}
