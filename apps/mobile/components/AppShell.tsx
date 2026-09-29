const HIDDEN_TAB_BAR_PREFIXES = ['/login', '/photo/', '/place/new', '/settings'];

export function AppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function shouldShowMainTabBar(pathname: string): boolean {
  if (pathname === '/') return false;
  if (pathname.includes('(auth)')) return false;
  return !HIDDEN_TAB_BAR_PREFIXES.some((route) => pathname === route || pathname.startsWith(route));
}
