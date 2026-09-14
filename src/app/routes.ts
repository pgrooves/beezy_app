import type { IconName } from '../components/nav/GlassTabBar';
import type { Role } from '../core/types';

/**
 * The app's navigation, as data.
 *
 * Every destination is declared here rather than scattered through JSX, so the
 * React Native navigator can be generated from the same structure at port
 * time. Screens are wired to these paths in src/app/App.tsx.
 *
 * Role decides the entire shell. A customer never sees an admin surface, and
 * the router enforces that rather than trusting the nav to hide it — a deep
 * link to /admin/clients must not resolve for a customer.
 */

export interface TabDef {
  path: string;
  label: string;
  icon: IconName;
  /** Exact match only — for a tab whose path prefixes its siblings. */
  end?: boolean;
}

export interface MoreLink {
  to: string;
  label: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export const CUSTOMER_TABS: TabDef[] = [
  { path: '/', label: 'Home', icon: 'home', end: true },
  { path: '/book', label: 'Book', icon: 'book' },
  { path: '/garage', label: 'Garage', icon: 'garage' },
  { path: '/gallery', label: 'Gallery', icon: 'gallery' },
];

export const CUSTOMER_MORE: { title?: string; links: MoreLink[] }[] = [
  {
    title: 'Your account',
    links: [
      { to: '/plan', label: 'Plan & membership', detail: 'Signature · 1 wash left' },
      { to: '/invoices', label: 'Invoices & receipts' },
      { to: '/messages', label: 'Messages' },
      { to: '/referral', label: 'Refer a friend', detail: 'Both of you get $25' },
    ],
  },
  {
    title: 'Beezy',
    links: [
      { to: '/about', label: 'About Beezy' },
      { to: '/service-area', label: 'Service area' },
      { to: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Settings',
    links: [
      { to: '/settings/notifications', label: 'Notifications' },
      { to: '/settings/appearance', label: 'Appearance' },
      { to: '/settings/profile', label: 'Profile & account' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Admin / owner
// ---------------------------------------------------------------------------

export const ADMIN_TABS: TabDef[] = [
  { path: '/admin', label: 'Today', icon: 'today', end: true },
  { path: '/admin/schedule', label: 'Schedule', icon: 'schedule' },
  { path: '/admin/jobs', label: 'Jobs', icon: 'jobs' },
  { path: '/admin/clients', label: 'Clients', icon: 'clients' },
];

export const ADMIN_MORE: { title?: string; links: MoreLink[] }[] = [
  {
    title: 'Insight',
    links: [
      { to: '/admin/reporting', label: 'Reporting', detail: 'Revenue, mix, retention' },
      { to: '/admin/subscribers', label: 'Subscribers', detail: 'MRR and credit use' },
    ],
  },
  {
    title: 'Run the business',
    links: [
      { to: '/admin/services', label: 'Service menu' },
      { to: '/admin/plans', label: 'Membership plans' },
      { to: '/admin/team', label: 'Team' },
      { to: '/admin/checklists', label: 'Quality checklists' },
    ],
  },
  {
    title: 'Money',
    links: [
      { to: '/admin/expenses', label: 'Expenses' },
      { to: '/admin/mileage', label: 'Mileage log' },
    ],
  },
  {
    title: 'Settings',
    links: [
      { to: '/admin/settings', label: 'Business settings' },
      { to: '/admin/integrations', label: 'Integrations', detail: 'Square, Google, SMS' },
      { to: '/settings/appearance', label: 'Appearance' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tech
// ---------------------------------------------------------------------------

/** Deliberately narrow: assigned work, and no revenue anywhere. */
export const TECH_TABS: TabDef[] = [
  { path: '/admin', label: 'Today', icon: 'today', end: true },
  { path: '/admin/jobs', label: 'My Jobs', icon: 'jobs' },
];

export const TECH_MORE: { title?: string; links: MoreLink[] }[] = [
  {
    links: [
      { to: '/settings/profile', label: 'Profile' },
      { to: '/settings/appearance', label: 'Appearance' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function tabsForRole(role: Role): TabDef[] {
  if (role === 'tech') return TECH_TABS;
  if (role === 'admin' || role === 'owner') return ADMIN_TABS;
  return CUSTOMER_TABS;
}

export function moreForRole(role: Role): { title?: string; links: MoreLink[] }[] {
  if (role === 'tech') return TECH_MORE;
  if (role === 'admin' || role === 'owner') return ADMIN_MORE;
  return CUSTOMER_MORE;
}

/** The screen a role lands on at sign-in. */
export function homeForRole(role: Role): string {
  return role === 'customer' ? '/' : '/admin';
}

/**
 * Public routes stay browsable signed out — guideline 5.1.1(iv) forbids
 * gating content that does not require an account. Login is required only at
 * booking, garage and payment.
 */
export const PUBLIC_PATHS = ['/gallery', '/about', '/service-area', '/faq', '/services'];
