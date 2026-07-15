'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Plus, Gauge, Wrench, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';

interface Vehicle {
  id: string;
  nickname?: string;
  brand: string;
  model: string;
  year: number;
  mileage?: number;
  media?: { url: string }[];
  _count?: { maintenance: number; modifications: number; reminders: number };
}

interface VehicleForm {
  nickname: string;
  brand: string;
  model: string;
  year: string;
  mileage: string;
  color: string;
  licensePlate: string;
}

const emptyForm: VehicleForm = {
  nickname: '',
  brand: '',
  model: '',
  year: '',
  mileage: '',
  color: '',
  licensePlate: '',
};

export default function GaragePage() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['garage'],
    queryFn: () => unwrap<Vehicle[]>(api.get('/garage')),
    enabled: !!user,
  });

  const createVehicle = useMutation({
    mutationFn: () =>
      unwrap<Vehicle>(
        api.post('/garage', {
          nickname: form.nickname || undefined,
          brand: form.brand.trim(),
          model: form.model.trim(),
          year: Number(form.year),
          mileage: form.mileage ? Number(form.mileage) : undefined,
          color: form.color || undefined,
          licensePlate: form.licensePlate || undefined,
        }),
      ),
    onSuccess: () => {
      toast.success('Vehicle added');
      setForm(emptyForm);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['garage'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function submit() {
    if (!form.brand.trim() || !form.model.trim() || !form.year) {
      toast.error('Brand, model and year are required');
      return;
    }
    createVehicle.mutate();
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Car className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Log in to manage your garage.</p>
        <Button className="mt-4" asChild><Link href="/login">Log in</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">My Garage</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add vehicle'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input id="nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Daily driver" />
            </div>
            <div>
              <Label htmlFor="brand">Brand *</Label>
              <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="BMW" />
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="M3" />
            </div>
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input id="year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2020" />
            </div>
            <div>
              <Label htmlFor="mileage">Mileage (km)</Label>
              <Input id="mileage" type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} placeholder="45000" />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Black" />
            </div>
            <div>
              <Label htmlFor="plate">License plate</Label>
              <Input id="plate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="AA-001-BB" />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={submit} disabled={createVehicle.isPending}>
                {createVehicle.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save vehicle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((v) => (
            <Card key={v.id} className="card-hover overflow-hidden">
              <div className="relative flex aspect-video items-center justify-center bg-muted">
                {v.media?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.media[0].url} alt={v.brand} className="h-full w-full object-cover" />
                ) : (
                  <Car className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <CardContent className="pt-4">
                <h3 className="font-bold">{v.nickname ?? `${v.brand} ${v.model}`}</h3>
                <p className="text-sm text-muted-foreground">{v.year} · {v.brand} {v.model}</p>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  {v.mileage != null && <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{v.mileage.toLocaleString()} km</span>}
                  <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{v._count?.maintenance ?? 0} logs</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <Car className="mx-auto mb-3 h-10 w-10" />
          Your garage is empty. Add your first vehicle!
        </Card>
      )}
    </div>
  );
}
