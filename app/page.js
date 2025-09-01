// page.js (Updated)

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { RoomEvent, connect } from "livekit-client";

export default function Page({ username, token, url }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  function setupParticipantHandlers(newRoom) {
    setParticipants([]); // Clear existing list

    const selfId = newRoom.localParticipant?.identity;

    newRoom.on(RoomEvent.ParticipantConnected, (p) => {
      if (!p?.identity || p.identity === selfId) return;

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

  function playAudio(src) {
    const audio = new Audio(src);
    audio.play().catch((e) => console.warn("Audio play failed", e));
  }

  async function handleJoin() {
    const newRoom = await connect(url, token, {
      autoSubscribe: true,
    });

    setRoom(newRoom);
    console.log("✅ Connected as", newRoom.localParticipant.identity);

    setupParticipantHandlers(newRoom);
    scheduleReshuffle();
    playAudio("/RoameoRoam.mp3");
  }

  function scheduleReshuffle() {
    console.log("⏳ Scheduling reshuffle warning at 30s");
    setTimeout(() => {
      console.log("⚠️ Reshuffle warning fired");
      playAudio("/Reshuffle.mp3");
    }, 30000);

    console.log("⏳ Scheduling reshuffle at 60s");
    setTimeout(() => {
      console.log("🔄 Reshuffle triggered");
      handleReshuffle();
    }, 60000);
  }

  async function handleReshuffle() {
    if (!room) return;
    console.log("🔄 Performing reshuffle…");

    room.disconnect();
    console.log("❌ Disconnected");

    const newRoom = await connect(url, token, {
      autoSubscribe: true,
    });

    setRoom(newRoom);
    console.log("✅ Reconnected after reshuffle as", newRoom.localParticipant.identity);

    setupParticipantHandlers(newRoom);
    scheduleReshuffle();
    playAudio("/RoameoRoam.mp3");
  }

  useEffect(() => {
    handleJoin();
    return () => {
      room?.disconnect();
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
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
  );
}
