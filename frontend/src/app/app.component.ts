import { Component } from '@angular/core';
import { DataTableComponent } from './components/data-table/data-table.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <h1>StreamCSV — Large Dataset Export Demo</h1>
    <p class="subtitle">Streaming 50k–180k rows from Node.js backend with real-time download progress</p>
    <app-data-table></app-data-table>
  `,
  styleUrl: './app.component.scss'
})
export class AppComponent {}
