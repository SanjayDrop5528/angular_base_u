import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private authService = inject(AuthService);
  private router = inject(Router);

  Init(res: any, returnUrl?: string) {
    if (res && res.token) {
      this.authService.setSession(res.token, res.user);
      this.authService.setOrg(null);
      this.router.navigateByUrl(returnUrl || '/home');
    }
  }
}
