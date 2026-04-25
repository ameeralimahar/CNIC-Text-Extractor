import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8082';

  constructor(private http: HttpClient) { }

  extractCnics(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<any>(`${this.apiUrl}/extract`, formData);
  }

  extractSingleCnic(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('files', file); // Backend expects 'files' list, so we send one
    return this.http.post<any>(`${this.apiUrl}/extract`, formData);
  }
}
