import {
  Component, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, TemplateRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldType } from '@ngx-formly/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FilePreviewComponent } from '../../shared/components/preview/preview';
import { DataService } from '../../../core/services/data.service';
import { DialogService } from '../../../core/services/dialog.service';
import { environment } from '../../../../environments/environment';
import _ from 'lodash';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface UploadedFile {
  /** Server-returned fields */
  url?: string;
  storage_name?: string;
  original_name?: string;
  name?: string;
  file_name?: string;
  /** Local preview URL (object URL, only during upload) */
  previewUrl?: string;
  /** True when the file is an image type */
  isImage?: boolean;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, FilePreviewComponent, TranslateModule],
  template: `
    <div class="file-upload-wrapper">

      <!-- Label -->
      <label class="file-upload-label" *ngIf="props.label">
        {{ props.label | translate }}
        <span class="required-star" *ngIf="props.required">*</span>
      </label>
<div [ngClass]="props['grid'] ? 'filecontainer-grid' : 'filecontainer'">
  <div class="upload-progress" *ngIf="isUploading">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" [style.width.%]="uploadProgress"></div>
        </div>
      </div>
    
      <!-- ── FILE PREVIEW GRID ── -->
        <div [ngClass]="props['grid'] ? 'preview-card-grid' : 'preview-card'" *ngFor="let f of uploadedFiles; let i = index">

          <!-- IMAGE preview -->
          <ng-container *ngIf="f.isImage">
            <div class="preview-thumb-wrapper" (click)="openFilePreview(f, $event)">
              <img
                class="preview-thumb"
                [src]="f.previewUrl || buildUrl(f)"
                [alt]="getDisplayName(f)"
                (error)="onImgError($event)" />
              <!-- overlay on hover -->
              <div class="preview-overlay">
                <button type="button" *ngIf="buildUrl(f)"
                   class="overlay-btn"
                   title="Preview"
                   (click)="openFilePreview(f, $event)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button type="button" class="overlay-btn delete"
                        (click)="removeFile(i, f); $event.stopPropagation()"
                        title="Remove">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
            <span class="preview-name">{{ getDisplayName(f) }}</span>
          </ng-container>

          <!-- NON-IMAGE preview (PDF / DOC / etc.) -->
          <ng-container *ngIf="!f.isImage">
            <div class="preview-doc-wrapper" (click)="openFilePreview(f, $event)">
              <mat-icon class="doc-icon" [class]="getDocIconClass(f)">{{ getFileIcon(f) }}</mat-icon>
              <div class="preview-overlay">
                <button type="button" *ngIf="buildUrl(f)"
                   class="overlay-btn"
                   title="Preview"
                   (click)="openFilePreview(f, $event)">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button type="button" class="overlay-btn delete"
                        (click)="removeFile(i, f); $event.stopPropagation()"
                        title="Remove">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
            <span class="preview-name">{{ getDisplayName(f) }}</span>
          </ng-container>

        </div>
    <div
        class="drop-zone"
        [ngClass]="props['grid'] ? 'drop-zone-grid' : ''"
        [class.drag-over]="isDragging"
        [class.has-error]="formControl.invalid && formControl.touched"
        (dragover)="onDragOver($event)"
        (dragleave)="isDragging = false"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">
        <input
          #fileInput
          type="file"
          [multiple]="props['multiple'] !== false"
          [accept]="props['accept'] || '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt'"
          style="display:none"
          (change)="onFileSelected($event)" />

        <div class="drop-zone-content">
          <mat-icon class="upload-icon">cloud_upload</mat-icon>
          <p class="drop-text">{{ 'FORM.FILE_UPLOAD.DRAG_DROP_OR' | translate }} <span class="browse-link">{{ 'FORM.FILE_UPLOAD.BROWSE' | translate }}</span></p>
          <p class="drop-hint">{{ (props['hint'] | translate) || ('FORM.FILE_UPLOAD.DEFAULT_HINT' | translate) }}</p>
      </div>
    </div>
</div>
      <!-- Validation error -->
      <span class="field-error"
            *ngIf="formControl.invalid && formControl.touched && props.required && uploadedFiles.length === 0">
        {{ 'FORM.VALIDATION.FIELD_REQUIRED' | translate:{ label: (props.label | translate) || ('FORM.COMMON.THIS_FIELD' | translate) } }}
      </span>
    </div>

    <ng-template #previewDialog>
      <app-file-preview 
        [file]="activePreviewFile" 
        [isActive]="isPreviewActive" 
        (closed)="closeFilePreview()">
      </app-file-preview>
    </ng-template>
  `,
  styles: [`
    .file-upload-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: start;
      margin-bottom: 0.5rem;
    }
    .filecontainer{
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .filecontainer-grid{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      width: 100%;
    }
    @media (max-width: 768px) {
      .filecontainer-grid{
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.5rem;
        width: 100%;
      }
    }
    .file-upload-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted, #9ca3af);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .required-star { color: #ef4444; margin-left: 2px; }

    /* ── Drop zone ─────────────────────────────── */
    .drop-zone {
      border: 2px dashed var(--border-color, rgba(255,255,255,0.15));
      border-radius: 10px;
      padding: 1.25rem 1rem;
      text-align: center;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 200px;
      height: 200px;
      transition: border-color 0.2s ease, background 0.2s ease;
      background: rgba(255,255,255,0.02);
    }
    .drop-zone-grid{
      width: 100% !important;
    }

    .drop-zone:hover,
    .drop-zone.drag-over {
      border-color: var(--primary-color, #1a73e8);
      background: rgba(26,115,232,0.06);
    }

    .drop-zone.has-error { border-color: #ef4444; }

    .drop-zone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      pointer-events: none;
    }

    .upload-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: var(--primary-color, #1a73e8);
      opacity: 0.7;
    }

    .drop-text {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-main, #e0e0e0);
    }

    .browse-link {
      color: var(--primary-color, #1a73e8);
      font-weight: 600;
    }

    .drop-hint {
      margin: 0;
      font-size: 0.72rem;
      color: var(--text-muted, #9ca3af);
    }

    /* ── Progress ──────────────────────────────── */
    .upload-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .progress-bar-track {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--primary-color, #1a73e8);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 0.72rem;
      color: var(--text-muted, #9ca3af);
      white-space: nowrap;
    }

    /* ── Preview grid ──────────────────────────── */
    .preview-grid {
          display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
    padding: 0.5rem;
    border-radius: 7px;
    margin-top: 0.25rem;
    }

    .preview-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      width: 200px;
      height: 200px;
    
    }
    .preview-card-grid{
       display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      width: 100%;
      height: 200px;
    }
    /* Image thumbnail */
    .preview-thumb-wrapper,
    .preview-doc-wrapper {
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color, rgba(255,255,255,0.12));
      background: rgba(255,255,255,0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 0.2s ease;
    }

    .preview-thumb-wrapper:hover,
    .preview-doc-wrapper:hover {
      border-color: var(--primary-color, #1a73e8);
    }

    .preview-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Doc icon card */
    .doc-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
    }

    .doc-icon.pdf   { color: #ef4444; }
    .doc-icon.doc   { color: #3b82f6; }
    .doc-icon.sheet { color: #22c55e; }
    .doc-icon.other { color: var(--text-muted, #9ca3af); }

    /* Hover overlay */
    .preview-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .preview-thumb-wrapper:hover .preview-overlay,
    .preview-doc-wrapper:hover .preview-overlay {
      opacity: 1;
    }

    .overlay-btn {
      background: rgba(255,255,255,0.15);
      border: none;
      border-radius: 6px;
      padding: 5px;
      cursor: pointer;
      color: #fff;
      display: flex;
      align-items: center;
      text-decoration: none;
      transition: background 0.2s;
    }

    .overlay-btn:hover { background: rgba(26,115,232,0.7); }
    .overlay-btn.delete:hover { background: rgba(239,68,68,0.7); }

    .overlay-btn mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }

    /* File name below card */
    .preview-name {
      font-size: 0.7rem;
      color: var(--text-muted, #9ca3af);
      text-align: center;
      max-width: 110px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Validation error ──────────────────────── */
    .field-error {
      font-size: 0.75rem;
      color: #ef4444;
    }

    /* === File Preview Dialog Styles === */
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
  `]
})
export class FileUploadComponent extends FieldType<any> implements OnInit, OnDestroy {

  isDragging = false;
  isUploading = false;
  uploadProgress = 0;
  uploadedFiles: UploadedFile[] = [];

  @ViewChild('previewDialog') previewDialogTpl!: TemplateRef<any>;
  private dialog = inject(MatDialog);
  private dialogRef: any = null;

  activePreviewFile: any = null;
  isPreviewActive = false;

  private readonly baseUrl = (environment as any).ImageBaseUrl || '';
  /** Object URLs created locally — revoke on destroy to avoid memory leaks */
  private objectUrls: string[] = [];

  constructor(
    private dataService: DataService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService
  ) {
    super();
  }

  ngOnInit(): void {
    const existing = this.formControl.value;
    if (Array.isArray(existing) && existing.length > 0) {
      this.uploadedFiles = existing.map(f => this.annotateFile(f));
    } else if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      if (Object.keys(existing).length > 0) {
        this.uploadedFiles = [this.annotateFile(existing)];
      }
    }
  }

  ngOnDestroy(): void {
    // Release local blob URLs
    this.objectUrls.forEach(u => URL.revokeObjectURL(u));
  }

  /** Attach isImage flag and build a previewUrl if we have a server URL */
  private annotateFile(file: any): UploadedFile {
    const name = (file.original_name || file.file_name || file.name || '').toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(name);
    return { ...file, isImage };
  }

  // ── Event handlers ────────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files?.length) this.processFiles(files);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.processFiles(input.files);
      input.value = '';
    }
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">🖼️</text></svg>';
  }

  // ── Core logic ────────────────────────────────────────────────────────

  private processFiles(files: FileList): void {
    const maxSizeMB: number = this.props['maxSizeMB'] || 10;
    const fileArray = Array.from(files);

    const oversized = fileArray.find(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      const msg = this.translateService.instant('FORM.FILE_UPLOAD.EXCEEDS_LIMIT', { name: oversized.name, size: maxSizeMB })
        || `"${oversized.name}" exceeds the ${maxSizeMB} MB limit.`;
      const ok = this.translateService.instant('FORM.COMMON.OK') || 'OK';
      this.dialogService.openSnackBar(msg, ok);
      return;
    }

    // Generate local preview URLs immediately for instant feedback
    fileArray.forEach(file => {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const objectUrl = URL.createObjectURL(file);
        this.objectUrls.push(objectUrl);
        // Add a temporary pending entry so the preview appears right away
        const pending: UploadedFile = {
          name: file.name,
          original_name: file.name,
          previewUrl: objectUrl,
          isImage: true
        };
        this.uploadedFiles = [...this.uploadedFiles, pending];
      } else {
        const pending: UploadedFile = {
          name: file.name,
          original_name: file.name,
          isImage: false
        };
        this.uploadedFiles = [...this.uploadedFiles, pending];
      }
    });
    this.cdr.detectChanges();

    this.uploadFiles(fileArray, fileArray.length);
  }

  private uploadFiles(files: File[], pendingCount: number): void {
    this.isUploading = true;
    this.uploadProgress = 10;

    const formData = new FormData();
    files.forEach(file => formData.append('file', file, file.name));

    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 85) {
        this.uploadProgress += 15;
        this.cdr.detectChanges();
      }
    }, 300);
    const ID = files
      .map(f => f.name.replace(/\.[^/.]+$/, ''))
      .join('_');
    this.dataService.fileuploadData(this.props.folderName, ID, formData).subscribe({
      next: (res: any) => {
        clearInterval(progressInterval);
        this.uploadProgress = 100;

        const returned: any[] = res?.data
          ? (Array.isArray(res.data) ? res.data : [res.data])
          : files.map(f => ({ name: f.name, original_name: f.name }));

        // Replace the last `pendingCount` pending entries with server responses
        const existing = this.uploadedFiles.slice(0, this.uploadedFiles.length - pendingCount);
        const serverFiles = returned.map(f => this.annotateFile(f));

        // Carry over local previewUrl for images
        files.forEach((localFile, idx) => {
          if (localFile.type.startsWith('image/') && serverFiles[idx]) {
            const localEntry = this.uploadedFiles[existing.length + idx];
            if (localEntry?.previewUrl) {
              serverFiles[idx].previewUrl = localEntry.previewUrl;
            }
          }
        });

        this.uploadedFiles = [...existing, ...serverFiles];
        // Strip local-only UI fields before writing to the form control
        this.formControl.setValue(this.toPayload(this.uploadedFiles));
        this.formControl.markAsDirty();

        setTimeout(() => {
          this.isUploading = false;
          this.uploadProgress = 0;
          this.cdr.detectChanges();
        }, 400);

        const msg = this.translateService.instant('FORM.FILE_UPLOAD.UPLOAD_SUCCESS') || 'File(s) uploaded successfully';
        const ok = this.translateService.instant('FORM.COMMON.OK') || 'OK';
        this.dialogService.openSnackBar(msg, ok);
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearInterval(progressInterval);
        this.isUploading = false;
        this.uploadProgress = 0;
        // Remove the pending entries on failure
        this.uploadedFiles = this.uploadedFiles.slice(0, this.uploadedFiles.length - pendingCount);
        const errMsg = this.translateService.instant(err?.error?.message || 'FORM.FILE_UPLOAD.UPLOAD_FAILED') || 'File upload failed. Please try again.';
        const errOk = this.translateService.instant('FORM.COMMON.OK') || 'OK';
        this.dialogService.openSnackBar(errMsg, errOk);
        this.cdr.detectChanges();
      }
    });
  }

  removeFile(index: number, _file: any): void {
    this.uploadedFiles.splice(index, 1);
    this.uploadedFiles = [...this.uploadedFiles];
    const payload = this.toPayload(this.uploadedFiles);
    this.formControl.setValue(payload.length > 0 ? payload : null);
    this.formControl.markAsDirty();
    this.cdr.detectChanges();
  }

  /**
   * Strip local-only UI fields (previewUrl, isImage) from the file list
   * so they are never included in the form value sent to the server.
   */
  private toPayload(files: UploadedFile[]): Record<string, any>[] {
    return files.map(({ previewUrl, isImage, ...rest }) => rest);
  }

  // ── Display helpers ───────────────────────────────────────────────────

  getDisplayName(file: UploadedFile): string {
    return file.original_name || file.storage_name || file.name || 'File';
  }

  buildUrl(file: UploadedFile): string {
    if (file.url) return file.url;
    if (file.storage_name) {
      var url = `${this.baseUrl}/${file.storage_name}`;
      console.log(url, "9999999999999999999999999999999999999")
      return url;
    }
    return '';
  }

  getFileIcon(file: UploadedFile): string {
    const name = this.getDisplayName(file).toLowerCase();
    if (name.endsWith('.pdf')) return 'picture_as_pdf';
    if (name.match(/\.(doc|docx)$/)) return 'description';
    if (name.match(/\.(xls|xlsx)$/)) return 'table_chart';
    if (name.match(/\.(zip|rar|7z)$/)) return 'folder_zip';
    return 'attach_file';
  }

  getDocIconClass(file: UploadedFile): string {
    const name = this.getDisplayName(file).toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.match(/\.(doc|docx)$/)) return 'doc';
    if (name.match(/\.(xls|xlsx)$/)) return 'sheet';
    return 'other';
  }

  openFilePreview(file: UploadedFile, event: Event) {
    event.stopPropagation();
    const filename = this.getDisplayName(file);
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    let fileType = 'other';

    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
      fileType = 'image';
    } else if (['doc', 'docx'].includes(ext)) {
      fileType = 'doc';
    } else if (ext === 'pdf') {
      fileType = 'pdf';
    } else if (ext === 'txt') {
      fileType = 'txt';
    } else if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
      fileType = 'video';
    }

    this.activePreviewFile = {
      file_name: filename,
      storage_name: file.storage_name || '',
      type: fileType
    };
    this.isPreviewActive = true;

    this.dialogRef = this.dialog.open(this.previewDialogTpl, {
      panelClass: 'centered-preview-dialog-overlay',
      width: '1000px',
      height: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh'
    });

    this.dialogRef.afterClosed().subscribe(() => {
      this.closeFilePreview();
    });
  }

  closeFilePreview() {
    this.activePreviewFile = null;
    this.isPreviewActive = false;
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }
}
