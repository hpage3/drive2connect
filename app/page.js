"use client";
import { useState, useEffect, useRef } from "react";
import {
  joinRoom,
  disconnectRoom,
  toggleMute,
  sendReaction,
} from "./lib/voice/room";
import { initMap } from "./lib/map/map";
import Controls from "./components/Controls";
import Status from "./components/Status";
import { RoomEvent } from "livekit-client";

export default function Home() {
  const [roomName] = useState("lobby");
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState("");
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [status, setStatus] = useState("");

  const reshuffleTimer = useRef(null);
  const warningTimer = useRef(null);

  // --- Audio helper
  function playAudio(src) {
    const audio = new Audio(src);
    audio.play()
      .then(() => console.log("▶️ Playing:", src))
      .catch((err) => console.error("❌ Audio play failed:", src, err));
  }

 
  function resyncParticipants(room) {
  if (!room || !room.participants) {
    console.log("⚠️ No participants yet to resync");
    return;
  }

  const selfId = room.localParticipant?.identity;

  const remote = Array.from(room.participants?.values() || []).filter(
    (p) => p.identity !== selfId
  );

  setParticipants(remote);
  console.log("🔄 Participant list resynced:", remote.map(p => p.identity));
}

  // --- Schedule reshuffle timers
  function scheduleReshuffle() {
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    console.log("⏳ Scheduling reshuffle warning at 30s");
    warningTimer.current = setTimeout(() => {
      console.log("⚠️ Reshuffle warning fired");
      playAudio("/Reshuffle.mp3");
    }, 30 * 1000);

    console.log("⏳ Scheduling reshuffle at 60s");
    reshuffleTimer.current = setTimeout(() => {
      console.log("🔄 Reshuffle triggered");
      handleReshuffle();
    }, 60 * 1000);
  }

  // --- Setup participant listeners
function setupParticipantHandlers(newRoom) {
  setParticipants([]); // Clear old

  // Initial Snapshot (after short delay)
  setTimeout(() => {
    const remote = newRoom.participants
      ? Array.from(newRoom.participants.values())
      : [];

	const selfId = newRoom.localParticipant?.identity;

	const remoteOnly = remote.filter((p) => p.identity !== selfId);

	setParticipants(remoteOnly);
	console.log("👥 Synced participants on join:", remoteOnly.map(p => p.identity));

  }, 1500);

  // 🧱 Safeguard all handlers

  newRoom.on(RoomEvent.ParticipantConnected, (p) => {
  const selfId = newRoom.localParticipant?.identity;
  if (!p?.identity || p.identity === selfId) {
    return;
  }

  setParticipants((prev) => {
    if (prev.some((x) => x.identity === p.identity)) return prev;
    return [...prev, p];
  });
  console.log("👤 New participant joined:", p.identity);
});

  newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
    if (!p?.identity) return;

    setParticipants((prev) =>
      prev.filter((x) => x.identity !== p.identity)
    );
    console.log("👤 Participant left:", p.identity);
  });
}


  // --- Join Room
  async function handleJoin() {
    try {
      await joinRoom({
        roomName,
        username,
        onConnected: (newRoom, handle) => {
          setRoom(newRoom);
          setUsername((prev) => prev || handle);
          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);

          console.log("✅ Connected as", handle);

          setupParticipantHandlers(newRoom);
          scheduleReshuffle();
          playAudio("/RoameoRoam.mp3");
		  setTimeout(() => resyncParticipants(newRoom), 2000);
        },
        onDisconnected: () => {
		  console.log("❌ Disconnected");
		  if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
		  if (warningTimer.current) clearTimeout(warningTimer.current);
		  setRoom(null);
		  setParticipants([]);
		  setConnectText("Connect");
		  setConnectDisabled(false);
		  setIsMuted(false);
		  // ⚠️ do NOT clear username here — preserve across reshuffles
		},

      });
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
      setConnectDisabled(false);
      setConnectText("Connect");
    }
  }

  // --- Disconnect Room
  function handleDisconnect() {
    console.log("👋 Manual disconnect");
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    disconnectRoom(room);
    setRoom(null);
    setParticipants([]);
    setConnectDisabled(false);
    setConnectText("Connect");
    setIsMuted(false);
  }

  // --- Reshuffle
  async function handleReshuffle() {
    console.log("🔄 Performing reshuffle…");
    try {
      disconnectRoom(room);
      await new Promise((r) => setTimeout(r, 500));

      playAudio("/RoameoRoam.mp3");

      await joinRoom({
        roomName,
        username,
        onConnected: (newRoom, handle) => {
          console.log("✅ Reconnected after reshuffle as", handle);
          setRoom(newRoom);
          setUsername((prev) => prev || handle);
          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);
          setStatus("");

          setupParticipantHandlers(newRoom);
          scheduleReshuffle();
		  setTimeout(() => resyncParticipants(newRoom), 2000); 
        },
        onDisconnected: () => {
		  console.log("❌ Disconnected after reshuffle");
		  setRoom(null);
		  setParticipants([]);
		  setConnectText("Connect");
		  setConnectDisabled(false);
		  setIsMuted(false);
		  // ⚠️ do NOT clear username here either
		},
      });
    } catch (err) {
      console.error("❌ Reshuffle failed:", err);
      setStatus("Reshuffle failed");
    }
  }

  // --- Toggle Mute
  async function handleMuteToggle() {
    if (!room) return;
    await toggleMute(room, isMuted);
    setIsMuted(!isMuted);
  }

  // --- Reactions
  function handleReaction(type) {
    if (!room) return;
    sendReaction(room, type);
  }

  // --- Map Init
  useEffect(() => {
    initMap("map", () => {
      setConnectDisabled(false);
      setConnectText("Connect");
    });
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div id="map" className="absolute top-0 left-0 w-full h-full" />

      {/* User + Participants */}
      {room && (
        <div className="absolute top-5 left-5 z-50 space-y-2">
          <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
            You are <strong>{username}</strong>
          </div>
          {participants.map((p) => (
            <div
              key={p.identity}
              className="bg-black/50 text-white px-3 py-1 rounded"
            >
              {p.identity}
            </div>
          ))}
        </div>
      )}

      {/* Connect / Disconnect */}
      {!room && (
        <button
          onClick={handleJoin}
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
          onClick={handleDisconnect}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 
                     px-6 py-3 rounded-xl font-bold z-50 
                     bg-red-600 text-white hover:bg-red-700"
        >
          Disconnect
        </button>
      )}

      {/* Controls */}
      {room && (
        <Controls
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          onReaction={handleReaction}
        />
      )}

      {/* Status */}
      {status && <Status message={status} />}
    </div>
  );
}
