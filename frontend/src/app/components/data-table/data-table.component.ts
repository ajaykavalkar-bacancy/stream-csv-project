import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DataService } from '../../services/data.service';
import { DataRecord } from '../../models/record.model';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    MatProgressBarModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit {
  private dataService = inject(DataService);

  columns = ['id', 'firstName', 'lastName', 'email', 'department', 'salary', 'joiningDate', 'country', 'status', 'score'];
  rows: DataRecord[] = [];
  totalRows = 50000;
  rowOptions = [50000, 100000, 150000, 180000, 1000000];

  page = 1;
  pageSize = 200;
  totalPages = 1;
  loading = false;

  downloading = false;
  downloadProgress = 0;
  downloadDone = false;

  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.loading = true;
    this.errorMessage = null;
    this.dataService.getPage(this.page, this.pageSize, this.totalRows).subscribe({
      next: res => {
        this.rows = res.data;
        this.totalPages = Math.max(1, Math.ceil(res.total / this.pageSize));
        if (res.total === 0 && this.rows.length === 0) {
          this.errorMessage = 'Could not load data from the server.';
        }
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err?.message || 'Failed to load data.';
        this.loading = false;
      }
    });
  }

  onTotalChange(): void {
    this.page = 1;
    this.loadPage();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadPage();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadPage();
    }
  }

  downloadCsv(): void {
    this.downloading = true;
    this.downloadDone = false;
    this.downloadProgress = 0;
    this.errorMessage = null;

    this.dataService.downloadCsvStream(this.totalRows).subscribe({
      next: ({ progress, done }) => {
        this.downloadProgress = progress;
        if (done) {
          this.downloadDone = true;
        }
      },
      error: err => {
        this.errorMessage = err?.message || 'CSV download failed.';
        this.downloading = false;
        this.downloadProgress = 0;
      },
      complete: () => {
        this.downloading = false;
        this.downloadProgress = 100;
      }
    });
  }

  trackById(_index: number, row: DataRecord): number {
    return row.id;
  }

  getCell(row: DataRecord, col: string): unknown {
    return (row as unknown as Record<string, unknown>)[col];
  }

  capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
