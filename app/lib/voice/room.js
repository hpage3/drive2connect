import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

const LK_WS_URL = "wss://drive2connect-hvmppwa2.livekit.cloud";

export async function joinRoom({ roomName, username, onConnected, onDisconnected }) {
  const handle = username || generateHandle();  // ✅ reuse handle if passed
  const res = await fetch(`/api/token?room=${roomName}&user=${handle}`);
  const { token } = await res.json();
  if (!token) throw new Error("No token returned");

  const room = new Room();
  await room.connect(LK_WS_URL, token);

  // ✅ Publish mic track on join
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
    // Always unpublish + stop before disconnect
    stopMicTracks(room);
    room.disconnect();
  }
}

// ✅ Hardened mute toggle
export async function toggleMute(room, isMuted) {
  if (!room || !room.localParticipant) return;

  const lp = room.localParticipant;

  // If no audio track exists and we are unmuting → create one
  if (lp.audioTracks.size === 0 && !isMuted) {
    try {
      const micTrack = await createLocalAudioTrack();
      await lp.publishTrack(micTrack);
      console.log("🎤 New mic track published (unmuted).");
    } catch (err) {
      console.error("❌ Failed to create/publish mic track:", err);
    }
    return;
  }

  // Otherwise, just toggle
  try {
    await lp.setMicrophoneEnabled(!isMuted);
    console.log(`🎤 Mic ${isMuted ? "unmuted" : "muted"}.`);
  } catch (err) {
    console.error("❌ toggleMute failed:", err);
  }
}

export function sendReaction(room, type) {
  const payload = new TextEncoder().encode(JSON.stringify({ type }));
  room.localParticipant.publishData(payload, { topic: "ui", reliable: true });
}

// ✅ Stop and release microphone tracks
export function stopMicTracks(room) {
  try {
    if (!room) return;

    const lp = room.localParticipant;
    if (!lp) {
      console.log("🎤 No local participant.");
      return;
    }

    // Look at both audioTracks (map of TrackPublications) and all tracks
    const pubs = [
      ...lp.audioTracks.values(),
      ...lp.tracks.values()
    ];

    pubs.forEach((pub) => {
      const track = pub.track;
      if (track && track.kind === "audio") {
        try {
          lp.unpublishTrack(track);
        } catch (e) {
          console.warn("⚠️ Could not unpublish track", e);
        }

        if (track.mediaStreamTrack) {
          track.mediaStreamTrack.stop();
          console.log("🎤 Mic track stopped at media layer.");
        }
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
