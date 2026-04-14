from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import BASE_CURRENCY
from app.core.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin


class Profile(Base, PrimaryKeyMixin, TimestampMixin):
    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    minimum_cash_buffer: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    base_currency: Mapped[str] = mapped_column(String(3), default=BASE_CURRENCY)
