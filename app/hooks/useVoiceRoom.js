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

      // 1) Fetch token
      const res = await fetch(`${tokenApi}?room=testroom&user=${handle}`);
      const data = await res.json();
      if (!data.token) throw new Error("No token returned");

      // 2) Connect to LiveKit
      const newRoom = new Room();
      await newRoom.connect(LK_WS_URL, data.token);

      // 3) Publish microphone
      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);
      setIsMuted(false);

      // 4) Handle remote audio
      newRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind
