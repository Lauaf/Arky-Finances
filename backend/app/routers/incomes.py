from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Income
from app.schemas.income import IncomeCreate, IncomeRead, IncomeUpdate

router = APIRouter(prefix="/incomes", tags=["incomes"])


@router.get("", response_model=list[IncomeRead])
def list_incomes(db: Session = Depends(get_db)) -> list[Income]:
    return list(db.scalars(select(Income).order_by(Income.start_date.desc(), Income.id.desc())).all())


@router.post("", response_model=IncomeRead, status_code=status.HTTP_201_CREATED)
def create_income(payload: IncomeCreate, db: Session = Depends(get_db)) -> Income:
    income = Income(**payload.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.put("/{income_id}", response_model=IncomeRead)
def update_income(income_id: int, payload: IncomeUpdate, db: Session = Depends(get_db)) -> Income:
    income = db.get(Income, income_id)
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found.")

    for key, value in payload.model_dump().items():
        setattr(income, key, value)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(income_id: int, db: Session = Depends(get_db)) -> None:
    income = db.get(Income, income_id)
    if income is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found.")
    db.delete(income)
    db.commit()
