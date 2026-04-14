import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent {
  protected readonly navigation = [
    { label: 'Overview', route: '/dashboard', detail: 'Monthly health, forecasts, and recommended free spend.' },
    { label: 'Income', route: '/incomes', detail: 'Recurring salary, side income, and one-off cash inflows.' },
    { label: 'Expenses', route: '/expenses', detail: 'Fixed obligations, flexible spend, and monthly pressure points.' },
    { label: 'Goals', route: '/goals', detail: 'Savings targets, priorities, and projected completion timing.' },
    { label: 'Scenarios', route: '/scenarios', detail: 'Conservative, base, and optimistic planning assumptions.' },
  ];
}
