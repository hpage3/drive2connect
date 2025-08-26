"use client";

import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

export default function MapView({ onReady }) {
  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1Ijoicm9tZW8yMDI1IiwiYSI6ImNtOTRsenl2ZjB5ZW4ya3E4bjdrYWR2NWcifQ.lhqHkfQZIUqZtS0t1Yq73w";

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-84.39, 33.75],
      zoom: 9,
    });

    map.on("load", () => {
      if (onReady) onReady();
    });

    return () => map.remove();
  }, [onReady]);

  return <div id="map" className="absolute top-0 left-0 w-full h-full" />;
}
