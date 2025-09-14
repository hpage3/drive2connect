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
	  // Grab everyone already in the room (bot included, if it connected first)
	  const existing = Array.from(room.participants.values());
	  console.log("🔄 Resyncing participants:", existing.map(p => p.identity));

	  setParticipants(existing);

	  // Optionally include yourself
	  if (room.localParticipant) {
		setParticipants((prev) => [room.localParticipant, ...prev]);
	  }
	}
  // --- Schedule reshuffle timers
	function scheduleReshuffle() {
	  // clear any old timers
	  if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
	  if (warningTimer.current) clearTimeout(warningTimer.current);

	  const reshuffleDelay = 300 * 1000; // 5 minutes
	  const warningDelay = reshuffleDelay - 30 * 1000; // fire warning at 4m30s

	  console.log("⏳ Scheduling reshuffle warning at 4m30s (30s before reshuffle)");
	  warningTimer.current = setTimeout(() => {
		console.log("⚠️ Reshuffle warning fired");
		playAudio("/Reshuffle.mp3");
	  }, warningDelay);

	  console.log("⏳ Scheduling reshuffle at 5 min");
	  reshuffleTimer.current = setTimeout(() => {
		console.log("🔄 Reshuffle triggered");
		handleReshuffle();
	  }, reshuffleDelay);
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
		 // ✅ Ensure we capture participants already in the room
		  const existing = Array.from(newRoom.participants.values());
		  if (newRoom.localParticipant) {
			existing.unshift(newRoom.localParticipant);
		  }
		  setParticipants(existing);
		  console.log("🔄 Initial participant sync:", existing.map(p => p.identity));

		  scheduleReshuffle();
		  playAudio("/RoameoRoam.mp3");
		// Safe RoameoBot spawn check
		  setTimeout(() => {
		  // Pull the list of participants we actually know about
		    const participants = Array.from(newRoom?.participants?.values() || []);
		    const hasBot = participants.some((p) => p.identity === "RoameoBot");

		    if (!hasBot) {
			fetch("/api/add-agent?room=" + roomName)
			  .then(async (res) => {
				if (!res.ok) {
				  throw new Error("Failed to fetch RoameoBot token");
				}

				const { token, url, identity } = await res.json();

				console.log("🤖 Spawning RoameoBot as", identity);

				const botFrame = document.createElement("iframe");
				botFrame.style.display = "none";
				botFrame.src = `/bot.html?token=${encodeURIComponent(
				  token
				)}&url=${encodeURIComponent(url)}`;
				document.body.appendChild(botFrame);
			  })
			  .catch((err) => {
				console.error("🚨 RoameoBot error:", err);
			  });
		    } else {
			  console.log("👥 Skipping RoameoBot — already present in the room");
		    }
		  }, 5000); // ⏳ wait 5s

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
	  console.log("🔄 Performing reshuffle...");

	  // clear old timers just in case
	  if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
	  if (warningTimer.current) clearTimeout(warningTimer.current);

	  try {
		// disconnect if still in a room
		if (room) {
		  await room.disconnect();
		}

		// reset UI state
		setRoom(null);
		setParticipants([]);
		setConnectText("Connect");
		setConnectDisabled(false);
		setIsMuted(false);

		// rejoin the lobby (or next room) automatically
		await handleJoin();

		// ⏱️ restart reshuffle + warning timers
		scheduleReshuffle();
	  } catch (err) {
		console.error("❌ Reshuffle failed:", err);
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