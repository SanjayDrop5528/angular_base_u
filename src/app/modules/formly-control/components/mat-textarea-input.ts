import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FormlyModule } from '@ngx-formly/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';

/**
 * Standalone Material textarea input formly type.
 * Register as: { name: 'mat-textarea-input', component: MatTextareaInput }
 */
@Component({
  selector: 'mat-textarea-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <mat-form-field
      class="textarea-form-field"
      [class.json-textarea-field]="!!field.props?.['jsonEditor']"
      style="width: 100%;"
    >
      <mat-label>{{ field.props?.label }}</mat-label>
      <textarea
        matInput
        [class.json-textarea-input]="!!field.props?.['jsonEditor']"
        [rows]="field.props?.rows || 4"
        [placeholder]="field.props?.placeholder || ''"
        [required]="!!field.props?.required"
        [readonly]="!!field.props?.readonly"
        [formControl]="formControl"
        [formlyAttributes]="field"
        (input)="updateTemplateVariables()"
      ></textarea>
      <mat-error *ngIf="formControl.hasError('required')">
        {{ field.props?.label }} is required
      </mat-error>
      <mat-error *ngIf="formControl.hasError('pattern')">
        Invalid format
      </mat-error>
    </mat-form-field>
    <div class="template-variable-preview" *ngIf="shouldShowTemplateVariables">
      <div class="template-variable-heading">Detected variables</div>
      <div class="template-variable-list" *ngIf="templateVariables.length; else noTemplateVariables">
        <span class="template-variable-chip" *ngFor="let variable of templateVariables">
          {{ variable }}
        </span>
      </div>
      <ng-template #noTemplateVariables>
        <div class="template-variable-empty">No variables detected</div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    :host ::ng-deep .json-textarea-field {
      margin-bottom: 18px;
    }

    :host ::ng-deep .json-textarea-field .mat-mdc-text-field-wrapper,
    :host ::ng-deep .json-textarea-field .mat-mdc-form-field-flex {
      min-height: 360px !important;
      align-items: stretch !important;
    }

    :host ::ng-deep .json-textarea-field .mat-mdc-form-field-infix {
      min-height: 360px !important;
      padding-top: 24px !important;
      padding-bottom: 12px !important;
      align-items: stretch !important;
    }

    .json-textarea-input {
      min-height: 320px !important;
      height: 320px !important;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
      line-height: 1.45 !important;
      font-family: Consolas, Monaco, 'Courier New', monospace !important;
      font-size: 13px !important;
      resize: vertical;
      white-space: pre;
      overflow: auto !important;
    }

    .template-variable-preview {
      margin-top: -12px;
      margin-bottom: 16px;
    }

    .template-variable-heading {
      color: #5f6368;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .template-variable-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .template-variable-chip {
      background: #eef3ff;
      border: 1px solid #c9d8ff;
      border-radius: 999px;
      color: #244a9b;
      font-size: 12px;
      line-height: 1;
      padding: 6px 10px;
      word-break: break-word;
    }

    .template-variable-empty {
      color: #8a8f98;
      font-size: 12px;
    }
  `],
})
export class MatTextareaInput extends FieldType<any> implements OnInit, OnDestroy {
  templateVariables: string[] = [];
  private valueChangesSubscription?: Subscription;

  get shouldShowTemplateVariables(): boolean {
    return !!this.field.props?.['detectTemplateVariables'];
  }

  ngOnInit(): void {
    this.updateTemplateVariables();
    this.valueChangesSubscription = this.formControl.valueChanges.subscribe(() => {
      this.updateTemplateVariables();
    });
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  updateTemplateVariables(): void {
    if (!this.shouldShowTemplateVariables) {
      this.templateVariables = [];
      return;
    }

    const value = `${this.formControl.value || ''}`;
    const variables: string[] = [];
    const seen = new Set<string>();
    const matcher = /{{\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*}}/g;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(value)) !== null) {
      const variable = match[1];
      if (!seen.has(variable)) {
        seen.add(variable);
        variables.push(variable);
      }
    }

    this.templateVariables = variables;
  }
}
