import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = "pk.eyJ1Ijoicm9tZW8yMDI1IiwiYSI6ImNtOTRsenl2ZjB5ZW4ya3E4bjdrYWR2NWcifQ.lhqHkfQZIUqZtS0t1Yq73w";

export function initMap(containerId, onLoad) {
  const map = new mapboxgl.Map({
    container: containerId,
    style: "mapbox://styles/mapbox/streets-v11",
    center: [-84.39, 33.75],
    zoom: 9,
  });

  map.on("load", () => {
    if (onLoad) onLoad();
  });

  return map;
}
