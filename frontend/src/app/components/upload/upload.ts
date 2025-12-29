import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

export interface UploadItem {
  file: File;
  previewUrl: string | null;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  data: any | null;
  error?: string;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class UploadComponent {
  items: UploadItem[] = [];
  isProcessing = false;
  globalError = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) { }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      const files: File[] = Array.from(event.target.files);

      this.items = files.map(file => ({
        file: file,
        previewUrl: null,
        status: 'pending',
        data: null
      }));

      this.items.forEach(item => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          item.previewUrl = e.target.result;
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(item.file);
      });

      this.globalError = '';
    }
  }

  onUpload() {
    const pendingItems = this.items.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0) return;

    this.isProcessing = true;
    this.globalError = '';

    pendingItems.forEach(item => {
      item.status = 'uploading';
      this.cdr.detectChanges();

      this.apiService.extractSingleCnic(item.file).subscribe({
        next: (response) => {
          if (response.results && response.results.length > 0) {
            item.data = response.results[0].data;
            item.status = 'completed';
          } else {
            item.status = 'error';
            item.error = 'No data returned';
          }
          this.checkGlobalStatus();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Item upload error:', err);
          item.status = 'error';
          item.error = err.error?.detail || 'Failed';
          this.checkGlobalStatus();
          this.cdr.detectChanges();
        }
      });
    });
  }

  checkGlobalStatus() {
    const uploading = this.items.some(i => i.status === 'uploading');
    if (!uploading) {
      this.isProcessing = false;
    }
  }

  reset() {
    this.items = [];
    this.isProcessing = false;
    this.globalError = '';
    this.cdr.detectChanges();
  }
}
