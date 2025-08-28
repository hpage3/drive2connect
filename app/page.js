"use client";
import { useState, useEffect, useRef } from "react";
import { joinRoom, disconnectRoom, toggleMute, sendReaction } from "./lib/voice/room";
import { initMap } from "./lib/map/map";
import UserBadge from "./components/UserBadge";
import Controls from "./components/Controls";
import Status from "./components/Status";

export default function Home() {
  const [roomName] = useState("lobby");   // dynamic room name (currently one room)
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [status, setStatus] = useState("");

  const reshuffleTimer = useRef(null);
  const warningTimer = useRef(null);

  function playAudio(src) {
    const audio = new Audio(src);
    audio.play().catch(() => console.warn("Autoplay blocked:", src));
  }

  // --- Join Room ---
  async function handleJoin() {
    try {
      await joinRoom({
        roomName,
        onConnected: (newRoom, handle) => {
          setRoom(newRoom);
          setUsername(handle);
          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);

          console.log("✅ Connected as", handle);

          // Clear old timers
          if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
          if (warningTimer.current) clearTimeout(warningTimer.current);

          // Schedule warning
          console.log("⏳ Scheduling reshuffle warning at 30s");
          warningTimer.current = setTimeout(() => {
            console.log("⚠️ Reshuffle warning fired");
            playAudio("/Reshuffle.mp3"); // reuse existing file for now
            setStatus("You’ll be moved to a new channel in 30s…");
          }, 30 * 1000);

          // Schedule reshuffle
          console.log("⏳ Scheduling reshuffle at 60s");
          reshuffleTimer.current = setTimeout(() => {
            console.log("🔄 Reshuffle triggered");
            handleReshuffle();
          }, 60 * 1000);

          // Initial ad
          playAudio("/RoameoRoam.mp3");
        },
        onDisconnected: () => {
          console.log("❌ Disconnected");
          if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
          if (warningTimer.current) clearTimeout(warningTimer.current);
          setRoom(null);
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

  // --- Disconnect Room ---
  function handleDisconnect() {
    console.log("👋 Manual disconnect");
    if (reshuffleTimer.current) clearTimeout(reshuffleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    disconnectRoom(room);
    setRoom(null);
    setConnectDisabled(false);
    setConnectText("Connect");
    setIsMuted(false);
  }

  // --- Reshuffle ---
  async function handleReshuffle() {
    console.log("🔄 Performing reshuffle…");
    try {
      disconnectRoom(room);
      await new Promise(r => setTimeout(r, 500)); // short delay

      playAudio("/RoameoRoam.mp3");

      await joinRoom({
        roomName,
        username, // keep same handle
        onConnected: (newRoom, handle) => {
          console.log("✅ Reconnected after reshuffle as", handle);
          setRoom(newRoom);
          setUsername(handle);
          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);
          setStatus("");
        },
        onDisconnected: () => {
          console.log("❌ Disconnected after reshuffle");
          setRoom(null);
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

      {room && <UserBadge username={username} />}

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
