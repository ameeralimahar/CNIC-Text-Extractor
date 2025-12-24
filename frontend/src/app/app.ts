import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { UploadComponent } from './components/upload/upload';
import { MatchResultsComponent } from './components/match-results/match-results';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, UploadComponent, MatchResultsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'frontend';
  verificationResults: any = null;

  handleVerification(results: any) {
    this.verificationResults = results;
  }
}
