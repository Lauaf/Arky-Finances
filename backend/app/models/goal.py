from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import BASE_CURRENCY
from app.core.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin


class Goal(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "goals"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default=BASE_CURRENCY)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=2)
    monthly_contribution_ideal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    current_progress: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    future_probability: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
