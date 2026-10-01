import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Shell } from './Shell';
import { useSession, isStaff } from './session';
import { useAppearance } from '../theme/useAppearance';
import { useScrollToTop } from '../lib/platform/hooks';
import { BOOKING_STEPS } from './booking';

import SignIn from '../routes/auth/SignIn';
import ProfileScreen from '../routes/account/Profile';
import Home from '../routes/customer/Home';
import Garage, { VehicleDetail } from '../routes/customer/Garage';
import Gallery from '../routes/customer/Gallery';
import { BookLayout } from '../routes/customer/book/BookLayout';
import {
  StepCondition,
  StepConfirm,
  StepDeposit,
  StepLocation,
  StepService,
  StepTime,
  StepVehicle,
} from '../routes/customer/book/steps';
import {
  AboutScreen,
  AppearanceScreen,
  BookingDetail,
  FaqScreen,
  InvoicesScreen,
  MessagesScreen,
  NotificationsScreen,
  PlanScreen,
  ReferralScreen,
  ServiceAreaScreen,
} from '../routes/customer/more';

import Today from '../routes/admin/Today';
import Jobs, { JobDetail } from '../routes/admin/Jobs';
import Clients, { ClientDetail } from '../routes/admin/Clients';
import {
  BusinessSettings,
  Checklists,
  Expenses,
  Integrations,
  Mileage,
  PlansEditor,
  Reporting,
  Schedule,
  ServiceMenuEditor,
  Subscribers,
  Team,
} from '../routes/admin/more';

/**
 * Route table.
 *
 * Role decides the shell, and the router enforces it rather than trusting the
 * nav to hide things — a customer deep-linking to /admin/clients must not get
 * a client list. That check lives in StaffOnly below.
 */
export default function App() {
  // Mounted once at the root so the theme is applied before anything paints.
  useAppearance();
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Shell />}>
          {/* Open to everyone. Guideline 5.1.1(iv): content that does not
              need an account must not sit behind one. */}
          <Route path="/" element={<Home />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/service-area" element={<ServiceAreaScreen />} />
          <Route path="/faq" element={<FaqScreen />} />
          <Route path="/settings/appearance" element={<AppearanceScreen />} />

          {/* Account-bound: garage, bookings, money, and the account itself. */}
          <Route path="/garage" element={<SignedIn><Garage /></SignedIn>} />
          <Route path="/garage/:vehicleId" element={<SignedIn><VehicleDetail /></SignedIn>} />
          <Route path="/booking/:bookingId" element={<SignedIn><BookingDetail /></SignedIn>} />
          <Route path="/plan" element={<SignedIn><PlanScreen /></SignedIn>} />
          <Route path="/invoices" element={<SignedIn><InvoicesScreen /></SignedIn>} />
          <Route path="/messages" element={<SignedIn><MessagesScreen /></SignedIn>} />
          <Route path="/referral" element={<SignedIn><ReferralScreen /></SignedIn>} />
          <Route path="/settings/notifications" element={<SignedIn><NotificationsScreen /></SignedIn>} />
          <Route path="/settings/profile" element={<SignedIn><ProfileScreen /></SignedIn>} />

          {/* Booking flow — its own full-screen layout inside the shell.
              One route with an index child, not two siblings sharing /book:
              duplicate sibling paths are ambiguous and the wrong one wins. */}
          <Route path="/book" element={<SignedIn><BookLayout /></SignedIn>}>
            <Route index element={<Navigate to={BOOKING_STEPS[0].path} replace />} />
            <Route path="service" element={<StepService />} />
            <Route path="vehicle" element={<StepVehicle />} />
            <Route path="condition" element={<StepCondition />} />
            <Route path="location" element={<StepLocation />} />
            <Route path="time" element={<StepTime />} />
            <Route path="deposit" element={<StepDeposit />} />
            <Route path="confirm" element={<StepConfirm />} />
          </Route>

          {/* Admin & tech */}
          <Route
            path="/admin"
            element={
              <StaffOnly>
                <Today />
              </StaffOnly>
            }
          />
          <Route path="/admin/schedule" element={<StaffOnly staffOnly><Schedule /></StaffOnly>} />
          <Route path="/admin/jobs" element={<StaffOnly><Jobs /></StaffOnly>} />
          <Route path="/admin/jobs/:bookingId" element={<StaffOnly><JobDetail /></StaffOnly>} />
          <Route path="/admin/clients" element={<StaffOnly staffOnly><Clients /></StaffOnly>} />
          <Route path="/admin/clients/:clientId" element={<StaffOnly staffOnly><ClientDetail /></StaffOnly>} />
          <Route path="/admin/reporting" element={<StaffOnly staffOnly><Reporting /></StaffOnly>} />
          <Route path="/admin/subscribers" element={<StaffOnly staffOnly><Subscribers /></StaffOnly>} />
          <Route path="/admin/services" element={<StaffOnly staffOnly><ServiceMenuEditor /></StaffOnly>} />
          <Route path="/admin/plans" element={<StaffOnly staffOnly><PlansEditor /></StaffOnly>} />
          <Route path="/admin/team" element={<StaffOnly staffOnly><Team /></StaffOnly>} />
          <Route path="/admin/checklists" element={<StaffOnly staffOnly><Checklists /></StaffOnly>} />
          <Route path="/admin/expenses" element={<StaffOnly staffOnly><Expenses /></StaffOnly>} />
          <Route path="/admin/mileage" element={<StaffOnly staffOnly><Mileage /></StaffOnly>} />
          <Route path="/admin/settings" element={<StaffOnly staffOnly><BusinessSettings /></StaffOnly>} />
          <Route path="/admin/integrations" element={<StaffOnly staffOnly><Integrations /></StaffOnly>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

/**
 * Sends a signed-out visitor to sign in, and back here afterwards.
 *
 * Renders nothing while the stored session is read back: redirecting before
 * it resolves would bounce a signed-in customer to /sign-in on every reload.
 */
function SignedIn({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status);
  const location = useLocation();

  if (status === 'loading') return null;
  if (status !== 'signedIn') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Guards an admin surface.
 *
 * `staffOnly` marks the screens a tech must not see either — anything with
 * revenue, client records or business settings on it. Techs get Today and
 * their own jobs and nothing else.
 *
 * This is navigation, not security. The data behind these screens is guarded
 * by RLS, which returns a customer nothing however they reach the route.
 */
function StaffOnly({ children, staffOnly }: { children: ReactNode; staffOnly?: boolean }) {
  const role = useSession((s) => s.role);

  const allowed = staffOnly ? isStaff(role) : isStaff(role) || role === 'tech';
  return <SignedIn>{allowed ? children : <Navigate to="/" replace />}</SignedIn>;
}

/** A pushed screen should start at the top, not wherever the last one was. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useScrollToTop(pathname);
  return null;
}
