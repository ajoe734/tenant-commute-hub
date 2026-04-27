import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const MapPicker: React.FC<MapPickerProps> = ({
  onLocationSelect,
  initialLat = 25.033,
  initialLng = 121.5654,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");

  useEffect(() => {
    // Check for Mapbox token in localStorage
    const storedToken = localStorage.getItem("mapbox_token");
    if (storedToken) {
      setMapboxToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [initialLng, initialLat],
        zoom: 13,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add marker
      marker.current = new mapboxgl.Marker({ draggable: true })
        .setLngLat([initialLng, initialLat])
        .addTo(map.current);

      // Handle marker drag
      marker.current.on("dragend", async () => {
        const lngLat = marker.current!.getLngLat();

        // Reverse geocoding to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxToken}`,
          );
          const data = await response.json();
          const address =
            data.features[0]?.place_name ||
            `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
          onLocationSelect(lngLat.lat, lngLat.lng, address);
        } catch (error) {
          console.error("Geocoding error:", error);
          onLocationSelect(
            lngLat.lat,
            lngLat.lng,
            `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`,
          );
        }
      });

      // Handle map click
      map.current.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        marker.current?.setLngLat([lng, lat]);

        // Reverse geocoding
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`,
          );
          const data = await response.json();
          const address =
            data.features[0]?.place_name ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          onLocationSelect(lat, lng, address);
        } catch (error) {
          console.error("Geocoding error:", error);
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      map.current?.remove();
    };
  }, [initialLat, initialLng, mapboxToken, onLocationSelect]);

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem("mapbox_token", tokenInput.trim());
      setMapboxToken(tokenInput.trim());
    }
  };

  if (!mapboxToken) {
    return (
      <div className="space-y-4 p-6 border rounded-lg bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <h3 className="font-semibold">Mapbox Token Required</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Please enter your Mapbox public token to use the map. Get your token
          from{" "}
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            mapbox.com
          </a>
        </p>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="pk.eyJ1Ijoi..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSaveToken}>Save Token</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={mapContainer} className="w-full h-[400px] rounded-lg border" />
      <p className="text-sm text-muted-foreground">
        點擊地圖或拖動標記來選擇位置
      </p>
    </div>
  );
};

export default MapPicker;
