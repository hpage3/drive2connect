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

    console.log("⏳ Scheduling reshuffle at 5 min");
    reshuffleTimer.current = setTimeout(() => {
      console.log("🔄 Reshuffle triggered");
      handleReshuffle();
    }, 300 * 1000);
  }

  // --- Setup participant listeners
function setupParticipantHandlers(newRoom) {
  // Clear on join/reshuffle
  setParticipants([]);
  console.log("👥 Participant list cleared at join/reshuffle");

  // Initial snapshot (include self + remote peers)
  setTimeout(() => {
    if (newRoom.localParticipant && newRoom.participants) {
      const list = [
        newRoom.localParticipant,
        ...Array.from(newRoom.participants.values())
      ];
      setParticipants(list);
      console.log("👥 Initial snapshot:", list.map(p => p.identity));
    }
  }, 2500); // wait a bit so remote peers are available

  // Event-driven updates
  newRoom.on(RoomEvent.ParticipantConnected, (p) => {
    console.log("👥 Participant joined:", p.identity);
    setParticipants((prev) => [...prev, p]);
  });

  newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
    console.log("👥 Participant left:", p.identity);
    setParticipants((prev) =>
      prev.filter((x) => x.identity !== p.identity)
    );
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

		  // Safe RoameoBot spawn check
		  setTimeout(() => {
			const participantCount = newRoom?.participants?.size || 0;

			if (participantCount === 0) {
			  fetch("/api/add-agent?room=" + roomName)
				.then((res) => res.json())
				.then(async (res) => {
				  const data = await res.json();
				  const { token, url, identity } = data;

				  console.log("🤖 Spawning RoameoBot...", identity);

				  const botFrame = document.createElement("iframe");
				  botFrame.style.display = "none";
				  botFrame.src = `/bot.html?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`;
				  document.body.appendChild(botFrame);
				});

			} else {
			  console.log(`👥 Skipping RoameoBot — already ${participantCount} participants`);
			}
		  }, 2500); // ⏳ wait 2.5s
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