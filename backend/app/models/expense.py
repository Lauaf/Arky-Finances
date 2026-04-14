from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import BASE_CURRENCY
from app.core.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin


class Expense(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "expenses"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default=BASE_CURRENCY)
    expense_type: Mapped[str] = mapped_column(String(24), default="fixed")
    recurrence: Mapped[str] = mapped_column(String(24), default="monthly")
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
