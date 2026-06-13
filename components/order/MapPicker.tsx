"use client";

// Delivery location picker — Leaflet + OpenStreetMap (free, no API key).
// Loaded dynamically (ssr:false) from CheckoutPanel.

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SHOP, DELIVERY_RADIUS_KM, haversineKm } from "@/lib/orders";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#B59556;border:3px solid #14160E;box-shadow:0 0 0 2px #B59556"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({
  onChange,
}: {
  onChange: (v: { lat: number; lng: number; distanceKm: number; inRange: boolean }) => void;
}) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  const distanceKm = useMemo(
    () => (pos ? haversineKm(SHOP.lat, SHOP.lng, pos.lat, pos.lng) : 0),
    [pos]
  );

  useEffect(() => {
    if (pos) onChange({ ...pos, distanceKm, inRange: distanceKm <= DELIVERY_RADIUS_KM });
  }, [pos, distanceKm, onChange]);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div>
      <div className="overflow-hidden rounded-sm border border-cream/15">
        <MapContainer
          center={[SHOP.lat, SHOP.lng]}
          zoom={14}
          style={{ height: 280, width: "100%", background: "#14160E" }}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle
            center={[SHOP.lat, SHOP.lng]}
            radius={DELIVERY_RADIUS_KM * 1000}
            pathOptions={{ color: "#B59556", weight: 1, fillColor: "#B59556", fillOpacity: 0.06 }}
          />
          <Marker position={[SHOP.lat, SHOP.lng]} icon={pin} />
          {pos && <Marker position={[pos.lat, pos.lng]} icon={pin} />}
          <ClickCatcher onPick={(lat, lng) => setPos({ lat, lng })} />
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={locate}
          className="rounded-full border border-gold-500/40 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-brand text-gold-400 transition-colors hover:border-gold-500"
        >
          Use my location
        </button>
        <p className="font-body text-xs text-cream/55">
          {pos
            ? `${distanceKm.toFixed(1)} km away — ${
                distanceKm <= DELIVERY_RADIUS_KM ? "we deliver here ✓" : `outside our ${DELIVERY_RADIUS_KM} km zone`
              }`
            : "Tap the map to drop your delivery pin."}
        </p>
      </div>
    </div>
  );
}
