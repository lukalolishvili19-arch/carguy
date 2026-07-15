'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api, unwrap } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const placeTypes = ['MECHANIC', 'FUEL_STATION', 'EV_CHARGER', 'CAR_WASH', 'PARKING', 'DEALERSHIP'];
const DEFAULT_CENTER: [number, number] = [44.8271, 41.7151]; // Tbilisi

interface Place {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  ratingAvg: number;
}

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [type, setType] = useState<string>();

  const { data: config } = useQuery({
    queryKey: ['map', 'config'],
    queryFn: () => unwrap<{ mapboxToken: string }>(api.get('/map/config')),
  });

  const { data: places } = useQuery({
    queryKey: ['map', 'nearby', center, type],
    queryFn: () =>
      unwrap<Place[]>(
        api.get('/map/nearby', { params: { lat: center[1], lng: center[0], radiusKm: 30, type } }),
      ),
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.longitude, pos.coords.latitude]),
        () => undefined,
      );
    }
  }, []);

  useEffect(() => {
    if (!config?.mapboxToken || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = config.mapboxToken;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: 11,
    });
  }, [config, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !places) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = places.map((p) => {
      const el = document.createElement('div');
      el.className = 'flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-lg';
      el.textContent = p.name.charAt(0);
      return new mapboxgl.Marker(el)
        .setLngLat([p.longitude, p.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<b>${p.name}</b><br/>${p.distanceKm} km`))
        .addTo(map);
    });
  }, [places]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-3xl font-black">Map</h1>
      <p className="mb-4 text-muted-foreground">Find mechanics, fuel, EV chargers and more nearby</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={!type ? 'default' : 'outline'} size="sm" onClick={() => setType(undefined)}>All</Button>
        {placeTypes.map((pt) => (
          <Button key={pt} variant={type === pt ? 'default' : 'outline'} size="sm" onClick={() => setType(pt)}>
            {pt.replace('_', ' ').toLowerCase()}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {config?.mapboxToken ? (
          <div ref={containerRef} className="h-[600px] overflow-hidden rounded-2xl border border-border" />
        ) : (
          <Card className="flex h-[600px] items-center justify-center text-center text-muted-foreground">
            Set NEXT_PUBLIC_MAPBOX_TOKEN / MAPBOX_ACCESS_TOKEN to enable the map.
          </Card>
        )}
        <div className="space-y-2 lg:max-h-[600px] lg:overflow-y-auto scrollbar-thin">
          {places?.map((p) => (
            <Card key={p.id} className="p-3">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.type.replace('_', ' ').toLowerCase()} · {p.distanceKm} km · ★ {p.ratingAvg.toFixed(1)}
              </p>
            </Card>
          ))}
          {places?.length === 0 && <p className="text-sm text-muted-foreground">No places found nearby.</p>}
        </div>
      </div>
    </div>
  );
}
