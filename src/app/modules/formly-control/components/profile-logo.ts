import { HttpClient } from "@angular/common/http";
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { FieldType } from "@ngx-formly/core";
import { firstValueFrom } from "rxjs";
import _ from "lodash";
import { DataService } from "../../../core/services/data.service";
import { DialogService } from "../../../core/services/dialog.service";
import { environment } from "../../../../environments/environment";

import { AuthService } from "../../../core/services/auth.service";
import { HelperService } from "../../../core/services/utils/helper.service";

@Component({
  selector: "formly-field-logo", standalone: false,
  template: `
    <style>
      .profile-logo-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 2.5rem;
        width: 100%;
      }

      .profile-logo-header {
        margin-bottom: 1rem;
        width: 100%;
        text-align: center;
      }

      .field-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-muted, #888);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .required-asterisk {
        color: var(--mff-border-error-color, #ff4d4d);
        margin-left: 2px;
      }

      .logo-container {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .hoverable-avatar {
        position: relative;
        display: block;
        cursor: pointer;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .hoverable-avatar:hover {
        transform: scale(1.03);
      }

      .avatar-preview-box {
        position: relative;
        width: 130px;
        height: 130px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.02);
        box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .hoverable-avatar:hover .avatar-preview-box {
        border-color: var(--primary-color, #3f51b5);
      }

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-muted, #888);
        background: rgba(255, 255, 255, 0.03);
      }

      .placeholder-icon {
        font-size: 3rem !important;
        opacity: 0.6;
      }

      .hover-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(2px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 2;
      }

      .hoverable-avatar:hover .hover-overlay {
        opacity: 1;
      }

      .camera-icon {
        font-size: 1.5rem !important;
        color: #fff;
        margin-bottom: 4px;
      }

      .hover-text {
        font-size: 0.7rem;
        color: #fff;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      #fileInput {
        display: none;
      }
    </style>
    <div class="profile-logo-wrapper">
      <div class="profile-logo-header" *ngIf="label">
        <span class="field-label">{{ label }}<span *ngIf="opt?.required" class="required-asterisk">*</span></span>
      </div>
      <div class="logo-container">
        <label class="hoverable-avatar" for="fileInput">
          <div class="avatar-preview-box">
            <img *ngIf="url" [src]="url" alt="Avatar" class="avatar-image" />
            <div *ngIf="!url" class="avatar-placeholder">
              <i class="fa fa-user placeholder-icon"></i>
            </div>
            <div class="hover-overlay">
              <i class="fa fa-camera camera-icon"></i>
              <span class="hover-text">Upload</span>
            </div>
          </div>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            (change)="handleFileUpload($event)"
            (change)="onSelectFile($event)"
          />
        </label>
      </div>
    </div>

    <input
      type="hidden"
      [formControl]="thisFormControl"
      [formlyAttributes]="field"
    />
  `,
})
export class LogoComponent extends FieldType<any> implements OnInit {
  opt: any;
  url: any;
  label: any;
  docBasePath: string = environment?.ImageBaseUrl;
  photoTimestamp = new Date().getTime();

  constructor(
    private dataService: DataService,
    private cf: ChangeDetectorRef,
    private dialogService: DialogService, 
    private authService: AuthService,
    private helperService: HelperService
  ) {
    super();
  }

  ngOnInit(): void {
    this.opt = this.field.props || this.field.templateOptions || {};
    this.label = this.opt.label || "";

    const setUrl = (val: any) => {
      if (val) {
        if (val.startsWith('data:')) {
          this.url = val;
        } else {
          const folder = this.opt.folder || 'profiles';
          const basePath = this.docBasePath && this.docBasePath.endsWith('/') ? this.docBasePath : ((this.docBasePath || '') + '/');
          let cleanUrl = '';
          if (val.startsWith(folder + '/')) {
            cleanUrl = basePath + val;
          } else if (val.startsWith('http://') || val.startsWith('https://')) {
            cleanUrl = val;
          } else {
            cleanUrl = basePath + folder + '/' + val;
          }
          this.url = cleanUrl + "?t=" + this.photoTimestamp;
        }
      } else {
        this.url = "";
      }
      this.cf.detectChanges();
    };

    setUrl(this.formControl?.value || this.model[this.field.key]);

    if (this.formControl) {
      this.formControl.valueChanges.subscribe((val: any) => {
        if (val && !val.startsWith('data:')) {
          setUrl(val);
        }
      });
    }

    this.dataService.profilePhotoUploaded.subscribe(() => {
      this.photoTimestamp = new Date().getTime();
      setUrl(this.formControl?.value || this.model[this.field.key]);
    });
  }

  public get thisFormControl(): FormControl {
    return this.formControl as FormControl;
  }
  refId: any;

  handleFileUpload(event: any): void {
    const fileInput: any = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!event) {
      return this.dialogService.openSnackBar("Select the File First", "OK");
    }
    let ref = this.field.props?.refId || this.opt?.refId;
    this.refId = this.model[ref] || this.authService.getCurrentUser()?.email || 'user_profile';
    const formData = new FormData();
    if (this.field.bind_key) {
      const bindValue = this.model[this.field.bind_key] || this.authService.getCurrentUser()?.email || 'user_profile';
      formData.append("file", event.target.files[0]);
      formData.append(this.field.refId || 'refId', bindValue);

      var refId = this.model?.[this.opt?.refId] || this.helperService.generateRandomId();
      if (this.field?.props?.model === 'email') {
          refId = refId.split('@')[0];
      }
      const folder = this.opt?.folder || 'profiles';
      var clonedData = _.clone(this.model);

      const upload = () => {
        if (folder && refId) {

          this.dataService.imageupload(folder, refId, formData).subscribe({
            next: (res: any) => {
              if (res.data) {
                this.formControl.setValue(res.data[0]?.storage_name);
                this.dataService.profilePhotoUploaded.next();
                this.dialogService.openSnackBar("File Uploaded successfully", "OK");
              }
            },
            error: err => console.error("Upload failed", err),
          });
        }
      };

      const prepareUpload = async () => {
        try {
          // // Handle optional folder_api 
          // if (this.opt?.folder_api) {
          //   const orgId: any = clonedData["org_id"];
          //   const res: any = await firstValueFrom(this.dataService.GetSchoolName(orgId));
          //   clonedData["school_name"] = res?.school_name ?? "";
          // }


          upload();

        } catch (error) {
          console.error("Error during folder_api/custom_folder processing", error);
        }
      };

      prepareUpload();
    }
  }

  onSelectFile(event: any): void {
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      let sourcefile: any = event.target.files[0];
      reader.readAsDataURL(sourcefile);
      this.cf.detectChanges();
      reader.onload = (event) => {
        const url = (<FileReader>event.target).result as string;
        this.url = url;
        this.cf.detectChanges();
      };
    }
  }
}
// ! SAmple
// 	{
//   "type": "logo",
//   "key": "Org_logo",
//   "className": "flex-6",
//   "templateOptions": {
//     "label": "Organization Logo"
//   }
// },
