from pydantic import Field

from app.schemas.common import OrmModel


class ScenarioBase(OrmModel):
    name: str = Field(min_length=2, max_length=80)
    slug: str = Field(min_length=2, max_length=40)
    description: str = Field(min_length=5, max_length=300)
    inflation_monthly: float = Field(ge=0, le=1)
    salary_adjustment_rate: float = Field(ge=0, le=1)
    salary_adjustment_frequency_months: int = Field(ge=1, le=24)
    exchange_rate_variation_monthly: float = Field(ge=0, le=1)
    investment_return_monthly: float = Field(ge=0, le=1)
    unexpected_expense_amount: float = Field(ge=0)
    target_savings_rate: float = Field(ge=0, le=1)
    is_preset: bool = False


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(ScenarioBase):
    pass


class ScenarioRead(ScenarioBase):
    id: int
