import { NavItem, NavSection } from './layout.types';

export interface AppNavItem extends NavItem {
  requiredPermission?: {
    module: string;
    submodule: string;
    action: string;
  };
  children?: AppNavItem[];
}

export interface AppNavSection extends NavSection {
  requiredPermission?: {
    module: string;
    submodule: string;
    action: string;
  };
  children: AppNavItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission key reference (must match backend Module._id values exactly)
//
// user-management-module
//   all-users          → list / view / create / edit / delete
//   user-groups        → list / view / create / edit / delete
//   user-roles         → list / view / create / edit / delete
//   user-sessions      → list / deactivate
//   organisation       → view / edit
//
// subscription-module
//   pricing-plans          → list / view / create / edit / delete
//   subscription-config    → list / view / create / edit / delete
//
// notification-module
//   notification-center    → list
//   alerts                 → list / create / edit / delete
//   channels               → list / view / edit
//   notification-history   → list
//
// storage-module
//   storage-dashboard  → list
//   file-explorer      → list / view
//   upload             → create
//   shared-files       → list / view
//   trash              → list / delete
//   storage-reports    → list
//   storage-settings   → view / edit
//
// calendar-module
//   roaster             → list / create / edit / delete
// ─────────────────────────────────────────────────────────────────────────────

// ── Flat nav items (used in sidenav-only mode) ─────────────────────────────
export const defaultNavItems: AppNavItem[] = [
  // ── User Management ──────────────────────────────────────────────────────
  {
    id: 'user-mgmt',
    label: 'MENU_CONFIG.USER_MANAGEMENT',
    icon: 'manage_accounts',
    requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'list' },
    children: [
      {
        id: 'user-mgmt-dashboard',
        label: 'MENU_CONFIG.DASHBOARD',
        icon: 'insights',
        route: '/user-mgmt/dashboard'
      },
      {
        id: 'user-mgmt-members',
        label: 'MENU_CONFIG.MEMBERS_USERS',
        icon: 'people',
        route: '/user-mgmt/members',
        requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'list' }
      },
      {
        id: 'user-mgmt-roles',
        label: 'MENU_CONFIG.ROLES',
        icon: 'badge',
        route: '/user-mgmt/roles',
        requiredPermission: { module: 'user-management-module', submodule: 'user-roles', action: 'list' }
      },
      {
        id: 'user-mgmt-sessions',
        label: 'MENU_CONFIG.SESSION_HISTORY',
        icon: 'history',
        route: '/user-mgmt/sessions',
        requiredPermission: { module: 'user-management-module', submodule: 'user-sessions', action: 'list' }
      },
      {
        id: 'user-mgmt-screens',
        label: 'MENU_CONFIG.SCREENS_CONFIG',
        icon: 'dvr',
        route: '/user-mgmt/screens',
        requiredPermission: { module: 'user-management-module', submodule: 'screens-config', action: 'list' }
      },
      {
        id: 'user-mgmt-prg-modules',
        label: 'MENU_CONFIG.PRG_MODULES',
        icon: 'view_module',
        route: '/user-mgmt/prg-modules',
        requiredPermission: { module: 'user-management-module', submodule: 'prg-modules', action: 'list' }
      },
      {
        id: 'user-mgmt-global-config',
        label: 'MENU_CONFIG.GLOBAL_CONFIGURATION',
        icon: 'settings_suggest',
        route: '/user-mgmt/global-config',
        requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'edit' }
      }
    ]
  },
  // ── Patient Management ─────────────────────────────────────────────────────
  {
    id: 'patient-mgmt-menu',
    label: 'MENU_CONFIG.PATIENTS',
    icon: 'personal_injury',
    children: [
      {
        id: 'patient-mgmt-list',
        label: 'MENU_CONFIG.ALL_PATIENTS',
        icon: 'people_alt',
        route: '/patients'
      }
    ]
  },

  // ── Specialist Management ──────────────────────────────────────────────────
  {
    id: 'specialist-mgmt-menu',
    label: 'MENU_CONFIG.SPECIALISTS',
    icon: 'medical_services',
    // requiredPermission: { module: 'user-management-module', submodule: 'specialists', action: 'list' },
    children: [
      {
        id: 'specialist-mgmt-list',
        label: 'MENU_CONFIG.ALL_SPECIALISTS',
        icon: 'people_alt',
        route: '/specialists',
        requiredPermission: { module: 'user-management-module', submodule: 'specialists', action: 'list' }
      },
      {
        id: 'specialist-approval',
        label: 'MENU_CONFIG.SPECIALIST_APPROVAL',
        icon: 'verified_user',
        route: '/specialists/approval',
        requiredPermission: { module: 'user-management-module', submodule: 'specialists', action: 'list' }
      }
    ]
  },

  // ── Subscriptions ────────────────────────────────────────────────────────
  {
    id: 'subscriptions-menu',
    label: 'MENU_CONFIG.SUBSCRIPTIONS',
    icon: 'card_membership',
    requiredPermission: { module: 'subscription-module', submodule: 'pricing-plans', action: 'list' },
    children: [
      {
        id: 'subs-pricing',
        label: 'MENU_CONFIG.PRICING_PLANS',
        icon: 'payments',
        route: '/subscriptions/pricing',
        requiredPermission: { module: 'subscription-module', submodule: 'pricing-plans', action: 'list' }
      },
      {
        id: 'subs-plans',
        label: 'MENU_CONFIG.MENU_CONFIG',
        icon: 'layers',
        route: '/subscriptions/plans',
        requiredPermission: { module: 'subscription-module', submodule: 'subscription-config', action: 'list' }
      },

      {
        id: 'subs-features',
        label: 'MENU_CONFIG.PLAN_FEATURES',
        icon: 'tune',
        route: '/subscriptions/features',
        requiredPermission: { module: 'subscription-module', submodule: 'subscription-config', action: 'list' }
      }
    ]
  },

  // ── Notification Center ──────────────────────────────────────────────────
  {
    id: 'notifications-menu',
    label: 'MENU_CONFIG.NOTIFICATION_CENTER',
    icon: 'notifications_active',
    requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' },
    children: [
      {
        id: 'notif-channels',
        label: 'MENU_CONFIG.NOTIFICATION_CHANNELS',
        icon: 'rss_feed',
        route: '/notifications/channels',
        requiredPermission: { module: 'notification-module', submodule: 'channels', action: 'list' }
      },
      {
        id: 'notif-events',
        label: 'MENU_CONFIG.NOTIFICATION_EVENTS',
        icon: 'event',
        route: '/notifications/events',
        requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }
      },
      {
        id: 'notif-templates',
        label: 'MENU_CONFIG.NOTIFICATION_TEMPLATES',
        icon: 'description',
        route: '/notifications/templates',
        requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }
      },
      {
        id: 'notif-check',
        label: 'NOTIFICATION_MODULE.CHECK.TITLE',
        icon: 'fact_check',
        route: '/notifications/check',
        requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }
      },
      {
        id: 'notif-delivery-logs',
        label: 'Delivery Logs',
        icon: 'mark_email_read',
        route: '/notifications/delivery-logs',
        requiredPermission: { module: 'notification-module', submodule: 'notification-history', action: 'list' }
      }
    ]
  },

  // ── Calendar (Appointment Management) ────────────────────────────────────
  {
    id: 'calendar',
    label: 'MENU_CONFIG.APPOINTMENT_MANAGEMENT',
    icon: 'calendar_today',
    children: [
      {
        id: 'sec-calendar-roaster',
        label: 'MENU_CONFIG.MY_CALLENDAR',
        icon: 'date_range',
        route: '/roaster/my-calendar',
        requiredPermission: { module: 'roaster-module', submodule: 'roaster', action: 'list' }
      },
      {
        id: 'sec-calendar-roaster-owner',
        label: 'MENU_CONFIG.ROASTER_OWNER',
        icon: 'supervised_user_circle',
        route: '/roaster/roaster-owner',
        requiredPermission: { module: 'roaster-module', submodule: 'roaster-owner', action: 'list' }
      },
      {
        id: 'sec-calendar-booking',
        label: 'MENU_CONFIG.BOOKINGS',
        icon: 'book_online',
        route: '/roaster/reservation',
        requiredPermission: { module: 'roaster-module', submodule: 'buddy-roaster', action: 'list' }
      },
      {
        id: 'sec-calendar-patient-bookings',
        label: 'MENU_CONFIG.MY_BOOKINGS',
        icon: 'receipt_long',
        route: '/roaster/patient-bookings',
        requiredPermission: { module: 'roaster-module', submodule: 'patient-booking', action: 'list' }
      }
    ]
  },

  // ── File Storage ─────────────────────────────────────────────────────────
  {
    id: 'storage-menu',
    label: 'MENU_CONFIG.FILE_STORAGE',
    icon: 'folder',
    requiredPermission: { module: 'storage-module', submodule: 'storage-dashboard', action: 'list' },
    children: [
      {
        id: 'storage-dashboard',
        label: 'MENU_CONFIG.DASHBOARD',
        icon: 'insights',
        route: '/storage',
        requiredPermission: { module: 'storage-module', submodule: 'storage-dashboard', action: 'list' }
      },
      {
        id: 'storage-explorer',
        label: 'MENU_CONFIG.FILE_EXPLORER',
        icon: 'folder_open',
        route: '/storage/files',
        requiredPermission: { module: 'storage-module', submodule: 'file-explorer', action: 'list' }
      },
      {
        id: 'storage-upload',
        label: 'MENU_CONFIG.UPLOAD_FILES',
        icon: 'cloud_upload',
        route: '/storage/upload',
        requiredPermission: { module: 'storage-module', submodule: 'upload', action: 'create' }
      },
      {
        id: 'storage-shared',
        label: 'MENU_CONFIG.SHARED_FILES',
        icon: 'share',
        route: '/storage/shared',
        requiredPermission: { module: 'storage-module', submodule: 'shared-files', action: 'list' }
      },
      {
        id: 'storage-trash',
        label: 'MENU_CONFIG.TRASH_BIN',
        icon: 'delete',
        route: '/storage/trash',
        requiredPermission: { module: 'storage-module', submodule: 'trash', action: 'list' }
      },
      {
        id: 'storage-reports',
        label: 'MENU_CONFIG.AUDIT_REPORTS',
        icon: 'assignment',
        route: '/storage/reports',
        requiredPermission: { module: 'storage-module', submodule: 'storage-reports', action: 'list' }
      },
      {
        id: 'storage-settings',
        label: 'MENU_CONFIG.SETTINGS',
        icon: 'settings',
        route: '/storage/settings',
        requiredPermission: { module: 'storage-module', submodule: 'storage-settings', action: 'view' }
      }
    ]
  },
  // ── Consent Management ───────────────────────────────────────────────────
  {
    id: 'consent-mgmt-menu',
    label: 'MENU_CONFIG.CONSENT_MANAGEMENT',
    icon: 'rule_folder',
    requiredPermission: { module: 'consent-module', submodule: 'consent-notices', action: 'list' },
    children: [
      {
        id: 'consent-notices',
        label: 'MENU_CONFIG.CONSENT_NOTICES',
        icon: 'gavel',
        route: '/consent-mgmt/notices',
        requiredPermission: { module: 'consent-module', submodule: 'consent-notices', action: 'list' }
      },
      {
        id: 'consent-responses',
        label: 'MENU_CONFIG.CONSENT_RESPONSES',
        icon: 'fact_check',
        route: '/consent-mgmt/responses',
        requiredPermission: { module: 'consent-module', submodule: 'consent-responses', action: 'list' }
      }
    ]
  },

  // ── Payments & Transactions ──────────────────────────────────────────────
  {
    id: 'payment-menu',
    label: 'MENU_CONFIG.PAYMENTS',
    icon: 'account_balance_wallet',
    requiredPermission: { module: 'payment-module', submodule: 'transactions', action: 'list' },
    children: [
      {
        id: 'payment-transactions',
        label: 'MENU_CONFIG.TRANSACTIONS',
        icon: 'receipt_long',
        route: '/payment/transactions',
        requiredPermission: { module: 'payment-module', submodule: 'transactions', action: 'list' }
      }
    ]
  }
];

// ── Section-based nav (used in header-sidenav mode) ───────────────────────
export const defaultNavSections: AppNavSection[] = [
  // ── Home ─────────────────────────────────────────────────────────────────
  // {
  //   id: 'home-section',
  //   label: 'Home',
  //   icon: 'home',
  //   children: [
  //     {
  //       id: 'home-dashboard',
  //       label: 'Dashboard',
  //       icon: 'dashboard',
  //       route: '/user-mgmt/dashboard'
  //     },
  //     // {
  //     //   id: 'home-calendar',
  //     //   label: 'Calendar',
  //     //   icon: 'calendar_today',
  //     //   route: '/calendar',
  //     //   requiredPermission: { module: 'calendar-module', submodule: 'roaster', action: 'list' }
  //     // }
  //   ]
  // },

  // ── User Management ───────────────────────────────────────────────────────
  {
    id: 'user-mgmt-section',
    label: 'MENU_CONFIG.USER_MANAGEMENT',
    icon: 'manage_accounts',
    requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'list' },
    children: [
      {
        id: 'sec-user-mgmt-dashboard',
        label: 'MENU_CONFIG.DASHBOARD',
        icon: 'insights',
        route: '/user-mgmt/dashboard'
      },
      {
        id: 'sec-user-mgmt-members',
        label: 'MENU_CONFIG.MEMBERS_USERS',
        icon: 'people',
        route: '/user-mgmt/members',
        requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'list' }
      },
      {
        id: 'sec-user-mgmt-roles',
        label: 'MENU_CONFIG.ROLES',
        icon: 'badge',
        route: '/user-mgmt/roles',
        requiredPermission: { module: 'user-management-module', submodule: 'user-roles', action: 'list' }
      },
      {
        id: 'sec-user-mgmt-entities',
        label: 'MENU_CONFIG.ENTITIES',
        icon: 'domain',
        route: '/user-mgmt/entities',
        requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'list' }
      },
      {
        id: 'sec-user-mgmt-sessions',
        label: 'MENU_CONFIG.SESSION_HISTORY',
        icon: 'history',
        route: '/user-mgmt/sessions',
        requiredPermission: { module: 'user-management-module', submodule: 'user-sessions', action: 'list' }
      },
      {
        id: 'sec-user-mgmt-screens',
        label: 'MENU_CONFIG.SCREENS_CONFIG',
        icon: 'dvr',
        route: '/user-mgmt/screens',
        requiredPermission: { module: 'user-management-module', submodule: 'screens-config', action: 'list' }
      },
      {
        id: 'sec-user-mgmt-prg-modules',
        label: 'MENU_CONFIG.PRG_MODULES',
        icon: 'view_module',
        route: '/user-mgmt/prg-modules',
        requiredPermission: { module: 'user-management-module', submodule: 'prg-modules', action: 'list' }
      },
      {
        id: 'sec-user-mgmt-global-config',
        label: 'MENU_CONFIG.GLOBAL_CONFIGURATION',
        icon: 'settings_suggest',
        route: '/user-mgmt/global-config',
        requiredPermission: { module: 'user-management-module', submodule: 'all-users', action: 'edit' }
      }
    ]
  },

  // ── Patient Management ─────────────────────────────────────────────────────
  // {
  //   id: 'patient-section',
  //   label: 'MENU_CONFIG.PATIENTS',
  //   icon: 'personal_injury',
  //   children: [
  //     {
  //       id: 'sec-patient-list',
  //       label: 'MENU_CONFIG.ALL_PATIENTS',
  //       icon: 'people_alt',
  //       route: '/patients'
  //     }
  //   ]
  // },

  // ── Specialist Management ─────────────────────────────────────────────────
  {
    id: 'specialist-section',
    label: 'MENU_CONFIG.SPECIALISTS',
    icon: 'medical_services',
    requiredPermission: { module: 'user-management-module', submodule: 'specialists', action: 'list' },
    children: [
      {
        id: 'sec-specialist-list',
        label: 'MENU_CONFIG.ALL_SPECIALISTS',
        icon: 'people_alt',
        route: '/specialists',
        requiredPermission: { module: 'user-management-module', submodule: 'specialists', action: 'list' }
      },
      {
        id: 'sec-specialist-approval',
        label: 'MENU_CONFIG.SPECIALIST_APPROVAL',
        icon: 'verified_user',
        route: '/specialists/approval',
        requiredPermission: { module: 'user-management-module', submodule: 'specialists', action: 'list' }
      }
    ]
  },

  // ── Subscriptions ─────────────────────────────────────────────────────────
  {
    id: 'subscription-section',
    label: 'MENU_CONFIG.SUBSCRIPTIONS',
    icon: 'card_membership',
    requiredPermission: { module: 'subscription-module', submodule: 'pricing-plans', action: 'list' },
    children: [
      {
        id: 'sec-subs-pricing',
        label: 'MENU_CONFIG.PRICING_PLANS',
        icon: 'payments',
        route: '/subscriptions/pricing',
        requiredPermission: { module: 'subscription-module', submodule: 'pricing-plans', action: 'list' }
      },
      {
        id: 'sec-subs-plans',
        label: 'MENU_CONFIG.SUBSCRIPTION_PLANS',
        icon: 'layers',
        route: '/subscriptions/plans',
        requiredPermission: { module: 'subscription-module', submodule: 'subscription-config', action: 'list' }
      },

      {
        id: 'sec-subs-features',
        label: 'MENU_CONFIG.PLAN_FEATURES',
        icon: 'tune',
        route: '/subscriptions/features',
        requiredPermission: { module: 'subscription-module', submodule: 'subscription-config', action: 'list' }
      }
    ]
  },

  // ── Notification Center ───────────────────────────────────────────────────
  {
    id: 'notification-section',
    label: 'MENU_CONFIG.NOTIFICATIONS',
    icon: 'notifications_active',
    requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' },
    children: [
      {
        id: 'sec-notif-channels',
        label: 'MENU_CONFIG.CHANNELS',
        icon: 'rss_feed',
        route: '/notifications/channels',
        requiredPermission: { module: 'notification-module', submodule: 'channels', action: 'list' }
      },
      {
        id: 'sec-notif-events',
        label: 'MENU_CONFIG.EVENTS',
        icon: 'event',
        route: '/notifications/events',
        requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }
      },
      {
        id: 'sec-notif-templates',
        label: 'MENU_CONFIG.TEMPLATES',
        icon: 'description',
        route: '/notifications/templates',
        requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }
      },
      {
        id: 'sec-notif-check',
        label: 'NOTIFICATION_MODULE.CHECK.TITLE',
        icon: 'fact_check',
        route: '/notifications/check',
        requiredPermission: { module: 'notification-module', submodule: 'notification-center', action: 'list' }
      },
      {
        id: 'sec-notif-delivery-logs',
        label: 'Delivery Logs',
        icon: 'mark_email_read',
        route: '/notifications/delivery-logs',
        requiredPermission: { module: 'notification-module', submodule: 'notification-history', action: 'list' }
      }
    ]
  },

  // ── File Storage ──────────────────────────────────────────────────────────
  {
    id: 'storage-section',
    label: 'MENU_CONFIG.STORAGE',
    icon: 'cloud',
    requiredPermission: { module: 'storage-module', submodule: 'storage-dashboard', action: 'list' },
    children: [
      {
        id: 'sec-storage-dashboard',
        label: 'MENU_CONFIG.DASHBOARD',
        icon: 'insights',
        route: '/storage',
        requiredPermission: { module: 'storage-module', submodule: 'storage-dashboard', action: 'list' }
      },
      {
        id: 'sec-storage-explorer',
        label: 'MENU_CONFIG.FILE_EXPLORER',
        icon: 'folder_open',
        route: '/storage/files',
        requiredPermission: { module: 'storage-module', submodule: 'file-explorer', action: 'list' }
      },
      {
        id: 'sec-storage-upload',
        label: 'MENU_CONFIG.UPLOAD_FILES',
        icon: 'cloud_upload',
        route: '/storage/upload',
        requiredPermission: { module: 'storage-module', submodule: 'upload', action: 'create' }
      },
      {
        id: 'sec-storage-shared',
        label: 'MENU_CONFIG.SHARED_FILES',
        icon: 'share',
        route: '/storage/shared',
        requiredPermission: { module: 'storage-module', submodule: 'shared-files', action: 'list' }
      },
      {
        id: 'sec-storage-trash',
        label: 'MENU_CONFIG.TRASH_BIN',
        icon: 'delete',
        route: '/storage/trash',
        requiredPermission: { module: 'storage-module', submodule: 'trash', action: 'list' }
      },
      {
        id: 'sec-storage-reports',
        label: 'MENU_CONFIG.AUDIT_REPORTS',
        icon: 'assignment',
        route: '/storage/reports',
        requiredPermission: { module: 'storage-module', submodule: 'storage-reports', action: 'list' }
      },
      {
        id: 'sec-storage-settings',
        label: 'MENU_CONFIG.SETTINGS',
        icon: 'settings',
        route: '/storage/settings',
        requiredPermission: { module: 'storage-module', submodule: 'storage-settings', action: 'view' }
      }
    ]
  },

  // ── Calendar ─────────────────────────────────────────────────────────────
  {
    id: 'calendar-section',
    label: 'MENU_CONFIG.APPOINTMENT_MANAGEMENT',
    icon: 'calendar_today',
    children: [
      // {
      //   id: 'sec-calendar-roaster-config',
      //   label: 'Roaster Configuration',
      //   icon: 'settings',
      //   route: '/roaster-config',
      //   requiredPermission: { module: 'roaster-module', submodule: 'roaster-config', action: 'list' }
      // },
      {
        id: 'sec-calendar-roaster',
        label: 'MENU_CONFIG.MY_CALLENDAR',
        icon: 'date_range',
        route: '/roaster/my-calendar',
        requiredPermission: { module: 'roaster-module', submodule: 'roaster', action: 'list' }
      },
      {
        id: 'sec-calendar-roaster-owner',
        label: 'MENU_CONFIG.ROASTER_OWNER',
        icon: 'supervised_user_circle',
        route: '/roaster/roaster-owner',
        requiredPermission: { module: 'roaster-module', submodule: 'roaster-owner', action: 'list' }
      },
      {
        id: 'sec-calendar-booking',
        label: 'MENU_CONFIG.BOOKINGS',
        icon: 'book_online',
        route: '/roaster/reservation',
        requiredPermission: { module: 'roaster-module', submodule: 'buddy-roaster', action: 'list' }
      },
      {
        id: 'sec-calendar-patient-bookings',
        label: 'MENU_CONFIG.MY_BOOKINGS',
        icon: 'receipt_long',
        route: '/roaster/patient-bookings',
        requiredPermission: { module: 'roaster-module', submodule: 'patient-booking', action: 'list' }
      },
      // {
      //   id: 'sec-form-booking',
      //   label: 'MENU_CONFIG.APPOINTMENT_BOOKINGS',
      //   icon: 'book_online',
      //   route: '/bookings',
      //   requiredPermission: { module: 'roaster-module', submodule: 'roaster-booking', action: 'list' }
      // }
    ]
  },
  // ── Consent Management ───────────────────────────────────────────────────
  {
    id: 'consent-mgmt-section',
    label: 'MENU_CONFIG.CONSENT_MANAGEMENT',
    icon: 'rule_folder',
    requiredPermission: { module: 'consent-module', submodule: 'consent-notices', action: 'list' },
    children: [
      {
        id: 'sec-consent-notices',
        label: 'MENU_CONFIG.CONSENT_NOTICES',
        icon: 'gavel',
        route: '/consent-mgmt/notices',
        requiredPermission: { module: 'consent-module', submodule: 'consent-notices', action: 'list' }
      },
      {
        id: 'sec-consent-responses',
        label: 'MENU_CONFIG.CONSENT_RESPONSES',
        icon: 'fact_check',
        route: '/consent-mgmt/responses',
        requiredPermission: { module: 'consent-module', submodule: 'consent-responses', action: 'list' }
      }
    ]
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  {
    id: 'payment-section',
    label: 'MENU_CONFIG.PAYMENTS',
    icon: 'account_balance_wallet',
    requiredPermission: { module: 'payment-module', submodule: 'transactions', action: 'list' },
    children: [
      {
        id: 'sec-payment-transactions',
        label: 'MENU_CONFIG.TRANSACTIONS',
        icon: 'receipt_long',
        route: '/payment/transactions',
        requiredPermission: { module: 'payment-module', submodule: 'transactions', action: 'list' }
      }
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// ── Patient nav items (shown for Patient / User roles) ──────────────────────
export const patientNavItems: AppNavItem[] = [
  {
    id: 'patient-dashboard',
    label: 'MENU_CONFIG.DASHBOARD',
    icon: 'dashboard',
    route: '/user-mgmt/dashboard'
  },
  {
    id: 'patient-mgmt-menu',
    label: 'MENU_CONFIG.PATIENTS',
    icon: 'personal_injury',
    route: '/patients'
  },
  {
    id: 'patient-my-cases',
    label: 'MENU_CONFIG.MY_CASES',
    icon: 'folder_shared',
    route: '/cases/directory'
  },
  {
    id: 'patient-my-bookings',
    label: 'MENU_CONFIG.MY_BOOKINGS',
    icon: 'calendar_today',
    route: '/roaster/patient-bookings',
    requiredPermission: { module: 'roaster-module', submodule: 'patient-booking', action: 'list' }
  },
  {
    id: 'patient-transactions',
    label: 'MENU_CONFIG.TRANSACTIONS',
    icon: 'receipt_long',
    route: '/payment/transactions',
    requiredPermission: { module: 'payment-module', submodule: 'transactions', action: 'list' }
  }
];

// Filtering helpers — called at runtime with the user's hasPermission function
// ─────────────────────────────────────────────────────────────────────────────

export function filterMenuItems(
  items: AppNavItem[],
  hasPermissionFn: (module: string, submodule: string, action: string) => boolean
): NavItem[] {
  return items
    .filter(item => {
      // Exclude settings item from general navigation menus
      if (item.route === '/user-mgmt/settings') return false;

      if (!item.requiredPermission) return true;
      return hasPermissionFn(
        item.requiredPermission.module,
        item.requiredPermission.submodule,
        item.requiredPermission.action
      );
    })
    .map(item => {
      const filteredItem: NavItem = {
        id: item.id,
        label: item.label,
        icon: item.icon,
        route: item.route,
        badge: item.badge,
        disabled: item.disabled,
        dividerAfter: item.dividerAfter
      };
      if (item.children) {
        filteredItem.children = filterMenuItems(item.children, hasPermissionFn);
      }
      return filteredItem;
    })
    // Drop parent items whose children are all filtered out
    .filter(item => !item.children || item.children.length > 0);
}

export function filterNavSections(
  sections: AppNavSection[],
  hasPermissionFn: (module: string, submodule: string, action: string) => boolean
): NavSection[] {
  return sections
    .filter(section => {
      if (!section.requiredPermission) return true;
      return hasPermissionFn(
        section.requiredPermission.module,
        section.requiredPermission.submodule,
        section.requiredPermission.action
      );
    })
    .map(section => ({
      id: section.id,
      label: section.label,
      icon: section.icon,
      children: filterMenuItems(section.children, hasPermissionFn)
    }))
    // Drop sections with no visible children
    .filter(section => section.children.length > 0);
}
