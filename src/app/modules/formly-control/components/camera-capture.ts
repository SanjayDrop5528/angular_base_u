import { Component, ElementRef, ViewChild, OnDestroy, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogService } from '../../../core/services/dialog.service';
import { FieldType } from '@ngx-formly/core';
import _ from 'lodash';
import { environment } from '../../../../environments/environment';
import { FormControl } from '@angular/forms';

@Component({
	selector: 'app-camera',
	standalone: false,
	template: `
		<div class="camera-container">
<!-- @if(capturedImages?.['length'] === 0 && !model.isEdit){ -->
			<div class="capt_img" *ngIf="!capturedImages?.length">
			<p class="heading" style="border: none; cursor: auto; ">
				{{'CAMERA_CAPTURE_MSG' | translate}}
				<span *ngIf="props?.label">{{'CAPUTE_IMG'|translate}}  {{ props.label }}</span>
			</p>
			<mat-icon style=" border: none; cursor: pointer; " (click)="popup()">add_circle_outline</mat-icon>
			<mat-icon style="border: none; cursor: pointer; " (click)="fileInput.click()">attach_file</mat-icon>
			</div>
      	<div>
		  <input
    #fileInput
    type="file" 
    accept="image/*"
    style="display: none;"
    (change)="onFileSelected($event)"
  />

		<div class="captured-images">
			<h2 *ngIf="capturedImages?.['length'] > 0" class="h2B">Captured Photo:</h2>
			<div class="image-gallery">
				<div *ngFor="let image of capturedImages; let i = index" class="image-item">
					<img [src]="getS3Url(image.storage_name)" [alt]="'Captured Image ' + (i + 1)" />
					<div class="image-actions">
						<button (click)="deleteImage(i, image)" class="btn btn-small btn-danger">
						<mat-icon >delete_outline </mat-icon>
						</button>
					</div>
				</div>
			</div>
		</div>
</div>
	<div *ngIf="error" class="error">
		{{ error }}
	</div>
</div>

<ng-template #editViewPopup>
	<div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
		<div class="video-wrapper" style="position: relative; width: 100%; max-width: 800px;">

			<!-- Close Icon -->
			<mat-icon 
				(click)="close()"
				style="position: absolute; top: 10px; right: 10px; z-index: 10; cursor: pointer; background: white; border-radius: 50%; padding: 4px;">
				close
			</mat-icon>

			<!-- Video Container -->
			<div class="video-container">
				<video #video autoplay playsinline width="100%" height="500"
					[style.transform]="isFrontCamera ? 'scaleX(-1)' : 'none'"></video>
				<canvas #canvas style="display: none;"></canvas> <!-- Hidden canvas -->
			</div>
		</div>

		<div style="margin-top: 10px;" class="controls">
			<button (click)="capturePhoto()" class="btn btn-capture">Capture Photo</button>
		</div>
	</div>
</ng-template>

	`,
	styles: [`
		.camera-container {
			display: flex;
			align-items: flex-start;

			flex-direction: column;
			font-family: Arial, sans-serif;
		}

		.h2B {
		color:var(--list-add-button-color);
		font-weight:600
		}
		.image-gallery{
		display:flex;
		justify-content: center;
		gap:10px;
		flex-wrap:wrap;
		}
		video {

			background: #000;
		}
		.heading{
			font-size:18px;
			font-weight:600
		}
		.controls {
			display: flex;
			gap: 10px;
			justify-content: center;
			flex-wrap: wrap;
			margin-bottom: 20px;
		}
		.capt_img{
		display: flex;align-content: center;justify-content: center;
		gap:5px;
		cursor: pointer;
		}

		.btn {
			padding: 10px 16px;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			baground-color: var(--primary-color, #007bff);
			font-size: 14px;
			transition: background-color 0.2s;
		}

		.btn:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		.btn-primary { background-color: #007bff; color: white; }
		.btn-primary:hover:not(:disabled) { background-color: #0056b3; }

		.btn-secondary { background-color: #6c757d; color: white; }
		.btn-secondary:hover:not(:disabled) { background-color: #545b62; }

		.btn-success { background-color: #28a745; color: white; }
		.btn-success:hover:not(:disabled) { background-color: #1e7e34; }

		.btn-danger { background:transparent; color: white; }
		.btn-danger:hover:not(:disabled) { background-color: #c82333; }

		.btn-small {
			padding: 5px 10px;
			font-size: 12px;
		}
		.btn-capture {
			background-color: var(--login-button-color); 
			color: white;}

			.image-item {
			position: relative;
			border: 1px solid #ddd;
			border-radius: 8px;
			overflow: hidden;
			background: white;
			width: max-content;
		}

.image-item img {
	width: 100%;
	height: 150px;
	object-fit: cover;
	display: block;
}

.image-actions {
	position: absolute;
	top: -4.5px;
	right: -5.5px;
	padding: 0;
	opacity: 0; /* hidden initially */
	transition: opacity 0.3s ease;
}

.image-item:hover .image-actions {
	opacity: 1; /* show on hover */
}

.image-actions .btn {
	/* background: rgba(255, 0, 0, 0.8); red background */
	color: white; /* icon color */
	border-radius: 50%;
	padding: 5px;
	min-width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}


	.error {
		color: #dc3545;
		background-color: #f8d7da;
		border: 1px solid #f5c6cb;
		padding: 10px;
		border-radius: 4px;
		margin-top: 10px;
	}

	h3 {
		color: #333;
		margin: 0 0 10px 0;
	}
.upload-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(255, 255, 255, 0.8);
	display: flex; flex-direction: column;
	justify-content: center; align-items: center;
	z-index: 100;
}

.custom-spinner {
	border: 4px solid rgba(0, 0, 0, 0.1);
	border-left-color: #163688; /* spinner color */
	border-radius: 50%;
	width: 50px;
	height: 50px;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}


	`]
})
export class CameraCaptureComponent extends FieldType<any> {
	@ViewChild('video') video!: ElementRef<HTMLVideoElement>;
	@ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
	@ViewChild("editViewPopup", { static: true }) editViewPopup!: TemplateRef<any>;
	uploadedImageIndexes: Set<number> = new Set(); // OR use: uploadedImageStatus: boolean[] = []
	docBasePath = environment.ImageBaseUrl

	capturedImages: any;
	currentStream: MediaStream | null = null;
	cameraActive: boolean = false;
	isFrontCamera: boolean = false;
	isUploading = false;

	hasMultipleCameras: boolean = false;
	error: string | null = null;
	constructor(
		private dialogService: DialogService,
		private cdf: ChangeDetectorRef,
		private dataService: DataService,

	) {
		super();
	}
	async ngOnInit() {


		if (this.model["isEdit"]) {
			this.capturedImages = (this.formControl as FormControl).value
		}
		await this.checkAvailableCameras();

	}

	ngOnDestroy() {
		this.stopCamera();
	}

	async checkAvailableCameras() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');
			this.hasMultipleCameras = videoDevices.length > 1;
		} catch (err) {
			console.error('Error checking cameras:', err);
		}
	}

	async startCamera() {
		try {
			this.error = null;

			const constraints: MediaStreamConstraints = {
				video: {
					facingMode: this.isFrontCamera ? 'user' : 'environment',
					width: { ideal: 400 },
					height: { ideal: 300 }
				}
			};

			this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
			this.video.nativeElement.srcObject = this.currentStream;
			this.cameraActive = true;

		} catch (err: any) {
			this.error = `Camera access error: ${err.message || 'Permission denied'}`;
			console.error('Camera access error:', err);
		}
	}

	// async switchCamera() {
	// if (this.cameraActive) {
	// this.stopCamera();
	// this.isFrontCamera = !this.isFrontCamera;
	// await this.startCamera();
	// }
	// }
	saveImage(index: number) {
		const image = this.capturedImages[index];
		if (!image || !image.files) {
			this.dialogService.openSnackBar("No image to save", "OK");
			return;
		}
		console.log(image.files, "::::::::::");
		// this.handleFileUpload(image.files,index);
	}
	capturePhotoOld() {
		if (!this.cameraActive) {
			this.error = 'Camera is not active';
			return;
		}

		try {
			const video = this.video.nativeElement;
			const canvas = this.canvas.nativeElement;
			const context = canvas.getContext('2d');

			if (context && video.videoWidth > 0 && video.videoHeight > 0) {
				// Adjust canvas size to match video dimensions
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;

				// If front camera, flip the image horizontally
				if (this.isFrontCamera) {
					context.scale(-1, 1);
					context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
					context.scale(-1, 1); // Reset transform
				} else {
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
				}

				const dataUrl = canvas.toDataURL('image/png');
				const file = new File([dataUrl], 'image.png', { type: 'image/png' });
				this.handleFileUpload(file),

					this.error = null;
			} else {
				this.error = 'Video not ready for capture';
			}
		} catch (err: any) {
			this.error = `Capture error: ${err.message}`;
			console.error('Capture error:', err);
		}
	}
	capturePhoto() {


		if (!this.cameraActive) {
			this.error = 'Camera is not active';
			return;
		}

		try {
			const video = this.video.nativeElement;
			const canvas = this.canvas.nativeElement;
			const context = canvas.getContext('2d');

			if (context && video.videoWidth > 0 && video.videoHeight > 0) {
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;

				if (this.isFrontCamera) {
					context.scale(-1, 1);
					context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
					context.scale(-1, 1); // reset
				} else {
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
				}

				const dataUrl = canvas.toDataURL('image/png');
				const file = this.dataURLtoFile(dataUrl, `${this.model._id}.png`);

				this.handleFileUpload(file);
				this.error = null;
			} else {
				this.error = 'Video not ready for capture';
			}
		} catch (err: any) {
			this.error = `Capture error: ${err.message}`;
			console.error('Capture error:', err);
		}

	}
	close() {
		this.stopCamera();
		this.dialogService.closeModal();
	}

	dataURLtoFile(dataUrl: string, filename: string): File {
		const arr = dataUrl.split(',');
		const mime = arr[0].match(/:(.*?);/)![1];
		const bstr = atob(arr[1]);
		let n = bstr.length;
		const u8arr = new Uint8Array(n);

		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}

		return new File([u8arr], filename, { type: mime });
	}

	getTimestamp(): string {
		const now = new Date();
		return now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); // e.g., 20250724104317
	}

	onFileSelected(event: any) {
		const files = event.target.files;
		this.handleFileUpload(files);
	}
	labour_content_files: any[] = []
	handleFileUpload(files: FileList | File | File[]): void {
		debugger
		this.isUploading = true;

		let fileArray: File[] = [];

		if (!files) {
			return this.dialogService.openSnackBar("Select the File First", "OK");
		}

		if (files instanceof FileList) {
			fileArray = Array.from(files);
		} else if (files instanceof File) {
			fileArray = [files];
		} else if (Array.isArray(files)) {
			fileArray = files;
		} else {
			return this.dialogService.openSnackBar("No valid files found", "OK");
		}

		if (fileArray.length === 0) {
			return this.dialogService.openSnackBar("Select the File First", "OK");
		}

		const formData = new FormData();
		console.log('Uploading files:', formData);
		fileArray.forEach((file) => {
			const renamed = new File([file], this.model?.['_id'] ?? file.name, { type: file.type });
			formData.append("file", renamed);
		});

		this.dataService.imageupload("images", `${this.props.refId}`, formData).subscribe({
			next: (res: any) => {
				if (res.data) {
					this.capturedImages = [
						...(this.capturedImages || []),
						...(Array.isArray(res.data) ? res.data : [res.data])
					];

					console.log('Captured image:', this.capturedImages);
					this.formControl.setValue(this.capturedImages);
					this.dialogService.openSnackBar("File uploaded successfully", "OK");
					this.dialogService.closeModal();
					this.stopCamera();
				}
				this.isUploading = false;
			},
			error: (err) => {
				this.isUploading = false;
				console.error("Upload failed", err);
				this.dialogService.openSnackBar("File upload failed", "OK");
			},
		});



	}
	stopCamera() {
		if (this.currentStream) {
			this.currentStream.getTracks().forEach(track => track.stop());
			this.currentStream = null;
		}
		this.cameraActive = false;
	}

	downloadImage(image: { dataUrl: string, timestamp: Date }, index: number) {
		const link = document.createElement('a');
		link.download = `${this.model._id}.png`;
		link.href = image.dataUrl;
		link.click();
	}

	deleteImage(index: number, file?: any) {
		// this.capturedImages.splice(index, 1);
		this.dataService.deleteDataById('user_files', file._id).subscribe((res: any) => {
			this.capturedImages = []
			this.formControl.setValue(this.capturedImages);
			this.dialogService.openSnackBar("File Deleted successfully", "OK");
			if (this.props.updateOnDelete) {
				const fields = this.props.updateOnDelete || [];
				fields.forEach((f: any) => {
					const control = this.form.get(f.key);
					if (control) {
						control.setValue(f.value);
					}
				});
			}
			// this.cd.detectChanges()

		},(err: any) => {
			console.error("Delete failed", err);
			this.capturedImages = []
			this.formControl.setValue(this.capturedImages);
			this.dialogService.openSnackBar("File Deleted successfully", "OK");
		})
	}


	popup() {
		if (this.model._id) {
			this.dialogService.openDialog(
				this.editViewPopup, "800px");
			this.startCamera();
			console.log(this, "::::::::::::::");
		} else {
			this.dialogService.openSnackBar(`Please fill ${this.props?.refId} ID`, "OK");
		}
	}

	getS3Url(storageName: string): string {
		let url = `${this.docBasePath}${storageName}?cb=${Date.now()}`
		return url
	}
}
