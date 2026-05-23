import { NavLink } from 'react-router-dom';
import { Home, Calendar, BarChart2, User, Users, ClipboardList, BookOpen, Settings, type LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  calendar: Calendar,
  chart: BarChart2,
  user: User,
  users: Users,
  list: ClipboardList,
  book: BookOpen,
  settings: Settings,
};

interface Tab { to: string; label: string; icon: string; badge?: number }

export default function BottomNav({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border safe-pb z-40">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon] ?? Home;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                    {tab.badge != null && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-heading rounded-full flex items-center justify-center px-0.5">
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-body tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
