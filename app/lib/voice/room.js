export async function toggleMute(room, isMuted) {
  try {
    const lp = room?.localParticipant;
    if (!lp) {
      console.warn("⚠️ No local participant for mute toggle");
      return;
    }

    if (isMuted) {
      // 🔊 Unmuting → re-publish mic
      currentMicTrack = await createLocalAudioTrack();
      await lp.publishTrack(currentMicTrack);
      console.log("🎤 Mic re-published (unmuted).");
    } else {
      // 🤫 Muting → unpublish and stop mic
      const pubs = [...lp.audioTracks.values()];
      for (let pub of pubs) {
        const track = pub.track;
        if (track?.kind === "audio") {
          try {
            lp.unpublishTrack(track);
            track.stop();
            console.log("🎤 Mic unpublished and stopped (muted).");
          } catch (err) {
            console.warn("⚠️ Failed to mute mic:", err);
          }
        }
      }
      currentMicTrack = null;
    }
  } catch (err) {
    console.warn("⚠️ toggleMute failed:", err);
  }
}
