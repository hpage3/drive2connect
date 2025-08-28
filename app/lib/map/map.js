"use client";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1Ijoicm9tZW8yMDI1IiwiYSI6ImNtOTRsenl2ZjB5ZW4ya3E4bjdrYWR2NWcifQ.lhqHkfQZIUqZtS0t1Yq73w";

export function initMap(containerId = "map", onReady) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("❌ Map container not found");
    return;
  }

  // Default center (fallback = NJ)
  let defaultCenter = [-74.5, 40];

  // Try to get user location
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      console.log("📍 Got user location:", latitude, longitude);
      setupMap(containerId, [longitude, latitude], onReady);
    },
    (err) => {
      console.warn("⚠️ Geolocation failed, using fallback:", err.message);
      setupMap(containerId, defaultCenter, onReady);
    }
  );
}

function setupMap(containerId, center, onReady) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const map = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/streets-v11",
    center,
    zoom: 12,
  });

  map.on("load", () => {
    console.log("🗺️ Map ready at", center);
    new mapboxgl.Marker().setLngLat(center).addTo(map);
    if (typeof onReady === "function") onReady();
  });
}
