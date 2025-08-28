import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

const LK_WS_URL = "wss://drive2connect-hvmppwa2.livekit.cloud";

export async function joinRoom({ roomName, username, onConnected, onDisconnected }) {
  const handle = username || generateHandle();  // ✅ reuse handle if passed
  const res = await fetch(`/api/token?room=${roomName}&user=${handle}`);
  const { token } = await res.json();
  if (!token) throw new Error("No token returned");

  const room = new Room();
  await room.connect(LK_WS_URL, token);

  // ✅ Only declare micTrack once
  const micTrack = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(micTrack);

  // Attach remote audio
  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === "audio") {
      const el = track.attach();
      el.autoplay = true;
      el.playsInline = true;
      el.style.display = "none";
      document.body.appendChild(el);
    }
  });

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
  });

  if (onConnected) onConnected(room, handle);

  room.on(RoomEvent.Disconnected, () => {
    if (onDisconnected) onDisconnected();
  });

  return room;
}

export function disconnectRoom(room) {
  if (room) {
    stopMicTracks(room); // ✅ shut off mic before leaving
    room.disconnect();
  }
}

export async function toggleMute(room, isMuted) {
  await room.localParticipant.setMicrophoneEnabled(isMuted);
}

export function sendReaction(room, type) {
  const payload = new TextEncoder().encode(JSON.stringify({ type }));
  room.localParticipant.publishData(payload, { topic: "ui", reliable: true });
}

// ✅ NEW: stop and release microphone tracks
// --- Stop mic tracks safely
export function stopMicTracks(room) {
  try {
    if (!room) {
      console.log("🎤 No room, nothing to stop.");
      return;
    }

    const lp = room.localParticipant;
    if (!lp || !lp.audioTracks) {
      console.log("🎤 No local participant audio tracks to stop.");
      return;
    }

    lp.audioTracks.forEach((pub) => {
      const track = pub.track;
      if (track && track.mediaStreamTrack) {
        track.mediaStreamTrack.stop();
        console.log("🎤 Mic track stopped.");
      }
    });
  } catch (err) {
    console.warn("⚠️ stopMicTracks failed:", err);
  }
}

function generateHandle() {
  const adjectives = ["Fast", "Lonely", "Wild", "Rusty", "Silver", "Sleepy", "Lucky", "Rough", "Free", "Roamin"];
  const nouns = ["Driver", "Rider", "Nomad", "Explorer", "Drifter", "Traveler"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}`;
}
