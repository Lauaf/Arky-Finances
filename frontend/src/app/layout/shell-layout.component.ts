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
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Ingresos', route: '/incomes' },
    { label: 'Gastos', route: '/expenses' },
    { label: 'Objetivos', route: '/goals' },
    { label: 'Escenarios', route: '/scenarios' },
  ];
}
