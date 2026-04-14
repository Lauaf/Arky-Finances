import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin, of } from 'rxjs';

import {
  AlertLevel,
  DashboardResponse,
  ProjectionResponse,
  RecommendationResponse,
  Scenario,
} from '../../core/models/finance.models';
import { ExpenseService } from '../../core/services/expense.service';
import { GoalService } from '../../core/services/goal.service';
import { IncomeService } from '../../core/services/income.service';
import { InsightsService } from '../../core/services/insights.service';
import { ProfileService } from '../../core/services/profile.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';

interface SetupSnapshot {
  incomes: number;
  expenses: number;
  goals: number;
}

interface SetupStep {
  title: string;
  description: string;
  route: string;
  cta: string;
  done: boolean;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BaseChartDirective, MetricCardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly scenarioService = inject(ScenarioService);
  private readonly insightsService = inject(InsightsService);
  private readonly profileService = inject(ProfileService);
  private readonly incomeService = inject(IncomeService);
  private readonly expenseService = inject(ExpenseService);
  private readonly goalService = inject(GoalService);
  private readonly tutorialStorageKey = 'arky-finances-dashboard-guide-hidden';

  protected scenarios: Scenario[] = [];
  protected selectedScenarioId: number | null = null;
  protected dashboard: DashboardResponse | null = null;
  protected recommendation: RecommendationResponse | null = null;
  protected projection: ProjectionResponse | null = null;
  protected comparisonProjections: ProjectionResponse[] = [];
  protected setupSnapshot: SetupSnapshot = { incomes: 0, expenses: 0, goals: 0 };
  protected tutorialVisible = true;
  protected isLoading = true;
  protected isSavingProfile = false;
  protected errorMessage = '';

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    current_balance: [0, [Validators.min(0)]],
    minimum_cash_buffer: [0, [Validators.min(0)]],
    base_currency: ['ARS', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
  });

  protected readonly lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
        },
      },
    },
  };

  protected readonly goalChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 10,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  constructor() {
    this.tutorialVisible = this.readTutorialVisibility();
    this.loadScenarios();
  }

  protected get balanceChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.projection?.months.map((month) => this.formatMonth(month.month)) ?? [],
      datasets: [
        {
          data: this.projection?.months.map((month) => month.closing_balance) ?? [],
          label: 'Projected liquid balance',
          borderColor: '#0f5a52',
          backgroundColor: 'rgba(27, 127, 115, 0.16)',
          fill: true,
          tension: 0.3,
        },
        {
          data: this.projection?.months.map((month) => month.total_saved_balance) ?? [],
          label: 'Projected savings balance',
          borderColor: '#c78a2c',
          backgroundColor: 'rgba(199, 138, 44, 0.16)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }

  protected get comparisonChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.comparisonProjections[0]?.months.map((month) => this.formatMonth(month.month)) ?? [],
      datasets: this.comparisonProjections.map((projection, index) => ({
        data: projection.months.map((month) => month.closing_balance),
        label: projection.scenario.name,
        tension: 0.28,
        borderColor: ['#0f5a52', '#c78a2c', '#81411a'][index % 3],
        backgroundColor: 'transparent',
      })),
    };
  }

  protected get goalsChartData(): ChartConfiguration<'bar'>['data'] {
    return {
      labels: this.projection?.goals.map((goal) => goal.name) ?? [],
      datasets: [
        {
          data: this.projection?.goals.map((goal) => goal.projected_progress) ?? [],
          label: 'Projected progress',
          backgroundColor: 'rgba(27, 127, 115, 0.8)',
        },
        {
          data: this.projection?.goals.map((goal) => goal.target_amount) ?? [],
          label: 'Target amount',
          backgroundColor: 'rgba(199, 138, 44, 0.34)',
        },
      ],
    };
  }

  protected get selectedScenario(): Scenario | undefined {
    return this.scenarios.find((scenario) => scenario.id === this.selectedScenarioId);
  }

  protected get setupSteps(): SetupStep[] {
    const profileReady = (this.dashboard?.current_balance ?? 0) > 0 || (this.dashboard?.minimum_cash_buffer ?? 0) > 0;
    return [
      {
        title: 'Set your starting cash position',
        description: 'Enter your current balance and the minimum buffer you never want to spend below.',
        route: '/dashboard',
        cta: 'Update profile',
        done: profileReady,
      },
      {
        title: 'Add reliable monthly income',
        description: 'Start with salary or any dependable recurring cash inflow. Add bonuses as one-time income later.',
        route: '/incomes',
        cta: 'Add income',
        done: this.setupSnapshot.incomes > 0,
      },
      {
        title: 'Split expenses into fixed and variable',
        description: 'Fixed items make the plan rigid. Variable items reveal how much flexibility you actually have.',
        route: '/expenses',
        cta: 'Add expenses',
        done: this.setupSnapshot.expenses > 0,
      },
      {
        title: 'Create the goals you actually care about',
        description: 'Use one goal per outcome, set a target date, and choose a realistic ideal monthly contribution.',
        route: '/goals',
        cta: 'Create goals',
        done: this.setupSnapshot.goals > 0,
      },
      {
        title: 'Stress test the plan with scenarios',
        description: 'Compare your base case with tighter or better assumptions so you can see the fragility of the month.',
        route: '/scenarios',
        cta: 'Review scenarios',
        done: this.scenarios.length >= 3,
      },
    ];
  }

  protected get isFreshWorkspace(): boolean {
    return (
      this.setupSnapshot.incomes === 0 &&
      this.setupSnapshot.expenses === 0 &&
      this.setupSnapshot.goals === 0 &&
      (this.dashboard?.current_balance ?? 0) === 0 &&
      (this.dashboard?.minimum_cash_buffer ?? 0) === 0
    );
  }

  protected onScenarioChange(event: Event): void {
    const nextValue = Number((event.target as HTMLSelectElement).value);
    this.selectedScenarioId = Number.isFinite(nextValue) ? nextValue : null;
    this.loadDashboardData();
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;
    const payload = {
      ...this.profileForm.getRawValue(),
      base_currency: this.profileForm.getRawValue().base_currency.toUpperCase(),
    };

    this.profileService
      .updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSavingProfile = false;
          this.loadDashboardData();
        },
        error: () => {
          this.isSavingProfile = false;
          this.errorMessage = 'I could not save the financial profile.';
        },
      });
  }

  protected dismissTutorial(): void {
    this.tutorialVisible = false;
    this.writeTutorialVisibility(false);
  }

  protected showTutorial(): void {
    this.tutorialVisible = true;
    this.writeTutorialVisibility(true);
  }

  protected formatCurrency(value: number, currency = this.dashboard?.base_currency ?? 'ARS'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  protected metricTone(alert: AlertLevel): 'neutral' | 'success' | 'warning' | 'danger' {
    if (this.isFreshWorkspace) {
      return 'neutral';
    }
    if (alert === 'deficit') {
      return 'danger';
    }
    if (alert === 'tight') {
      return 'warning';
    }
    return 'success';
  }

  protected amountTone(value: number): 'neutral' | 'success' | 'warning' | 'danger' {
    if (this.isFreshWorkspace) {
      return 'neutral';
    }
    if (value < 0) {
      return 'danger';
    }
    if (value === 0) {
      return 'neutral';
    }
    return 'success';
  }

  protected alertLabel(level: AlertLevel): string {
    if (level === 'deficit') {
      return 'Deficit';
    }
    if (level === 'tight') {
      return 'Tight month';
    }
    return 'Healthy month';
  }

  protected goalStatusLabel(status: string): string {
    if (status === 'completed') {
      return 'Completed';
    }
    if (status === 'on_track') {
      return 'On track';
    }
    return 'Active';
  }

  protected goalStatusTone(status: string): 'neutral' | 'warning' | 'danger' {
    if (status === 'completed') {
      return 'neutral';
    }
    if (status === 'on_track') {
      return 'neutral';
    }
    return 'warning';
  }

  private loadScenarios(): void {
    this.isLoading = true;
    this.scenarioService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (scenarios) => {
          this.scenarios = scenarios;
          this.selectedScenarioId = scenarios.find((scenario) => scenario.slug === 'base')?.id ?? scenarios[0]?.id ?? null;
          this.loadDashboardData();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'I could not load the scenarios.';
        },
      });
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const comparisonRequests = this.scenarios.length
      ? forkJoin(this.scenarios.map((scenario) => this.insightsService.getProjection(12, scenario.id)))
      : of([] as ProjectionResponse[]);

    forkJoin({
      dashboard: this.insightsService.getDashboard(this.selectedScenarioId),
      recommendation: this.insightsService.getRecommendation(this.selectedScenarioId),
      projection: this.insightsService.getProjection(12, this.selectedScenarioId),
      profile: this.profileService.getProfile(),
      comparison: comparisonRequests,
      incomes: this.incomeService.list(),
      expenses: this.expenseService.list(),
      goals: this.goalService.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, recommendation, projection, profile, comparison, incomes, expenses, goals }) => {
          this.dashboard = dashboard;
          this.recommendation = recommendation;
          this.projection = projection;
          this.comparisonProjections = comparison;
          this.setupSnapshot = {
            incomes: incomes.length,
            expenses: expenses.length,
            goals: goals.length,
          };
          this.profileForm.patchValue(profile);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'I could not load the dashboard.';
        },
      });
  }

  protected formatMonth(value: string): string {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  private readTutorialVisibility(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.localStorage.getItem(this.tutorialStorageKey) !== 'hidden';
  }

  private writeTutorialVisibility(visible: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.tutorialStorageKey, visible ? 'visible' : 'hidden');
  }
}
