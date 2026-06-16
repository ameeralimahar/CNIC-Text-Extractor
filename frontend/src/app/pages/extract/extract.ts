import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadComponent } from '../../components/upload/upload';
import { MatchResultsComponent } from '../../components/match-results/match-results';

@Component({
  selector: 'app-extract-page',
  standalone: true,
  imports: [CommonModule, UploadComponent, MatchResultsComponent],
  template: `
    <app-upload (verificationComplete)="handleVerification($event)"></app-upload>
    <app-match-results *ngIf="verificationResults" [results]="verificationResults"></app-match-results>
  `,
})
export class ExtractPageComponent {
  verificationResults: any = null;

  handleVerification(results: any) {
    this.verificationResults = results;
  }
}
