import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './Shell';
import { useSession, isStaff } from './session';
import { useAppearance } from '../theme/useAppearance';
import { useScrollToTop } from '../lib/platform/hooks';
import { BOOKING_STEPS } from './booking';

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
  ProfileScreen,
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
          {/* Customer */}
          <Route path="/" element={<Home />} />
          <Route path="/garage" element={<Garage />} />
          <Route path="/garage/:vehicleId" element={<VehicleDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/booking/:bookingId" element={<BookingDetail />} />
          <Route path="/plan" element={<PlanScreen />} />
          <Route path="/invoices" element={<InvoicesScreen />} />
          <Route path="/messages" element={<MessagesScreen />} />
          <Route path="/referral" element={<ReferralScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/service-area" element={<ServiceAreaScreen />} />
          <Route path="/faq" element={<FaqScreen />} />
          <Route path="/settings/appearance" element={<AppearanceScreen />} />
          <Route path="/settings/notifications" element={<NotificationsScreen />} />
          <Route path="/settings/profile" element={<ProfileScreen />} />

          {/* Booking flow — its own full-screen layout inside the shell.
              One route with an index child, not two siblings sharing /book:
              duplicate sibling paths are ambiguous and the wrong one wins. */}
          <Route path="/book" element={<BookLayout />}>
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
 * Guards an admin surface.
 *
 * `staffOnly` marks the screens a tech must not see either — anything with
 * revenue, client records or business settings on it. Techs get Today and
 * their own jobs and nothing else.
 */
function StaffOnly({ children, staffOnly }: { children: React.ReactNode; staffOnly?: boolean }) {
  const role = useSession((s) => s.role);
  const hydrated = useSession((s) => s.hydrated);

  // Role is read from storage asynchronously; redirecting before it resolves
  // would bounce a legitimate admin back to the customer home on every reload.
  if (!hydrated) return null;

  const allowed = staffOnly ? isStaff(role) : isStaff(role) || role === 'tech';
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** A pushed screen should start at the top, not wherever the last one was. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useScrollToTop(pathname);
  return null;
}
