import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { FormControl } from '@angular/forms';
import * as _ from 'lodash';
import { AngularEditorConfig } from '@kolkov/angular-editor';

@Component({
  selector: 'html-input', standalone: false,
  template: `
<style>
      .header {
        margin-top: 100px;
        text-align: center;
        margin-bottom: 40px;
      }
      .html-header {
        margin: 15px 0 5px;
      }
  

      .html {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 0.5rem;
        background-color: #f1f1f1;
        min-height: 20px;
        max-height: 10rem;
        overflow: auto;
      }

      ::ng-deep
        .angular-editor
        .angular-editor-wrapper
        .angular-editor-textarea {
        min-height: 5rem;
        padding: 0.5rem 2.8rem 1rem !important;
        border: 1px solid #ddd;
        background-color: transparent;
        overflow-x: hidden;
        overflow-y: auto;
        position: relative;
        padding-left: 10px; 
      }
    </style>
<div style="margin-bottom: 20px;background-color: white;">

  <span class="html-heading sub-title" style="margin-left:15px">{{field.props!['label'] || ""}}</span>

  <angular-editor height="100px" minHeight="100px"
    [formlyAttributes]="field"
    [formControl]="FormControl"
    [config]="editorConfig" [(ngModel)]="data">
  </angular-editor>

  @if ( this.FormControl.touched && this.FormControl.errors?.['required']) {
    <mat-error>This {{ this.field.props!.label }} is required</mat-error>
  }
</div>

`


})
export class HtmlInput extends FieldType implements OnInit {
  constructor() {
    super();
  }
  data: any

  hide = [
    'undo',
    'redo',
    'strikeThrough',
    'insertImage',
    'insertVideo',
    'insertHorizontalRule',
    'customClasses',
    'toggleEditorMode',
    // 'fontName'

  ]
  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    showToolbar: false,
    // sanitize: false,
    // height: '5rem',
    minHeight: '13rem',
    maxHeight: 'var(--sidenav-bg-width)',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    toolbarHiddenButtons: [this.hide]
  }
  public get FormControl() {
    return this.formControl as FormControl;

  }
  opt: any
  editing: any
  ngOnInit() {
    let key = this.field.key as string
    this.editing = false;
    this.opt = this.props;
    this.editorConfig.editable = !this.field.props?.disabled;
    this.editorConfig.showToolbar = !this.field.props?.disabled;
    this.appendFieldToHtml();
    this.data = _.get(this.field, `model.${key}`, "");

  }

  appendFieldToHtml() {
    if (!_.hasIn(this.opt, 'parentKey')) {
      return
    }
    const formControl: any = this.form.get(this.opt?.['parentKey'])
    const data = _.cloneDeep(formControl.value)
    var change = false
    formControl?.valueChanges.subscribe((res: any) => {
      if (!_.isEqual(data, res) || change) {
        this.data = res.map((item: any) => `{{${item}}}`).join(' ');
        change = true
      }
    })
  }

}
/* 
JSON 
{
  "type": "html-input",
  "key": "description",
  "props": {
    "label": "About the Assignment"
  }
}
  */