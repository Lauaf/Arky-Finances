import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { WorkspaceUser } from '../core/models/finance.models';
import { ProfileService } from '../core/services/profile.service';
import { UserContextService } from '../core/services/user-context.service';
import { UserService } from '../core/services/user.service';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly userContext = inject(UserContextService);
  private readonly profileService = inject(ProfileService);

  protected readonly navigation = [
    { label: 'Overview', route: '/dashboard' },
    { label: 'Analytics', route: '/analytics' },
    { label: 'Income', route: '/incomes' },
    { label: 'Expenses', route: '/expenses' },
    { label: 'Goals', route: '/goals' },
    { label: 'Scenarios', route: '/scenarios' },
  ];

  protected users: WorkspaceUser[] = [];
  protected activeUserId: number | null = null;
  protected isAddingUser = false;
  protected userErrorMessage = '';

  protected readonly userForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    locale: ['en-US', [Validators.required]],
    timezone: ['America/Argentina/Buenos_Aires', [Validators.required]],
    base_currency: ['ARS', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
  });

  constructor() {
    this.loadUsers();
  }

  protected get activeUser(): WorkspaceUser | undefined {
    return this.users.find((user) => user.id === this.activeUserId);
  }

  protected switchUser(event: Event): void {
    const nextId = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(nextId) || nextId === this.activeUserId) {
      return;
    }

    const nextUser = this.users.find((user) => user.id === nextId) ?? null;
    this.userContext.setActiveUser(nextUser);
    this.userContext.setActiveUserId(nextId);
    window.location.reload();
  }

  protected toggleAddUser(): void {
    this.isAddingUser = !this.isAddingUser;
    this.userErrorMessage = '';
  }

  protected createUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.userService
      .create(this.userForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.userContext.setActiveUser(user);
          this.userContext.setActiveUserId(user.id);
          this.userContext.setBaseCurrency(this.userForm.getRawValue().base_currency);
          window.location.reload();
        },
        error: () => {
          this.userErrorMessage = 'I could not create the new user workspace.';
        },
      });
  }

  protected applyRegionPreset(value: string): void {
    if (value === 'argentina') {
      this.userForm.patchValue({
        locale: 'en-US',
        timezone: 'America/Argentina/Buenos_Aires',
        base_currency: 'ARS',
      });
      return;
    }

    if (value === 'japan') {
      this.userForm.patchValue({
        locale: 'en-US',
        timezone: 'Asia/Tokyo',
        base_currency: 'JPY',
      });
    }
  }

  private loadUsers(): void {
    this.userService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users = users;
          const storedUserId = this.userContext.activeUserId();
          const activeUser = users.find((user) => user.id === storedUserId) ?? users[0];
          this.activeUserId = activeUser?.id ?? null;
          this.userContext.setActiveUser(activeUser ?? null);
          this.userContext.setActiveUserId(this.activeUserId);
          this.loadProfilePreferences();
        },
        error: () => {
          this.userErrorMessage = 'I could not load the user list.';
        },
      });
  }

  private loadProfilePreferences(): void {
    this.profileService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.userContext.setBaseCurrency(profile.base_currency);
        },
        error: () => {
          // Keep the last stored currency if the profile call fails.
        },
      });
  }
}
