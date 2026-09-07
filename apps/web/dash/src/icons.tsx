type IconName = 'interests' | 'users' | 'logout' | 'search' | 'refresh' | 'chevron' | 'mail' | 'phone' | 'arrow' | 'close';

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };
  const paths: Record<IconName, React.ReactNode> = {
    interests: <><path d="M4 5.5h16v12H4z" {...common}/><path d="m5 7 7 5 7-5" {...common}/></>,
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" {...common}/><circle cx="9" cy="7" r="4" {...common}/><path d="M17 11a4 4 0 0 1 4 4v1" {...common}/><path d="M16 3.2a4 4 0 0 1 0 7.6" {...common}/></>,
    logout: <><path d="M10 17l5-5-5-5" {...common}/><path d="M15 12H3" {...common}/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" {...common}/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" {...common}/><path d="m16 16 4 4" {...common}/></>,
    refresh: <><path d="M20 6v5h-5" {...common}/><path d="M18.5 16.5A8 8 0 1 1 20 11" {...common}/></>,
    chevron: <path d="m9 18 6-6-6-6" {...common}/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1" {...common}/><path d="m4 7 8 6 8-6" {...common}/></>,
    phone: <path d="M7.2 3H4.5A1.5 1.5 0 0 0 3 4.6C3.5 13.2 10.8 20.5 19.4 21a1.5 1.5 0 0 0 1.6-1.5v-2.7l-4.1-1-1.3 2.1a15.7 15.7 0 0 1-9.5-9.5l2.1-1.3L7.2 3Z" {...common}/>,
    arrow: <><path d="M5 12h14" {...common}/><path d="m14 7 5 5-5 5" {...common}/></>,
    close: <><path d="m6 6 12 12" {...common}/><path d="M18 6 6 18" {...common}/></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>{paths[name]}</svg>;
}
