import { Component, OnInit, } from "@angular/core";
import { FieldType } from "@ngx-formly/core";
import { v4 as uuidv4 } from 'uuid';
import { DataService } from "../../../core/services/data.service";
import { DialogService } from "../../../core/services/dialog.service";

@Component({
  selector: "file-input", standalone: false,
  template: `

<style>


  ::ng-deep .custom-mat-form-field .mat-input-element[type="file"] {
  background-color: #f0f0f0; /* Replace with your desired background color */
}

.file-input{
display:flex;
margin:20px
}


.show-file{
margin-top:4px !important
}
</style>
<!-- <mat-label>{{field.props!['label']}}</mat-label> -->
 <p class="html-heading">{{to['label']}}</p>
<div class="file-input">

  <input
    #myInput
    type="file"
    multiple
    (change)="onFileSelected($event.target)"
    />
  <br />


  <div  style="text-align-last: end; width: 100%">
    <button style="margin-left:2px;margin-right:10px" type="button" [disabled]="show_button"  mat-button (click)="reset(myInput)">
      <span class="glyphicon glyphicon-trash"></span> Reset
    </button>

    <button
      type="button"
      (click)="save()"
      [disabled]="show_button"
      mat-raised-button
      class="approve-button"
      class="btn btn-primary"
      >
      <span class="glyphicon glyphicon-upload"></span>Upload
    </button>
  </div>
</div>

<div class="show-file">
  @for (data of this.file; track data) {
    <li style="margin-left:20px" >{{data.filename}}</li>
  }
</div>
`,
})
export class FileInput extends FieldType<any> implements OnInit {
  show_files: boolean = false
  constructor(
    public dataservice: DataService,
    public dialogservice: DialogService,
  ) {
    super();
  }

  selectedFiles: any[] = []
  file: any[] = []
  refid: any
  show_button: boolean = true

  ngOnInit(): void {
    let data = this.model[this.field.key]
    if (data?.length != 0 && data != undefined) {
      this.file = data
    }
  }


  save() {
    //api call

    let id = uuidv4()

    const formData = new FormData();

    for (let i = 0; i < this.selectedFiles.length; i++) {
      formData.append('file', this.selectedFiles[i]);
      console.log(formData)
    }
    formData.append(this.field.refId, id);
    formData.append("category", this.field.category);
    this.dataservice.fileupload(formData).subscribe((res: any) => {

      if (res.data) {
        this.field.formControl.setValue(res.data);
        this.dialogservice.openSnackBar(res.message, "OK")
        this.show_button = true
      }
    })
  }

  reset(file: any) {
    this.file = []
    file.value = "";
  }

  onFileSelected(target: any) {
    this.file = []
    this.show_button = false
    this.selectedFiles = target.files
    for (let i = 0; i < this.selectedFiles.length; i++) {
      this.file.push({ "filename": this.selectedFiles[i].name })
    }
  }
}
