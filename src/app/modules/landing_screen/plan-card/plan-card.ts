import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { FeatureComparisonComponent } from './feature-comparison.component';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-plan-card',
  standalone: true,
  imports: [CommonModule, FeatureComparisonComponent, TranslateModule],
  templateUrl: './plan-card.html',
  styleUrl: './plan-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush, // ← explicit, works with manual detectChanges
})
export class PlanCardComponent implements OnInit {

  @Input() isSelectionMode: boolean = false;
  
  private _selectedPlanId: string = '';

  @Input()
  set selectedPlanId(val: string) {
    if (val) {
      this._selectedPlanId = val;
    }
  }

  get selectedPlanId(): string {
    return this._selectedPlanId;
  }

  @Output() planSelected = new EventEmitter<any>();

  plans: any[] = [];
  categories: any[] = [];
  services: any[] = [];
  showComparisonDrawer = false;
  loading = true;

  constructor(
    private subscriptionService: SubscriptionService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  openComparisonDrawer(plan: any): void {
    this.selectedPlanId = plan.id;
    this.showComparisonDrawer = true;
    this.cdr.markForCheck();
  }

  closeComparisonDrawer(): void {
    this.showComparisonDrawer = false;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadMasterData();
  }

  loadMasterData(): void {
    this.loading = true;

    forkJoin({
      plans: this.subscriptionService.getPlans(),
      categories: this.subscriptionService.getCategories(),
      services: this.subscriptionService.getServices()
    }).subscribe({
      next: (res: any) => {
        const allServices = res.services || [];

        const mapped = (res.plans || [])
          .filter((p: any) => p.status === 'active')
          .map((plan: any) => {
            const planFeatures = allServices
              .filter((s: any) => {
                const ids = this.safeParse(s.plan_id, []);
                return Array.isArray(ids) && ids.includes(plan.id);
              })
              .map((s: any) => s.name);

            const currencySymbol: Record<string, string> = {
              INR: '₹',
              USD: '$',
              EUR: '€'
            };

            return {
              id: plan.id,
              name: plan.name,
              tagline: plan.description || '',
              badge: plan.tag || null,
              highlighted: plan.is_default,
              features: planFeatures,
              price: plan.price ?? 0,
              currency: currencySymbol[plan.currency] ?? plan.currency,
              rawCurrency: plan.currency,
              preference: plan.preference ?? 0
            };
          })
          .sort((a: any, b: any) => a.preference - b.preference);

        this.plans = [...mapped];
        this.categories = res.categories || [];
        this.services = res.services || [];

        // Set default selected plan ID
        if (!this.selectedPlanId) {
          const defaultPlan = this.plans.find((p: any) => p.highlighted) || this.plans[0];
          if (defaultPlan) {
            this.selectedPlanId = defaultPlan.id;
            this.planSelected.emit(defaultPlan);
          }
        } else {
          const currentPlan = this.plans.find((p: any) => p.id === this.selectedPlanId);
          if (currentPlan) {
            this.planSelected.emit(currentPlan);
          }
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
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

  selectPlan(plan: any): void {
    this.selectedPlanId = plan.id;
    this.cdr.markForCheck();
    if (this.isSelectionMode) {
      this.planSelected.emit(plan);
    } else {
      this.router.navigate(['/iam/login'], {
        queryParams: {
          type: 'register'
        }
      });
    }
  }
}

