import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateSearchResult } from '../../../../models/interfaces';

@Component({
  selector: 'app-candidate-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" [class.selected]="selected" (click)="toggleSelect()">
      <div class="card-check">
        <input type="checkbox" [checked]="selected" (click)="$event.stopPropagation()" (change)="toggleSelect()" />
      </div>
      <div class="card-content">
        <div class="card-row">
          <span class="field-label">App ID:</span>
          <span class="field-value id">{{ candidate.applicationId }}</span>
        </div>
        <div class="card-row">
          <span class="field-label">Name:</span>
          <span class="field-value">{{ candidate.fullName }}</span>
        </div>
        <div class="card-row">
          <span class="field-label">Project:</span>
          <span class="field-value">{{ candidate.projectName }}</span>
        </div>
        <div class="card-row">
          <span class="field-label">Applied For:</span>
          <span class="field-value">{{ candidate.appliedFor }}</span>
        </div>
        <div class="card-row">
          <span class="field-label">Payment:</span>
          <span class="field-value" [class.paid]="candidate.paymentStatus === 'Challan Paid'">
            {{ candidate.paymentStatus }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .card {
        display: flex;
        gap: 1rem;
        padding: 1.25rem;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .card:hover {
        border-color: #93c5fd;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
      }
      .card.selected {
        border-color: #3b82f6;
        background: #eff6ff;
      }
      .card-check {
        display: flex;
        align-items: flex-start;
        padding-top: 2px;
      }
      .card-check input {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #3b82f6;
      }
      .card-content {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem 1.5rem;
      }
      .card-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .field-label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
      .field-value {
        font-size: 0.95rem;
        color: #1e293b;
        font-weight: 500;
      }
      .field-value.id {
        font-weight: 700;
        color: #2563eb;
      }
      .field-value.paid {
        color: #059669;
      }
    `,
  ],
})
export class CandidateCardComponent {
  @Input() candidate!: CandidateSearchResult;
  @Input() selected = false;
  @Output() selectionChange = new EventEmitter<boolean>();

  toggleSelect() {
    this.selectionChange.emit(!this.selected);
  }
}
