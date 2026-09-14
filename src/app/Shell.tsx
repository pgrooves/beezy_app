import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlassTabBar } from '../components/nav/GlassTabBar';
import { MoreSheet } from '../components/nav/MoreSheet';
import { RoleSwitcher } from '../components/dev/RoleSwitcher';
import { UpdatePrompt } from '../components/UpdatePrompt';
import { useSession } from './session';
import { moreForRole, tabsForRole } from './routes';

/**
 * The app frame: whichever tab bar the role calls for, the More sheet, and the
 * scrolling outlet underneath.
 *
 * Content deliberately runs to the bottom of the viewport and scrolls under
 * the glass capsule — that translucency is the point of the design. `Screen`
 * adds the bottom padding so the last row is still reachable.
 */
export function Shell() {
  const role = useSession((s) => s.role);
  const devMode = useSession((s) => s.devMode);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const tabs = tabsForRole(role);
  const groups = moreForRole(role);

  // The booking flow owns the full screen: its own footer carries the running
  // total and the next-step button, and a tab bar over that is two competing
  // bottom bars.
  const immersive = location.pathname.startsWith('/book/');

  return (
    <div className="min-h-dvh">
      <Outlet />

      {!immersive && (
        <>
          <GlassTabBar tabs={tabs} onMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
          <MoreSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            groups={groups}
            footer={devMode ? <RoleSwitcher onNavigate={() => setMoreOpen(false)} /> : null}
          />
        </>
      )}

      <UpdatePrompt />
    </div>
  );
}
