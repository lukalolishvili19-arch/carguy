'use client';

import { useTranslations } from 'next-intl';
import { LogOut, User as UserIcon, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';

export function UserMenu() {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">{t('auth.login')}</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">{t('auth.register')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage src={user.profile?.avatarUrl} alt={user.username} />
            <AvatarFallback>{getInitials(user.profile?.displayName ?? user.username)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-semibold">{user.profile?.displayName ?? user.username}</span>
            <span className="text-xs text-muted-foreground">@{user.username}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${user.username}`}>
            <UserIcon className="h-4 w-4" /> {t('nav.profile')}
          </Link>
        </DropdownMenuItem>
        {(user.role === 'BUSINESS' || user.role === 'ADMIN') && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="h-4 w-4" /> {t('nav.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-primary"
          onClick={async () => {
            await logout();
            router.push('/');
          }}
        >
          <LogOut className="h-4 w-4" /> {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
