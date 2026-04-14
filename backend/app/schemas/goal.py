from datetime import date

from pydantic import Field

from app.schemas.common import OrmModel


class GoalBase(OrmModel):
    name: str = Field(min_length=2, max_length=120)
    target_amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, default="ARS")
    target_date: date
    priority: int = Field(ge=1, le=5, default=2)
    monthly_contribution_ideal: float = Field(ge=0)
    current_progress: float = Field(ge=0)
    future_probability: float | None = Field(default=None, ge=0, le=100)


class GoalCreate(GoalBase):
    pass


class GoalUpdate(GoalBase):
    pass


class GoalRead(GoalBase):
    id: int
