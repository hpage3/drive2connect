"use client";

import { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as h3 from "h3-js";
import { Room, RoomEvent } from "livekit-client";

export default function Home() {
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [status, setStatus] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [room, setRoom] = useState(null);

  // LiveKit constants
  const LK_WS_URL = "wss://drive2connect-hvmppwa2.livekit.cloud";
  const TOKEN_API = "/api/token"; // ✅ Next.js route

  // Generate random handle
  function generateHandle() {
    const adjectives = [
      "Fast", "Lonely", "Wild", "Rusty", "Silver",
      "Sleepy", "Lucky", "Rough", "Free", "Roamin"
    ];
    const nouns = [
      "Coyote", "Mustang", "Outlaw", "Wanderer",
      "Nomad", "Hawk", "Fox", "Bison", "Drifter", "Thunder"
    ];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Math.floor(100 + Math.random() * 900)}`;
  }

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1Ijoicm9tZW8yMDI1IiwiYSI6ImNtOTRsenl2ZjB5ZW4ya3E4bjdrYWR2NWcifQ.lhqHkfQZIUqZtS0t1Yq73w";

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-98.5795, 39.8283],
      zoom: 10,
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const zone = h3.geoToH3(rawLat, rawLng, 7);
        const [zoneLat, zoneLng] = h3.h3ToGeo(zone);

        map.setCenter([zoneLng, zoneLat]);
        new mapboxgl.Marker().setLngLat([rawLng, rawLat]).addTo(map);

        setConnectDisabled(false);
        setConnectText("Connect");

        // store location in DOM (simpler than state juggling here)
        document.body.dataset.hexId = zone;
      },
      (err) => {
        console.error("Geolocation error:", err);
        setConnectText("Location Required");
        setConnectDisabled(true);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  async function joinVoiceRoom() {
    const zoneId = document.body.dataset.hexId;
    if (!zoneId) return alert("Waiting for location…");

    const nickname = encodeURIComponent(generateHandle());
    const roomName = `drive2connect_${zoneId}`;

    try {
      // 1) Request token
      const resp = await fetch(`${TOKEN_API}?room=${roomName}&user=${nickname}`);
      const data = await resp.json();
      if (!data.token) throw new Error("Token API failed");

      // 2) Connect to LiveKit
      const r = new Room();
      await r.connect(LK_WS_URL, data.token);
      await r.localParticipant.setMicrophoneEnabled(false);

      setRoom(r);
      setOverlayVisible(true);
      setStatus(`Room: ${roomName} | You: ${decodeURIComponent(nickname)}`);

      // handle remote audio
      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const el = track.attach();
          el.autoplay = true;
          el.playsInline = true;
          el.style.display = "none";
          document.body.appendChild(el);
        }
      });

      r.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });
    } catch (err) {
      console.error(err);
      alert("Voice connection failed.");
      setConnectText("Connect");
      setConnectDisabled(false);
    }
  }

  function send(type) {
    if (!room) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type }));
    room.localParticipant.publishData(payload, { topic: "ui", reliable: true });setCenter
  }

  return (
    <div className="w-full h-screen relative">
      <div id="map" className="absolute inset-0" />
		<button
			id="connectBtn"
			disabled={connectDisabled}
			onClick={joinVoiceRoom}
			className="absolute bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white font-medium z-50"
			style={{ backgroundColor: connectDisabled ? "#888" : "#1db954" }}
		>
			{connectText}
		</button>

      {overlayVisible && (
        <div id="overlay" className="absolute bottom-5 right-5 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-black text-white"
              onMouseDown={() => room.localParticipant.setMicrophoneEnabled(true)}
              onMouseUp={() => room.localParticipant.setMicrophoneEnabled(false)}
              onTouchStart={(e) => { e.preventDefault(); room.localParticipant.setMicrophoneEnabled(true); }}
              onTouchEnd={(e) => { e.preventDefault(); room.localParticipant.setMicrophoneEnabled(false); }}
            >
              Hold to Talk
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-black text-white"
              onClick={() => room.localParticipant.setMicrophoneEnabled(false)}
            >
              Mute
            </button>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={() => send("like")}>👍</button>
            <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={() => send("dislike")}>👎</button>
            <button className="px-4 py-2 rounded-lg bg-red-700 text-white" onClick={() => send("report")}>Report</button>
          </div>

          <div id="status" className="text-xs text-white text-right mt-2">{status}</div>
        </div>
      )}
    </div>
  );
}
