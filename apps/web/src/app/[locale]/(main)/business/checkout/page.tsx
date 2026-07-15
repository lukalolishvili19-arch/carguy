'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiErrorMessage, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Plan {
  name: string;
  amount: number;
  currency: string;
  interval: string;
  description: string;
}

interface SubscriptionPayload {
  plan: Plan;
  subscription: {
    id: string;
    status: string;
    amount: string | number;
    currency: string;
    currentPeriodEnd?: string | null;
  } | null;
  isActive: boolean;
}

export default function BusinessCheckoutPage() {
  const user = useAuth((s) => s.user);
  const loadSession = useAuth((s) => s.loadSession);
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => unwrap<SubscriptionPayload>(api.get('/billing/subscription')),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await unwrap(api.post('/billing/business/checkout'));
        await refetch();
      } catch (e) {
        toast.error(apiErrorMessage(e));
      } finally {
        setReady(true);
      }
    })();
  }, [user, refetch]);

  const pay = useMutation({
    mutationFn: () => unwrap<{ message: string }>(api.post('/billing/business/confirm', {})),
    onSuccess: async (res) => {
      toast.success(res.message);
      await loadSession();
      await qc.invalidateQueries({ queryKey: ['billing'] });
      router.push('/services');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-black">Business გამოწერა</h1>
        <p className="mb-6 text-muted-foreground">გადახდისთვის ჯერ შეხვიდე ანგარიშზე</p>
        <Button asChild>
          <Link href="/login">შესვლა</Link>
        </Button>
      </div>
    );
  }

  const plan = data?.plan;
  const active = data?.isActive;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Briefcase className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-black">Business ანგარიში</h1>
        <p className="mt-2 text-muted-foreground">კომპანიის განთავსება სერვისებში — თვიური გამოწერა</p>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          {isLoading || !ready ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : active ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <div>
                <p className="font-bold">გამოწერა აქტიურია</p>
                {data?.subscription?.currentPeriodEnd && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    ვადა: {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('ka-GE')}
                  </p>
                )}
              </div>
              <Button asChild className="w-full">
                <Link href="/services">სერვისებში გადასვლა</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-secondary/60 p-5 text-center">
                <p className="text-sm text-muted-foreground">{plan?.name ?? 'Business'}</p>
                <p className="mt-1 text-4xl font-black tracking-tight">
                  {plan?.amount ?? 10} <span className="text-2xl">₾</span>
                  <span className="text-base font-semibold text-muted-foreground"> / თვე</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan?.description ?? 'კომპანიის განთავსება სერვისებში'}
                </p>
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• კომპანიის პროფილი სერვისებში</li>
                <li>• ტელეფონი, მდებარეობა, ბრენდები</li>
                <li>• თვიური გადახდა — 10 ₾</li>
              </ul>

              <Button
                className="w-full"
                size="lg"
                disabled={pay.isPending}
                onClick={() => pay.mutate()}
              >
                {pay.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                გადახდა — 10 ₾
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                დროებითი გადახდა (dev). რეალური ბანკის ინტეგრაცია მოგვიანებით დაემატება.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
