import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

const LK_WS_URL = "wss://drive2connect-hvmppwa2.livekit.cloud";

let currentHandle = null;
let currentMicTrack = null; // 🔒 keep a reference to mic

export async function joinRoom({ roomName, username, onConnected, onDisconnected }) {
  // const handle = username || generateHandle();  // ✅ reuse handle if passed
  
	let handle = username;
	if (!handle || handle.trim() === "") {
	  handle = currentHandle || generateHandle();
	}
	currentHandle = handle;
	 
  const res = await fetch(`/api/token?room=${roomName}&user=${handle}`);
  const { token } = await res.json();
  if (!token) throw new Error("No token returned");

  const room = new Room();
  await room.connect(LK_WS_URL, token);

  // ✅ Publish mic track on join
  currentMicTrack = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(currentMicTrack);


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
  try {
    if (!room?.localParticipant) {
      console.warn("⚠️ No local participant for mute toggle");
      return;
    }
room.localParticipant
    let pub = null;

    // If we already have a cached mic track, find its publication
    if (currentMicTrack && room.localParticipant.audioTracks) {
	  pub = [...room.localParticipant.audioTracks.values()]
     .find((p) => p.track === currentMicTrack);
    }


    // Otherwise, grab the first audio publication
    if (!pub && room.localParticipant.audioTracks && room.localParticipant.audioTracks.size > 0) {
		pub = [...room.localParticipant.audioTracks.values()][0];
		currentMicTrack = pub?.track || currentMicTrack;
    }

    // If no publication yet and unmuting → create/publish track
    if (!pub && !isMuted) {
      currentMicTrack = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(currentMicTrack);
      console.log("🎤 New mic track published (unmuted).");
      return;
    }

    if (!pub) {
      console.warn("⚠️ No mic publication found to toggle");
      return;
    }

    // ✅ Use LiveKit API to mute/unmute
    await pub.setMuted(!isMuted);
    console.log(`🎤 Mic ${!isMuted ? "muted" : "unmuted"}`);
  } catch (err) {
    console.warn("⚠️ toggleMute failed:", err);
  }
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
    const pubs = [];
    if (lp.audioTracks && typeof lp.audioTracks.values === "function") {
      pubs.push(...lp.audioTracks.values());
    }
    if (lp.tracks && typeof lp.tracks.values === "function") {
      pubs.push(...lp.tracks.values());
    }

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

    // ✅ Fallback: stop cached mic reference if still active
    if (currentMicTrack) {
      try {
        currentMicTrack.stop();
        console.log("🎤 Cached mic track stopped.");
      } catch (e) {
        console.warn("⚠️ Could not stop cached mic track", e);
      }
      currentMicTrack = null;
    }
  } catch (err) {
    console.warn("⚠️ stopMicTracks failed:", err);
  }
}


function generateHandle() {
  const adjectives = ["Fast", "Lonely", "Wild", "Rusty", "Silver", "Sleepy", "Lucky", "Rough", "Free", "Roamin"];
  const nouns = ["Driver", "Rider", "Nomad", "Explorer", "Drifter", "Traveler"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}`;
}
