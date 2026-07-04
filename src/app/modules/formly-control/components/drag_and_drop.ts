import { ChangeDetectorRef, Component, inject, OnInit } from "@angular/core";
import { FieldType } from "@ngx-formly/core";
import _ from "lodash";
import { firstValueFrom, map, Observable } from "rxjs";
import { DialogService } from "../../../core/services/dialog.service";
import { DataService } from "../../../core/services/data.service";
import { environment } from "../../../../environments/environment";
import { SvgLoaderService } from "../../../core/services/utils/svg-loader.service";

@Component({
  selector: "app-drag",
  standalone: false,
  host: {
    class: "app-drag"
  },
  template: `
<style>

:root{
  --banner-width:min(250px,30%)
}
.preview-container{
  container-type: inline-size;
}
  
  /* Box that contains the upload area */
  .upload-box {
   background-color: #f4f4f4;
  border-radius: 8px;
  padding: 20px;
  width: 100%;
  text-align: center;
  border: 1px solid #D9D9D9 ;
   box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  /* The label styling for the upload area */
  .upload-area {
  border: 2px dashed var(--base-theme-dotted-border-color); 
  padding: 30px;
  display: inline-block;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  height:-webkit-fill-available;
  width:-moz-available;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  
  }
.upload-area .web {
  display: block;
}

.upload-area .mobile {
  display: none;
}
 
  .upload p{
  
  font-weight: bold; 
  }
  
  .dragover{
  background-color: #f1f9ff;
  border-color: #3399ff;
  }
  
  /* Hover effect for the upload area */
  .upload-area:hover {
  background-color: #f1f9ff;
  border-color: #3399ff;
  }
  
  /* Text styling inside the upload area */
  .upload-area p {
  margin: 0;
  font-size: 16px;
  color: #555;
  font-weight: bold;
  text-align: center;
   }
  
  /* For the hidden file input */
  #fileInput {
  display: none;
  }
  /* Optional styling for when a file is dragged over */
  .upload-area.dragover {
  background-color: #e6f7ff;
  border-color: #3399ff;
  }   
  
  .preview-container {
    margin-top: 20px;
    margin-bottom: 24px;
    .svg-list{
      height: 110px;
      /* max-height: 110px; */
      svg{
        height: 100%;
        width: auto;
      }
  }
    .image-list {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
      justify-content: space-between;
      .image-item {
        /* width:100%; */
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 1px solid #ccc;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
        background-color: #f9f9f9;
        /* height: inherit; */
        /* height: 80%; */
        .preview-image {
          width: 100%;
          height: 85%; 
          border-radius: 4px;
          margin-bottom: 8px;
          object-fit: cover;
        }
        p {
          margin: 0;
          font-size: 14px;
          text-wrap: wrap;
          text-align: flex-start;
          font-weight: bold;
        }
        .icon{
          display: none;
        }
  }
     .image-item:hover {
          img {
            filter: blur(0.4rem);
          }video {
            filter: blur(0.4rem);
          }
          svg {
            filter: blur(0.4rem);
          }
          p{
            filter: blur(0.4rem);
          }
      .icon{
        display: flex;
        gap: 20px; 
        align-items: center;
        justify-content: center;
        font-size: 50%;
        color: grey;
        cursor: pointer;
        transition: transform 0.2s ease-in-out;
        }
    }  
    .isdisable{
          img{
          filter:blur(0) !important;
          }
          p{
            filter: blur(0) !important;
          }
        }
   
}
}

.preview-svg {
  max-height: 60px;
  height: 90px;
  max-height: 90px;
  display: flex;
  justify-content: center;
  width: 90px;
  align-items: center;
}
.preview-svg  svg{
    height: 90px;
  max-height: 90px;
  max-width: 100%
  }

  @container (max-width: 1586px) {
    .preview-container{
    .image-list {
      grid-template-columns: repeat(5, 1fr);
  }
}
}

@container (max-width: 1271px) {
    .preview-container{
    .image-list {
      grid-template-columns: repeat(4, 1fr);
  }
}
}
@container (max-width: 1068px) {
    .preview-container{
    .image-list {
      grid-template-columns: repeat(3, 1fr);
  }
}
}
@container (max-width: 620px) {
    .preview-container{
    .image-list {
      grid-template-columns: repeat(2, 1fr);
  }
}

}
@container (max-width: 500px) {
    .preview-container{
    .image-list {
      grid-template-columns: repeat(2, 1fr);
  }
}

}
</style>
@if(field){
<!-- <br> -->
  <span class="html-heading sub-title" style="margin-left:15px">{{(title || "EMPTY") | translate}} <label *ngIf="this.opt['required']">*</label> </span>

<!-- <p style="margin-bottom:-10px;margin-left:20px; color:#20202099">{{title}}</p> -->
@if(uploadedFiles.length ==0){

<div class="upload-container" (dragover)="onDragOver($event)" (drop)="onDrop($event)" (dragleave)="onDragLeave($event)">
         
      <div class="upload-box" >
  
        <label class="upload-area" [for]="'fileInput'+field?.['key']" >
          @if(opt?.['single']==true){
            <input [id]="'fileInput'+field?.['key']" style="display: none;" type="file" (change)="onFileSelect($event)"  hidden />   
          }@else {
            <input [id]="'fileInput'+field?.['key']" style="display: none;" type="file" (change)="onFileSelect($event)" multiple
            hidden /> 
          }
          
         
          <p class="web"> {{ 'FORM.COMMON.UPLOAD_CLICK_DRAG' | translate }}</p>
              <p class="mobile">+</p>
        </label> 
      </div>
    </div> 
}

    @if(uploadedFiles.length > 0 ){

      <div class="preview-container"> 
          <div class="image-list" [ngClass]="opt?.['className']"> 
        @if(this?.opt['single']!=true){
          @for (item of uploadedFiles;let isLast=$last; track item) { 
            <div class="image-item" >
                <img *ngIf="isImage(item)" [src]="docBasePath + item.storage_name" alt="Preview" class="preview-image" />
              <video *ngIf="isVideo(item)" controls class="preview-video" style="width:100%; height: 90%; object-fit: cover;">
                <source [src]="docBasePath + item.storage_name" [type]="getVideoType(uploadedFiles[0]?.storage_name)" />
              </video>
              <div class="preview-svg"  *ngIf="isSvg(item)" [id]="item['_id']"></div>

              <span class="icon">
                <mat-icon  matTooltip="{{'Delete ' + ( item?.['name'] ? item?.['name'] : item?.['file_name']) }}"  class="delete" (click)="deleteFile(item)">delete_forever</mat-icon>
                <mat-icon matTooltip="{{'Edit ' + ( item?.name ? item?.name : item?.file_name) }}" *ngIf="opt?.['enableEditing']"  class="edit"  (click)="item.editing=true">edit</mat-icon>
              </span>

              @if(opt?.['enableEditing']){
                <p *ngIf="!item?.editing" (dblclick)="item.editing=true">
                  {{ item?.name ? item?.name : item?.file_name }}
                </p>
                <mat-form-field *ngIf="item?.editing">
                  <mat-label> Enter Name </mat-label>
                  <input matInput [(ngModel)]="item.name" (blur)="item.editing=false" (keyup.enter)="item.editing=false" />
                </mat-form-field>
              }@else{
              <p class="name">{{ item?.name ? item?.name : item?.file_name }}</p>  
              }
            </div>
            @if(isLast){
              <div class="upload-container"  (dragover)="onDragOver($event)" (drop)="onDrop($event)" (dragleave)="onDragLeave($event)">
            
          <div class="upload-box" >
      
            <label class="upload-area" [for]="'fileInput'+field?.['key']" >
              <input [id]="'fileInput'+field?.['key']" style="display: none;" type="file" (change)="onFileSelect($event)" multiple
              hidden /> 
              <p class="web"> {{ 'FORM.COMMON.UPLOAD_CLICK_DRAG' | translate }}</p>
              <p class="mobile">+</p>
            </label>
            <!-- <p>{{insideText}}</p> -->
          </div>
        </div> 
            }
          }
        }@else if(uploadedFiles.length == 1){
<!--  SINGLE IMAGE -->
            @if(opt?.['single']==true){
               <input [id]="'fileInput'+field?.['key']" style="display: none;" type="file" (change)="onFileSelect($event)"  hidden />   
             }
          <div class="image-item" [class.isdisable]="isDisabled">
                <img *ngIf="isImage(uploadedFiles[0])" [src]="docBasePath + uploadedFiles[0]?.storage_name" alt="Preview" class="preview-image" />
              <video *ngIf="isVideo(uploadedFiles[0])" controls class="preview-video" style="width:100%">
                <source [src]="docBasePath + uploadedFiles[0]?.storage_name" [type]="getVideoType(uploadedFiles[0]?.storage_name)" />
              </video>
              <div  class="preview-svg"   *ngIf="isSvg(uploadedFiles[0])" [id]="uploadedFiles[0]['_id']"></div>
              <span class="icon" *ngIf="!isDisabled">
                <mat-icon matTooltip="Upload New Image" (click)="upload()">cloud_upload</mat-icon>

                <mat-icon matTooltip="{{'Delete ' + ( uploadedFiles[0]?.name ? uploadedFiles[0]?.name : uploadedFiles[0]?.file_name) }}" (click)="deleteFile(uploadedFiles[0])">delete_forever</mat-icon>
                <mat-icon *ngIf="opt?.['enableEditing']"  matTooltip="{{'Edit ' + ( uploadedFiles[0]?.name ? uploadedFiles[0]?.name : uploadedFiles[0]?.file_name) }}"   (click)="uploadedFiles[0].editing=true">edit</mat-icon>
              </span>

              @if(opt?.['enableEditing']){
                <p *ngIf="!uploadedFiles[0]?.editing" (dblclick)="uploadedFiles[0].editing=true">
                  {{ uploadedFiles[0]?.name ? uploadedFiles[0]?.name : uploadedFiles[0]?.file_name }}
                </p>
                <mat-form-field *ngIf="uploadedFiles[0]?.editing">
                  <mat-label> Enter Name </mat-label>
                  <input matInput [(ngModel)]="uploadedFiles[0].name" (blur)="uploadedFiles[0].editing=false" (keyup.enter)="uploadedFiles[0].editing=false" />
                </mat-form-field>
              }@else{
              <p >{{ uploadedFiles[0]?.name ? uploadedFiles[0]?.name : uploadedFiles[0]?.file_name }}</p>  
              }
            </div>
        }

        </div>
          </div>
    }
  }
    `,
})
export class DragComponent extends FieldType<any> {
  docBasePath: string = environment?.ImageBaseUrl

  dialogService = inject(DialogService);
  cdr = inject(ChangeDetectorRef);
  dataService = inject(DataService);

  title: any = "Add a File"
  insideText = "Supports single or bulk uploads"
  uploadedFiles: any = [];
  opt: any
  acceptFileType: any = [".jpg", ".jpeg", ".webp"]
  isDisabled = false;
  svgLoader = inject(SvgLoaderService)
  ngOnInit(): void {
    this.opt = this.props || {};
    console.log(this.opt);

    if (this.opt['title']) {
      this.title = this.opt['title']
    }
    if (this.opt['insideText']) {
      this.insideText = this.opt['insideText']
    }

    if (this.opt['acceptFileType']) {
      this.acceptFileType = this.opt['acceptFileType']
    }
    if (this.model["isEdit"]) {
      const images: any = _.isEmpty(this.model[this.field.key]) ? [] : this.model[this.field.key]
      this.uploadedFiles = (Array.isArray(images) ? images : [images]) || [];
    }
    const root = document.documentElement;
    console.log(this.opt['aspect_ratio']);
    root.style.setProperty('--banner-width', this.opt['aspect_ratio'] ?? 'min(250px,30%)');
  }

  upload() {
    console.log("UPLOAD");

    const element = document.getElementById('fileInput' + this.field?.['key'])
    if (element) {
      element.click()
    }

  }
  deleteFile(deletedItem: any): void {

    this.dataService.deleteDataById('user_files', deletedItem._id).subscribe((res: any) => {
      this.uploadedFiles = this.uploadedFiles.filter(
        (item: any) => item['_id'] !== deletedItem["_id"]
      );
      this.formControl.setValue(this.uploadedFiles);
      this.dialogService.openSnackBar("File Deleted successfully", "OK");
      this.cdr.detectChanges()
    })
  }

  onFileSelect(event: any): void {
    const files = Array.from(event.target.files) as File[];
    const validFiles = this.checkFiles(files);
    if (validFiles.length > 0) {
      if (this.opt['single']) {
        this.SingleFileAccept(validFiles)
      } else {
        this.handleFileUpload(validFiles);
      }
    }
  }

  onDragOver(event: any) {
    event.preventDefault();
    const uploadBox = event.target.closest(".upload-box");
    if (uploadBox) uploadBox.classList.add("dragover");
  }

  onDragLeave(event: any) {
    const uploadBox = event.target.closest(".upload-box");
    if (uploadBox) uploadBox.classList.remove("dragover");

  }

  isImage(file: any): any {
    if (!file) return
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageExtensions.some(ext => file.file_name?.toLowerCase().endsWith(ext));
  }

  isSvg(file: any): any {
    if (!file) return
    const imageExtensions = ['.svg'];
    const value = imageExtensions.some(ext => file.file_name?.toLowerCase().endsWith(ext));
    if (value) {
      this.svgLoader.loadSVG(file.storage_name, file["_id"])
    }
    return value
  }
  isVideo(file: any): any {
    if (!file) return
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    return videoExtensions.some(ext => file.file_name?.toLowerCase().endsWith(ext));
  }
  getVideoType(fileName: string): string {

    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'ogg': return 'video/ogg';
      case 'mkv': return 'video/mkv';
      default: return ''; // Handle unknown types
    }
  }

  checkFiles(files: any) {
    const allowedExtensions = this.acceptFileType ?? [".jpg", ".png", ".pdf", ".txt"];
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const isAllAllowed = allowedExtensions.includes("*") || allowedExtensions.includes("*/*");
    if (isAllAllowed) {
      return files
    }
    Array.from(files).forEach((file: any) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (ext && allowedExtensions.includes(ext)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      alert(`Invalid file(s):\n${invalidFiles.join("\n")}`);
      // this.dialogService.openErrorPopup(`Invalid file(s):\n${invalidFiles.join("\n")}`)
    }

    return validFiles; // Return valid files for further processing
  }

  SingleFileAccept(file: any) {
    if (this.uploadedFiles.length > 0) {
      const dialogRef = this.dialogService.openConfirmation("Would You Like To Delete The Previous Image")
      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (result) {
          this.deleteFile(this.uploadedFiles[0]);
          this.handleFileUpload(file)

        }
      });
    } else {
      this.handleFileUpload(file)
    }
  }

  onDrop(event: any) {
    event.preventDefault();
    const uploadBox = event.target.closest(".upload-box");
    if (uploadBox) uploadBox.classList.remove("dragover");

    // const files: File[] = event.dataTransfer.files;   
    const files = event.dataTransfer.files;
    const validFiles = this.checkFiles(files);
    if (validFiles.length > 0) {
      if (this.opt['single']) {
        this.SingleFileAccept(validFiles)
      } else {
        this.handleFileUpload(validFiles);
      }
    }
    // this.handleFileUpload(files)
  }

  handleFileUpload(files: any): void {
    if (!files) {
      return this.dialogService.openSnackBar("Select the File First", "OK");
    }
    const formData = new FormData();
    if (this.opt.refId) {
      if (this.model[this.opt.refId] == undefined) {
        if (this.opt['error_msg']) {
          return this.dialogService.openSnackBar(this.opt['error_msg'])
        }
        return this.dialogService.openSnackBar(
          `${this.opt.refId.toUpperCase().replace("_", " ")} Is Missing`,
          "OK"
        );
      }
      for (const element of files) {
        formData.append("file", element);
      }
      // this.dataService.imageupload(this.opt.folder, this.model[this.opt.refId], formData)
      //   .subscribe((res: any) => {
      //     if (res.data) { 
      //       this.uploadedFiles.push(...res.data);
      //       if(this.opt['single']){
      //         this.formControl.setValue(this.uploadedFiles[0]);            
      //       }else{
      //         this.formControl.setValue(this.uploadedFiles);
      //       }
      //       this.dialogService.openSnackBar("File Uploaded successfully", "OK");
      //     }
      //   }); 
      // const clonedData = _.clone(this.model);

      // console.log("clonedData",clonedData);

      const refId = this.model?.[this.opt?.refId];
      const folder = this.opt?.folder;
      var clonedData = _.clone(this.model);
      const isSingle = this.opt?.['single'];

      const upload = () => {
        if (folder && refId) {
          console.log("clonedata", clonedData);

          this.dataService.imageupload(folder, refId, formData).subscribe({
            next: (res: any) => {
              if (res.data) {
                this.uploadedFiles.push(...res.data);
                this.formControl.setValue(isSingle ? this.uploadedFiles[0] : this.uploadedFiles);
                this.dialogService.openSnackBar("File Uploaded successfully", "OK");
                // ["className", "courseName", "schoolName", "org_id"].forEach(key => {
                //   if (key in this.model) {
                //     delete this.model[key];
                //     console.log(`Deleted ${key}`);
                //   }
                // });


              }
            },
            error: err => console.error("Upload failed", err),
          });
        }
      };

      const prepareUpload = async () => {
        try {
          upload();
        } catch (error) {
          console.error("Error during folder_api/custom_folder processing", error);
        }
      };

      prepareUpload();


    }
  }

  GetFilterData(): Observable<any> {
    const options: any = this.opt?.folder_api_struct;
    const columnKey = options.column;
    const CollectionName = options.CollectionName;
    const operator = options.operator;
    const valueKey = options.valueKey;
    const val = this.model[valueKey];

    var filter: any = {
      filter: [
        {
          clause: "AND",
          conditions: [
            {
              column: columnKey,
              operator: operator,
              value: val,
              type: "STRING"
            }
          ]
        }
      ]
    };
    if (columnKey == undefined || columnKey == null) {
      filter = {}
    }

    return this.dataService.dataset_Get_Data(CollectionName, filter).pipe(
      map((res: any) => {
        const responseItem = res?.data?.[0]?.response?.[0];
        return responseItem
      })
    );
  }

}
/*? SAMPLE JSON
{
  "type": "drag_drop",
  "key": "gallery",
  "className": "gallery",
  "props": { 
    "folder": "gallery", 
    "refId":"org_id",
    "enableEditing":true,
    "acceptFileType":[".jpg",".jpeg",".webp"],
    "title":"Gallery Upload",
    "insideText":"Supports single or bulk uploads. Supported file types: JPG, JPEG, PNG, TIFF, SVG, WEBP",
    "error_msg":"Please Enter the School ID for Gallery Upload"
  }
}
  */