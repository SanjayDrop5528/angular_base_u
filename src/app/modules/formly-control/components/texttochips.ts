import { COMMA, ENTER } from "@angular/cdk/keycodes";
import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    ViewChild,
} from "@angular/core";
import { FormControl } from "@angular/forms";
import { FieldType } from "@ngx-formly/core";
 import { Observable } from "rxjs"; 
import { DataService } from "../../../core/services/data.service";
@Component({
    selector: "domain-input",standalone:false,
    template: `
    <style>
      .mat-chip-list-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 4px; /* Adjust as needed */
    }
    
    .mat-chip {
    max-width: 200px; /* Set the maximum width for each chip */
    white-space: nowrap; /* Prevent text from wrapping */
    overflow: hidden;
    text-overflow: ellipsis; /* Add ellipsis if text overflows */
    }
    
    </style>
    <div class="mat-chip-list-wrapper">
      <mat-form-field>
        <mat-label class="form-label">{{to.label}}</mat-label>
        <mat-chip-grid #chipGrid required>
          @for (value of domain; track value; let i = $index) {
            <mat-chip-row (removed)="remove(value)">
              <div (click)="domainClick(value, i)">
                {{value}}
                @if (!to.readonly) {
                  <button matChipRemove>
                    <mat-icon>cancel</mat-icon>
                  </button>
                }
              </div>
            </mat-chip-row>
          }
        </mat-chip-grid>
        <input [readonly]="to.readonly" #domainInput [matAutocomplete]="auto" required
          [matChipInputFor]="chipGrid"
          [matChipInputSeparatorKeyCodes]="separatorKeysCodes" [matChipInputAddOnBlur]="true"
          (matChipInputTokenEnd)="add($event)"
          [placeholder]="to?.['placeholder']"/>
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selected($event)">
          @for (domain of filterDomain | async; track domain) {
            <mat-option [value]="domain">
              {{domain}}
            </mat-option>
          }
        </mat-autocomplete>
        @if (this?.formControl?.touched && this?.formControl?.errors?.required) {
          <mat-error>
            {{ this.field.props?.label  }} is required
          </mat-error>
        }
    
        @if (this?.formControl?.touched && this?.formControl?.errors?.pattern) {
          <mat-error>
            {{ this.field.props?.label }} does not match the pattern
          </mat-error>
        }
      </mat-form-field>
    
    </div>
    `,
})
export class TexttoChips extends FieldType<any>   {
    @ViewChild('domainInput') domainInput!: ElementRef<HTMLInputElement>;
    value:any
    constructor(public dataService: DataService) {
        super();
    }
    separatorKeysCodes: number[] = [ENTER, COMMA]

    filterDomain!: Observable<string[]>;
    domain: string[] = []
   
    public get thisFormControl() {
        return this.formControl as FormControl;
    } 

    private setJson(): void {
        this.formControl.setValue(this.domain.join(','));
    }

    add(event: any): void {
        const value = (event.value || '').trim();
        if (!this.domain.includes(value) && value) {
            this.domain.push(value);
        }
        event.chipInput!.clear();
        this.setJson();
    }

    selected(event: any): void {
        this.domain.push(event.option.viewValue);
        this.domainInput.nativeElement.value = '';
        this.setJson();
    }

    remove(domain: string): void {
        const index = this.domain.indexOf(domain);
        if (index >= 0) this.domain.splice(index, 1);
        this.setJson();
    }

    domainClick(valeu: any, index: any) {
        if (this.to?.['readonly']) return;
        this.domain.splice(index, 1);
        this.domainInput.nativeElement.value = valeu;
        this.setJson();
    }

    private loadFromModel(): void {
        const raw = this.model[this.field.key as string];
        if (!raw) return;
        try {
            if (typeof raw === 'string') {
                // support both comma-string and legacy JSON array
                this.domain = raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else {
                this.domain = raw;
            }
        } catch {
            this.domain = [];
        }
        this.formControl.setValue(this.domain.join(','));
    }

    ngOnInit(): void {
        this.loadFromModel();
    }

    ngAfterViewInit(): void {
        this.loadFromModel();
    }
}