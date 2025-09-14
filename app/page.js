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
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.onended = () => resolve();
      audio.onerror = (err) => reject(err);
      audio
        .play()
        .then(() => console.log("▶️ Playing:", src))
        .catch((err) => {
          console.error("❌ Audio play failed:", src, err);
          reject(err);
        });
    });
  }

  // --- Schedule reshuffle timers
  function scheduleReshuffle() {
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    const reshuffleDelay = 300 * 1000; // 5 minutes (later configurable)
    const warningDelay = reshuffleDelay - 30 * 1000;

    // Pretty print helper
    function formatMs(ms) {
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      return sec === 0 ? `${min}m` : `${min}m${sec}s`;
    }

    console.log(
      `⏳ Scheduling reshuffle warning at ${formatMs(
        warningDelay
      )} (30s before reshuffle)`
    );
    warningTimer.current = setTimeout(() => {
      console.log("⚠️ Reshuffle warning fired");
      playAudio("/Reshuffle.mp3");
    }, warningDelay);

    console.log(`⏳ Scheduling reshuffle at ${formatMs(reshuffleDelay)}`);
    reshuffleTimer.current = setTimeout(() => {
      console.log("🔄 Reshuffle triggered");
      handleReshuffle();
    }, reshuffleDelay);
  }

  // --- Setup participant listeners
function setupParticipantHandlers(newRoom) {
  if (!newRoom) {
    console.warn("⚠️ setupParticipantHandlers called with no room");
    return;
  }

// Initial sync: build list from current state
  const initialList = [
    newRoom.localParticipant,
    ...(newRoom.participants && typeof newRoom.participants.values === "function"
      ? Array.from(newRoom.participants.values())
      : [])
  ].filter(Boolean);

  setParticipants(initialList);
  console.log("👥 Initial sync:", initialList.map((p) => p.identity));
  
  
 // 🔎 Debug
  if (newRoom.participants && typeof newRoom.participants.entries === "function") {
    console.log("🔎 Full participants map:", Array.from(newRoom.participants.entries()));
  } else {
    console.log("⚠️ Participants map not ready yet", newRoom.participants);
  }
  // Listen for join
  newRoom.on(RoomEvent.ParticipantConnected, (p) => {
    console.log("👥 Participant joined:", p.identity);
    setParticipants((prev) => [...prev, p]);
  });

  // Listen for leave
  newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
    console.log("👥 Participant left:", p.identity);
    setParticipants((prev) => prev.filter((x) => x.sid !== p.sid));
  });
}


  // --- Join Room
  async function handleJoin() {
    try {
      await joinRoom({
        roomName,
        username,
		onConnected: async (newRoom, handle) => {
		  setRoom(newRoom);
		  setUsername((prev) => prev || handle);
		  setConnectText("Connected");
		  setConnectDisabled(true);
		  setIsMuted(false);

		  console.log("✅ Connected as", handle);
		  console.log("🌐 Room name:", newRoom.name);
		  console.log("🌐 Server URL:", newRoom.engine?.url || "(no URL)");

		  newRoom.once(RoomEvent.Connected, () => {
			console.log(
			  "🟢 Room fully connected. SID:",
			  newRoom.sid,
			  "Local SID:",
			  newRoom.localParticipant?.sid
			);
		  });

		  if (newRoom.state === "connected") {
			console.log("🟢 LiveKit Room Connected (immediate).");
			console.log("Room ID:", newRoom.sid);
			setupParticipantHandlers(newRoom);
		  } else {
			newRoom.once(RoomEvent.Connected, () => {
			  console.log("🟢 LiveKit Room Connected.");
			  console.log("Room ID:", newRoom.sid);
			  setupParticipantHandlers(newRoom);
			});
		  }

		  // Initial sync
		  const existing = [];
		  if (newRoom.participants && typeof newRoom.participants.values === "function") {
			existing.push(...Array.from(newRoom.participants.values()));
		  }
		  if (newRoom.localParticipant) {
			existing.unshift(newRoom.localParticipant);
		  }
		  setParticipants(existing);
		  console.log(
			"🔄 Initial participant sync:",
			existing.map((p) => p.identity)
		  );

		  // 🔄 Force resync after 2s to ensure participant state arrives from server
		  setTimeout(() => {
			if (!newRoom.participants) {
			  console.warn("⚠️ Participants map not ready yet", newRoom.participants);
			  return;
			}
			const synced = [
			  newRoom.localParticipant,
			  ...Array.from(newRoom.participants.values())
			].filter(Boolean);

			setParticipants(synced);
			console.log("🔄 Forced resync after 2s:", synced.map((p) => p.identity));
		  }, 2000);

		  // Debug: Log full participant list after delay
		  setTimeout(() => {
			const delayedList = [];
			if (newRoom.localParticipant) {
			  delayedList.push(newRoom.localParticipant);
			}
			if (newRoom.participants && typeof newRoom.participants.values === "function") {
			  delayedList.push(...Array.from(newRoom.participants.values()));
			}

			console.log("🕵️ Full participant list after 3s:");
			delayedList.forEach((p) => {
			  console.log("🔹", p.identity);
			});
		  }, 3000);

		  scheduleReshuffle();

		  // 🎵 Wait for welcome audio before spawning bot
		  try {
			await playAudio("/RoameoRoam.mp3");
		  } catch {
			console.warn("⚠️ Skipping bot delay since audio failed");
		  }

		  // 🛠 Delay bot check by 3 seconds to ensure remote participants have arrived
		  setTimeout(() => {
			const participantsNow = [];
			if (newRoom.localParticipant) {
			  participantsNow.push(newRoom.localParticipant);
			}
			if (newRoom.participants && typeof newRoom.participants.values === "function") {
			  participantsNow.push(...Array.from(newRoom.participants.values()));
			}

			const hasBot = participantsNow.some((p) => p.identity === "RoameoBot");

			console.log("🤖 Bot Check after 3s. Participants:", participantsNow.map(p => p.identity));
			if (!hasBot) {
			  fetch("/api/add-agent?room=" + roomName)
				.then(async (res) => {
				  if (!res.ok) throw new Error("Failed to fetch RoameoBot token");
				  const { token, url, identity } = await res.json();
				  console.log("🤖 Spawning RoameoBot as", identity);
				  const botFrame = document.createElement("iframe");
				  botFrame.style.display = "none";
				  botFrame.src = `/bot.html?token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`;
				  document.body.appendChild(botFrame);
				})
				.catch((err) => {
				  console.error("🚨 RoameoBot error:", err);
				});
			} else {
			  console.log("👥 Skipping RoameoBot — already present in the room");
			}
		  }, 3000);
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
        },
      });
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
      setConnectDisabled(false);
      setConnectText("Connect");
    }
  }

  // --- Disconnect
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
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    try {
      if (room) {
        await room.disconnect();
      }
      setRoom(null);
      setParticipants([]);
      setConnectText("Connect");
      setConnectDisabled(false);
      setIsMuted(false);

      await handleJoin();
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

      {room && (
        <Controls
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          onReaction={handleReaction}
        />
      )}

      {status && <Status message={status} />}
    </div>
  );
}
