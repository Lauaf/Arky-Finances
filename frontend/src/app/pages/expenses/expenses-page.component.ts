import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Expense, ExpensePayload, ExpenseType, RecurrenceType } from '../../core/models/finance.models';
import { DisplayFormatService } from '../../core/services/display-format.service';
import { ExpenseService } from '../../core/services/expense.service';
import { UserContextService } from '../../core/services/user-context.service';

type ExpensePreset = 'rent' | 'groceries' | 'subscription' | 'repair';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './expenses-page.component.html',
  styleUrl: './expenses-page.component.scss',
})
export class ExpensesPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly expenseService = inject(ExpenseService);
  private readonly displayFormat = inject(DisplayFormatService);
  private readonly userContext = inject(UserContextService);

  protected expenses: Expense[] = [];
  protected editingExpenseId: number | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';

  protected readonly expenseForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: [this.defaultCurrency(), [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    expense_type: this.formBuilder.nonNullable.control<ExpenseType>('fixed', Validators.required),
    recurrence: this.formBuilder.nonNullable.control<RecurrenceType>('monthly', Validators.required),
    start_date: [this.todayString(), Validators.required],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const currency = this.defaultCurrency();
      if (this.editingExpenseId === null && !this.expenseForm.controls.currency.dirty) {
        this.expenseForm.patchValue({ currency }, { emitEvent: false });
      }
    });
    this.loadExpenses();
  }

  protected applyPreset(preset: ExpensePreset): void {
    const common = {
      currency: this.defaultCurrency(),
      start_date: this.monthOffsetString(0),
    };

    if (preset === 'rent') {
      this.expenseForm.patchValue({
        ...common,
        name: 'Rent',
        category: 'Housing',
        expense_type: 'fixed',
        recurrence: 'monthly',
        notes: 'Recurring fixed housing cost.',
      });
      return;
    }

    if (preset === 'groceries') {
      this.expenseForm.patchValue({
        ...common,
        name: 'Groceries',
        category: 'Food',
        expense_type: 'variable',
        recurrence: 'monthly',
        notes: 'Flexible monthly spending category.',
      });
      return;
    }

    if (preset === 'subscription') {
      this.expenseForm.patchValue({
        ...common,
        name: 'Subscription',
        category: 'Utilities',
        expense_type: 'fixed',
        recurrence: 'monthly',
        notes: 'Streaming, software, gym, or other repeating charge.',
      });
      return;
    }

    this.expenseForm.patchValue({
      ...common,
      name: 'Repair',
      category: 'Unexpected',
      expense_type: 'variable',
      recurrence: 'one_time',
      notes: 'One-off hit such as a repair, medical bill, or replacement purchase.',
    });
  }

  protected scheduleThisMonth(): void {
    this.expenseForm.patchValue({
      start_date: this.monthOffsetString(0),
    });
  }

  protected scheduleNextMonth(): void {
    this.expenseForm.patchValue({
      start_date: this.monthOffsetString(1),
    });
  }

  protected makeRecurring(): void {
    this.expenseForm.patchValue({
      recurrence: 'monthly',
    });
  }

  protected makeOneTime(): void {
    this.expenseForm.patchValue({
      recurrence: 'one_time',
    });
  }

  protected saveExpense(): void {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = this.buildPayload();
    const request$ = this.editingExpenseId
      ? this.expenseService.update(this.editingExpenseId, payload)
      : this.expenseService.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.resetForm();
        this.loadExpenses();
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'I could not save the expense entry.';
      },
    });
  }

  protected editExpense(expense: Expense): void {
    this.editingExpenseId = expense.id;
    this.expenseForm.patchValue({
      ...expense,
      notes: expense.notes ?? '',
    });
  }

  protected deleteExpense(expense: Expense): void {
    if (!window.confirm(`Delete expense "${expense.name}"?`)) {
      return;
    }

    this.expenseService
      .remove(expense.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadExpenses(),
        error: () => {
          this.errorMessage = 'I could not delete the expense entry.';
        },
      });
  }

  protected cancelEdit(): void {
    this.resetForm();
  }

  protected formatCurrency(value: number, currency = 'ARS'): string {
    return this.displayFormat.formatCurrency(value, currency);
  }

  protected expenseTypeLabel(type: ExpenseType): string {
    return type === 'fixed' ? 'Fixed' : 'Variable';
  }

  protected recurrenceLabel(recurrence: RecurrenceType): string {
    return recurrence === 'monthly' ? 'Monthly' : 'One time';
  }

  private loadExpenses(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.expenseService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (expenses) => {
          this.expenses = expenses;
          this.isLoading = false;
          this.isSaving = false;
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'I could not load expense entries.';
        },
      });
  }

  private buildPayload(): ExpensePayload {
    const rawValue = this.expenseForm.getRawValue();
    return {
      ...rawValue,
      currency: rawValue.currency.toUpperCase(),
      notes: rawValue.notes || null,
    };
  }

  private resetForm(): void {
    this.editingExpenseId = null;
    this.isSaving = false;
    this.expenseForm.reset({
      name: '',
      category: '',
      amount: 0,
      currency: this.defaultCurrency(),
      expense_type: 'fixed',
      recurrence: 'monthly',
      start_date: this.todayString(),
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
