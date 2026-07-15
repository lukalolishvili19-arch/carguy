'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, X, Loader2, Upload, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap, apiErrorMessage, uploadFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  BRAND_NAMES,
  GEORGIAN_CITIES,
  RIM_RADIUS_OPTIONS,
  getModelsForBrand,
  getYearOptions,
} from './marketplace-data';

const categories = ['CAR', 'MOTORCYCLE', 'PART', 'WHEEL', 'ACCESSORY'] as const;
const fuelTypes = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'PLUGIN_HYBRID', 'LPG', 'HYDROGEN'] as const;
const vehicleCategories: string[] = ['CAR', 'MOTORCYCLE'];

const selectClass =
  'flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Props {
  onCreated?: () => void;
}

export function CreateListing({ onCreated }: Props) {
  const t = useTranslations('marketplace');
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4" /> {t('sell')}
      </Button>
      {open && (
        <CreateListingModal
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

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations('marketplace');
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const yearOptions = getYearOptions();

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>('CAR');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [city, setCity] = useState('');
  const [vin, setVin] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [engineSize, setEngineSize] = useState('');
  const [fuelType, setFuelType] = useState<(typeof fuelTypes)[number]>('PETROL');
  const [partNumber, setPartNumber] = useState('');
  const [rimWidth, setRimWidth] = useState('');
  const [rimHeight, setRimHeight] = useState('');
  const [rimRadius, setRimRadius] = useState('');
  const [description, setDescription] = useState('');

  const isVehicle = vehicleCategories.includes(category);
  const isWheel = category === 'WHEEL';
  const modelOptions = brand ? getModelsForBrand(brand) : [];

  useEffect(() => {
    setModel('');
  }, [brand]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadFile(file);
        setImages((prev) => [...prev, res.url]);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const create = useMutation({
    mutationFn: () => {
      const title = [year, brand, model].filter(Boolean).join(' ').trim() || brand || model;
      return unwrap(
        api.post('/marketplace', {
          title,
          description: description.trim() || undefined,
          category,
          price: Number(price),
          brand: brand || undefined,
          model: model || undefined,
          year: year ? Number(year) : undefined,
          city: city || undefined,
          country: 'Georgia',
          images,
          ...(isVehicle
            ? {
                vin: vin.trim() || undefined,
                mileage: mileage ? Number(mileage) : undefined,
                engineSize: engineSize ? Number(engineSize) : undefined,
                fuelType,
              }
            : {}),
          ...(isWheel
            ? {
                partNumber: partNumber.trim() || undefined,
                rimWidth: rimWidth ? Number(rimWidth) : undefined,
                rimHeight: rimHeight ? Number(rimHeight) : undefined,
                rimRadius: rimRadius ? Number(rimRadius) : undefined,
              }
            : {}),
        }),
      );
    },
    onSuccess: () => {
      toast.success(t('createdToast'));
      qc.invalidateQueries({ queryKey: ['marketplace'] });
      onCreated();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  function submit() {
    if (!images.length) return toast.error(t('uploadPhotos'));
    if (!brand || !model || !year) return toast.error(`${t('brand')} / ${t('model')} / ${t('year')}`);
    if (!price) return toast.error(t('price'));
    if (!city) return toast.error(t('location'));
    if (isVehicle && vin.trim() && vin.trim().length !== 17) return toast.error(t('vinError'));
    if (isWheel) {
      if (!partNumber.trim()) return toast.error(t('partNumber'));
      if (!rimWidth || !rimHeight || !rimRadius) return toast.error(t('rimDimensions'));
    }
    create.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('newListing')}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('photos')}</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-secondary"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('category')}</Label>
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as any)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('brand')}</Label>
              <select className={selectClass} value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">{t('selectBrand')}</option>
                {BRAND_NAMES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('model')}</Label>
              <select
                className={selectClass}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!brand}
              >
                <option value="">{t('selectModel')}</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('year')}</Label>
              <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">{t('selectYear')}</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('price')} (₾)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25000" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('location')}</Label>
            <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t('selectCity')}</option>
              {GEORGIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {isWheel && (
            <>
              <div className="space-y-1.5">
                <Label>{t('partNumber')}</Label>
                <Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="P/N 123456" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('rimWidth')}</Label>
                  <Input type="number" value={rimWidth} onChange={(e) => setRimWidth(e.target.value)} placeholder="205" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('rimHeight')}</Label>
                  <Input type="number" value={rimHeight} onChange={(e) => setRimHeight(e.target.value)} placeholder="55" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('rimRadius')}</Label>
                  <select className={selectClass} value={rimRadius} onChange={(e) => setRimRadius(e.target.value)}>
                    <option value="">R</option>
                    {RIM_RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={r}>R{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {isVehicle && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('mileage')} (km)</Label>
                  <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="80000" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('engine')}</Label>
                  <Input type="number" step="0.1" value={engineSize} onChange={(e) => setEngineSize(e.target.value)} placeholder="2.0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('fuel')}</Label>
                <select className={selectClass} value={fuelType} onChange={(e) => setFuelType(e.target.value as any)}>
                  {fuelTypes.map((f) => (
                    <option key={f} value={f}>
                      {f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('vin')}</Label>
                <Input
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  maxLength={17}
                  placeholder="WBAXXXXXXXXXXXXXX"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>
              {t('description')} <span className="text-muted-foreground">({t('optional')})</span>
            </Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[90px]" />
          </div>

          <Button className="w-full" onClick={submit} disabled={create.isPending || uploading}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t('publish')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
