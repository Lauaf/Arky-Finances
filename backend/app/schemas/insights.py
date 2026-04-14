from datetime import date

from pydantic import BaseModel


class ScenarioSummary(BaseModel):
    id: int
    name: str
    slug: str


class GoalForecastSummary(BaseModel):
    id: int
    name: str
    priority: int
    target_date: date
    target_amount: float
    current_progress: float
    projected_progress: float
    remaining_amount: float
    percent_complete: float
    projected_completion_month: str | None
    monthly_contribution_ideal: float
    status: str


class GoalProgressPoint(BaseModel):
    goal_id: int
    name: str
    progress: float
    target_amount: float
    percent_complete: float
    projected_completion_month: str | None


class ProjectionMonth(BaseModel):
    month: str
    opening_balance: float
    income_total: float
    fixed_expenses: float
    variable_expenses: float
    unexpected_expenses: float
    total_expenses: float
    available_after_expenses: float
    ideal_savings_target: float
    recommended_savings: float
    goal_allocation: float
    reserve_allocation: float
    free_spending_max: float
    closing_balance: float
    total_saved_balance: float
    investment_gain: float
    alert_level: str
    goal_progress: list[GoalProgressPoint]


class ProjectionSummary(BaseModel):
    final_balance: float
    total_income: float
    total_expenses: float
    total_saved_balance: float


class ProjectionResponse(BaseModel):
    scenario: ScenarioSummary
    months: list[ProjectionMonth]
    goals: list[GoalForecastSummary]
    summary: ProjectionSummary


class DashboardResponse(BaseModel):
    scenario: ScenarioSummary
    current_balance: float
    minimum_cash_buffer: float
    base_currency: str
    estimated_income_monthly: float
    fixed_expenses_monthly: float
    variable_expenses_monthly: float
    unexpected_expenses_monthly: float
    estimated_available_savings: float
    ideal_savings_target: float
    recommended_savings: float
    recommended_free_spend: float
    alert_level: str
    alert_message: str
    active_goals: list[GoalForecastSummary]


class RecommendationResponse(BaseModel):
    scenario: ScenarioSummary
    recommended_savings: float
    ideal_savings_target: float
    recommended_free_spend: float
    plan_sustainable: bool
    alert_level: str
    explanation: str
