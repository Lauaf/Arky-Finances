from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin


class Scenario(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "scenarios"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    inflation_monthly: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=0)
    salary_adjustment_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=0)
    salary_adjustment_frequency_months: Mapped[int] = mapped_column(Integer, default=3)
    exchange_rate_variation_monthly: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=0)
    investment_return_monthly: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=0)
    unexpected_expense_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    target_savings_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4), default=0)
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False)
