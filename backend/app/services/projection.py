from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_PROJECTION_MONTHS
from app.models import Expense, Goal, Income, Profile, Scenario
from app.schemas.insights import (
    DashboardResponse,
    GoalForecastSummary,
    GoalProgressPoint,
    ProjectionMonth,
    ProjectionResponse,
    ProjectionSummary,
    RecommendationResponse,
    ScenarioSummary,
)


@dataclass
class GoalNeed:
    goal: Goal
    target_amount: float
    remaining: float
    suggested_contribution: float


def to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def round_money(value: float) -> float:
    return round(value + 1e-9, 2)


def month_start(value: date) -> date:
    return value.replace(day=1)


def add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def months_between(start: date, end: date) -> int:
    return (end.year - start.year) * 12 + (end.month - start.month)


def month_key(value: date) -> str:
    return value.strftime("%Y-%m")


def get_profile(db: Session) -> Profile:
    profile = db.scalar(select(Profile).order_by(Profile.id).limit(1))
    if profile is None:
        profile = Profile(current_balance=0, minimum_cash_buffer=0, base_currency="ARS")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def get_scenario(db: Session, scenario_id: int | None = None, scenario_slug: str | None = None) -> Scenario:
    query = select(Scenario)
    if scenario_id is not None:
        scenario = db.scalar(query.where(Scenario.id == scenario_id))
        if scenario is not None:
            return scenario
    if scenario_slug:
        scenario = db.scalar(query.where(Scenario.slug == scenario_slug))
        if scenario is not None:
            return scenario
    scenario = db.scalar(query.where(Scenario.slug == "base"))
    if scenario is not None:
        return scenario
    first_scenario = db.scalar(query.order_by(Scenario.id).limit(1))
    if first_scenario is None:
        raise ValueError("No scenarios available.")
    return first_scenario


def is_active_in_month(item_date: date, recurrence: str, target_month: date) -> bool:
    item_month = month_start(item_date)
    if recurrence == "monthly":
        return item_month <= target_month
    return item_month == target_month


def project_income_amount(income: Income, scenario: Scenario, month_index: int, target_month: date) -> float:
    if not is_active_in_month(income.start_date, income.recurrence, target_month):
        return 0.0

    amount = to_float(income.amount)
    if income.recurrence == "monthly" and income.is_salary_adjusted:
        frequency = max(int(scenario.salary_adjustment_frequency_months), 1)
        salary_steps = month_index // frequency
        amount *= (1 + to_float(scenario.salary_adjustment_rate)) ** salary_steps
    return round_money(amount)


def project_expense_amount(expense: Expense, scenario: Scenario, month_index: int, target_month: date) -> float:
    if not is_active_in_month(expense.start_date, expense.recurrence, target_month):
        return 0.0

    amount = to_float(expense.amount)
    inflation_factor = (1 + to_float(scenario.inflation_monthly)) ** month_index
    return round_money(amount * inflation_factor)


def projected_goal_target(goal: Goal, profile: Profile, scenario: Scenario, month_index: int) -> float:
    amount = to_float(goal.target_amount)
    if goal.currency != profile.base_currency:
        amount *= (1 + to_float(scenario.exchange_rate_variation_monthly)) ** month_index
    return round_money(amount)


def compute_goal_needs(
    goals: list[Goal],
    progress_map: dict[int, float],
    current_month: date,
    scenario: Scenario,
    profile: Profile,
    month_index: int,
) -> tuple[list[GoalNeed], float]:
    goal_needs: list[GoalNeed] = []
    total_need = 0.0

    for goal in sorted(goals, key=lambda item: (item.priority, item.target_date, item.name.lower())):
        target_amount = projected_goal_target(goal, profile, scenario, month_index)
        current_progress = progress_map.get(goal.id, 0.0)
        remaining = max(target_amount - current_progress, 0.0)
        if remaining <= 0:
            continue

        months_left = max(months_between(current_month, month_start(goal.target_date)) + 1, 1)
        required_by_date = remaining / months_left
        suggested = min(remaining, max(to_float(goal.monthly_contribution_ideal), required_by_date))
        goal_needs.append(
            GoalNeed(
                goal=goal,
                target_amount=target_amount,
                remaining=remaining,
                suggested_contribution=round_money(suggested),
            )
        )
        total_need += suggested

    return goal_needs, round_money(total_need)


def classify_alert(
    profile: Profile,
    closing_balance: float,
    free_spending: float,
    available_after_expenses: float,
    ideal_savings_target: float,
) -> str:
    buffer = to_float(profile.minimum_cash_buffer)
    if available_after_expenses < 0 or closing_balance < 0:
        return "deficit"
    if available_after_expenses < ideal_savings_target or closing_balance <= buffer or free_spending <= buffer * 0.15:
        return "tight"
    return "healthy"


def alert_message_for_level(level: str) -> str:
    if level == "deficit":
        return "This month falls into deficit and needs either lower spending or lower savings commitments."
    if level == "tight":
        return "The plan stays barely above your buffer, so a small deviation could put the month under pressure."
    return "The month keeps a positive margin after expenses and the recommended savings transfer."


def build_projection(
    db: Session,
    scenario_id: int | None = None,
    scenario_slug: str | None = None,
    months: int = DEFAULT_PROJECTION_MONTHS,
) -> ProjectionResponse:
    projection_months: list[ProjectionMonth] = []
    profile = get_profile(db)
    scenario = get_scenario(db, scenario_id=scenario_id, scenario_slug=scenario_slug)
    incomes = list(db.scalars(select(Income).order_by(Income.start_date, Income.id)).all())
    expenses = list(db.scalars(select(Expense).order_by(Expense.start_date, Expense.id)).all())
    goals = list(db.scalars(select(Goal).order_by(Goal.priority, Goal.target_date, Goal.id)).all())

    current_month = month_start(date.today())
    liquid_balance = to_float(profile.current_balance)
    reserve_balance = 0.0
    progress_map = {goal.id: to_float(goal.current_progress) for goal in goals}
    completion_map: dict[int, str | None] = {goal.id: None for goal in goals}

    for goal in goals:
        if progress_map[goal.id] >= projected_goal_target(goal, profile, scenario, 0):
            completion_map[goal.id] = month_key(current_month)

    total_income = 0.0
    total_expenses = 0.0

    for month_index in range(max(months, 1)):
        target_month = add_months(current_month, month_index)
        opening_balance = liquid_balance

        income_total = sum(project_income_amount(income, scenario, month_index, target_month) for income in incomes)
        fixed_expenses = sum(
            project_expense_amount(expense, scenario, month_index, target_month)
            for expense in expenses
            if expense.expense_type == "fixed"
        )
        variable_expenses = sum(
            project_expense_amount(expense, scenario, month_index, target_month)
            for expense in expenses
            if expense.expense_type == "variable"
        )
        unexpected_expenses = round_money(
            to_float(scenario.unexpected_expense_amount)
            * ((1 + to_float(scenario.inflation_monthly)) ** month_index)
        )
        month_expenses = round_money(fixed_expenses + variable_expenses + unexpected_expenses)
        available_after_expenses = round_money(income_total - month_expenses)

        goal_needs, total_goal_need = compute_goal_needs(
            goals=goals,
            progress_map=progress_map,
            current_month=target_month,
            scenario=scenario,
            profile=profile,
            month_index=month_index,
        )
        savings_rate_target = round_money(income_total * to_float(scenario.target_savings_rate))
        ideal_savings_target = round_money(max(total_goal_need, savings_rate_target))
        recommended_savings = round_money(min(max(available_after_expenses, 0.0), ideal_savings_target))

        remaining_savings = recommended_savings
        goal_allocation = 0.0

        for need in goal_needs:
            contribution = round_money(min(need.suggested_contribution, remaining_savings))
            if contribution <= 0:
                continue
            progress_map[need.goal.id] = round_money(progress_map[need.goal.id] + contribution)
            remaining_savings = round_money(remaining_savings - contribution)
            goal_allocation = round_money(goal_allocation + contribution)

            if completion_map.get(need.goal.id) is None and progress_map[need.goal.id] >= need.target_amount:
                completion_map[need.goal.id] = month_key(target_month)

        reserve_allocation = round_money(remaining_savings)
        reserve_balance = round_money(reserve_balance + reserve_allocation)

        invested_balance = round_money(reserve_balance + sum(progress_map.values()))
        investment_gain = 0.0
        if invested_balance > 0:
            investment_gain = round_money(invested_balance * to_float(scenario.investment_return_monthly))
            reserve_balance = round_money(reserve_balance + investment_gain)

        free_spending = round_money(max(available_after_expenses - recommended_savings, 0.0))
        liquid_balance = round_money(liquid_balance + available_after_expenses - recommended_savings)
        total_saved_balance = round_money(reserve_balance + sum(progress_map.values()))
        alert_level = classify_alert(
            profile=profile,
            closing_balance=liquid_balance,
            free_spending=free_spending,
            available_after_expenses=available_after_expenses,
            ideal_savings_target=ideal_savings_target,
        )

        goal_progress = [
            GoalProgressPoint(
                goal_id=goal.id,
                name=goal.name,
                progress=round_money(progress_map[goal.id]),
                target_amount=projected_goal_target(goal, profile, scenario, month_index),
                percent_complete=round_money(
                    min(
                        (progress_map[goal.id] / max(projected_goal_target(goal, profile, scenario, month_index), 1.0))
                        * 100,
                        100.0,
                    )
                ),
                projected_completion_month=completion_map.get(goal.id),
            )
            for goal in goals
        ]

        projection_months.append(
            ProjectionMonth(
                month=month_key(target_month),
                opening_balance=round_money(opening_balance),
                income_total=round_money(income_total),
                fixed_expenses=round_money(fixed_expenses),
                variable_expenses=round_money(variable_expenses),
                unexpected_expenses=unexpected_expenses,
                total_expenses=month_expenses,
                available_after_expenses=available_after_expenses,
                ideal_savings_target=ideal_savings_target,
                recommended_savings=recommended_savings,
                goal_allocation=goal_allocation,
                reserve_allocation=reserve_allocation,
                free_spending_max=free_spending,
                closing_balance=liquid_balance,
                total_saved_balance=total_saved_balance,
                investment_gain=investment_gain,
                alert_level=alert_level,
                goal_progress=goal_progress,
            )
        )

        total_income += income_total
        total_expenses += month_expenses

    goal_summaries: list[GoalForecastSummary] = []
    final_month = projection_months[-1] if projection_months else None
    final_progress_lookup = {point.goal_id: point.progress for point in (final_month.goal_progress if final_month else [])}

    for goal in goals:
        final_target = projected_goal_target(goal, profile, scenario, max(months - 1, 0))
        projected_progress = round_money(final_progress_lookup.get(goal.id, to_float(goal.current_progress)))
        remaining = round_money(max(final_target - projected_progress, 0.0))
        projected_completion_month = completion_map.get(goal.id)
        status = "completed" if remaining <= 0 else ("on_track" if projected_completion_month else "active")
        goal_summaries.append(
            GoalForecastSummary(
                id=goal.id,
                name=goal.name,
                priority=goal.priority,
                target_date=goal.target_date,
                target_amount=final_target,
                current_progress=round_money(to_float(goal.current_progress)),
                projected_progress=projected_progress,
                remaining_amount=remaining,
                percent_complete=round_money(min((projected_progress / max(final_target, 1.0)) * 100, 100.0)),
                projected_completion_month=projected_completion_month,
                monthly_contribution_ideal=round_money(to_float(goal.monthly_contribution_ideal)),
                status=status,
            )
        )

    return ProjectionResponse(
        scenario=ScenarioSummary(id=scenario.id, name=scenario.name, slug=scenario.slug),
        months=projection_months,
        goals=goal_summaries,
        summary=ProjectionSummary(
            final_balance=round_money(projection_months[-1].closing_balance if projection_months else liquid_balance),
            total_income=round_money(total_income),
            total_expenses=round_money(total_expenses),
            total_saved_balance=round_money(projection_months[-1].total_saved_balance if projection_months else 0.0),
        ),
    )


def build_dashboard(db: Session, scenario_id: int | None = None, scenario_slug: str | None = None) -> DashboardResponse:
    profile = get_profile(db)
    projection = build_projection(db=db, scenario_id=scenario_id, scenario_slug=scenario_slug, months=12)
    first_month = projection.months[0]
    active_goals = [goal for goal in projection.goals if goal.remaining_amount > 0]
    return DashboardResponse(
        scenario=projection.scenario,
        current_balance=round_money(to_float(profile.current_balance)),
        minimum_cash_buffer=round_money(to_float(profile.minimum_cash_buffer)),
        base_currency=profile.base_currency,
        estimated_income_monthly=first_month.income_total,
        fixed_expenses_monthly=first_month.fixed_expenses,
        variable_expenses_monthly=first_month.variable_expenses,
        unexpected_expenses_monthly=first_month.unexpected_expenses,
        estimated_available_savings=first_month.available_after_expenses,
        ideal_savings_target=first_month.ideal_savings_target,
        recommended_savings=first_month.recommended_savings,
        recommended_free_spend=first_month.free_spending_max,
        alert_level=first_month.alert_level,
        alert_message=alert_message_for_level(first_month.alert_level),
        active_goals=active_goals,
    )


def build_recommendation(
    db: Session,
    scenario_id: int | None = None,
    scenario_slug: str | None = None,
) -> RecommendationResponse:
    projection = build_projection(db=db, scenario_id=scenario_id, scenario_slug=scenario_slug, months=1)
    first_month = projection.months[0]
    plan_sustainable = first_month.recommended_savings >= first_month.ideal_savings_target or first_month.ideal_savings_target == 0
    explanation = (
        f"Estimated income of {first_month.income_total:.2f} minus expenses of {first_month.total_expenses:.2f} "
        f"leaves {first_month.available_after_expenses:.2f}. "
        f"Your goals and target savings rate ask for {first_month.ideal_savings_target:.2f}; "
        f"with the current setup, the recommended move is to save {first_month.recommended_savings:.2f} "
        f"and cap flexible spending at {first_month.free_spending_max:.2f}."
    )
    if not plan_sustainable:
        explanation += " The ideal savings target does not fully fit inside the current month."

    return RecommendationResponse(
        scenario=projection.scenario,
        recommended_savings=first_month.recommended_savings,
        ideal_savings_target=first_month.ideal_savings_target,
        recommended_free_spend=first_month.free_spending_max,
        plan_sustainable=plan_sustainable,
        alert_level=first_month.alert_level,
        explanation=explanation,
    )
