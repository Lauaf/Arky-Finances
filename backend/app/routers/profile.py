from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.current_user import get_active_user
from app.core.database import get_db
from app.models import User
from app.schemas.profile import ProfileRead, ProfileUpdate
from app.services.projection import get_profile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileRead)
def read_profile(db: Session = Depends(get_db), user: User = Depends(get_active_user)):
    return get_profile(db, user)


@router.put("", response_model=ProfileRead)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_active_user)):
    profile = get_profile(db, user)
    for key, value in payload.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile
