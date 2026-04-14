from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Expense, Goal, Income, Profile, Scenario


def month_start(value: date) -> date:
    return value.replace(day=1)


def add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def seed_database(db: Session) -> None:
    profile = db.scalar(select(Profile).limit(1))
    if profile is None:
        db.add(
            Profile(
                current_balance=850000,
                minimum_cash_buffer=250000,
                base_currency="ARS",
            )
        )

    existing_slugs = set(db.scalars(select(Scenario.slug)).all())
    scenarios = [
        Scenario(
            name="Conservador",
            slug="conservador",
            description="Más inflación, menos rendimiento y un colchón de ahorro exigente.",
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
            description="Escenario central para planificar el mes y las metas activas.",
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
            name="Optimista",
            slug="optimista",
            description="Menos inflación, mejor rendimiento y menor presión de gasto inesperado.",
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

    current_month = month_start(date.today())

    if db.scalar(select(Income).limit(1)) is None:
        db.add_all(
            [
                Income(
                    name="Sueldo principal",
                    amount=2400000,
                    currency="ARS",
                    start_date=current_month,
                    recurrence="monthly",
                    is_salary_adjusted=True,
                    notes="Ingreso principal sujeto a ajustes salariales.",
                ),
                Income(
                    name="Freelance mensual",
                    amount=420000,
                    currency="ARS",
                    start_date=current_month,
                    recurrence="monthly",
                    is_salary_adjusted=False,
                    notes="Trabajo independiente conservador.",
                ),
                Income(
                    name="Bonus semestral",
                    amount=600000,
                    currency="ARS",
                    start_date=add_months(current_month, 2),
                    recurrence="one_time",
                    is_salary_adjusted=False,
                    notes="Ingreso extraordinario puntual.",
                ),
            ]
        )

    if db.scalar(select(Expense).limit(1)) is None:
        db.add_all(
            [
                Expense(
                    name="Alquiler",
                    category="Vivienda",
                    amount=780000,
                    currency="ARS",
                    expense_type="fixed",
                    recurrence="monthly",
                    start_date=current_month,
                    notes="Contrato actual.",
                ),
                Expense(
                    name="Servicios",
                    category="Hogar",
                    amount=145000,
                    currency="ARS",
                    expense_type="fixed",
                    recurrence="monthly",
                    start_date=current_month,
                    notes="Luz, gas, internet y celular.",
                ),
                Expense(
                    name="Seguro médico",
                    category="Salud",
                    amount=185000,
                    currency="ARS",
                    expense_type="fixed",
                    recurrence="monthly",
                    start_date=current_month,
                    notes=None,
                ),
                Expense(
                    name="Supermercado",
                    category="Consumo",
                    amount=260000,
                    currency="ARS",
                    expense_type="variable",
                    recurrence="monthly",
                    start_date=current_month,
                    notes="Promedio mensual.",
                ),
                Expense(
                    name="Transporte y movilidad",
                    category="Movilidad",
                    amount=110000,
                    currency="ARS",
                    expense_type="variable",
                    recurrence="monthly",
                    start_date=current_month,
                    notes=None,
                ),
                Expense(
                    name="Reparación notebook",
                    category="Imprevistos",
                    amount=240000,
                    currency="ARS",
                    expense_type="variable",
                    recurrence="one_time",
                    start_date=add_months(current_month, 1),
                    notes="Gasto puntual de hardware.",
                ),
            ]
        )

    if db.scalar(select(Goal).limit(1)) is None:
        db.add_all(
            [
                Goal(
                    name="Viaje a Japón",
                    target_amount=4500000,
                    currency="ARS",
                    target_date=date(current_month.year + 1, 5, 1),
                    priority=2,
                    monthly_contribution_ideal=280000,
                    current_progress=950000,
                    future_probability=None,
                ),
                Goal(
                    name="Fondo de emergencia",
                    target_amount=3200000,
                    currency="ARS",
                    target_date=date(current_month.year + 1, 1, 1),
                    priority=1,
                    monthly_contribution_ideal=260000,
                    current_progress=1300000,
                    future_probability=None,
                ),
                Goal(
                    name="Compra grande",
                    target_amount=1800000,
                    currency="ARS",
                    target_date=date(current_month.year, 12, 1),
                    priority=3,
                    monthly_contribution_ideal=170000,
                    current_progress=250000,
                    future_probability=None,
                ),
            ]
        )

    db.commit()
