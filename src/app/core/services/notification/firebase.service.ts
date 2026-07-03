import { inject, Injectable } from '@angular/core';
import { initializeApp } from "firebase/app";
import { environment } from "../../../../environments/environment";
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../data.service';
import { HelperService } from '../utils/helper.service';
import { DialogService } from '../dialog.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { LoginService } from '../login.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseServices {
  private app = initializeApp(environment.firebaseConfig);
  private auth = getAuth(this.app);
  private googleProvider = new GoogleAuthProvider();
  private loginService = inject(LoginService);
  private dialogService = inject(DialogService);
  private route = inject(ActivatedRoute);

  constructor(
    private router: Router,
    private dataservice: DataService
  ) { }

  signInWithGoogle(qr: any) {
    return new Promise((resolve) => {
      signInWithPopup(this.auth, this.googleProvider)
        .then((result) => {
          // Get user info
          const user = result.user;
          console.log("User Info:", user);
          this.signIn(result, qr);
          resolve(true); // Sign-in successful
        })
        .catch((error) => {
          console.error("Error during sign-in:", error);
          resolve(false); // Sign-in failed
        });
    });
  }

  signIn(data: any, qr: any) {
    let tokenRes = data["_tokenResponse"];
    const displayName = tokenRes["displayName"] || tokenRes["email"];
    let payload: any = {
      email_id: tokenRes["email"],
      name: displayName,
      profile_image: tokenRes["photoUrl"],
      provide_id: tokenRes["providerId"],
      provide_by: "google",
      role: "USER"
    };
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.dataservice.ssouserRegister(payload, qr).subscribe((res: any) => {
      // Note: The HTTP client response or backend payload maps 200/201 success.
      // Wait, in Go we return StatusOK (200) for SSO verify. So res can be initialized directly.
      this.loginService.Init(res, returnUrl);
    }, (error: any) => {
      const err = error['error'];
      if (err?.['acceptance']) {
        this.router.navigateByUrl(`/authorize/${err.userId}`);
      } else {
        const msg = err?.error || err?.message || 'SSO login failed. Please try again.';
        console.error('SSO verify error:', error);
        this.dialogService.openSnackBar(msg);
      }
    });
  }
}
