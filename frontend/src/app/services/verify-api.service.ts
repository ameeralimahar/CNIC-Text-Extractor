import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CandidateSearchResult, CandidateBasicInfo } from '../models/interfaces';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VerifyApiService {
  private docsApiUrl = environment.docsApiUrl;
  private backendUrl = environment.backendUrl;

  constructor(private http: HttpClient) {}

  searchApplications(query: string): Observable<CandidateSearchResult[]> {
    return this.http.get<CandidateSearchResult[]>(`${this.docsApiUrl}/search/${query}`);
  }

  getCandidateDetails(formId: string): Observable<CandidateBasicInfo> {
    return this.http.get<any>(`${this.docsApiUrl}/candidate/${formId}`).pipe(
      map((res) => ({
        applicationId: res.applicationId,
        projectName: res.projectName,
        vacancyName: res.appliedFor,
        cnic: res.personalInfo?.cnic || '',
        name: res.personalInfo?.fullName || '',
        fatherName: res.personalInfo?.fatherHusbandName || '',
        dob: res.personalInfo?.dateOfBirth || '',
        gender: res.personalInfo?.gender || '',
        disability: res.personalInfo?.disability || '',
        issueDate: '',
        expiryDate: '',
        cnicFrontUrl: res.images?.cnicFront || '',
      }))
    );
  }

  verifyBatch(
    applications: { image_url: string; expected_cnic: string; expected_dob: string }[]
  ): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/verify-batch`, { applications });
  }
}
