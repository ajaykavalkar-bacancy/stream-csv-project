# FRONTEND_SPEC.md — Angular Streaming CSV Frontend

## Tech Stack
- Angular 17+ (standalone components, no NgModules)
- Angular CDK Virtual Scroll (`@angular/cdk/scrolling`)
- Angular Material (table, button, progress bar, select)
- RxJS (for HTTP streaming via `fetch` API + ReadableStream)
- TypeScript strict mode

## Project Setup
```
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts         # Root standalone component
│   │   ├── app.config.ts            # provideHttpClient, provideRouter
│   │   ├── models/
│   │   │   └── record.model.ts      # Row interface
│   │   ├── services/
│   │   │   └── data.service.ts      # HTTP calls + stream download
│   │   ├── components/
│   │   │   ├── data-table/
│   │   │   │   ├── data-table.component.ts
│   │   │   │   └── data-table.component.html
│   │   │   └── download-bar/
│   │   │       ├── download-bar.component.ts
│   │   │       └── download-bar.component.html
│   └── environments/
│       └── environment.ts
├── angular.json
└── package.json
```

## Data Model
```ts
// record.model.ts
export interface DataRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  salary: number;
  joiningDate: string;
  country: string;
  status: string;
  score: number;
}

export interface PagedResponse {
  total: number;
  page: number;
  limit: number;
  data: DataRecord[];
}
```

## DataService
```ts
// data.service.ts
@Injectable({ providedIn: 'root' })
export class DataService {
  private baseUrl = 'http://localhost:3000/api';

  // Paginated JSON for table display
  getPage(page: number, limit: number, total: number): Observable<PagedResponse> { ... }

  // Streaming CSV download using fetch + ReadableStream
  // Emits progress (0–100) and triggers file save when done
  downloadCsvStream(total: number): Observable<{ progress: number; done: boolean }> {
    return new Observable(observer => {
      const url = `${this.baseUrl}/download/csv?total=${total}`;
      fetch(url)
        .then(async res => {
          const totalRows = parseInt(res.headers.get('X-Total-Rows') || '0');
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let receivedRows = 0;
          let csvText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            csvText += chunk;
            // count newlines as proxy for rows
            receivedRows += (chunk.match(/\n/g) || []).length;
            const progress = totalRows ? Math.min(99, Math.round((receivedRows / totalRows) * 100)) : 0;
            observer.next({ progress, done: false });
          }

          // Trigger file download
          const blob = new Blob([csvText], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'data-export.csv'; a.click();
          URL.revokeObjectURL(url);

          observer.next({ progress: 100, done: true });
          observer.complete();
        })
        .catch(err => observer.error(err));
    });
  }
}
```

## DataTable Component
```ts
// data-table.component.ts
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, ScrollingModule, MatProgressBarModule,
            MatButtonModule, MatSelectModule, FormsModule],
  templateUrl: './data-table.component.html'
})
export class DataTableComponent implements OnInit {
  columns = ['id','firstName','lastName','email','department',
             'salary','joiningDate','country','status','score'];
  rows: DataRecord[] = [];
  totalRows = 50000;
  rowOptions = [50000, 100000, 150000, 180000];
  
  // Pagination state
  page = 1;
  pageSize = 200;
  loading = false;

  // Download state
  downloading = false;
  downloadProgress = 0;

  constructor(private dataSvc: DataService) {}

  ngOnInit() { this.loadPage(); }

  loadPage() {
    this.loading = true;
    this.dataSvc.getPage(this.page, this.pageSize, this.totalRows)
      .subscribe(res => { this.rows = res.data; this.loading = false; });
  }

  onTotalChange() { this.page = 1; this.loadPage(); }

  downloadCsv() {
    this.downloading = true;
    this.downloadProgress = 0;
    this.dataSvc.downloadCsvStream(this.totalRows).subscribe({
      next: ({ progress }) => this.downloadProgress = progress,
      complete: () => { this.downloading = false; this.downloadProgress = 100; }
    });
  }
}
```

## Template Key Points
```html
<!-- data-table.component.html -->
<!-- Row count selector -->
<mat-select [(ngModel)]="totalRows" (ngModelChange)="onTotalChange()">
  <mat-option *ngFor="let opt of rowOptions" [value]="opt">{{ opt | number }} rows</mat-option>
</mat-select>

<!-- Download button + progress -->
<button mat-raised-button color="primary" (click)="downloadCsv()" [disabled]="downloading">
  {{ downloading ? 'Downloading...' : 'Download CSV' }}
</button>
<mat-progress-bar *ngIf="downloading" mode="determinate" [value]="downloadProgress"></mat-progress-bar>
<span *ngIf="downloading">{{ downloadProgress }}%</span>

<!-- Virtual scroll table -->
<cdk-virtual-scroll-viewport itemSize="48" style="height: 600px;">
  <table>
    <thead><tr><th *ngFor="let col of columns">{{ col }}</th></tr></thead>
    <tbody>
      <tr *cdkVirtualFor="let row of rows">
        <td *ngFor="let col of columns">{{ row[col] }}</td>
      </tr>
    </tbody>
  </table>
</cdk-virtual-scroll-viewport>

<!-- Pagination -->
<button (click)="page = page - 1; loadPage()" [disabled]="page === 1">Prev</button>
<span>Page {{ page }}</span>
<button (click)="page = page + 1; loadPage()">Next</button>
```

## Styling Approach
- Use Angular Material theming with a dark indigo/cyan palette
- Table rows alternating background for readability
- Sticky header on the table
- Progress bar fills with accent color during stream download
- Responsive layout with flex column

## package.json key dependencies
```json
{
  "@angular/cdk": "^17.0.0",
  "@angular/material": "^17.0.0",
  "rxjs": "~7.8.0"
}
```

## Environment
```ts
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```
