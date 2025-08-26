import { useState } from "react";
import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

export function useVoiceRoom(LK_WS_URL) {
  const [room, setRoom] = useState(null);
  const [username, setUsername] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("");

  // Generate random handle
  function generateHandle() {
    const adjectives = ["Fast", "Lonely", "Wild", "Rusty", "Silver", "Sleepy", "Lucky", "Rough", "Free", "Roamin"];
    const nouns = ["Driver", "Rider", "Nomad", "Explorer", "Drifter", "Traveler"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  async function join(tokenApi) {
    try {
      const handle = generateHandle();
      setUsername(handle);

      // ✅ Request token and room assignment
      const res = await fetch(`${tokenApi}?user=${handle}`);
      const data = await res.json();
      if (!data.token || !data.room) throw new Error("No token or room returned");

      const newRoom = new Room();
      await newRoom.connect(LK_WS_URL, data.token);

      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);
      setIsMuted(false);

      setRoom(newRoom);

      const adAudio = new Audio("/RoameoRoam.mp3");
      adAudio.play();
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
    }
  }

  function leave() {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsMuted(false);
    }
  }

  async function toggleMute() {
    if (!room) return;
    const enable = isMuted;
    await room.localParticipant.setMicrophoneEnabled(enable);
    setIsMuted(!enable);
  }

  function send(type) {
    if (!room) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type }));
    room.localParticipant.publishData(payload, { topic: "ui", reliable: true });
  }

  return { room, username, isMuted, status, join, leave, toggleMute, send };
}
