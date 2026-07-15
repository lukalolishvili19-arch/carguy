'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield, Check, X } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: string;
  yearlyPrice?: string;
  currency: string;
  company: { name: string; logoUrl?: string; ratingAvg: number };
  coverages: { id: string; title: string; included: boolean }[];
}

export default function InsurancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['insurance', 'plans'],
    queryFn: () => unwrap<Plan[]>(api.get('/insurance/plans')),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Insurance Hub</h1>
          <p className="text-muted-foreground">Compare plans and get covered</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="muted">{plan.company.name}</Badge>
                  <span className="text-xs text-amber-500">★ {plan.company.ratingAvg.toFixed(1)}</span>
                </div>
                <CardTitle className="mt-2">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-4">
                  <span className="text-3xl font-black">{formatPrice(plan.monthlyPrice, plan.currency)}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="mb-4 flex-1 space-y-2 text-sm">
                  {plan.coverages.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      {c.included ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={c.included ? '' : 'text-muted-foreground line-through'}>{c.title}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="accent" className="w-full">Get a quote</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
