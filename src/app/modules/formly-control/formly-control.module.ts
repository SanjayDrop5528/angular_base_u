import { LOCALE_ID, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { MultiSelectInput } from './components/multiselect-input';
import { MatTimeInput } from './components/mat-timepicker';
import { CheckboxInputFieldComponent } from './components/checkbox';
import { Tab } from './components/tab';
import { FormlyFieldInputTextEnterKey } from './components/inputcheck';
import { TexttoChips } from './components/texttochips';
import { SelectInput } from './components/select-input';
import { HtmlInput } from './components/html-input';
import { LabelView } from './components/label';
import { LogoComponent } from './components/profile-logo';
import { DateInput } from './components/datepicker';
import { DobInput } from './components/dob-input';
import { CustomDecimalInputType } from './components/custom-decimal-input';
import { yearInput } from './components/year-picker';
import { MatPrefixInput } from './components/mat-prefix-input';
import { tooglebutton } from './components/tooglebutton';
import { Card } from './components/card';
import { patchWork } from './components/patchwork';
import { radiobutton } from './components/radiobutton';
import { RepeatTypeComponent } from './components/repeat';
import { FormlyFieldStepper } from './components/stepper';
import { NumericInput } from './components/numeric-input';
import { DragComponent } from './components/drag_and_drop';
import { ColorPickerInputComponent } from './components/color-picker';
import { FormlyInputFieldConfig } from '@ngx-formly/material/input';
import { PrefixInput } from './components/prefix-input';
import { LabelWrapperComponent } from './components/formly-form-wrapper/label-wrapper';
import { FORMLY_CONFIG, FormlyExtension, FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { Chips } from './components/chips';
import { GridFormlyCellComponent } from './components/formlygridsupport';
import { FormlyMatFormFieldModule } from '@ngx-formly/material/form-field';
import { FormlyMatInputModule } from '@ngx-formly/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { OverlayModule } from '@angular/cdk/overlay';
import { CameraCaptureComponent } from './components/camera-capture';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDateFormats } from '@angular/material/core';
import { addonsExtension } from './extension/prefix-extensions';
import { TranslateService } from '@ngx-translate/core';
import { registerTranslateExtension } from './extension/translation-extensions';
import { DynamicFilterComponent } from '../dynamic/components/dynamic-filter/dynamic-filter.component';
import { CheckNumericInput } from './components/custom-input-checker';
import { SharedModule } from '../shared/shared.module';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { CalendarBookingSlotComponent } from './components/calender-booking';
import { MatTextInput } from './components/mat-text-input';
import { MatTextareaInput } from './components/mat-textarea-input';
import { DynamicStepperComponent } from './components/dynamic-stepper/dynamic-stepper.component';
import { DropdownDynamicInput } from './components/dropdown-dynamic-input';
import { FileUploadComponent } from './components/file-upload';
import { ConsentPreviewComponent } from './components/consent-preview';
import { RatingInputFieldComponent } from './components/rating';
import { FormlyFieldMatSlider } from './components/mat-slider';
import { FormlyFieldQA } from './components/qa-field';


export const MY_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD-MMM-YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export const MY_TIME_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
    timeInput: 'hh:mm a', // REQUIRED
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
    timeInput: 'hh:mm a',          // REQUIRED
    timeOptionLabel: 'hh:mm a',    // REQUIRED
  },
};


const lang = "en-US";

const formlyConfig: any = {
  wrappers: [
    { name: "addons", component: PrefixInput },
    { name: 'label', component: LabelWrapperComponent },
  ],
  extensions: [
    { name: "addons", extension: { onPopulate: addonsExtension } },
    { name: 'translate', extension: { onPopulate: registerTranslateExtension } },

  ],

  extras: { lazyRender: true, resetFieldOnHide: true },
  types: [
    { name: "mat-time-picker", component: MatTimeInput },
    { name: "inputcheckbox", component: CheckboxInputFieldComponent },
    { name: "camera-capture", component: CameraCaptureComponent },
    { name: "tab-input", component: Tab },
    { name: 'input-text-enterkey', component: FormlyFieldInputTextEnterKey },
    { name: 'text-to-chips', component: TexttoChips },
    { name: "select-input", component: SelectInput },
    { name: "html-input", component: HtmlInput },
    { name: "label-view", component: LabelView },
    { name: "logo", component: LogoComponent },
    { name: "date-input", component: DateInput },
    { name: "dob-input", component: DobInput },
    { name: "custom-decimal-input", component: CustomDecimalInputType },
    { name: "year-input", component: yearInput },
    { name: "year-picker", component: yearInput },
    { name: "matprefix-input", component: MatPrefixInput },
    { name: "toogle", component: tooglebutton },
    { name: "card", component: Card },
    { name: "patch-work", component: patchWork },
    { name: "radio-button", component: radiobutton },
    { name: "repeat", component: RepeatTypeComponent },
    { name: "stepper", component: FormlyFieldStepper },
    { name: "numeric-input", component: NumericInput },
    { name: "custom-input-checker", component: CheckNumericInput },
    { name: "drag_drop", component: DragComponent },
    // {name:"icon-picker",component:IconPicker},   
    { name: 'color-picker-input', component: ColorPickerInputComponent },
    { name: 'callender-Booking-slot', component: CalendarBookingSlotComponent },
    { name: 'mat-text-input', component: MatTextInput },
    { name: 'mat-textarea-input', component: MatTextareaInput },
    { name: 'dynamic-stepper', component: DynamicStepperComponent },
    { name: 'dropdown-dynamic-input', component: DropdownDynamicInput },
    { name: 'file-upload', component: FileUploadComponent },
    { name: 'consent-preview', component: ConsentPreviewComponent },
    { name: 'rating', component: RatingInputFieldComponent },
    { name: 'mat-slider', component: FormlyFieldMatSlider },
    { name: 'qa-field', component: FormlyFieldQA },
  ],
};

@NgModule({
  declarations: [
    MatTimeInput,
    yearInput,
    LabelWrapperComponent,
    ColorPickerInputComponent,
    NumericInput,
    CheckNumericInput,
    Tab,
    HtmlInput,
    LabelView,
    // MultiSelectInput,
    SelectInput,
    TexttoChips,
    DateInput,
    DobInput,
    PrefixInput,
    MatPrefixInput,
    RepeatTypeComponent,
    CameraCaptureComponent,
    CustomDecimalInputType,
    // TimeInput,
    // Location,
    LogoComponent,
    tooglebutton,
    Card,
    patchWork,
    CheckboxInputFieldComponent,
    Chips,
    FormlyFieldStepper,
    // CarsoalComponent,
    FormlyFieldInputTextEnterKey,
    GridFormlyCellComponent,
    // IconPicker,
    DragComponent,
    ConsentPreviewComponent,
    RatingInputFieldComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormlyMatFormFieldModule,
    FormlyMatInputModule,
    FormlyModule.forRoot(formlyConfig),
    MatDatepickerModule,
    AngularEditorModule,
    OverlayModule,
    DynamicFilterComponent,
    CalendarBookingSlotComponent,
    MatTextInput,
    MatTextareaInput,
    DynamicStepperComponent,
    DropdownDynamicInput,
    FileUploadComponent,
    FormlyFieldMatSlider,
    FormlyFieldQA,
  ], exports: [
    FormlyModule,
    FormlyMatInputModule,
    MatTimeInput,
    yearInput,
    LabelWrapperComponent,
    ColorPickerInputComponent,
    NumericInput,
    Tab,
    HtmlInput,
    LabelView,
    // MultiSelectInput,
    SelectInput,
    TexttoChips,
    DateInput,
    DobInput,
    CameraCaptureComponent,
    PrefixInput,
    MatPrefixInput,
    RepeatTypeComponent,
    CustomDecimalInputType,

    // Location,
    LogoComponent,
    tooglebutton,
    Card,
    patchWork,
    CheckboxInputFieldComponent,
    Chips,
    FormlyFieldStepper,
    // CarsoalComponent,
    FormlyFieldInputTextEnterKey,
    GridFormlyCellComponent,
    // IconPicker,
    DragComponent,
    CalendarBookingSlotComponent,
    ConsentPreviewComponent,
    RatingInputFieldComponent,
    FormlyFieldMatSlider,
    FormlyFieldQA,
    MatTextInput,
    MatTextareaInput,
    DynamicStepperComponent,
    FileUploadComponent,
  ], providers: [
    { provide: FORMLY_CONFIG, multi: true, useFactory: registerTranslateExtension, deps: [TranslateService] },

    // { provide: LOCALE_ID, useValue: lang }, { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_FORMATS, useValue: MY_TIME_FORMATS },

  ]
})
export class FormlyControlModule { }
