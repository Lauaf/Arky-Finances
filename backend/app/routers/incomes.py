from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.current_user import get_active_user
from app.core.database import get_db
from app.models import Income, User
from app.schemas.income import IncomeCreate, IncomeRead, IncomeUpdate

router = APIRouter(prefix="/incomes", tags=["incomes"])


@router.get("", response_model=list[IncomeRead])
def list_incomes(db: Session = Depends(get_db), user: User = Depends(get_active_user)) -> list[Income]:
    return list(
        db.scalars(select(Income).where(Income.user_id == user.id).order_by(Income.start_date.desc(), Income.id.desc())).all()
    )


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(payload: IncomeCreate, db: Session = Depends(get_db), user: User = Depends(get_active_user)) -> Income:
    income = Income(**payload.model_dump(), user_id=user.id)
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.put("/{income_id}", response_model=IncomeRead)
def update_income(
    income_id: int,
    payload: IncomeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_active_user),
) -> Income:
    income = db.scalar(select(Income).where(Income.id == income_id, Income.user_id == user.id))
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found.")

    for key, value in payload.model_dump().items():
        setattr(income, key, value)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(income_id: int, db: Session = Depends(get_db), user: User = Depends(get_active_user)) -> None:
    income = db.scalar(select(Income).where(Income.id == income_id, Income.user_id == user.id))
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found.")
    db.delete(income)
    db.commit()
