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
  let newRoom; // ✅ declare it so it's visible everywhere
  try {
    const handle = generateHandle();
    setUsername(handle);

    // ✅ Request token
    const res = await fetch(`${tokenApi}?user=${handle}`);
    const data = await res.json();
    if (!data.token) throw new Error("No token returned");

    // ✅ Connect to LiveKit
    newRoom = new Room();
    await newRoom.connect(LK_WS_URL, data.token);
    console.log("✅ Connected to LiveKit room");

    // ✅ Publish microphone
    const micTrack = await createLocalAudioTrack();
    await newRoom.localParticipant.publishTrack(micTrack);
    setIsMuted(false);

    // ✅ Handle remote audio
    newRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        const audioEl = track.attach();
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
      }
    });
    newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });

    setRoom(newRoom);

    // (Optional: ad playback stays here if you want)
    const adAudio = new Audio("/RoameoRoam.mp3");
    adAudio.play();

  } catch (err) {
    console.error("❌ Voice connection failed:", err);
    setStatus("Voice connection failed: " + err.message);
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
