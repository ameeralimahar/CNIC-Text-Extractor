import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class UploadComponent {
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  extractedData: any | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
      this.extractedData = null; // Reset previous result
      this.errorMessage = '';
    }
  }

  onUpload() {
    if (!this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.extractedData = null;

    this.apiService.extractCnic(this.selectedFile).subscribe({
      next: (response) => {
        console.log('Backend Response:', response); // Debug Log
        this.isLoading = false;
        this.extractedData = response.extracted_data;
        console.log('Extracted Data Assigned:', this.extractedData); // Debug Log
        this.cdr.detectChanges(); // Force update
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Frontend Error:', error); // Debug Log
        this.errorMessage = error.error?.detail || 'Extraction failed. Please try again.';
        this.cdr.detectChanges(); // Force update
      }
    });
  }

  reset() {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.extractedData = null;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }
}
