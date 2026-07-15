'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  BRAND_NAMES,
  GEORGIAN_CITIES,
  getModelsForBrand,
  getYearOptions,
} from '@/features/marketplace/marketplace-data';

const categories = [
  'MECHANIC',
  'DETAILING',
  'CAR_WASH',
  'TUNING',
  'TIRES',
  'BODY_REPAIR',
  'DEALERSHIP',
  'DIAGNOSTICS',
  'OIL_CHANGE',
  'PAINT_SHOP',
] as const;

const CAPABILITY_OPTIONS = [
  'ზეთის შეცვლა',
  'დიაგნოსტიკა',
  'ძრავის რემონტი',
  'ტრანსმისია',
  'საკიდარი',
  'ელექტროობა',
  'კონდიციონერი',
  'საბურავები / დისკები',
  'საღებავი',
  'კუზოვის რემონტი',
  'დეტეილინგი',
  'სამრეცხაო',
  'ტიუნინგი',
  'გადახვევა / PPF',
  'კერამიკული საფარი',
];

const selectClass =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Props {
  onCreated?: () => void;
}

export function CreateBusinessButton({ onCreated }: Props) {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user || (user.role !== 'BUSINESS' && user.role !== 'ADMIN')) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> კომპანიის დამატება
      </Button>
      {open && (
        <CreateBusinessModal
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            onCreated?.();
          }}
        />
      )}
    </>
  );
}

function CreateBusinessModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const qc = useQueryClient();
  const years = getYearOptions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('MECHANIC');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [customCapability, setCustomCapability] = useState('');

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of brands) getModelsForBrand(b).forEach((m) => set.add(m));
    return Array.from(set).sort();
  }, [brands]);

  useEffect(() => {
    setModels((prev) => prev.filter((m) => modelOptions.includes(m)));
  }, [modelOptions]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const create = useMutation({
    mutationFn: () =>
      unwrap(
        api.post('/businesses', {
          name: name.trim(),
          description: description.trim(),
          category,
          phone: phone.trim(),
          city,
          addressLine: addressLine.trim() || undefined,
          country: 'Georgia',
          supportedBrands: brands,
          supportedModels: models,
          yearFrom: yearFrom ? Number(yearFrom) : undefined,
          yearTo: yearTo ? Number(yearTo) : undefined,
          capabilities,
        }),
      ),
    onSuccess: () => {
      toast.success('კომპანია დაემატა');
      qc.invalidateQueries({ queryKey: ['services'] });
      qc.invalidateQueries({ queryKey: ['business'] });
      onCreated();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function submit() {
    if (!name.trim()) return toast.error('კომპანიის სახელი სავალდებულოა');
    if (description.trim().length < 10) return toast.error('აღწერა სავალდებულოა (მინ. 10 სიმბოლო)');
    if (!phone.trim()) return toast.error('ტელეფონის ნომერი სავალდებულოა');
    if (!city) return toast.error('ლოკაცია (ქალაქი) სავალდებულოა');
    if (!brands.length) return toast.error('აირჩიე მინიმუმ ერთი მარკა');
    if (!capabilities.length) return toast.error('მიუთითე რისი გაკეთება შეგიძლია');
    create.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">კომპანიის განთავსება</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>კომპანიის სახელი *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto Service Tbilisi" />
          </div>

          <div className="space-y-1.5">
            <Label>კატეგორია *</Label>
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as any)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>ტელეფონის ნომერი *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+995 5XX XX XX XX" />
          </div>

          <div className="space-y-1.5">
            <Label>ლოკაცია (ქალაქი) *</Label>
            <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">აირჩიე ქალაქი</option>
              {GEORGIAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>მისამართი</Label>
            <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="ქუჩა, ნომერი" />
          </div>

          <div className="space-y-1.5">
            <Label>კომპანიის შესახებ *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[90px]"
              placeholder="რას აკეთებთ, გამოცდილება..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>მარკები, რომლებზეც მუშაობთ *</Label>
            <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border p-2">
              {BRAND_NAMES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggle(brands, b, setBrands)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    brands.includes(b) ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {brands.length > 0 && (
            <div className="space-y-1.5">
              <Label>მოდელები</Label>
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border p-2">
                {modelOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggle(models, m, setModels)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      models.includes(m) ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>წელი დან</Label>
              <select className={selectClass} value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}>
                <option value="">—</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>წელი მდე</Label>
              <select className={selectClass} value={yearTo} onChange={(e) => setYearTo(e.target.value)}>
                <option value="">—</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>რის გაკეთება შეგიძლიათ *</Label>
            <div className="flex flex-wrap gap-2">
              {CAPABILITY_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(capabilities, c, setCapabilities)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    capabilities.includes(c) ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={customCapability}
                onChange={(e) => setCustomCapability(e.target.value)}
                placeholder="სხვა სერვისი..."
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const v = customCapability.trim();
                  if (!v) return;
                  if (!capabilities.includes(v)) setCapabilities([...capabilities, v]);
                  setCustomCapability('');
                }}
              >
                დამატება
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            გამოქვეყნება
          </Button>
        </div>
      </Card>
    </div>
  );
}
