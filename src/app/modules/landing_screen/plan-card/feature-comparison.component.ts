import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-feature-comparison',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="comparison-container" *ngIf="plans && plans.length > 0">
      
      <div class="table-wrapper">
        <table class="compare-table">
          <thead>
            <tr>
              <th>{{ 'LANDING.PRICING.FEATURES' | translate }}</th>
              <!-- Highlighted Selected Plan Column -->
              <th class="selected-plan-col text-center" style="width: 25%;">
                {{ selectedPlan?.name }}
                <span class="selected-badge">{{ 'LANDING.PRICING.SELECTED' | translate }}</span>
              </th>
              <!-- Other plans sorted by order -->
              <th *ngFor="let plan of otherPlans" class="text-center" style="width: 25%;">
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let group of groupedFeatures">
              <!-- Category Header Row -->
              <tr class="category-row">
                <td [attr.colspan]="2 + otherPlans.length" class="category-title">
                  {{ group.categoryName }}
                </td>
              </tr>
              <!-- Individual Features (Services) in this Category -->
              <tr *ngFor="let feat of group.features" class="feature-row">
                <td class="feature-name">{{ feat.name }}</td>
                <!-- Selected Plan status -->
                <td class="selected-plan-col status-cell">
                  <span *ngIf="hasFeature(feat.planIds, selectedPlanId)" class="check-icon">✓</span>
                  <span *ngIf="!hasFeature(feat.planIds, selectedPlanId)" class="cross-icon">✗</span>
                </td>
                <!-- Other plans status -->
                <td *ngFor="let plan of otherPlans" class="status-cell">
                  <span *ngIf="hasFeature(feat.planIds, plan.id)" class="check-icon">✓</span>
                  <span *ngIf="!hasFeature(feat.planIds, plan.id)" class="cross-icon">✗</span>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .comparison-container {
      margin-top: 1rem;
      width: 100%;
      text-align: left;
    }

    .table-wrapper {
      overflow-x: auto;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    }

    .compare-table {
      width: 100%;
      border-collapse: collapse;
      font-family: inherit;
    }

    .compare-table th, 
    .compare-table td {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    .compare-table th {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.01);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .selected-plan-col {
      background: rgba(13, 148, 136, 0.06);
      border-left: 1px solid rgba(13, 148, 136, 0.2);
      border-right: 1px solid rgba(13, 148, 136, 0.2);
    }

    th.selected-plan-col {
      color: var(--text-main) !important;
      font-weight: 800 !important;
      border-top: 1px solid rgba(13, 148, 136, 0.2);
    }

    .category-row {
      background: rgba(255, 255, 255, 0.03);
    }

    .category-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--primary-color);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .feature-row {
      transition: background 0.2s;
    }

    .feature-row:hover {
      background: rgba(255, 255, 255, 0.01);
    }

    .feature-name {
      font-size: 0.9rem;
      color: var(--text-main);
      font-weight: 500;
    }

    .status-cell {
      text-align: center;
    }

    .check-icon {
      color: #10b981;
      font-weight: 900;
      font-size: 1.15rem;
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    }

    .cross-icon {
      color: #ef4444;
      font-weight: 900;
      font-size: 1.15rem;
      opacity: 0.35;
    }

    .selected-badge {
      display: inline-block;
      font-size: 0.6rem;
      background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
      color: #ffffff;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      margin-left: 0.5rem;
      text-transform: uppercase;
      font-weight: 800;
      vertical-align: middle;
      box-shadow: 0 2px 6px rgba(13, 148, 136, 0.4);
    }

    .text-center {
      text-align: center;
    }

    /* Light Mode Theme overrides */
    :host-context([data-theme='morning']) .table-wrapper,
    :host-context(app-landing-page) .table-wrapper {
      background: rgba(0, 0, 0, 0.01);
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
    }

    :host-context([data-theme='morning']) .compare-table th, 
    :host-context([data-theme='morning']) .compare-table td,
    :host-context(app-landing-page) .compare-table th, 
    :host-context(app-landing-page) .compare-table td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    :host-context([data-theme='morning']) .compare-table th,
    :host-context(app-landing-page) .compare-table th {
      background: rgba(0, 0, 0, 0.01);
    }

    :host-context([data-theme='morning']) .selected-plan-col,
    :host-context(app-landing-page) .selected-plan-col {
      background: rgba(26, 115, 232, 0.04);
      border-left: 1px solid rgba(26, 115, 232, 0.1);
      border-right: 1px solid rgba(26, 115, 232, 0.1);
    }

    :host-context([data-theme='morning']) th.selected-plan-col,
    :host-context(app-landing-page) th.selected-plan-col {
      border-top: 1px solid rgba(26, 115, 232, 0.1);
    }

    :host-context([data-theme='morning']) .category-row,
    :host-context(app-landing-page) .category-row {
      background: rgba(0, 0, 0, 0.02);
    }

    :host-context([data-theme='morning']) .feature-row:hover,
    :host-context(app-landing-page) .feature-row:hover {
      background: rgba(0, 0, 0, 0.005);
    }
  `]
})
export class FeatureComparisonComponent {
  @Input() plans: any[] = [];
  @Input() categories: any[] = [];
  @Input() services: any[] = [];
  @Input() selectedPlanId: string = '';

  get selectedPlan(): any {
    return (this.plans || []).find(p => p.id === this.selectedPlanId);
  }

  get otherPlans(): any[] {
    return (this.plans || [])
      .filter(p => p.id !== this.selectedPlanId)
      .sort((a, b) => (a.preference || 0) - (b.preference || 0));
  }

  get groupedFeatures(): any[] {
    if (!this.categories || !this.services) return [];
    return this.categories
      .map(cat => {
        const catServices = this.services.filter(s => s.category_id === cat.id);
        return {
          categoryName: cat.name,
          features: catServices.map(s => ({
            name: s.name,
            planIds: this.safeParse(s.plan_id, [])
          }))
        };
      })
      .filter(group => group.features.length > 0);
  }

  hasFeature(planIds: string[], planId: string): boolean {
    return Array.isArray(planIds) && planIds.includes(planId);
  }

  private safeParse(val: any, fallback: any): any {
    if (Array.isArray(val)) return val;
    if (!val) return fallback;
    try {
      const parsed = JSON.parse(val);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }
}
