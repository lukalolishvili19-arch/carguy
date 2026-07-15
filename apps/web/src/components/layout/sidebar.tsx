'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { primaryNav, secondaryNav } from './nav-config';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  const renderItem = (item: (typeof primaryNav)[number]) => {
    if (item.auth && !user) return null;
    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    const Icon = item.icon;
    return (
      <Link
        key={item.key}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{t(item.key)}</span>
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-4 lg:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground glow-red">
          C
        </div>
        <span className="text-lg font-black tracking-tight">
          Car<span className="text-primary">Guy</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
        {primaryNav.map(renderItem)}
        {user && (
          <>
            <div className="my-3 h-px bg-border" />
            {secondaryNav.map(renderItem)}
          </>
        )}
      </nav>
    </aside>
  );
}
