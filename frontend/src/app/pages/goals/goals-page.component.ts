import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Goal, GoalPayload } from '../../core/models/finance.models';
import { GoalService } from '../../core/services/goal.service';

@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './goals-page.component.html',
  styleUrl: './goals-page.component.scss',
})
export class GoalsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly goalService = inject(GoalService);

  protected goals: Goal[] = [];
  protected editingGoalId: number | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';

  protected readonly goalForm = this.formBuilder.group({
    name: this.formBuilder.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    target_amount: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    currency: this.formBuilder.nonNullable.control('ARS', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(3),
    ]),
    target_date: this.formBuilder.nonNullable.control(this.todayString(), Validators.required),
    priority: this.formBuilder.nonNullable.control(2, [Validators.required, Validators.min(1), Validators.max(5)]),
    monthly_contribution_ideal: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    current_progress: this.formBuilder.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    future_probability: this.formBuilder.control<number | null>(null, [Validators.min(0), Validators.max(100)]),
  });

  constructor() {
    this.loadGoals();
  }

  protected saveGoal(): void {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.buildPayload();
    const request$ = this.editingGoalId
      ? this.goalService.update(this.editingGoalId, payload)
      : this.goalService.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.resetForm();
        this.loadGoals();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'No pude guardar el objetivo.';
      },
    });
  }

  protected editGoal(goal: Goal): void {
    this.editingGoalId = goal.id;
    this.goalForm.patchValue(goal);
  }

  protected deleteGoal(goal: Goal): void {
    if (!window.confirm(`Eliminar objetivo "${goal.name}"?`)) {
      return;
    }

    this.goalService
      .remove(goal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadGoals(),
        error: () => {
          this.errorMessage = 'No pude eliminar el objetivo.';
        },
      });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected progressPercent(goal: Goal): number {
    if (!goal.target_amount) {
      return 0;
    }
    return Math.min(Math.round((goal.current_progress / goal.target_amount) * 100), 100);
  }

  private loadGoals(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.goalService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (goals) => {
          this.goals = goals;
          this.isLoading = false;
          this.isSaving = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'No pude cargar los objetivos.';
        },
      });
  }

  private buildPayload(): GoalPayload {
    const rawValue = this.goalForm.getRawValue();
    return {
      ...rawValue,
      currency: rawValue.currency.toUpperCase(),
      future_probability: rawValue.future_probability ?? null,
    };
  }

  private resetForm(): void {
    this.editingGoalId = null;
    this.isSaving = false;
    this.goalForm.reset({
      name: '',
      target_amount: 0,
      currency: 'ARS',
      target_date: this.todayString(),
      priority: 2,
      monthly_contribution_ideal: 0,
      current_progress: 0,
      future_probability: null,
    });
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
