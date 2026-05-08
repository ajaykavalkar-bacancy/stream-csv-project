import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PagedResponse } from '../models/record.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPage(page: number, limit: number, total: number): Observable<PagedResponse> {
    const url = `${this.apiUrl}/data?page=${page}&limit=${limit}&total=${total}`;
    return this.http.get<PagedResponse>(url).pipe(
      catchError(err => {
        console.error('getPage failed', err);
        const empty: PagedResponse = { total: 0, page, limit, data: [] };
        return of(empty);
      })
    );
  }

  downloadCsvStream(total: number): Observable<{ progress: number; done: boolean }> {
    return new Observable(subscriber => {
      const url = `${this.apiUrl}/download/csv?total=${total}`;
      const controller = new AbortController();

      fetch(url, { signal: controller.signal })
        .then(async res => {
          if (!res.ok || !res.body) {
            throw new Error(`Download failed: HTTP ${res.status}`);
          }

          const totalRows = parseInt(res.headers.get('X-Total-Rows') || '0', 10);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let csvText = '';
          let receivedRows = 0;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              csvText += chunk;
              receivedRows += (chunk.match(/\n/g) || []).length;

              const progress = totalRows
                ? Math.min(99, Math.round((receivedRows / totalRows) * 100))
                : 0;
              subscriber.next({ progress, done: false });
            }
          } catch (streamErr) {
            throw new Error('Download stream interrupted. Please try again.');
          }

          csvText += decoder.decode();

          const blob = new Blob([csvText], { type: 'text/csv' });
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = 'data-export.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);

          subscriber.next({ progress: 100, done: true });
          subscriber.complete();
        })
        .catch(err => {
          const message = err?.name === 'AbortError'
            ? 'Download cancelled.'
            : (err?.message || 'CSV download failed. Please try again.');
          subscriber.error(new Error(message));
        });

      return () => controller.abort();
    });
  }
}
