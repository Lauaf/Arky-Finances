import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Income, IncomePayload, RecurrenceType } from '../../core/models/finance.models';
import { IncomeService } from '../../core/services/income.service';

@Component({
  selector: 'app-incomes-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './incomes-page.component.html',
  styleUrl: './incomes-page.component.scss',
})
export class IncomesPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly incomeService = inject(IncomeService);

  protected incomes: Income[] = [];
  protected editingIncomeId: number | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';

  protected readonly incomeForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['ARS', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    start_date: [this.todayString(), Validators.required],
    recurrence: this.formBuilder.nonNullable.control<RecurrenceType>('monthly', Validators.required),
    is_salary_adjusted: [true],
    notes: [''],
  });

  constructor() {
    this.loadIncomes();
  }

  protected saveIncome(): void {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.buildPayload();
    const request$ = this.editingIncomeId
      ? this.incomeService.update(this.editingIncomeId, payload)
      : this.incomeService.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.resetForm();
        this.loadIncomes();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'No pude guardar el ingreso.';
      },
    });
  }

  protected editIncome(income: Income): void {
    this.editingIncomeId = income.id;
    this.incomeForm.patchValue({
      ...income,
      notes: income.notes ?? '',
    });
  }

  protected deleteIncome(income: Income): void {
    if (!window.confirm(`Eliminar ingreso "${income.name}"?`)) {
      return;
    }

    this.incomeService
      .remove(income.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadIncomes(),
        error: () => {
          this.errorMessage = 'No pude eliminar el ingreso.';
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

  private loadIncomes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.incomeService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incomes) => {
          this.incomes = incomes;
          this.isLoading = false;
          this.isSaving = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'No pude cargar los ingresos.';
        },
      });
  }

  private buildPayload(): IncomePayload {
    const rawValue = this.incomeForm.getRawValue();
    return {
      ...rawValue,
      currency: rawValue.currency.toUpperCase(),
      notes: rawValue.notes || null,
    };
  }

  private resetForm(): void {
    this.editingIncomeId = null;
    this.isSaving = false;
    this.incomeForm.reset({
      name: '',
      amount: 0,
      currency: 'ARS',
      start_date: this.todayString(),
      recurrence: 'monthly',
      is_salary_adjusted: true,
      notes: '',
    });
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
