import {
  Component,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  HostListener,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlanCardComponent } from '../plan-card/plan-card';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';

interface StatItem {
  label: string;
  labelKey: string;
  target: number;
  current: number;
  suffix: string;
  prefix: string;
}

interface Feature {
  icon: string;
  title: string;
  titleKey: string;
  description: string;
  descriptionKey: string;
}

interface Doctor {
  name: string;
  specialty: string;
  specialtyKey: string;
  experience: string;
  experienceKey: string;
  rating: number;
  avatar: string;
}

interface Hospital {
  name: string;
  location: string;
  locationKey: string;
  rating: number;
  tags: string[];
  tagKeys: string[];
  image: string;
}

interface PricingPlan {
  name: string;
  badge?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

interface Review {
  text: string;
  textKey: string;
  author: string;
  role: string;
  roleKey: string;
  avatar: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, PlanCardComponent, TranslateModule],
  templateUrl: './landig-page.html',
  styleUrl: './landig-page.scss',
})
export class LandingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('statSection') statSection!: QueryList<ElementRef>;

  currentThemeMode: 'night' | 'morning' = 'night';
  private themeSubscription?: Subscription;

  mobileMenuOpen = false;
  mobileLangOpen = false;
  statsAnimated = false;
  activeNavLink = 'home';
  isScrolled = false;
  currentYear = new Date().getFullYear();

  //constructor(private subscriptionService: SubscriptionService) { }

  stats: StatItem[] = [
    { label: 'Patients Served', labelKey: 'LANDING.STATS.PATIENTS', target: 50000, current: 0, suffix: '+', prefix: '' },
    { label: 'Specialist Doctors', labelKey: 'LANDING.STATS.DOCTORS', target: 1000, current: 0, suffix: '+', prefix: '' },
    { label: 'Partner Hospitals', labelKey: 'LANDING.STATS.HOSPITALS', target: 100, current: 0, suffix: '+', prefix: '' },
    { label: 'Patient Satisfaction', labelKey: 'LANDING.STATS.SATISFACTION', target: 98, current: 0, suffix: '%', prefix: '' },
  ];

  features: Feature[] = [
    {
      icon: '🎥',
      title: 'Online Consultation',
      titleKey: 'LANDING.FEATURE_ITEMS.ONLINE.TITLE',
      description:
        'Meet certified doctors through secure video consultations and receive expert medical advice from anywhere.',
      descriptionKey: 'LANDING.FEATURE_ITEMS.ONLINE.DESC',
    },
    {
      icon: '🚗',
      title: 'Medical Travel Assistance',
      titleKey: 'LANDING.FEATURE_ITEMS.TRAVEL.TITLE',
      description:
        'Book transportation for hospital visits and medical appointments directly through the platform.',
      descriptionKey: 'LANDING.FEATURE_ITEMS.TRAVEL.DESC',
    },
    {
      icon: '👤',
      title: 'Healthcare Buddy',
      titleKey: 'LANDING.FEATURE_ITEMS.BUDDY.TITLE',
      description:
        'A dedicated companion who assists patients with appointments, documentation, travel, and ongoing support.',
      descriptionKey: 'LANDING.FEATURE_ITEMS.BUDDY.DESC',
    },
    {
      icon: '🔒',
      title: 'Secure Health Records',
      titleKey: 'LANDING.FEATURE_ITEMS.RECORDS.TITLE',
      description:
        'All patient data is encrypted and securely stored with advanced privacy protection.',
      descriptionKey: 'LANDING.FEATURE_ITEMS.RECORDS.DESC',
    },
    {
      icon: '⚡',
      title: 'Fast Response',
      titleKey: 'LANDING.FEATURE_ITEMS.RESPONSE.TITLE',
      description:
        'Quick appointment scheduling and rapid support whenever you need medical assistance.',
      descriptionKey: 'LANDING.FEATURE_ITEMS.RESPONSE.DESC',
    },
    {
      icon: '🕐',
      title: '24/7 Support',
      titleKey: 'LANDING.FEATURE_ITEMS.SUPPORT.TITLE',
      description:
        'Round-the-clock healthcare support for patients and caregivers.',
      descriptionKey: 'LANDING.FEATURE_ITEMS.SUPPORT.DESC',
    },
  ];

  specialties = [
    { icon: '🩸', name: 'Diabetes', nameKey: 'LANDING.SPECIALTY_ITEMS.DIABETES' },
    { icon: '❤️', name: 'Blood Pressure', nameKey: 'LANDING.SPECIALTY_ITEMS.BLOOD_PRESSURE' },
    { icon: '💓', name: 'Heart Disease', nameKey: 'LANDING.SPECIALTY_ITEMS.HEART_DISEASE' },
    { icon: '🫁', name: 'Asthma', nameKey: 'LANDING.SPECIALTY_ITEMS.ASTHMA' },
    { icon: '🦴', name: 'Arthritis', nameKey: 'LANDING.SPECIALTY_ITEMS.ARTHRITIS' },
    { icon: '⚖️', name: 'Obesity', nameKey: 'LANDING.SPECIALTY_ITEMS.OBESITY' },
    { icon: '🦋', name: 'Thyroid', nameKey: 'LANDING.SPECIALTY_ITEMS.THYROID' },
    { icon: '🧠', name: 'Migraine', nameKey: 'LANDING.SPECIALTY_ITEMS.MIGRAINE' },
  ];

  hospitals: Hospital[] = [
    {
      name: 'Apex Multi-Specialty',
      location: 'Mumbai, India',
      locationKey: 'LANDING.HOSPITAL_ITEMS.APEX.LOCATION',
      rating: 4.9,
      tags: ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics'],
      tagKeys: ['LANDING.TAGS.CARDIOLOGY', 'LANDING.TAGS.ONCOLOGY', 'LANDING.TAGS.NEUROLOGY', 'LANDING.TAGS.ORTHOPEDICS'],
      image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&q=80',
    },
    {
      name: 'Greenfield Medical Center',
      location: 'Bengaluru, India',
      locationKey: 'LANDING.HOSPITAL_ITEMS.GREENFIELD.LOCATION',
      rating: 4.8,
      tags: ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics'],
      tagKeys: ['LANDING.TAGS.CARDIOLOGY', 'LANDING.TAGS.ONCOLOGY', 'LANDING.TAGS.NEUROLOGY', 'LANDING.TAGS.ORTHOPEDICS'],
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80',
    },
    {
      name: 'Sunrise Premier Hospital',
      location: 'Delhi NCR, India',
      locationKey: 'LANDING.HOSPITAL_ITEMS.SUNRISE.LOCATION',
      rating: 4.9,
      tags: ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics'],
      tagKeys: ['LANDING.TAGS.CARDIOLOGY', 'LANDING.TAGS.ONCOLOGY', 'LANDING.TAGS.NEUROLOGY', 'LANDING.TAGS.ORTHOPEDICS'],
      image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&q=80',
    },
  ];

  doctors: Doctor[] = [
    {
      name: 'Dr. Priya Sharma',
      specialty: 'Endocrinologist',
      specialtyKey: 'LANDING.DOCTOR_ITEMS.ENDOCRINOLOGIST',
      experience: '12 yrs experience',
      experienceKey: 'LANDING.DOCTOR_ITEMS.EXP_12',
      rating: 4.9,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80',
    },
    {
      name: 'Dr. Arjun Mehta',
      specialty: 'Cardiologist',
      specialtyKey: 'LANDING.DOCTOR_ITEMS.CARDIOLOGIST',
      experience: '15 yrs experience',
      experienceKey: 'LANDING.DOCTOR_ITEMS.EXP_15',
      rating: 4.8,
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80',
    },
    {
      name: 'Dr. Anika Verma',
      specialty: 'Pulmonologist',
      specialtyKey: 'LANDING.DOCTOR_ITEMS.PULMONOLOGIST',
      experience: '9 yrs experience',
      experienceKey: 'LANDING.DOCTOR_ITEMS.EXP_9',
      rating: 4.9,
      avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300&q=80',
    },
    {
      name: 'Dr. Rajesh Khanna',
      specialty: 'General Physician',
      specialtyKey: 'LANDING.DOCTOR_ITEMS.GENERAL_PHYSICIAN',
      experience: '22 yrs experience',
      experienceKey: 'LANDING.DOCTOR_ITEMS.EXP_22',
      rating: 5.0,
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80',
    },
  ];



  // plans: PricingPlan[] = [
  //   {
  //     name: 'Basic',
  //     tagline: 'Expert opinion',
  //     features: [
  //       'Consultation within 3 days',
  //       '30-minute video consultation',
  //       'Standard specialist assignment',
  //       'Meeting report within 48 hours',
  //       'Download medical report',
  //       'Second consultation within a month',
  //       'Case reviewed by ICMT',
  //     ],
  //     cta: 'Get Started',
  //     highlighted: false,
  //   },
  //   {
  //     name: 'Premium',
  //     badge: 'Most Popular',
  //     tagline: 'Full support',
  //     features: [
  //       'Dedicated Healthcare Buddy',
  //       'Buddy contacts within 24 hours',
  //       'Buddy collects & uploads documents',
  //       'Appointment booking managed',
  //       'AI-assisted doctor matching',
  //       'Video consultation within 48 hours',
  //       'Detailed patient report',
  //       'Travel arrangements on request',
  //       'Dedicated support throughout',
  //     ],
  //     cta: 'Choose Premium',
  //     highlighted: true,
  //   },
  //   {
  //     name: 'Care Journey',
  //     tagline: 'End-to-end',
  //     features: [
  //       '3-Month Comprehensive Program',
  //       'Same Healthcare Buddy throughout',
  //       'Complete treatment coordination',
  //       'Family & caregiver coordination',
  //       'Hospital selection & management',
  //       'Insurance claim guidance',
  //       'Medical travel support',
  //       'Visa assistance',
  //       'Surgery coordination',
  //       'Unlimited care enquiries',
  //     ],
  //     cta: 'Start Your Journey',
  //     highlighted: false,
  //   },
  // ];

  reviews: Review[] = [
    {
      text: 'SynapseMD made it incredibly easy to consult a specialist while caring for my mother. The Healthcare Buddy was a lifesaver.',
      textKey: 'LANDING.REVIEW_ITEMS.RIYA.TEXT',
      author: 'Riya S.',
      role: 'Verified Patient',
      roleKey: 'LANDING.REVIEW_ITEMS.VERIFIED_PATIENT',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    },
    {
      text: 'The platform is seamless and the doctors are exceptional. I got a second opinion from a top cardiologist within 48 hours.',
      textKey: 'LANDING.REVIEW_ITEMS.AHMED.TEXT',
      author: 'Ahmed K.',
      role: 'Verified Patient',
      roleKey: 'LANDING.REVIEW_ITEMS.VERIFIED_PATIENT',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    },
    {
      text: 'From booking to report delivery, everything was handled professionally. The 24/7 support gave me real peace of mind.',
      textKey: 'LANDING.REVIEW_ITEMS.MEERA.TEXT',
      author: 'Meera T.',
      role: 'Verified Patient',
      roleKey: 'LANDING.REVIEW_ITEMS.VERIFIED_PATIENT',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&q=80',
    },
  ];

  navLinks = [
    { id: 'home', label: 'Home', labelKey: 'LANDING.NAV.HOME', href: '#top' },
    { id: 'features', label: 'Features', labelKey: 'LANDING.NAV.FEATURES', href: '#features' },
    { id: 'doctors', label: 'Doctors', labelKey: 'LANDING.NAV.DOCTORS', href: '#doctors' },
    { id: 'hospitals', label: 'Hospitals', labelKey: 'LANDING.NAV.HOSPITALS', href: '#hospitals' },
    { id: 'reviews', label: 'Reviews', labelKey: 'LANDING.NAV.REVIEWS', href: '#reviews' },
  ];

  currentLanguage: any;
  languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ta', label: 'Tamil' },
    { code: 'mr', label: 'Marathi' },
    { code: 'ne', label: 'Nepali' },
    { code: 'ms', label: 'Malay' },
  ];

  private readonly langMap: { [key: string]: string } = {
    en: 'english',
    hi: 'hindi',
    ta: 'tamil',
    mr: 'marathi',
    ne: 'nepali',
    ms: 'malay'
  };

  private observer!: IntersectionObserver;
  private animationFrames: number[] = [];

  constructor(
    private router: Router,
    private translateService: TranslateService,
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    const defaultLang = localStorage.getItem('language') || 'en';
    this.currentLanguage = defaultLang;
    this.translateService.use(this.langMap[defaultLang] || defaultLang);

    this.themeSubscription = this.themeService.themeMode$.subscribe((mode) => {
      this.currentThemeMode = mode;
    });
  }

  changeLanguage(event: any): void {
    const lang = event.target.value;
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
    this.translateService.use(this.langMap[lang] || lang);
    this.mobileLangOpen = false; // close panel after selection on mobile
  }
  selectLanguage(code: string): void {
    this.currentLanguage = code;
    localStorage.setItem('language', code);
    this.translateService.use(this.langMap[code] || code);
    this.mobileLangOpen = false; // collapse panel after picking
  }


  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    this.animationFrames.forEach((id) => cancelAnimationFrame(id));
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  toggleThemeMode(): void {
    this.themeService.toggleThemeMode();
  }


  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 10;

    const sections = ['top', 'features', 'doctors', 'hospitals', 'reviews', 'contact'];

    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();

        if (rect.top <= 80 && rect.bottom >= 0) {
          this.activeNavLink = id === 'top' ? 'home' : id;
        }
      }
    }
  }

  setupIntersectionObserver(): void {
    const statEl = document.getElementById('stats-section');
    if (!statEl) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.statsAnimated) {
            this.statsAnimated = true;
            this.animateCounters();
          }
        });
      },
      { threshold: 0.3 }
    );

    this.observer.observe(statEl);
  }

  animateCounters(): void {
    const duration = 2200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);

      this.stats = this.stats.map((stat) => ({
        ...stat,
        current: Math.floor(eased * stat.target),
      }));

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      } else {
        this.stats = this.stats.map((stat) => ({
          ...stat,
          current: stat.target,
        }));
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  onGetStarted(): void {
    this.scrollTo('#contact');

    this.router.navigate(['/iam/login'], {
      queryParams: {
        type: 'register'
      }
    });
  }
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (!this.mobileMenuOpen) {
      this.mobileLangOpen = false;
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.mobileLangOpen = false;
  }

  toggleMobileLang(): void {
    this.mobileLangOpen = !this.mobileLangOpen;
  }
  goToLogin(): void {
    this.closeMobileMenu();
    this.router.navigate(['/iam/login']);
  }

  scrollTo(href: string): void {
    this.closeMobileMenu();
    const id = href.replace('#', '');
    const el = document.getElementById(id === 'top' ? 'top' : id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  formatCount(stat: StatItem): string {
    if (stat.current >= 1000) {
      return (stat.current / 1000).toFixed(stat.current % 1000 === 0 ? 0 : 1) + 'k';
    }
    return stat.current.toString();
  }

  getStars(rating: number): string[] {
    return Array(5)
      .fill('')
      .map((_, i) => (i < Math.floor(rating) ? 'full' : i < rating ? 'half' : 'empty'));
  }
}
