import { NavLink } from 'react-router-dom';

interface Tab { to: string; label: string; icon: string }

export default function BottomNav({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-black/10 flex safe-pb">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-body transition-colors ${isActive ? 'text-primary' : 'text-dark/40'}`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
