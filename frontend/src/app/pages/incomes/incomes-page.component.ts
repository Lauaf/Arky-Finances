import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Income, IncomePayload, RecurrenceType } from '../../core/models/finance.models';
import { DisplayFormatService } from '../../core/services/display-format.service';
import { IncomeService } from '../../core/services/income.service';
import { UserContextService } from '../../core/services/user-context.service';

type IncomePreset = 'salary' | 'freelance' | 'bonus' | 'sale';

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
  private readonly displayFormat = inject(DisplayFormatService);
  private readonly userContext = inject(UserContextService);

  protected incomes: Income[] = [];
  protected editingIncomeId: number | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';

  protected readonly incomeForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: [this.defaultCurrency(), [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    start_date: [this.todayString(), Validators.required],
    recurrence: this.formBuilder.nonNullable.control<RecurrenceType>('monthly', Validators.required),
    is_salary_adjusted: [true],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const currency = this.defaultCurrency();
      if (this.editingIncomeId === null && !this.incomeForm.controls.currency.dirty) {
        this.incomeForm.patchValue({ currency }, { emitEvent: false });
      }
    });
    this.loadIncomes();
  }

  protected applyPreset(preset: IncomePreset): void {
    const common = {
      currency: this.defaultCurrency(),
      start_date: this.monthOffsetString(0),
    };

    if (preset === 'salary') {
      this.incomeForm.patchValue({
        ...common,
        name: 'Main salary',
        recurrence: 'monthly',
        is_salary_adjusted: true,
        notes: 'Recurring income used to fund the month.',
      });
      return;
    }

    if (preset === 'freelance') {
      this.incomeForm.patchValue({
        ...common,
        name: 'Freelance retainer',
        recurrence: 'monthly',
        is_salary_adjusted: false,
        notes: 'Recurring side income that arrives most months.',
      });
      return;
    }

    if (preset === 'bonus') {
      this.incomeForm.patchValue({
        ...common,
        name: 'Bonus',
        recurrence: 'one_time',
        is_salary_adjusted: false,
        notes: 'One-time cash inflow for a specific month.',
      });
      return;
    }

    this.incomeForm.patchValue({
      ...common,
      name: 'Asset sale',
      recurrence: 'one_time',
      is_salary_adjusted: false,
      notes: 'One-off money from selling something or receiving cash back.',
    });
  }

  protected scheduleThisMonth(): void {
    this.incomeForm.patchValue({
      start_date: this.monthOffsetString(0),
    });
  }

  protected scheduleNextMonth(): void {
    this.incomeForm.patchValue({
      start_date: this.monthOffsetString(1),
    });
  }

  protected makeRecurring(): void {
    this.incomeForm.patchValue({
      recurrence: 'monthly',
    });
  }

  protected makeOneTime(): void {
    this.incomeForm.patchValue({
      recurrence: 'one_time',
      is_salary_adjusted: false,
    });
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
        this.errorMessage = 'I could not save the income entry.';
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
    if (!window.confirm(`Delete income "${income.name}"?`)) {
      return;
    }

    this.incomeService
      .remove(income.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadIncomes(),
        error: () => {
          this.errorMessage = 'I could not delete the income entry.';
        },
      });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected formatCurrency(value: number, currency = 'ARS'): string {
    return this.displayFormat.formatCurrency(value, currency);
  }

  protected recurrenceLabel(recurrence: RecurrenceType): string {
    return recurrence === 'monthly' ? 'Monthly' : 'One time';
  }

  protected salaryAdjustmentLabel(value: boolean): string {
    return value ? 'Included' : 'Ignored';
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
          this.errorMessage = 'I could not load income entries.';
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
      currency: this.defaultCurrency(),
      start_date: this.todayString(),
      recurrence: 'monthly',
      is_salary_adjusted: true,
      notes: '',
    });
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private defaultCurrency(): string {
    return this.userContext.baseCurrency() || 'ARS';
  }

  private monthOffsetString(offset: number): string {
    const value = new Date();
    value.setHours(12, 0, 0, 0);
    value.setMonth(value.getMonth() + offset, 1);
    return value.toISOString().slice(0, 10);
  }
}
