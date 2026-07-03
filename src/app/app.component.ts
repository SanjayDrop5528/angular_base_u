import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { FcmService } from './core/services/notification/fcm.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'synapse';

  constructor(
    private authService: AuthService,
    private translateService: TranslateService,
    private fcmService: FcmService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      const lang = user?.language || (typeof window !== 'undefined' ? localStorage.getItem('language') : null) || 'en';
      const langMap: { [key: string]: string } = {
        'en': 'english',
        'hi': 'hindi',
        'ta': 'tamil',
        'mr': 'marathi',
        'ne': 'nepali',
        'ms': 'malay'
      };
      const translateLang = langMap[lang] || lang;
      this.translateService.use(translateLang);

      if (user) {
        this.fcmService.requestPermission();
        this.fcmService.listenForMessages();
      }
    });
  }
}
