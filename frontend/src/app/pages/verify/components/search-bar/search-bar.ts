import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <input
          type="text"
          [(ngModel)]="query"
          (keyup.enter)="onSearch()"
          placeholder="Enter Application ID(s) comma-separated or 13-digit CNIC"
          class="search-input"
        />
        <button (click)="onSearch()" [disabled]="!query.trim()" class="search-btn">Search</button>
      </div>
      <p class="hint">Examples: 12345, 67890 or 4210112345671</p>
    </div>
  `,
  styles: [
    `
      .search-container {
        margin-bottom: 2rem;
      }
      .search-input-wrapper {
        display: flex;
        gap: 0.75rem;
      }
      .search-input {
        flex: 1;
        padding: 0.875rem 1.25rem;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 1rem;
        font-family: inherit;
        transition: border-color 0.2s;
      }
      .search-input:focus {
        outline: none;
        border-color: #3b82f6;
      }
      .search-btn {
        padding: 0.875rem 2rem;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }
      .search-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
      }
      .search-btn:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
        box-shadow: none;
      }
      .hint {
        margin-top: 0.5rem;
        color: #94a3b8;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class SearchBarComponent {
  query = '';
  @Output() search = new EventEmitter<string>();

  onSearch() {
    if (this.query.trim()) {
      this.search.emit(this.query.trim());
    }
  }
}
