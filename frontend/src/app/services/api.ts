import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.backendUrl;

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
    formData.append('files', file);
    return this.http.post<any>(`${this.apiUrl}/extract`, formData);
  }
}
