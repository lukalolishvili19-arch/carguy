'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-store';
import { Link, useRouter } from '@/i18n/navigation';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const schema = z.object({
  displayName: z.string().min(2, 'Too short'),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only'),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  asBusiness: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const registerUser = useAuth((s) => s.register);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { asBusiness: false } });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Account created!');
      router.push(data.asBusiness ? '/business/checkout' : '/');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_60%)]" />
      <Card className="w-full max-w-md p-8">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground glow-red">C</div>
          <span className="text-xl font-black">Car<span className="text-primary">Guy</span></span>
        </Link>
        <h1 className="text-center text-2xl font-bold">{t('createAccount')}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t('registerSubtitle')}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">{t('displayName')}</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName && <p className="text-xs text-primary">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">{t('username')}</Label>
            <Input id="username" {...register('username')} />
            {errors.username && <p className="text-xs text-primary">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-primary">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-primary">{errors.password.message}</p>}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" className="mt-1 h-4 w-4" {...register('asBusiness')} />
            <span>
              <span className="block text-sm font-semibold">Business ანგარიში — 10 ₾/თვე</span>
              <span className="text-xs text-muted-foreground">
                კომპანიის განთავსება სერვისებში. რეგისტრაციის შემდეგ გადაიხდი თვიურ გამოწერას.
              </span>
            </span>
          </label>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('register')}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" size="lg" asChild>
          <a href={`${API_URL}/auth/google`}>{t('continueWithGoogle')}</a>
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t('login')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
