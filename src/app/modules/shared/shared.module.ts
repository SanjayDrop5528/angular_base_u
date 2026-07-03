import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CdkTreeModule } from '@angular/cdk/tree';
import { MatTreeModule } from '@angular/material/tree';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMatCheckboxModule } from '@ngx-formly/material/checkbox';
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker';
import { FormlyMatInputModule } from '@ngx-formly/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormlyMatRadioModule } from '@ngx-formly/material/radio';
import { FormlyMatSelectModule } from '@ngx-formly/material/select';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { FormlyMatFormFieldModule } from '@ngx-formly/material/form-field';
import { FormlyMatTextAreaModule } from '@ngx-formly/material/textarea';
import { AgGridModule } from 'ag-grid-angular';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { FilePreviewComponent } from './components/preview/preview';
import { ReasonDialogComponent } from './components/dialogComponents/reason-dialog';
import { ToggleSwitchComponent } from './components/slider';
import { MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from './components/dialogComponents/confirmation-dialog';
import { TranslateModule } from '@ngx-translate/core';
import { ActionButtonComponent } from '../dynamic/components/datatable/button';
import { DropDownAgggrid } from '../dynamic/components/master-single-detail-form/dropdownAggrid';
import { MasterButtonComponent } from '../dynamic/components/master-single-detail-form/master-button';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

@NgModule({
  declarations: [
    //? Directive 
    HasPermissionDirective,
    //  ? Dialog Box
    ReasonDialogComponent,
    ConfirmationDialogComponent,
    //  VisibleDirective,

    ActionButtonComponent,
    DropDownAgggrid,
    MasterButtonComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule,
    ToggleSwitchComponent,
    // 3 party 
    AgGridModule,
    AngularEditorModule,
    TranslateModule,
    // NgSelectModule,
    FilePreviewComponent,
    // ? ANGULAR
    // NgOptimizedImage,
    // ? MAT IMPORTS
    MatTimepickerModule,
    ScrollingModule,
    MatStepperModule,
    MatAutocompleteModule,
    DragDropModule,
    MatChipsModule,
    MatRadioModule,
    MatProgressBarModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatAutocompleteModule,
    MatListModule,
    MatSidenavModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatNativeDateModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatTabsModule,
    MatDatepickerModule,
    MatGridListModule,
    MatExpansionModule,
    MatSlideToggleModule,

    CdkTreeModule,
    MatTreeModule,
    ClipboardModule,
    MatOptionModule,
    // ? Formly
    FormlyModule,
    FormlyMatCheckboxModule,
    FormlyMatDatepickerModule,
    FormlyMatInputModule,
    MatButtonToggleModule,
    FormlyMatRadioModule,
    FormlyMatSelectModule,
    FormlyMaterialModule,
    FormlyMatFormFieldModule,
    FormlyMatTextAreaModule,
    // ? Color Picker
    // NgxColorsModule,
    // FlexLayoutModule,
  ], exports: [
    // FlexLayoutModule,
    MatDialogModule,
    TranslateModule,

    HasPermissionDirective,


    ActionButtonComponent,

    DropDownAgggrid,
    MasterButtonComponent,
    FilePreviewComponent,
    // 3 party 
    AgGridModule,
    MatTimepickerModule,
    ScrollingModule,
    MatStepperModule,
    MatAutocompleteModule,
    DragDropModule,
    MatChipsModule,
    MatRadioModule,
    MatProgressBarModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatAutocompleteModule,
    MatListModule,
    MatSidenavModule,
    MatCardModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatNativeDateModule,
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatTabsModule,
    MatDatepickerModule,
    MatGridListModule,
    MatExpansionModule,
    MatSlideToggleModule,
    CdkTreeModule,
    MatTreeModule,
    ClipboardModule,
    MatOptionModule,
    // ? Formly
    FormlyModule,
    FormlyMatCheckboxModule,
    FormlyMatDatepickerModule,
    FormlyMatInputModule,
    MatButtonToggleModule,
    FormlyMatRadioModule,
    FormlyMatSelectModule,
    FormlyMaterialModule,
    FormlyMatFormFieldModule,
    FormlyMatTextAreaModule,

    // ? Color Picker
    MatBadgeModule
  ]
})
export class SharedModule { }
