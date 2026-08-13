'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, LogOut, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { APP_NAME, APP_TAGLINE } from '@longeviq/shared';
import { apiLogout } from '@/lib/auth-api';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const NAV_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Disclaimer', href: '#disclaimer' },
];

function AuthButtons({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await apiLogout();
    } catch {
      // Log out locally even if the server call fails.
    } finally {
      clearSession();
      toast.success('Signed out.');
      router.replace('/');
    }
  };

  if (isAuthenticated && user) {
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/reports">Reports</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/knowledge">Knowledge</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/nutrition">Nutrition</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/workout">Workout</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/assistant">Assistant</Link>
        </Button>
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/account">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {initials}
            </span>
            <span className="max-w-28 truncate">{user.firstName}</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          disabled={loggingOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? 'flex w-full flex-col gap-2' : 'flex items-center gap-2'}>
      <Button asChild variant="ghost" className={compact ? 'w-full' : undefined}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild className={compact ? 'w-full' : undefined}>
        <Link href="/auth/register">Get Started</Link>
      </Button>
    </div>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold">{APP_NAME}</span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">{APP_TAGLINE}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <AuthButtons />
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="border-t bg-background p-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-sm text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <AuthButtons compact />
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
