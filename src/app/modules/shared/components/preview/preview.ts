// file-preview.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  inject,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { FilePreviewService } from './preview.service';
import { CommonModule } from '@angular/common';
import { PinchZoomComponent } from '@meddv/ngx-pinch-zoom';

@Component({
  selector: 'app-file-preview',
  imports: [CommonModule, PinchZoomComponent],
  template: `
    <div class="full_view" [class.isActive]="isActive">
      <div class="inner_container">

        <!-- TOP BAR: Zoom Controls + Close Button -->
        <div class="preview-toolbar">

          <!-- Zoom Controls (only for image) -->
          <div class="zoom-controls" *ngIf="file?.type === 'image'">
            <button class="zoom-btn" (click)="zoomOut()" title="Zoom out">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="zoom-label">{{ zoomPercent }}%</span>
            <button class="zoom-btn" (click)="zoomIn()" title="Zoom in">
              <i class="fa-solid fa-plus"></i>
            </button>
            <button class="zoom-btn" (click)="resetZoom()" title="Reset zoom">
              <i class="fa-solid fa-arrows-to-dot"></i>
            </button>
          </div>

          <!-- Close Button -->
          <button class="close-btn" (click)="closePreview()" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Content Area -->
        <div class="img_container">

          <!-- PDF Preview -->
          <div *ngIf="file?.type === 'pdf'" class="pdf-container">
            <iframe
              [src]="safePdfUrl"
              class="pdf-iframe"
              frameborder="0">
            </iframe>
          </div>

          <!-- Word Document Preview -->
          <iframe
            *ngIf="['doc', 'docx'].includes(file?.type)"
            [src]="safeDocUrl"
            width="100%"
            height="100%"
            frameborder="0">
          </iframe>

          <!-- Text File Preview -->
          <div *ngIf="file?.type === 'txt'" class="document-preview">
            <pre *ngIf="textContent">{{ textContent }}</pre>
            <div *ngIf="!textContent" class="loading-text">Loading text content...</div>
          </div>

          <!-- Image Preview with ngx-pinch-zoom -->
          <div *ngIf="file?.type === 'image'" class="image-zoom-wrapper">
            <pinch-zoom
              #pinchZoom
              [limit-zoom]="maxZoom"
              [minScale]="1"
              [wheel]="true"
              [auto-zoom-out]="false"
              [double-tap]="true"
              (zoomChanged)="onZoomChanged($event)"
              class="pinch-zoom-container">
              <img
                [src]="safeImageUrl"
                alt="preview"
                class="full-image-preview" />
            </pinch-zoom>
          </div>

          <!-- Video Preview -->
          <video
            *ngIf="file?.type === 'video'"
            controls
            class="full-video-preview"
            width="100%"
            height="100%">
            <source [src]="safeVideoUrl" [type]="'video/' + fileExtension">
            Your browser does not support the video tag.
          </video>

        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../styles/notification.scss'],
  styles: [`

    /* === Centered Preview Dialog Overlay Styles === */
    ::ng-deep .centered-preview-dialog-overlay .mat-mdc-dialog-container,
    ::ng-deep .centered-preview-dialog-overlay .mdc-dialog__surface {
      background-color: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    ::ng-deep .centered-preview-dialog-overlay .full_view {
      scale: 1 !important;
      position: relative !important;
      top: unset !important;
      left: unset !important;
      transform: unset !important;
      margin: auto !important;
    }

    /* ── Overlay ── */
    .full_view {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .full_view.isActive {
      display: flex;
      padding: 20px;
    }

    /* ── Inner container ── */
    .inner_container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    /* ── Top toolbar ── */
    .preview-toolbar {
      position: absolute;
      top: 14px;
      right: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 20;
    }

    /* ── Zoom group ── */
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(10px);
      background: rgba(30, 30, 30, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 4px 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .zoom-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .zoom-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .zoom-btn:active {
      transform: scale(0.95);
    }
    .zoom-label {
      font-size: 13px;
      color: #ffffff;
      min-width: 46px;
      text-align: center;
      font-weight: 500;
      user-select: none;
    }

    /* ── Close button ── */
    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(30, 30, 30, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      backdrop-filter: blur(10px);
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      transition: background 0.2s, transform 0.1s;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .close-btn:active {
      transform: scale(0.95);
    }

    /* ── PDF Preview classes ── */
    .pdf-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
    }
    .pdf-iframe {
      width: 100%;
      height: calc(100% + 56px);
      margin-top: -56px;
      border: none;
    }

    /* ── Mobile responsiveness overrides ── */
    @media (max-width: 768px) {
      ::ng-deep .centered-preview-dialog-overlay .full_view {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        box-sizing: border-box !important;
        border-radius: 8px !important;
      }
      .full_view.isActive {
        padding: 8px !important;
      }
      .preview-toolbar {
        top: 8px !important;
        right: 8px !important;
        gap: 6px !important;
      }
      .zoom-controls {
        padding: 2px 6px !important;
        gap: 2px !important;
      }
      .zoom-btn {
        width: 28px !important;
        height: 28px !important;
        font-size: 11px !important;
      }
      .zoom-label {
        font-size: 11px !important;
        min-width: 36px !important;
      }
      .close-btn {
        width: 28px !important;
        height: 28px !important;
        font-size: 13px !important;
      }
      .pdf-iframe {
        height: 100% !important;
        margin-top: 0 !important;
      }
    }

    /* ── Content container ── */
    .img_container {
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Pinch zoom wrapper ── */
    .image-zoom-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    ::ng-deep .pinch-zoom-container {
      width: 100% !important;
      height: 100% !important;
      background: transparent !important;
    }

    ::ng-deep .pinch-zoom-container .pz-zoom-button {
      display: none !important;
    }

    .full-image-preview {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    /* ── Video ── */
    .full-video-preview {
      max-height: 85vh;
      object-fit: contain;
    }

    /* ── Text ── */
    .document-preview {
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #1e1e1e;
      padding: 1.5rem;
      border-radius: 8px;
    }
    .document-preview pre {
      color: #e0e0e0;
      font-family: monospace;
      font-size: 14px;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
    }
    .loading-text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }
  `]
})
export class FilePreviewComponent implements OnChanges {
  @Input() file: any;
  @Input() isActive = false;
  @Output() closed = new EventEmitter<void>();

  // Reference to pinch-zoom component
  @ViewChild('pinchZoom') pinchZoomRef!: PinchZoomComponent;

  safePdfUrl: SafeResourceUrl | null = null;
  safeDocUrl: SafeResourceUrl | null = null;
  safeImageUrl: SafeResourceUrl | null = null;
  safeVideoUrl: SafeResourceUrl | null = null;
  textContent: any = '';
  fileExtension = '';

  // Zoom state (tracked locally to show % label)
  zoomLevel = 1;
  readonly ZOOM_STEP = 0.25;
  readonly ZOOM_MIN = 1;
  readonly ZOOM_MAX = 4;
  readonly maxZoom = 4;

  // ngx-pinch-zoom properties
  pinchZoomProperties = {
    minScale: 1,
    limitZoom: 4,
    wheel: true,
    doubleTap: true,
    autoZoomOut: false,
    disableZoomControl: 'never',  // hide built-in buttons (we use custom)
    backgroundColor: 'transparent'
  };

  get zoomPercent(): number {
    return Math.round(this.zoomLevel * 100);
  }

  cdr = inject(ChangeDetectorRef);

  constructor(private filePreviewService: FilePreviewService) { }

  ngOnChanges() {
    if (this.file && this.isActive) {
      this.fileExtension = this.getFileExtension();
      this.zoomLevel = 1;
      this.loadPreview();
    }
  }

  getFileExtension(): string {
    if (!this.file?.file_name) return '';
    const parts = this.file.file_name.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  async loadPreview() {
    switch (this.file.type) {
      case 'pdf':
        this.safePdfUrl = null;
        this.safePdfUrl = this.filePreviewService.getSafeUrl(this.file, 'pdf');
        break;
      case 'doc':
      case 'docx':
        this.safeDocUrl = null;
        this.safeDocUrl = this.filePreviewService.getSafeUrl(this.file, 'doc');
        break;
      case 'txt':
        this.textContent = null;
        this.textContent = await this.filePreviewService.loadTextFileContent(this.file.storage_name);
        break;
      case 'image':
        this.safeImageUrl = null;
        this.safeImageUrl = this.filePreviewService.getSafeUrl(this.file, 'image');
        break;
      case 'video':
        this.safeVideoUrl = null;
        this.safeVideoUrl = this.filePreviewService.getSafeUrl(this.file, 'video');
        this.cdr.detectChanges();
        break;
    }
  }

  zoomIn() {
    if (this.pinchZoomRef) {
      this.pinchZoomRef.zoomIn(this.ZOOM_STEP);
    }
  }

  zoomOut() {
    if (this.pinchZoomRef) {
      this.pinchZoomRef.zoomOut(this.ZOOM_STEP);
    }
  }

  resetZoom() {
    if (this.pinchZoomRef) {
      const pz = this.pinchZoomRef as any;
      if (pz.pinchZoom && typeof pz.pinchZoom.resetScale === 'function') {
        pz.pinchZoom.resetScale();
      } else {
        this.pinchZoomRef.toggleZoom();
      }
      this.zoomLevel = 1;
      this.cdr.detectChanges();
    }
  }

  onZoomChanged(scale: number) {
    this.zoomLevel = scale;
    this.cdr.detectChanges();
  }

  closePreview() {
    this.isActive = false;
    this.safePdfUrl = null;
    this.safeDocUrl = null;
    this.safeImageUrl = null;
    this.safeVideoUrl = null;
    this.textContent = '';
    this.zoomLevel = 1;
    this.closed.emit();
  }
}