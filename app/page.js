"use client";

import { useEffect, useRef, useState } from "react";
import { RoomEvent, Room } from "livekit-client";

export default function Page() {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [username, setUsername] = useState(null);
  const audioRef = useRef(null);

  function setupParticipantHandlers(newRoom) {
    const selfId = newRoom.localParticipant.identity;

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

  async function handleJoin() {
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const stored = localStorage.getItem("username");
    const username = stored ?? generateRandomUsername();
    setUsername(username);

    const tokenRes = await fetch(`/api/token?username=${username}`);
    const { token } = await tokenRes.json();

    const newRoom = new Room();
    newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === "audio") {
        const el = audioRef.current;
        track.attach(el);
      }
    });

    await newRoom.connect(url, token);
    setRoom(newRoom);

    console.log("✅ Connected as", username);
    setupParticipantHandlers(newRoom);
    scheduleReshuffle();
    playAudio("/RoameoRoam.mp3");
  }

  async function handleReshuffle() {
    if (!room) return;

    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const username = generateRandomUsername();
    localStorage.setItem("username", username);
    setUsername(username);

    const tokenRes = await fetch(`/api/token?username=${username}`);
    const { token } = await tokenRes.json();

    room.disconnect();
    console.log("❌ Disconnected");

    const newRoom = new Room();
    newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === "audio") {
        const el = audioRef.current;
        track.attach(el);
      }
    });

    await newRoom.connect(url, token);
    setRoom(newRoom);

    console.log("✅ Reconnected after reshuffle as", username);
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

  function generateRandomUsername() {
    const adjectives = ["Fast", "Lucky", "Rusty", "Roamin"];
    const nouns = ["Nomad", "Driver", "Drifter", "Rider"];
    return (
      adjectives[Math.floor(Math.random() * adjectives.length)] +
      "-" +
      nouns[Math.floor(Math.random() * nouns.length)]
    );
  }

  function playAudio(url) {
    const audio = new Audio(url);
    audio.play();
  }

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);
  }, []);

  return (
    <div>
      <audio ref={audioRef} />
    </div>
  );
}
