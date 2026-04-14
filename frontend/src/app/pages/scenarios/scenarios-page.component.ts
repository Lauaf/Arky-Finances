import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Scenario, ScenarioPayload } from '../../core/models/finance.models';
import { ScenarioService } from '../../core/services/scenario.service';

@Component({
  selector: 'app-scenarios-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './scenarios-page.component.html',
  styleUrl: './scenarios-page.component.scss',
})
export class ScenariosPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly scenarioService = inject(ScenarioService);

  protected scenarios: Scenario[] = [];
  protected selectedScenarioId: number | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';

  protected readonly scenarioForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    inflation_monthly: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
    salary_adjustment_rate: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
    salary_adjustment_frequency_months: [3, [Validators.required, Validators.min(1), Validators.max(24)]],
    exchange_rate_variation_monthly: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
    investment_return_monthly: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
    unexpected_expense_amount: [0, [Validators.required, Validators.min(0)]],
    target_savings_rate: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
    is_preset: [true],
  });

  constructor() {
    this.loadScenarios();
  }

  protected selectScenario(scenario: Scenario): void {
    this.selectedScenarioId = scenario.id;
    this.scenarioForm.patchValue(scenario);
  }

  protected saveScenario(): void {
    if (this.scenarioForm.invalid || this.selectedScenarioId === null) {
      this.scenarioForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload: ScenarioPayload = {
      ...this.scenarioForm.getRawValue(),
      slug: this.scenarioForm.getRawValue().slug.toLowerCase(),
    };

    this.scenarioService
      .update(this.selectedScenarioId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (scenario) => {
          this.isSaving = false;
          this.loadScenarios(scenario.id);
        },
        error: () => {
          this.isSaving = false;
          this.errorMessage = 'No pude guardar el escenario.';
        },
      });
  }

  protected formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected isSelected(id: number): boolean {
    return this.selectedScenarioId === id;
  }

  private loadScenarios(preferredId?: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.scenarioService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (scenarios) => {
          this.scenarios = scenarios;
          const selected =
            scenarios.find((scenario) => scenario.id === preferredId) ??
            scenarios.find((scenario) => scenario.slug === 'base') ??
            scenarios[0];

          if (selected) {
            this.selectScenario(selected);
          }

          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'No pude cargar los escenarios.';
        },
      });
  }
}
