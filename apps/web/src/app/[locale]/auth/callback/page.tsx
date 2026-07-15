'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { useRouter } from '@/i18n/navigation';

function AuthCallback() {
  const params = useSearchParams();
  const setTokens = useAuth((s) => s.setTokens);
  const router = useRouter();

  useEffect(() => {
    const access = params.get('accessToken');
    const refresh = params.get('refreshToken');
    if (access && refresh) {
      setTokens(access, refresh).then(() => router.push('/'));
    } else {
      router.push('/login');
    }
  }, [params, setTokens, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
