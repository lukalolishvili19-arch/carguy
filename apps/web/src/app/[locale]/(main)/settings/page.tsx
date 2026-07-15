'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface FormData {
  displayName: string;
  bio: string;
  city: string;
  website: string;
}

export default function SettingsPage() {
  const user = useAuth((s) => s.user);
  const { register, handleSubmit, reset } = useForm<FormData>();

  const { data } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => unwrap<any>(api.get('/profiles/me')),
    enabled: !!user,
  });

  useEffect(() => {
    if (data) reset({ displayName: data.displayName, bio: data.bio ?? '', city: data.city ?? '', website: data.website ?? '' });
  }, [data, reset]);

  const update = useMutation({
    mutationFn: (values: FormData) => unwrap<any>(api.put('/profiles/me', values)),
    onSuccess: () => toast.success('Profile updated'),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        <p>Log in to edit your settings.</p>
        <Button className="mt-4" asChild><Link href="/login">Log in</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-3xl font-black">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" {...register('displayName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" {...register('bio')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...register('website')} />
              </div>
            </div>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
