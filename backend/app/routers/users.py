from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.current_user import get_active_user
from app.core.database import get_db
from app.models import Expense, Goal, Income, Profile, User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def infer_base_currency(payload: UserCreate | UserUpdate) -> str:
    explicit = (payload.base_currency or "").strip().upper()
    if explicit:
        return explicit

    timezone = payload.timezone.lower()
    locale = payload.locale.lower()

    if "tokyo" in timezone or locale.endswith("-jp"):
        return "JPY"
    if "argentina" in timezone or locale.endswith("-ar"):
        return "ARS"
    return "ARS"


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id.asc())).all())


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    user = User(**payload.model_dump(exclude={"base_currency"}))
    db.add(user)
    db.flush()
    db.add(
        Profile(
            user_id=user.id,
            current_balance=0,
            minimum_cash_buffer=0,
            base_currency=infer_base_currency(payload),
        )
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    for key, value in payload.model_dump(exclude={"base_currency"}).items():
        setattr(user, key, value)

    if payload.base_currency:
        profile = db.scalar(select(Profile).where(Profile.user_id == user.id).limit(1))
        if profile is None:
            profile = Profile(
                user_id=user.id,
                current_balance=0,
                minimum_cash_buffer=0,
                base_currency=infer_base_currency(payload),
            )
            db.add(profile)
        else:
            profile.base_currency = infer_base_currency(payload)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_active_user)) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    if total_users <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one user must remain.")

    db.execute(delete(Income).where(Income.user_id == user_id))
    db.execute(delete(Expense).where(Expense.user_id == user_id))
    db.execute(delete(Goal).where(Goal.user_id == user_id))
    db.execute(delete(Profile).where(Profile.user_id == user_id))
    db.delete(user)
    db.commit()
