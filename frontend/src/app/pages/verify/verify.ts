import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SearchBarComponent } from './components/search-bar/search-bar';
import { CandidateCardComponent } from './components/candidate-card/candidate-card';
import { VerificationResultsComponent } from './components/verification-results/verification-results';
import { VerifyApiService } from '../../services/verify-api.service';
import {
  CandidateSearchResult,
  CandidateBasicInfo,
  VerificationResult,
} from '../../models/interfaces';

@Component({
  selector: 'app-verify-page',
  standalone: true,
  imports: [CommonModule, SearchBarComponent, CandidateCardComponent, VerificationResultsComponent],
  templateUrl: './verify.html',
  styleUrl: './verify.css',
})
export class VerifyPageComponent {
  searchResults: CandidateSearchResult[] = [];
  selectedIds = new Set<string>();
  verificationResults: VerificationResult[] = [];
  isSearching = false;
  isVerifying = false;
  searchError = '';

  constructor(private verifyApi: VerifyApiService, private cdr: ChangeDetectorRef) {}

  onSearch(query: string) {
    this.searchError = '';
    this.searchResults = [];
    this.selectedIds.clear();
    this.verificationResults = [];
    this.isSearching = true;

    // Treat as single query — the Download-Docs-API handles both CNIC and FormID
    const ids = query
      .split(/[,\s]+/)
      .map((id) => id.trim().replace(/-/g, ''))
      .filter((id) => id);

    if (ids.length === 1) {
      this.verifyApi.searchApplications(ids[0]).subscribe({
        next: (results) => {
          this.searchResults = Array.isArray(results) ? results : [];
          if (this.searchResults.length === 0) {
            this.searchError = 'No applications found.';
          }
          this.isSearching = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.searchError = 'Failed to search. Make sure Download-Docs-API is running.';
          this.isSearching = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      const requests = ids.map((id) => this.verifyApi.searchApplications(id));
      forkJoin(requests).subscribe({
        next: (resultsArray) => {
          this.searchResults = resultsArray.flat();
          if (this.searchResults.length === 0) {
            this.searchError = 'No applications found.';
          }
          this.isSearching = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.searchError = 'Failed to search. Make sure Download-Docs-API is running.';
          this.isSearching = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  toggleSelection(applicationId: string, selected: boolean) {
    if (selected) {
      this.selectedIds.add(applicationId);
    } else {
      this.selectedIds.delete(applicationId);
    }
  }

  selectAll() {
    this.searchResults.forEach((r) => this.selectedIds.add(r.applicationId));
  }

  deselectAll() {
    this.selectedIds.clear();
  }

  isSelected(applicationId: string): boolean {
    return this.selectedIds.has(applicationId);
  }

  candidateDetails: CandidateBasicInfo[] = [];
  showDetails = false;

  loadDetails() {
    if (this.selectedIds.size === 0) return;

    this.isSearching = true;
    this.candidateDetails = [];
    this.showDetails = false;

    const ids = Array.from(this.selectedIds);
    const detailRequests = ids.map((id) => this.verifyApi.getCandidateDetails(id));

    forkJoin(detailRequests).subscribe({
      next: (candidates) => {
        this.candidateDetails = candidates;
        this.showDetails = true;
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.searchError = 'Failed to fetch candidate details.';
        this.isSearching = false;
        this.cdr.detectChanges();
      },
    });
  }

  getCnicImageUrl(relativePath: string): string {
    if (!relativePath) return '';
    return `http://localhost:3000${relativePath}`;
  }

  verifyAll() {
    if (this.candidateDetails.length === 0) return;

    this.isVerifying = true;
    this.verificationResults = this.candidateDetails.map((c) => ({
      applicationId: c.applicationId,
      candidate: c,
      extracted: {
        cnic_number: null,
        dob: null,
        name: null,
        father_name: null,
        gender: null,
        issue_date: null,
        expiry_date: null,
      },
      comparison: { cnicMatch: false, dobMatch: false },
      status: 'processing' as const,
    }));

    const applications = this.candidateDetails
      .filter((c) => c.cnicFrontUrl)
      .map((c) => ({
        application_id: c.applicationId,
        image_url: c.cnicFrontUrl,
        expected_cnic: c.cnic,
        expected_dob: c.dob,
      }));

    if (applications.length === 0) {
      this.verificationResults.forEach((r) => {
        r.status = 'error';
        r.error = 'No CNIC front image found';
      });
      this.isVerifying = false;
      this.cdr.detectChanges();
      return;
    }

    this.verifyApi.verifyBatch(applications).subscribe({
      next: (response) => {
        response.results.forEach((res: any) => {
          const idx = this.verificationResults.findIndex(
            (r) => r.applicationId === res.application_id
          );
          if (idx !== -1) {
            this.verificationResults[idx].extracted = res.extracted;
            this.verificationResults[idx].comparison = res.comparison;
            this.verificationResults[idx].status = 'completed';
          }
        });
        this.isVerifying = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.verificationResults.forEach((r) => {
          if (r.status === 'processing') {
            r.status = 'error';
            r.error = err.error?.detail || 'Verification failed';
          }
        });
        this.isVerifying = false;
        this.cdr.detectChanges();
      },
    });
  }
}
