from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.common import OrmModel

ExpenseType = Literal["fixed", "variable"]
RecurrenceType = Literal["monthly", "one_time"]


class ExpenseBase(OrmModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=80)
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, default="ARS")
    expense_type: ExpenseType = "fixed"
    recurrence: RecurrenceType = "monthly"
    start_date: date
    notes: str | None = Field(default=None, max_length=600)


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ExpenseBase):
    pass


class ExpenseRead(ExpenseBase):
    id: int
