import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CandidateSearchResult, CandidateBasicInfo, VerificationResult } from '../models/interfaces';

@Injectable({
  providedIn: 'root',
})
export class VerifyApiService {
  private docsApiUrl = 'http://localhost:3000';
  private backendUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  searchApplications(query: string): Observable<CandidateSearchResult[]> {
    return this.http.get<CandidateSearchResult[]>(`${this.docsApiUrl}/api/search/${query}`);
  }

  getCandidateDetails(formId: string): Observable<CandidateBasicInfo> {
    return this.http.get<any>(`${this.docsApiUrl}/api/candidate/${formId}`).pipe(
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
