import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-results.html',
  styleUrl: './match-results.css'
})
export class MatchResultsComponent {
  @Input() results: any;
}
