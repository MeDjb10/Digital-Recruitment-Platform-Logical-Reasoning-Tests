import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TestLookupService {
  private apiUrl = `${environment.apiUrl}/tests`;
  private testsCache: any[] = [];

  constructor(private http: HttpClient) {}

  // Get all tests
  getAllTests(): Observable<any[]> {
    // Return from cache if available
    if (this.testsCache.length > 0) {
      return of(this.testsCache);
    }

    // Otherwise fetch from API
    return this.http
      .get<{ success: boolean; data: any[] }>(`${this.apiUrl}`)
      .pipe(
        map((response) => response.data),
        tap((tests) => (this.testsCache = tests)),
        catchError((error) => {
          console.error('Error fetching tests:', error);
          return throwError(() => new Error('Failed to fetch tests'));
        })
      );
  }

  // Get test ID by name
  getTestIdByName(testName: string): Observable<string | null> {
    return this.getAllTests().pipe(
      map((tests) => {
        const test = tests.find((t) => t.name === testName);
        return test ? test._id : null;
      })
    );
  }

  // Get test name by ID
  getTestNameById(testId: string): Observable<string | null> {
    return this.getAllTests().pipe(
      map((tests) => {
        const test = tests.find((t) => t._id === testId);
        return test ? test.name : null;
      })
    );
  }

  // Get all test IDs for given test names
  getTestIdsByNames(testNames: string[]): Observable<string[]> {
    return this.getAllTests().pipe(
      map((tests) => {
        return testNames
          .map((name) => {
            const test = tests.find((t) => t.name === name);
            return test ? test._id : null;
          })
          .filter((id) => id !== null) as string[];
      })
    );
  }
}
