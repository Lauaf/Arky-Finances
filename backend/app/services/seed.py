from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Profile, Scenario, User


def seed_database(db: Session) -> None:
    user = db.scalar(select(User).order_by(User.id.asc()).limit(1))
    if user is None:
        user = User(name="Primary user", locale="en-US", timezone="America/Argentina/Buenos_Aires")
        db.add(user)
        db.flush()

    profile = db.scalar(select(Profile).where(Profile.user_id == user.id).limit(1))
    if profile is None:
        db.add(
            Profile(
                user_id=user.id,
                current_balance=0,
                minimum_cash_buffer=0,
                base_currency="ARS",
            )
        )

    existing_slugs = set(db.scalars(select(Scenario.slug)).all())
    scenarios = [
        Scenario(
            name="Conservative",
            slug="conservative",
            description="Higher inflation, lower returns, and a tighter savings posture.",
            inflation_monthly=0.08,
            salary_adjustment_rate=0.12,
            salary_adjustment_frequency_months=4,
            exchange_rate_variation_monthly=0.07,
            investment_return_monthly=0.01,
            unexpected_expense_amount=120000,
            target_savings_rate=0.22,
            is_preset=True,
        ),
        Scenario(
            name="Base",
            slug="base",
            description="Balanced assumptions for monthly planning and active savings goals.",
            inflation_monthly=0.05,
            salary_adjustment_rate=0.10,
            salary_adjustment_frequency_months=4,
            exchange_rate_variation_monthly=0.05,
            investment_return_monthly=0.018,
            unexpected_expense_amount=80000,
            target_savings_rate=0.18,
            is_preset=True,
        ),
        Scenario(
            name="Optimistic",
            slug="optimistic",
            description="Lower inflation, better returns, and lighter unexpected spending pressure.",
            inflation_monthly=0.03,
            salary_adjustment_rate=0.12,
            salary_adjustment_frequency_months=3,
            exchange_rate_variation_monthly=0.03,
            investment_return_monthly=0.025,
            unexpected_expense_amount=40000,
            target_savings_rate=0.16,
            is_preset=True,
        ),
    ]

    for scenario in scenarios:
        if scenario.slug not in existing_slugs:
            db.add(scenario)

    db.commit()
