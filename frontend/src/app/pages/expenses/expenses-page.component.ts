import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Expense, ExpensePayload, ExpenseType, RecurrenceType } from '../../core/models/finance.models';
import { ExpenseService } from '../../core/services/expense.service';

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

  protected expenses: Expense[] = [];
  protected editingExpenseId: number | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';

  protected readonly expenseForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    category: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    currency: ['ARS', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    expense_type: this.formBuilder.nonNullable.control<ExpenseType>('fixed', Validators.required),
    recurrence: this.formBuilder.nonNullable.control<RecurrenceType>('monthly', Validators.required),
    start_date: [this.todayString(), Validators.required],
    notes: [''],
  });

  constructor() {
    this.loadExpenses();
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
        this.errorMessage = 'No pude guardar el gasto.';
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
    if (!window.confirm(`Eliminar gasto "${expense.name}"?`)) {
      return;
    }

    this.expenseService
      .remove(expense.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadExpenses(),
        error: () => {
          this.errorMessage = 'No pude eliminar el gasto.';
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
          this.errorMessage = 'No pude cargar los gastos.';
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
      currency: 'ARS',
      expense_type: 'fixed',
      recurrence: 'monthly',
      start_date: this.todayString(),
      notes: '',
    });
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
