from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User


def get_active_user(
    x_arky_user: int | None = Header(default=None, alias="X-Arky-User"),
    db: Session = Depends(get_db),
) -> User:
    if x_arky_user is not None:
        selected_user = db.get(User, x_arky_user)
        if selected_user is not None:
            return selected_user

    user = db.scalar(select(User).order_by(User.id.asc()).limit(1))
    if user is None:
        user = User(name="Primary user", locale="en-US", timezone="America/Argentina/Buenos_Aires")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
