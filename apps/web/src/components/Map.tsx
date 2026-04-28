"use client";

import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type MapPoint = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  description?: string;
};

interface MapProps {
  center?: [number, number];
  zoom?: number;
  points?: MapPoint[];
}

const InteractiveMap: React.FC<MapProps> = ({
  center = [84.1240, 28.3949], // Nepal center
  zoom = 7,
  points = [],
}) => {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });

  const mapCenter: LatLngExpression = [center[1], center[0]];

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden glass-card shadow-2xl">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="absolute inset-0 z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lng] as LatLngExpression}>
            <Popup>
              <strong>{point.name}</strong>
              {point.description ? <p>{point.description}</p> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-4 left-4 z-10 glass-morphism p-4 rounded-xl text-white pointer-events-none">
        <h3 className="text-lg font-bold">TourChain Route Map</h3>
        <p className="text-xs opacity-70">OpenStreetMap (free) + live Supabase places</p>
      </div>
      <div className="absolute top-4 right-4 z-10 bg-trekker-orange p-3 rounded-full shadow-lg">
        <span className="block w-3 h-3 bg-white rounded-full" />
      </div>
    </div>
  );
};

export default InteractiveMap;
