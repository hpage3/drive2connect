"use client";
import { useState, useEffect, useRef } from "react";
import {
  joinRoom,
  disconnectRoom,
  toggleMute,
  sendReaction,
  stopMicTracks, // ✅ make sure this is in lib/voice/room.js
} from "./lib/voice/room";
import { initMap } from "./lib/map/map";
import UserBadge from "./components/UserBadge";
import Controls from "./components/Controls";
import Status from "./components/Status";
import { RoomEvent } from "livekit-client";

export default function Home() {
  const [roomName] = useState("lobby"); // one shared room for now
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

  // --- Manage Participants (dedupe, exclude self)
  function addParticipant(p) {
    setParticipants((prev) => {
      if (!p || !p.identity || p.identity === username) return prev;
      const updated = [...prev, p];
      return Array.from(new Map(updated.map((u) => [u.identity, u])).values());
    });
  }

  function removeParticipant(p) {
    if (!p || !p.identity) return;
    setParticipants((prev) => prev.filter((x) => x.identity !== p.identity));
  }

  // --- Schedule reshuffle timers
  function scheduleReshuffle() {
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    console.log("⏳ Scheduling reshuffle warning at 30s");
    warningTimer.current = setTimeout(() => {
      console.log("⚠️ Reshuffle warning fired");
      playAudio("/Reshuffle.mp3");
      setStatus("You’ll be moved to a new channel in 30s…");
    }, 30 * 1000);

    console.log("⏳ Scheduling reshuffle at 60s");
    reshuffleTimer.current = setTimeout(() => {
      console.log("🔄 Reshuffle triggered");
      handleReshuffle();
    }, 60 * 1000);
  }

  // --- Join Room ---
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

          // Initialize participants (exclude self)
          if (newRoom && newRoom.participants) {
            const list = [...newRoom.participants.values()].filter(
              (p) => p.identity !== handle
            );
            setParticipants(list);
          } else {
            setParticipants([]);
          }

          newRoom.on(RoomEvent.ParticipantConnected, (p) => {
            console.log("👥 Participant joined:", p.identity);
            addParticipant(p);
          });

          newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
            console.log("👥 Participant left:", p.identity);
            removeParticipant(p);
          });

          // Start reshuffle timers
          scheduleReshuffle();

          // Initial ad
          playAudio("/RoameoRoam.mp3");
        },
        onDisconnected: () => {
          console.log("❌ Disconnected");
          cleanupRoom();
        },
      });
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
      setConnectDisabled(false);
      setConnectText("Connect");
    }
  }

  // --- Disconnect Room ---
  function handleDisconnect() {
    console.log("👋 Manual disconnect");
    cleanupRoom();
  }

  function cleanupRoom() {
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (room) {
      disconnectRoom(room);
      stopMicTracks(room); // ✅ ensure mic released
    }
    setRoom(null);
    setParticipants([]);
    setConnectDisabled(false);
    setConnectText("Connect");
    setIsMuted(false);
  }

  // --- Reshuffle ---
  async function handleReshuffle() {
    console.log("🔄 Performing reshuffle…");
    try {
      if (room) {
        disconnectRoom(room);
        stopMicTracks(room);
      }
      await new Promise((r) => setTimeout(r, 1000)); // ✅ slightly longer delay

      playAudio("/RoameoRoam.mp3");

      await joinRoom({
        roomName,
        username,
        onConnected: (newRoom, handle) => {
          console.log("✅ Reconnected after reshuffle as", handle);
          setRoom(newRoom);
          setUsername(handle);
          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);
          setStatus("");

          // Initialize participants (exclude self)
          if (newRoom && newRoom.participants) {
            const list = [...newRoom.participants.values()].filter(
              (p) => p.identity !== handle
            );
            setParticipants(list);
          } else {
            setParticipants([]);
          }

          newRoom.on(RoomEvent.ParticipantConnected, (p) => {
            console.log("👥 Participant joined:", p.identity);
            addParticipant(p);
          });

          newRoom.on(RoomEvent.ParticipantDisconnected, (p) => {
            console.log("👥 Participant left:", p.identity);
            removeParticipant(p);
          });

          scheduleReshuffle();
        },
        onDisconnected: () => {
          console.log("❌ Disconnected after reshuffle");
          cleanupRoom();
        },
      });
    } catch (err) {
      console.error("❌ Reshuffle failed:", err);
      setStatus("Reshuffle failed");
    }
  }

  // --- Toggle Mute ---
  async function handleMuteToggle() {
    if (!room) return;
    await toggleMute(room, isMuted);
    setIsMuted(!isMuted);
  }

  // --- Reactions ---
  function handleReaction(type) {
    if (!room) return;
    sendReaction(room, type);
  }

  // --- Map Init ---
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
