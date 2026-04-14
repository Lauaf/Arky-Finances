export type RecurrenceType = 'monthly' | 'one_time';
export type ExpenseType = 'fixed' | 'variable';
export type AlertLevel = 'healthy' | 'tight' | 'deficit';

export interface Profile {
  id: number;
  current_balance: number;
  minimum_cash_buffer: number;
  base_currency: string;
}

export interface ProfilePayload {
  current_balance: number;
  minimum_cash_buffer: number;
  base_currency: string;
}

export interface Income {
  id: number;
  name: string;
  amount: number;
  currency: string;
  start_date: string;
  recurrence: RecurrenceType;
  is_salary_adjusted: boolean;
  notes: string | null;
}

export type IncomePayload = Omit<Income, 'id'>;

export interface Expense {
  id: number;
  name: string;
  category: string;
  amount: number;
  currency: string;
  expense_type: ExpenseType;
  recurrence: RecurrenceType;
  start_date: string;
  notes: string | null;
}

export type ExpensePayload = Omit<Expense, 'id'>;

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  currency: string;
  target_date: string;
  priority: number;
  monthly_contribution_ideal: number;
  current_progress: number;
  future_probability: number | null;
}

export type GoalPayload = Omit<Goal, 'id'>;

export interface Scenario {
  id: number;
  name: string;
  slug: string;
  description: string;
  inflation_monthly: number;
  salary_adjustment_rate: number;
  salary_adjustment_frequency_months: number;
  exchange_rate_variation_monthly: number;
  investment_return_monthly: number;
  unexpected_expense_amount: number;
  target_savings_rate: number;
  is_preset: boolean;
}

export type ScenarioPayload = Omit<Scenario, 'id'>;

export interface ScenarioSummary {
  id: number;
  name: string;
  slug: string;
}

export interface GoalForecastSummary {
  id: number;
  name: string;
  priority: number;
  target_date: string;
  target_amount: number;
  current_progress: number;
  projected_progress: number;
  remaining_amount: number;
  percent_complete: number;
  projected_completion_month: string | null;
  monthly_contribution_ideal: number;
  status: string;
}

export interface GoalProgressPoint {
  goal_id: number;
  name: string;
  progress: number;
  target_amount: number;
  percent_complete: number;
  projected_completion_month: string | null;
}

export interface ProjectionMonth {
  month: string;
  opening_balance: number;
  income_total: number;
  fixed_expenses: number;
  variable_expenses: number;
  unexpected_expenses: number;
  total_expenses: number;
  available_after_expenses: number;
  ideal_savings_target: number;
  recommended_savings: number;
  goal_allocation: number;
  reserve_allocation: number;
  free_spending_max: number;
  closing_balance: number;
  total_saved_balance: number;
  investment_gain: number;
  alert_level: AlertLevel;
  goal_progress: GoalProgressPoint[];
}

export interface ProjectionSummary {
  final_balance: number;
  total_income: number;
  total_expenses: number;
  total_saved_balance: number;
}

export interface ProjectionResponse {
  scenario: ScenarioSummary;
  months: ProjectionMonth[];
  goals: GoalForecastSummary[];
  summary: ProjectionSummary;
}

export interface DashboardResponse {
  scenario: ScenarioSummary;
  current_balance: number;
  minimum_cash_buffer: number;
  base_currency: string;
  estimated_income_monthly: number;
  fixed_expenses_monthly: number;
  variable_expenses_monthly: number;
  unexpected_expenses_monthly: number;
  estimated_available_savings: number;
  ideal_savings_target: number;
  recommended_savings: number;
  recommended_free_spend: number;
  alert_level: AlertLevel;
  alert_message: string;
  active_goals: GoalForecastSummary[];
}

export interface RecommendationResponse {
  scenario: ScenarioSummary;
  recommended_savings: number;
  ideal_savings_target: number;
  recommended_free_spend: number;
  plan_sustainable: boolean;
  alert_level: AlertLevel;
  explanation: string;
}
