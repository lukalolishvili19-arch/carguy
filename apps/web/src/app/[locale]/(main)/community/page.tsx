'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/** Legacy /community route — redirects to /forum */
export default function CommunityRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/forum');
  }, [router]);
  return null;
}
