import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VerificationResult } from '../../../../models/interfaces';

@Component({
  selector: 'app-verification-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-wrapper">
      <h3>Verification Results</h3>
      <div class="results-list">
        <div class="result-item" *ngFor="let result of results">
          <div class="result-header">
            <span class="app-id">App #{{ result.applicationId }}</span>
            <span class="candidate-name">{{ result.candidate.name }}</span>
            <span
              class="status-badge"
              [class.success]="result.status === 'completed' && result.comparison.cnicMatch && result.comparison.dobMatch"
              [class.failed]="result.status === 'completed' && (!result.comparison.cnicMatch || !result.comparison.dobMatch)"
              [class.processing]="result.status === 'processing'"
              [class.error]="result.status === 'error'"
            >
              <ng-container [ngSwitch]="result.status">
                <span *ngSwitchCase="'processing'">Processing...</span>
                <span *ngSwitchCase="'error'">Error</span>
                <span *ngSwitchCase="'completed'">
                  {{ result.comparison.cnicMatch && result.comparison.dobMatch ? 'Verified' : 'Mismatch' }}
                </span>
                <span *ngSwitchDefault>Pending</span>
              </ng-container>
            </span>
          </div>

          <div class="result-body" *ngIf="result.status === 'completed'">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Actual (Database)</th>
                  <th>Extracted (OCR)</th>
                  <th>Match</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CNIC Number</td>
                  <td>{{ result.candidate.cnic }}</td>
                  <td>{{ result.extracted.cnic_number || 'Not Found' }}</td>
                  <td>
                    <span [class.match]="result.comparison.cnicMatch" [class.mismatch]="!result.comparison.cnicMatch">
                      {{ result.comparison.cnicMatch ? '✅' : '❌' }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Date of Birth</td>
                  <td>{{ result.candidate.dob }}</td>
                  <td>{{ result.extracted.dob || 'Not Found' }}</td>
                  <td>
                    <span [class.match]="result.comparison.dobMatch" [class.mismatch]="!result.comparison.dobMatch">
                      {{ result.comparison.dobMatch ? '✅' : '❌' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="result-body error-msg" *ngIf="result.status === 'error'">
            <p>{{ result.error }}</p>
          </div>

          <div class="result-body" *ngIf="result.status === 'processing'">
            <div class="spinner-row">
              <div class="spinner-sm"></div>
              <span>Extracting data from CNIC image...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .results-wrapper {
        margin-top: 2rem;
      }
      h3 {
        font-size: 1.4rem;
        color: #1e293b;
        margin-bottom: 1.25rem;
      }
      .results-list {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .result-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
      }
      .result-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }
      .app-id {
        font-weight: 700;
        color: #2563eb;
        font-size: 0.95rem;
      }
      .candidate-name {
        flex: 1;
        color: #475569;
        font-weight: 500;
      }
      .status-badge {
        padding: 0.35rem 0.85rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .status-badge.success {
        background: #dcfce7;
        color: #166534;
      }
      .status-badge.failed {
        background: #fee2e2;
        color: #991b1b;
      }
      .status-badge.processing {
        background: #fef3c7;
        color: #92400e;
      }
      .status-badge.error {
        background: #fee2e2;
        color: #991b1b;
      }
      .result-body {
        padding: 1.25rem 1.5rem;
      }
      .comparison-table {
        width: 100%;
        border-collapse: collapse;
      }
      .comparison-table th,
      .comparison-table td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid #f1f5f9;
      }
      .comparison-table th {
        font-size: 0.8rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .comparison-table td {
        font-size: 0.95rem;
        color: #334155;
      }
      .match {
        font-size: 1.1rem;
      }
      .mismatch {
        font-size: 1.1rem;
      }
      .error-msg p {
        color: #dc2626;
        margin: 0;
      }
      .spinner-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #64748b;
      }
      .spinner-sm {
        width: 20px;
        height: 20px;
        border: 3px solid #e2e8f0;
        border-left-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class VerificationResultsComponent {
  @Input() results: VerificationResult[] = [];
}
