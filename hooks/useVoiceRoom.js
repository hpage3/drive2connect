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
