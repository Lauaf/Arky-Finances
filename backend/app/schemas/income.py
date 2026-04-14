from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.common import OrmModel

RecurrenceType = Literal["monthly", "one_time"]


class IncomeBase(OrmModel):
    name: str = Field(min_length=2, max_length=120)
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, default="ARS")
    start_date: date
    recurrence: RecurrenceType = "monthly"
    is_salary_adjusted: bool = False
    notes: str | None = Field(default=None, max_length=600)


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(IncomeBase):
    pass


class IncomeRead(IncomeBase):
    id: int
