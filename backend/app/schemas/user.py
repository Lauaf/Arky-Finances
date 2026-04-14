from pydantic import Field

from app.schemas.common import OrmModel


class UserBase(OrmModel):
    name: str = Field(min_length=2, max_length=120)
    locale: str = Field(min_length=2, max_length=20, default="en-US")
    timezone: str = Field(min_length=3, max_length=64, default="America/Argentina/Buenos_Aires")


class UserCreate(UserBase):
    base_currency: str | None = Field(default=None, min_length=3, max_length=3)


class UserUpdate(UserBase):
    base_currency: str | None = Field(default=None, min_length=3, max_length=3)


class UserRead(UserBase):
    id: int
