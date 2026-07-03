import { Component, OnInit, Inject, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PaymentService } from '../../../payment/service/payment.service';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-case-payment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div class="payment-dialog-container animate-fade-in" style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-radius: 16px;">
      
      <!-- Close button -->
      <div style="width: 100%; display: flex; justify-content: flex-end; margin-top: -0.5rem; margin-right: -0.5rem;">
        <mat-icon style="cursor: pointer; color: #6b7280;" (click)="close()">close</mat-icon>
      </div>

      <!-- Icon with glow -->
      <div class="payment-icon-glow" style="background: rgba(99, 102, 241, 0.1); border: 2px solid #6366f1; color: #6366f1; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 0 20px rgba(99, 102, 241, 0.25);">
        💳
      </div>

      @if (loading) {
        <div style="padding: 2rem 0; color: #4b5563; font-weight: 600; font-size: 0.95rem;">
          Retrieving payment details...
        </div>
      } @else if (errorMsg) {
        <div style="padding: 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem; align-items: center;">
          <mat-icon color="warn" style="font-size: 2.5rem; width: 40px; height: 40px;">error</mat-icon>
          <div style="color: #ef4444; font-weight: 600;">{{ errorMsg }}</div>
        </div>
      } @else {
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.5px;">Case Payment Pending</h2>
          <p style="color: #6b7280; font-size: 0.85rem; margin-top: 0.35rem; font-weight: 500;">
            Case Reference: <span style="font-family: monospace; color: #374151; font-weight: 700; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">{{ orderDetails?.case_no }}</span>
          </p>
        </div>

        <!-- Amount Display Box -->
        <div style="background: linear-gradient(135deg, rgba(249, 250, 251, 0.8), rgba(243, 244, 246, 0.8)); border: 1px solid rgba(229, 231, 235, 0.7); border-radius: 12px; padding: 1.25rem; width: 100%; max-width: 300px; display: flex; flex-direction: column; gap: 0.25rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <span style="font-size: 0.8rem; color: #4b5563; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Amount to Pay</span>
          <span style="font-size: 2.25rem; font-weight: 900; color: #1f2937; letter-spacing: -1px; line-height: 1;">
            {{ getCurrencySymbol(orderDetails?.currency) }}{{ orderDetails?.total_amount | number:'1.2-2' }}
          </span>
          <span style="font-size: 0.7rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Currency: {{ orderDetails?.currency }}</span>
        </div>

        <!-- Gateway Selector -->
        <div style="width: 100%; max-width: 300px; display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem;">
          <label style="font-size: 0.8rem; font-weight: 600; color: #374151;">Select Payment Gateway</label>
          <select [(ngModel)]="selectedGateway" style="width: 100%; padding: 0.65rem; border-radius: 8px; border: 1px solid #d1d5db; background-color: white; color: #111827; font-size: 0.85rem; font-weight: 600; outline: none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer;">
            <option value="cashfree">Cashfree Payments</option>
            <option value="stripe">Stripe Checkout</option>
          </select>
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: 0.65rem; width: 100%; max-width: 300px; margin-top: 0.25rem;">
          <button (click)="payNow()" [disabled]="paying" class="btn-pay-now" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: none; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-weight: 700; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35); transition: all 0.2s ease;">
            {{ paying ? 'Connecting to Gateway...' : 'Pay Now' }}
          </button>
          <button (click)="close()" [disabled]="paying" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #d1d5db; background: transparent; color: #4b5563; font-weight: 700; font-size: 0.875rem; cursor: pointer;">
            Cancel & Pay Later
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class CasePaymentDialogComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private dialogService = inject(DialogService);
  private cdr = inject(ChangeDetectorRef);

  orderDetails: any = null;
  loading = true;
  errorMsg = '';
  selectedGateway = 'cashfree';
  paying = false;

  constructor(
    public dialogRef: MatDialogRef<CasePaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { caseId: string }
  ) {}

  ngOnInit(): void {
    if (!this.data?.caseId) {
      this.errorMsg = 'No Case ID provided';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.paymentService.getOrderByCase(this.data.caseId).subscribe({
      next: (res: any) => {
        this.orderDetails = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error('Failed to load order:', err);
        this.errorMsg = err.error?.error || 'Failed to retrieve payment details';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    return symbols[currency] || currency;
  }

  payNow(): void {
    if (!this.orderDetails?.order_id) return;
    this.paying = true;

    this.paymentService.initiatePayment(
      this.orderDetails.order_id,
      this.selectedGateway,
      this.orderDetails.case_id
    ).subscribe({
      next: (res: any) => {
        if (res && res.checkout_url) {
          window.location.href = res.checkout_url;
        } else {
          this.dialogService.openSnackBar('Failed to initiate payment: no checkout URL returned');
          this.paying = false;
        }
      },
      error: (err: any) => {
        console.error('Payment initiation failed:', err);
        this.dialogService.openSnackBar(err.error?.error || 'Error initiating payment');
        this.paying = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
