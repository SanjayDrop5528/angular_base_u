import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMgmtService } from '../service/user-mgmt.service';
import { DialogService } from '../../../core/services/dialog.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CoreGrid, GridOutputEvent } from '../../shared/components/core-grid/core-grid';
import { CardSchema } from '../../shared/components/core-card/core-card';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, CoreGrid, TranslateModule],
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css']
})
export class SessionsComponent implements OnInit {
  @ViewChild('sessionsGrid') sessionsGrid!: CoreGrid;
  activeSessions: any[] = [];
  blockedIPs: any[] = [];

  /** Card schema for mobile / card view of active sessions */
  sessionsCardSchema: CardSchema = {
    titleKey: 'email',
    fields: [
      { key: 'ip',          label: 'SESSIONS.LABEL_IP',  type: 'text' },
      { key: 'device_type', label: 'SESSIONS.LABEL_DEVICE',      type: 'text' },
      { key: 'user_agent',  label: 'SESSIONS.LABEL_USER_AGENT',  type: 'text', span: 2 },
      { key: 'last_active', label: 'SESSIONS.LABEL_LAST_ACTIVE', type: 'date',
        dateFormat: 'dd MMM yyyy, HH:mm' },
    ],
    actions: [
      { label: 'SESSIONS.ACTION_TERMINATE', icon: 'logout',  action: 'terminate', color: 'warn'   },
      { label: 'SESSIONS.ACTION_BLOCK_IP',  icon: 'block',   action: 'block_ip',  color: 'warn'   },
    ],
  };

  constructor(
    private apiService: UserMgmtService,
    private dialogService: DialogService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.fetchActiveSessions();
    this.fetchBlockedIPs();
  }

  private transformSessionForGrid(session: any): any {
    return {
      ...session,
      _id: session.id ?? session._id,
      email: session.user_email || session.email,
      ip: session.ip_address,
      last_active: session.login_at,
    };
  }

  fetchActiveSessions(): void {
    this.apiService.getSessions().subscribe({
      next: (res) => {
        this.activeSessions = (res || []).map((session: any) => this.transformSessionForGrid(session));
      }
    });
  }

  fetchBlockedIPs(): void {
    this.apiService.getBlockedIPs().subscribe({
      next: (res) => {
        this.blockedIPs = res || [];
      }
    });
  }

  terminateSession(sessionId: string): void {
    this.dialogService.confirmationBox(this.translateService.instant('SESSIONS.CONFIRM_TERMINATE')).afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      this.apiService.deactivateSession(sessionId).subscribe({
        next: () => {
          this.dialogService.openSnackBar(this.translateService.instant('SESSIONS.SNACK_TERMINATED'));
          this.fetchActiveSessions();
        },
        error: (err) => {
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('SESSIONS.ERR_TERMINATE'));
        }
      });
    });
  }

  restrictIP(ipAddress: string): void {
    const reason = prompt(this.translateService.instant('SESSIONS.PROMPT_BLOCK_IP_REASON') + `: ${ipAddress}`);
    if (reason === null) return; // cancelled

    this.apiService.blockIP(ipAddress, reason || this.translateService.instant('SESSIONS.DEFAULT_BLOCK_REASON')).subscribe({
      next: () => {
        this.dialogService.openSnackBar(this.translateService.instant('SESSIONS.SNACK_BLOCKED'));
        this.fetchActiveSessions();
        this.fetchBlockedIPs();
      },
      error: (err) => {
        this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('SESSIONS.ERR_BLOCK'));
      }
    });
  }

  onGridAction(event: GridOutputEvent): void {
    const action = event.Action || (event as any).action;
    const data = event.data;
    switch (action) {
      case 'Refresh':
      case 'refresh':
        this.fetchActiveSessions();
        this.fetchBlockedIPs();
        break;
      case 'terminate':
        this.terminateSession(data.id || data._id);
        break;
      case 'block_ip':
        this.restrictIP(data.ip || data.ip_address);
        break;
      default:
        break;
    }
  }

  /** Adapter: maps core-card action strings to onGridAction format */
  onCardAction(event: any): void {
    this.onGridAction({
      Action: event.action || event.Action,
      Source: 'Grid',
      data: event.data
    });
  }

  onDeleteRequest(session: any): void {
    this.terminateSession(session.id || session._id);
  }

  removeIPRestriction(id: string): void {
    this.dialogService.confirmationBox(this.translateService.instant('SESSIONS.CONFIRM_UNBLOCK')).afterClosed().subscribe((confirm) => {
      if (!confirm) return;

      this.apiService.unblockIP(id).subscribe({
        next: () => {
          this.dialogService.openSnackBar(this.translateService.instant('SESSIONS.SNACK_UNBLOCKED'));
          this.fetchBlockedIPs();
        },
        error: (err) => {
          this.dialogService.openSnackBar(err.error?.error || this.translateService.instant('SESSIONS.ERR_UNBLOCK'));
        }
      });
    });
  }
}

