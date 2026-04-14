from pydantic import Field

from app.schemas.common import OrmModel


class ProfileRead(OrmModel):
    id: int
    current_balance: float
    minimum_cash_buffer: float
    base_currency: str


class ProfileUpdate(OrmModel):
    current_balance: float = Field(ge=0)
    minimum_cash_buffer: float = Field(ge=0)
    base_currency: str = Field(min_length=3, max_length=3)
