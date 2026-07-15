'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { mobileNav } from './nav-config';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export function MobileNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
      {mobileNav.map((item) => {
        if (item.auth && !user) return null;
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
