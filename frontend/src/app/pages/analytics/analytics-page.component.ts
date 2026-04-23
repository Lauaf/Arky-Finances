import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';

import { ProjectionMonth, ProjectionResponse, Scenario } from '../../core/models/finance.models';
import { DisplayFormatService } from '../../core/services/display-format.service';
import { InsightsService } from '../../core/services/insights.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';

interface ComparisonMetric {
  label: string;
  leftValue: number;
  rightValue: number;
  delta: number;
  betterWhenHigher: boolean;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, MetricCardComponent],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.scss',
})
export class AnalyticsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly insightsService = inject(InsightsService);
  private readonly scenarioService = inject(ScenarioService);
  private readonly displayFormat = inject(DisplayFormatService);

  protected scenarios: Scenario[] = [];
  protected projection: ProjectionResponse | null = null;
  protected selectedScenarioId: number | null = null;
  protected primaryMonthKey: string | null = null;
  protected comparisonMonthKey: string | null = null;
  protected isLoading = true;
  protected errorMessage = '';

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

  protected readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
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
    this.loadAnalytics();
  }

  protected get selectedScenario(): Scenario | undefined {
    return this.scenarios.find((scenario) => scenario.id === this.selectedScenarioId);
  }

  protected get availableMonths(): ProjectionMonth[] {
    return this.projection?.months ?? [];
  }

  protected get primaryMonth(): ProjectionMonth | undefined {
    return this.availableMonths.find((month) => month.month === this.primaryMonthKey);
  }

  protected get comparisonMonth(): ProjectionMonth | undefined {
    return this.availableMonths.find((month) => month.month === this.comparisonMonthKey);
  }

  protected get balanceChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.availableMonths.map((month) => this.formatMonth(month.month)),
      datasets: [
        {
          data: this.availableMonths.map((month) => month.closing_balance),
          label: 'Closing balance',
          borderColor: '#0f5a52',
          backgroundColor: 'rgba(27, 127, 115, 0.16)',
          fill: true,
          tension: 0.28,
        },
        {
          data: this.availableMonths.map((month) => month.total_saved_balance),
          label: 'Saved balance',
          borderColor: '#c78a2c',
          backgroundColor: 'rgba(199, 138, 44, 0.16)',
          fill: true,
          tension: 0.28,
        },
      ],
    };
  }

  protected get cashFlowChartData(): ChartConfiguration<'bar'>['data'] {
    return {
      labels: this.availableMonths.map((month) => this.formatMonth(month.month)),
      datasets: [
        {
          data: this.availableMonths.map((month) => month.income_total),
          label: 'Income',
          backgroundColor: 'rgba(27, 127, 115, 0.82)',
        },
        {
          data: this.availableMonths.map((month) => month.total_expenses),
          label: 'Expenses',
          backgroundColor: 'rgba(177, 68, 42, 0.58)',
        },
        {
          data: this.availableMonths.map((month) => month.recommended_savings),
          label: 'Recommended savings',
          backgroundColor: 'rgba(199, 138, 44, 0.75)',
        },
      ],
    };
  }

  protected get remainingMoneyChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.availableMonths.map((month) => this.formatMonth(month.month)),
      datasets: [
        {
          data: this.availableMonths.map((month) => month.available_after_expenses),
          label: 'Remaining before savings',
          borderColor: '#0f5a52',
          backgroundColor: 'rgba(27, 127, 115, 0.14)',
          fill: true,
          tension: 0.28,
        },
        {
          data: this.availableMonths.map((month) => month.free_spending_max),
          label: 'Spendable after savings',
          borderColor: '#81411a',
          backgroundColor: 'rgba(129, 65, 26, 0.1)',
          fill: true,
          tension: 0.28,
        },
      ],
    };
  }

  protected get comparisonMetrics(): ComparisonMetric[] {
    if (!this.primaryMonth || !this.comparisonMonth) {
      return [];
    }

    return [
      this.buildMetric('Income', this.primaryMonth.income_total, this.comparisonMonth.income_total, true),
      this.buildMetric('Expenses', this.primaryMonth.total_expenses, this.comparisonMonth.total_expenses, false),
      this.buildMetric('Recommended savings', this.primaryMonth.recommended_savings, this.comparisonMonth.recommended_savings, true),
      this.buildMetric('Free spend', this.primaryMonth.free_spending_max, this.comparisonMonth.free_spending_max, true),
      this.buildMetric('Closing balance', this.primaryMonth.closing_balance, this.comparisonMonth.closing_balance, true),
    ];
  }

  protected get comparisonSummaryLabel(): string {
    if (!this.primaryMonth || !this.comparisonMonth) {
      return 'Choose two projected months to compare how the plan changes over time.';
    }

    const closingDelta = this.comparisonMonth.closing_balance - this.primaryMonth.closing_balance;
    const direction = closingDelta >= 0 ? 'higher' : 'lower';
    return `${this.formatMonth(this.comparisonMonth.month)} closes ${this.formatCurrency(Math.abs(closingDelta))} ${direction} than ${this.formatMonth(this.primaryMonth.month)}.`;
  }

  protected get monthlyPressureTone(): 'neutral' | 'success' | 'warning' | 'danger' {
    if (!this.primaryMonth || !this.comparisonMonth) {
      return 'neutral';
    }

    const delta = this.comparisonMonth.free_spending_max - this.primaryMonth.free_spending_max;
    if (delta > 0) {
      return 'success';
    }
    if (delta < 0) {
      return 'warning';
    }
    return 'neutral';
  }

  protected onScenarioChange(event: Event): void {
    const nextValue = Number((event.target as HTMLSelectElement).value);
    this.selectedScenarioId = Number.isFinite(nextValue) ? nextValue : null;
    this.loadProjection();
  }

  protected onPrimaryMonthChange(event: Event): void {
    this.primaryMonthKey = (event.target as HTMLSelectElement).value;
  }

  protected onComparisonMonthChange(event: Event): void {
    this.comparisonMonthKey = (event.target as HTMLSelectElement).value;
  }

  protected formatCurrency(value: number): string {
    return this.displayFormat.formatCurrency(value);
  }

  protected formatMonth(value: string): string {
    return this.displayFormat.formatMonth(value);
  }

  protected totalMoneyIn(month: ProjectionMonth): number {
    return month.recurring_income + month.scheduled_income;
  }

  protected remainingTone(value: number): 'neutral' | 'success' | 'warning' | 'danger' {
    if (value < 0) {
      return 'danger';
    }
    if (value === 0) {
      return 'warning';
    }
    return 'success';
  }

  protected metricTone(metric: ComparisonMetric): 'neutral' | 'success' | 'warning' | 'danger' {
    if (metric.delta === 0) {
      return 'neutral';
    }

    const improvement = metric.betterWhenHigher ? metric.delta > 0 : metric.delta < 0;
    return improvement ? 'success' : 'warning';
  }

  protected deltaLabel(metric: ComparisonMetric): string {
    if (metric.delta === 0) {
      return 'No change';
    }

    const direction = metric.delta > 0 ? 'up' : 'down';
    return `${this.formatCurrency(Math.abs(metric.delta))} ${direction}`;
  }

  protected monthAlertLabel(month: ProjectionMonth): string {
    if (month.alert_level === 'deficit') {
      return 'Deficit risk';
    }
    if (month.alert_level === 'tight') {
      return 'Tight month';
    }
    return 'Healthy month';
  }

  private loadAnalytics(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.scenarioService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (scenarios) => {
          this.scenarios = scenarios;
          this.selectedScenarioId = scenarios.find((scenario) => scenario.slug === 'base')?.id ?? scenarios[0]?.id ?? null;
          this.loadProjection();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'I could not load the scenario list.';
        },
      });
  }

  private loadProjection(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      projection: this.insightsService.getProjection(12, this.selectedScenarioId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ projection }) => {
          this.projection = projection;
          this.primaryMonthKey = projection.months[0]?.month ?? null;
          this.comparisonMonthKey = projection.months[1]?.month ?? projection.months[0]?.month ?? null;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'I could not load the analytics view.';
        },
      });
  }

  private buildMetric(label: string, leftValue: number, rightValue: number, betterWhenHigher: boolean): ComparisonMetric {
    return {
      label,
      leftValue,
      rightValue,
      delta: rightValue - leftValue,
      betterWhenHigher,
    };
  }
}
