"use client";

import { useEffect, useState } from "react";
import { joinRoom, disconnectRoom, toggleMute, sendReaction } from "./lib/voice/room";
import { initMap } from "./lib/map/map";
import UserBadge from "./components/UserBadge";
import Controls from "./components/Controls";
import Status from "./components/Status";

export default function Home() {
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [status, setStatus] = useState("");
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  async function handleJoin() {
    try {
      const newRoom = await joinRoom({
        onConnected: (room, handle) => {
          setRoom(room);
          setUsername(handle);
          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);
          new Audio("/RoameoRoam.mp3").play();
        },
        onDisconnected: () => {
          setRoom(null);
          setConnectText("Connect");
          setConnectDisabled(false);
          setIsMuted(false);
        },
      });
      return newRoom;
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
      setConnectDisabled(false);
      setConnectText("Connect");
    }
  }

  function handleDisconnect() {
    disconnectRoom(room);
    setRoom(null);
    setConnectDisabled(false);
    setConnectText("Connect");
    setIsMuted(false);
  }

  async function handleMuteToggle() {
    if (!room) return;
    await toggleMute(room, isMuted);
    setIsMuted(!isMuted);
  }

  function handleReaction(type) {
    if (!room) return;
    sendReaction(room, type);
  }

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

      {status && !room && <Status message={status} />}
    </div>
  );
}
