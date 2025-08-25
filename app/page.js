"use client";

import { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

export default function Home() {
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [status, setStatus] = useState("");
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  // LiveKit constants
  const LK_WS_URL = "wss://drive2connect-hvmppwa2.livekit.cloud";
  const TOKEN_API = "/api/token";

  // Generate random handle
  function generateHandle() {
    const adjectives = ["Fast", "Lonely", "Wild", "Rusty", "Silver", "Sleepy", "Lucky", "Rough", "Free", "Roamin"];
    const nouns = ["Driver", "Rider", "Nomad", "Explorer", "Drifter", "Traveler"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  // Connect handler
  async function joinVoiceRoom() {
    try {
      const handle = generateHandle();
      setUsername(handle);

      // 1) Fetch token
      const res = await fetch(`/api/token?room=testroom&user=${handle}`);
      const data = await res.json();
      if (!data.token) throw new Error("No token returned");

      // 2) Connect to LiveKit
      const newRoom = new Room();
      await newRoom.connect(LK_WS_URL, data.token);

      // 3) Publish microphone automatically
      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);
      setIsMuted(false); // start unmuted

      // 4) Handle remote audio
      newRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const audioEl = track.attach();
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      newRoom.on(RoomEvent.ParticipantConnected, (p) => {
        console.log("Participant connected:", p.identity);
      });
      newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
        console.log("Participant disconnected:", p.identity);
      });

      setRoom(newRoom);
      setConnectDisabled(true);
      setConnectText("Connected");

      const adAudio = new Audio("/RoameoRoam.mp3");
      adAudio.play();
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
      setConnectDisabled(false);
      setConnectText("Connect");
    }
  }

  // Disconnect handler
  function disconnectRoom() {
	if (room) {
		room.disconnect();
		setRoom(null);
		setConnectDisabled(false);
		setConnectText("Connect");
		setIsMuted(false);
	}
  }

  // Toggle mute/unmute
  async function toggleMute() {
    if (!room) return;
    const enable = isMuted; // if muted, re-enable mic
    await room.localParticipant.setMicrophoneEnabled(enable);
    setIsMuted(!enable);
  }

  // Send reactions
  function send(type) {
    if (!room) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type }));
    room.localParticipant.publishData(payload, { topic: "ui", reliable: true });
  }

  // Setup Mapbox
  useEffect(() => {
    mapboxgl.accessToken = "pk.eyJ1Ijoicm9tZW8yMDI1IiwiYSI6ImNtOTRsenl2ZjB5ZW4ya3E4bjdrYWR2NWcifQ.lhqHkfQZIUqZtS0t1Yq73w";

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-84.39, 33.75],
      zoom: 9,
    });

    map.on("load", () => {
      setConnectDisabled(false);
      setConnectText("Connect");
    });
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div id="map" className="absolute top-0 left-0 w-full h-full" />

      {/* Username badge (only when connected) */}
      {room && (
        <div className="absolute top-5 left-5 bg-black/70 text-white px-4 py-2 rounded-lg z-50">
          You are <strong>{username}</strong>
        </div>
      )}

      {/* Connect / Disconnect */}
      {!room && (
        <button
          onClick={joinVoiceRoom}
          disabled={connectDisabled}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 
                     px-6 py-3 rounded-xl font-bold z-50 
                     bg-green-600 text-white hover:bg-green-700"
        >
          {connectText}
        </button>
      )}

      {room && (
        <button
          onClick={disconnectRoom}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 
                     px-6 py-3 rounded-xl font-bold z-50 
                     bg-red-600 text-white hover:bg-red-700"
        >
          Disconnect
        </button>
      )}

      {/* Controls */}
      {room && (
        <div className="controls">
          <button onClick={toggleMute} className="mute-btn">
            {isMuted ? "Unmute" : "Mute"}
          </button>
          <button className="like-btn" onClick={() => send("like")}>👍</button>
          <button className="dislike-btn" onClick={() => send("dislike")}>👎</button>
          <button className="report-btn" onClick={() => send("report")}>Report</button>
        </div>
      )}

      {/* Status (only when not connected, e.g. errors) */}
      {status && !room && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-md z-50">
          {status}
        </div>
      )}
    </div>
  );
}
