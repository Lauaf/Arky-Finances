import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { InsightsService } from '../../core/services/insights.service';
import { ProfileService } from '../../core/services/profile.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective, MetricCardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly scenarioService = inject(ScenarioService);
  private readonly insightsService = inject(InsightsService);
  private readonly profileService = inject(ProfileService);

  protected scenarios: Scenario[] = [];
  protected selectedScenarioId: number | null = null;
  protected dashboard: DashboardResponse | null = null;
  protected recommendation: RecommendationResponse | null = null;
  protected projection: ProjectionResponse | null = null;
  protected comparisonProjections: ProjectionResponse[] = [];
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
      },
    },
  };

  protected readonly goalChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  constructor() {
    this.loadScenarios();
  }

  protected get balanceChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.projection?.months.map((month) => this.formatMonth(month.month)) ?? [],
      datasets: [
        {
          data: this.projection?.months.map((month) => month.closing_balance) ?? [],
          label: 'Saldo líquido proyectado',
          borderColor: '#006a71',
          backgroundColor: 'rgba(0, 106, 113, 0.18)',
          fill: true,
          tension: 0.3,
        },
        {
          data: this.projection?.months.map((month) => month.total_saved_balance) ?? [],
          label: 'Ahorro acumulado',
          borderColor: '#d95d39',
          backgroundColor: 'rgba(217, 93, 57, 0.18)',
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
        borderColor: ['#006a71', '#d95d39', '#7b3f00'][index % 3],
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
          label: 'Progreso proyectado',
          backgroundColor: 'rgba(0, 106, 113, 0.72)',
        },
        {
          data: this.projection?.goals.map((goal) => goal.target_amount) ?? [],
          label: 'Monto objetivo',
          backgroundColor: 'rgba(217, 93, 57, 0.35)',
        },
      ],
    };
  }

  protected get selectedScenario(): Scenario | undefined {
    return this.scenarios.find((scenario) => scenario.id === this.selectedScenarioId);
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
          this.errorMessage = 'No pude guardar el perfil financiero.';
        },
      });
  }

  protected formatCurrency(value: number, currency = this.dashboard?.base_currency ?? 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  protected metricTone(alert: AlertLevel): 'neutral' | 'success' | 'warning' | 'danger' {
    if (alert === 'deficit') {
      return 'danger';
    }
    if (alert === 'tight') {
      return 'warning';
    }
    return 'success';
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
          this.errorMessage = 'No pude cargar los escenarios.';
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
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dashboard, recommendation, projection, profile, comparison }) => {
          this.dashboard = dashboard;
          this.recommendation = recommendation;
          this.projection = projection;
          this.comparisonProjections = comparison;
          this.profileForm.patchValue(profile);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'No pude cargar el dashboard.';
        },
      });
  }

  private formatMonth(value: string): string {
    const [year, month] = value.split('-');
    return `${month}/${year}`;
  }
}
