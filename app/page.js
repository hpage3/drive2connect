"use client";

import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";
import { RoomEvent } from "livekit-client";

export default function Page({ searchParams }) {
  const [username, setUsername] = useState("");
  const [participants, setParticipants] = useState([]);
  const [room, setRoom] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);

  const audioRef = useRef();

  useEffect(() => {
    const name = localStorage.getItem("username") || generateRandomName();
    localStorage.setItem("username", name);
    setUsername(name);
  }, []);

  useEffect(() => {
    if (!audioTrack || !audioRef.current) return;
    const el = audioRef.current;
    audioTrack.attach(el);
    return () => {
      audioTrack.detach(el);
    };
  }, [audioTrack]);

  function playAudio(url) {
    const audio = new Audio(url);
    audio.play();
  }

  function setupParticipantHandlers(newRoom) {
    setParticipants([]); // Clear old list

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

  async function handleJoin() {
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const tokenRes = await fetch(`/api/token?username=${username}`);
    const { token } = await tokenRes.json();

    const newRoom = new Room();
    newRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        setAudioTrack(track);
      }
    });

    await newRoom.connect(url, token);
    console.log("✅ Connected as", username);

    setRoom(newRoom);
    setupParticipantHandlers(newRoom);
    scheduleReshuffle();
    playAudio("/RoameoRoam.mp3");
  }

  async function handleReshuffle() {
    if (!room) return;

    console.log("🔄 Performing reshuffle…");

    const name = localStorage.getItem("username") || generateRandomName();
    localStorage.setItem("username", name);
    setUsername(name);

    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const tokenRes = await fetch(`/api/token?username=${name}`);
    const { token } = await tokenRes.json();

    room.disconnect();
    console.log("❌ Disconnected");

    const newRoom = new Room();
    newRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        setAudioTrack(track);
      }
    });

    await newRoom.connect(url, token);
    console.log("✅ Reconnected after reshuffle as", name);

    setRoom(newRoom);
    setupParticipantHandlers(newRoom);
    scheduleReshuffle();
    playAudio("/RoameoRoam.mp3");
  }

  function generateRandomName() {
    const adjectives = ["Lonely", "Rusty", "Happy", "Fast", "Lucky", "Roamin"];
    const nouns = ["Driver", "Nomad", "Explorer", "Wanderer", "Rider", "Drifter"];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective}-${noun}`;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      {!room && (
        <button
          onClick={handleJoin}
          className="bg-green-600 text-white text-lg px-6 py-2 rounded-full"
        >
          Join the Roam
        </button>
      )}

      {room && (
        <>
          <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
            You are <strong>{username}</strong>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {participants.map((p) => (
              <div
                key={p.identity}
                className="bg-black/50 text-white px-3 py-1 rounded"
              >
                {p.identity}
              </div>
            ))}
          </div>
        </>
      )}

      <audio ref={audioRef} />
    </main>
  );
}
