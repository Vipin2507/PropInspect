import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Users,
  FileText,
  Wrench,
  ListChecks,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { ROUTES } from '../../constants/routes';
import { useEffect } from 'react';

const navByRole: Record<
  string,
  { to: string; label: string; icon: typeof LayoutDashboard }[]
> = {
  admin: [
    { to: ROUTES.ADMIN, label: 'Dashboard', icon: LayoutDashboard },
    { to: ROUTES.ADMIN_PROJECTS, label: 'Projects', icon: Building2 },
    { to: ROUTES.ADMIN_USERS, label: 'Users', icon: Users },
    { to: ROUTES.ADMIN_TEMPLATES, label: 'Templates', icon: ListChecks },
    { to: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: FileText },
    { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
  ],
  engineer: [
    { to: ROUTES.ENGINEER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { to: ROUTES.ENGINEER_FLATS, label: 'My Flats', icon: Building2 },
    { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
  ],
  qa: [
    { to: ROUTES.QA_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { to: ROUTES.QA_REVIEWS, label: 'Reviews', icon: ClipboardList },
    { to: ROUTES.QA_HISTORY, label: 'History', icon: FileText },
    { to: ROUTES.DESNAGGING, label: 'De-Snagging', icon: Wrench },
  ],
  viewer: [
    { to: ROUTES.ADMIN, label: 'Dashboard', icon: LayoutDashboard },
    { to: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: FileText },
  ],
};

function SidebarNav({
  isCollapsed,
  onNavigate,
}: {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const items = navByRole[user?.role || 'engineer'] || [];

  return (
    <nav className="flex-1 space-y-1 p-2">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation',
              'min-h-[44px]', // Ensure min touch target
              isCollapsed ? 'justify-center' : 'justify-start',
              isActive
                ? 'bg-sidebar-active text-white'
                : 'text-slate-300 active:bg-white/10',
              !isActive &&
                '[@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white'
            )
          }
        >
          <Icon size={20} className="shrink-0" />
          <span
            className={cn(
              'transition-opacity',
              isCollapsed ? 'lg:hidden' : 'lg:inline'
            )}
          >
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar({
  isCollapsed,
  isMobile,
  isOpen,
  onClose,
}: {
  isCollapsed?: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isMobile && isOpen) {
      onClose?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const content = (
    <>
      <div
        className={cn(
          'flex h-16 shrink-0 items-center px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2',
            isCollapsed ? 'hidden' : 'flex'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
            S
          </div>
          <span className="font-bold text-white">SnagDesk</span>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-slate-300 active:bg-white/10"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        )}
      </div>
      <SidebarNav isCollapsed={isCollapsed} onNavigate={onClose} />
      <div className="p-2">
        <button
          onClick={logout}
          title="Logout"
          className={cn(
            'flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors touch-manipulation',
            'active:bg-white/10 [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <LogOut size={20} className="shrink-0" />
          <span
            className={cn(
              'transition-opacity',
              isCollapsed ? 'lg:hidden' : 'lg:inline'
            )}
          >
            Logout
          </span>
        </button>
      </div>
      <div className="p-4 text-center text-xs text-slate-500">
        <p>v1.0.0</p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[min(80%,280px)] flex-col bg-sidebar text-slate-300 shadow-xl transition-transform md:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar text-slate-300',
        isCollapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {content}
    </aside>
  );
}
