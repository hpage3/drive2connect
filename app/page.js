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
  const [username, setUsername] = useState("");           // preferred/sticky nameconst [localParticipant, setLocalParticipant] = useState(null); // actual LiveKit object
  const [participants, setParticipants] = useState([]);   // remotes only

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

  // --- Manage Participants
  function handleParticipantJoin(p) {
    setParticipants((prev) => [...prev, p]);
  }

  function handleParticipantLeave(p) {
    setParticipants((prev) => prev.filter((x) => x.identity !== p.identity));
  }

  function resyncParticipants(room) {
    if (!room || !room.participants) {
      console.log("⚠️ No participants yet to resync");
      return;
    }
    setParticipants(Array.from(room.participants.values()));
    console.log("🔄 Participant list resynced");
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
  // Start fresh
  setParticipants([]);

  // Initialize from current remote participants
  if (newRoom.participants) {
    setParticipants(Array.from(newRoom.participants.values()));
  }

  // Add when someone joins
  newRoom.on(RoomEvent.ParticipantConnected, (p) => {
    console.log("👥 Participant joined:", p.identity);
    setParticipants((prev) => [...prev, p]);
  });

  // Remove when someone leaves
  newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
    console.log("👥 Participant left:", p.identity);
    setParticipants((prev) =>
      prev.filter((x) => x.identity !== p.identity)
    );
  });

  // Cleanup on disconnect
  newRoom.once(RoomEvent.Disconnected, () => {
    console.log("👥 Room disconnected, clearing participants");
    setParticipants([]);
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

        // preserve chosen username, else fallback to LiveKit handle
        setUsername((prev) => prev || handle);

        // save LiveKit local participant
        setLocalParticipant(newRoom.localParticipant);

        setConnectText("Connected");
        setConnectDisabled(true);
        setIsMuted(false);

        console.log("✅ Connected as", handle);

        setupParticipantHandlers(newRoom);
        scheduleReshuffle();
        playAudio("/RoameoRoam.mp3");
      },
      onDisconnected: () => {
		  console.log("❌ Disconnected");
		  if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
		  if (warningTimer.current) clearTimeout(warningTimer.current);
		  setRoom(null);
		  setLocalParticipant(null);
		  setParticipants([]);
		  setConnectText("Connect");
		  setConnectDisabled(false);
		  setIsMuted(false);
		}

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
    // Disconnect old room (don’t clear participants here)
    disconnectRoom(room);

    await new Promise((r) => setTimeout(r, 500));

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

        // ✅ Fresh snapshot of current participants
        setParticipants(Array.from(newRoom.participants.values()));

        // ✅ Then wire up event-based updates
        setupParticipantHandlers(newRoom);

        scheduleReshuffle();
      },
      onDisconnected: () => {
        console.log("❌ Disconnected after reshuffle");
        setRoom(null);
        setParticipants([]); // only clear if really gone
        setConnectText("Connect");
        setConnectDisabled(false);
        setIsMuted(false);
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
		  {localParticipant && (
		    <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
		  	You are <strong>{username || localParticipant.identity}</strong>
		    </div>
		  )}
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
