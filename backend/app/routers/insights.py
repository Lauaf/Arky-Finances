from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.insights import DashboardResponse, ProjectionResponse, RecommendationResponse
from app.services.projection import build_dashboard, build_projection, build_recommendation

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/dashboard", response_model=DashboardResponse)
def read_dashboard(
    scenario_id: int | None = None,
    scenario_slug: str | None = None,
    db: Session = Depends(get_db),
) -> DashboardResponse:
    return build_dashboard(db=db, scenario_id=scenario_id, scenario_slug=scenario_slug)


@router.get("/projection", response_model=ProjectionResponse)
def read_projection(
    scenario_id: int | None = None,
    scenario_slug: str | None = None,
    months: int = Query(default=12, ge=1, le=24),
    db: Session = Depends(get_db),
) -> ProjectionResponse:
    return build_projection(db=db, scenario_id=scenario_id, scenario_slug=scenario_slug, months=months)


@router.get("/recommendation", response_model=RecommendationResponse)
def read_recommendation(
    scenario_id: int | None = None,
    scenario_slug: str | None = None,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    return build_recommendation(db=db, scenario_id=scenario_id, scenario_slug=scenario_slug)
