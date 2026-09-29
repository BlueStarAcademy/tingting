const TAB_PATHS = ['/home', '/map', '/camera', '/album', '/plans'];

export function AppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function shouldShowMainTabBar(pathname: string): boolean {
  return TAB_PATHS.includes(pathname);
}
