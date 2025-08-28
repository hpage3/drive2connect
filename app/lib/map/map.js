import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = "pk.eyJ1Ijoicm9tZW8yMDI1IiwiYSI6ImNtOTRsenl2ZjB5ZW4ya3E4bjdrYWR2NWcifQ.lhqHkfQZIUqZtS0t1Yq73w";

export function initMap(onReady) {
  const container = document.getElementById("map");
  if (!container) {
    console.warn("⏳ Map container not ready yet");
    return null;
  }

  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/streets-v11",
    center: [-74.5, 40],
    zoom: 9,
  });

  map.on("load", () => {
    console.log("🗺️ Map loaded");
    if (onReady) onReady();
  });

  return map;
}
