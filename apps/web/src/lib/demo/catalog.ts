export type DemoRoute = {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  duration_days: number;
  image_url: string;
  max_altitude_meters: number;
};

export type DemoPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
};

export const DEMO_ROUTES: DemoRoute[] = [
  {
    id: "demo-route-1",
    name: "Poon Hill Sunrise Trek",
    region: "Annapurna",
    difficulty: "easy",
    duration_days: 4,
    image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    max_altitude_meters: 3210,
  },
  {
    id: "demo-route-2",
    name: "Annapurna Circuit",
    region: "Annapurna",
    difficulty: "challenging",
    duration_days: 15,
    image_url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80",
    max_altitude_meters: 5416,
  },
  {
    id: "demo-route-3",
    name: "Everest Base Camp",
    region: "Khumbu",
    difficulty: "challenging",
    duration_days: 14,
    image_url: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&q=80",
    max_altitude_meters: 5364,
  },
  {
    id: "demo-route-4",
    name: "Langtang Valley",
    region: "Langtang",
    difficulty: "moderate",
    duration_days: 8,
    image_url: "https://images.unsplash.com/photo-1482192505345-5655af888cc4?w=1200&q=80",
    max_altitude_meters: 4984,
  },
  {
    id: "demo-route-5",
    name: "Mardi Himal Trek",
    region: "Annapurna",
    difficulty: "moderate",
    duration_days: 6,
    image_url: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1200&q=80",
    max_altitude_meters: 4500,
  },
  {
    id: "demo-route-6",
    name: "Manaslu Circuit",
    region: "Gorkha",
    difficulty: "extreme",
    duration_days: 16,
    image_url: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&q=80",
    max_altitude_meters: 5106,
  },
];

const baseLat = 28.20;
const baseLng = 83.80;

export const DEMO_PLACES: DemoPlace[] = Array.from({ length: 30 }, (_, idx) => {
  const n = idx + 1;
  return {
    id: `demo-place-${n}`,
    name: `Checkpoint ${n}`,
    latitude: Number((baseLat + idx * 0.02).toFixed(6)),
    longitude: Number((baseLng + ((idx % 5) - 2) * 0.03).toFixed(6)),
    description: `Scenic checkpoint ${n} with mountain and village views.`,
  };
});

