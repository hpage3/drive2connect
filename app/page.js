"use client";
import { useState, useEffect, useRef } from "react";
import {
  joinRoom,
  disconnectRoom,
  toggleMute,
  sendReaction,
} from "./lib/voice/room";
import { initMap } from "./lib/map/map";
import UserBadge from "./components/UserBadge";
import Controls from "./components/Controls";
import Status from "./components/Status";

export default function Home() {
  const [roomName] = useState("lobby"); // dynamic later
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [username, setUsername] = useState("");
  const usernameRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [status, setStatus] = useState("");

  const reshuffleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    initMap(() => {
      setConnectDisabled(false);
      setConnectText("Connect");
    });
  }, []);

  // Utility: play audio ads / warnings
  const playAudio = (src) => {
    try {
      const audio = new Audio(src);
      audio.play().catch((err) => {
        console.warn("Audio play blocked:", err);
      });
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // Utility: stop mic tracks safely
  const stopMicTracks = (room) => {
    if (!room || !room.localParticipant) return;
    try {
      room.localParticipant.tracks.forEach((pub) => {
        if (pub.track) {
          pub.track.stop();
          pub.unpublish();
        }
      });
    } catch (e) {
      console.warn("Error stopping mic tracks", e);
    }
  };

  // Join handler
  async function handleJoin() {
    try {
      await joinRoom({
        roomName,
        onConnected: (newRoom, handle) => {
          console.log("✅ Connected as", handle);
          setRoom(newRoom);
          setUsername(handle);
          usernameRef.current = handle;

          setConnectText("Connected");
          setConnectDisabled(true);
          setIsMuted(false);

          // Init participants list, exclude self
          const initial = [
            ...newRoom.participants.values(),
          ].filter((p) => p.identity !== newRoom.localParticipant.identity);
          setParticipants(initial);

          // Event-driven updates
          newRoom.on("participantConnected", (p) => {
            if (p.identity === newRoom.localParticipant.identity) return;
            console.log("👥 Participant joined:", p.identity);
            setParticipants((prev) => [
              ...prev.filter((x) => x.identity !== p.identity),
              p,
            ]);
          });

          newRoom.on("participantDisconnected", (p) => {
            console.log("👥 Participant left:", p.identity);
            setParticipants((prev) =>
              prev.filter((x) => x.identity !== p.identity)
            );
          });

          // Schedule reshuffles
          scheduleReshuffle(newRoom);
        },
        onDisconnected: () => {
          console.log("❌ Disconnected after reshuffle");
          stopMicTracks(room);
          clearTimers();
          setRoom(null);
          setParticipants([]);
          setConnectText("Connect");
          setConnectDisabled(false);
          setIsMuted(false);
        },
      });
    } catch (err) {
      console.error("Voice connection failed:", err);
      setStatus("Voice connection failed");
      setConnectDisabled(false);
      setConnectText("Connect");
    }
  }

  // Disconnect handler
  function handleDisconnect() {
    console.log("👋 Manual disconnect");
    if (room) {
      stopMicTracks(room);
      disconnectRoom(room);
    }
    clearTimers();
    setRoom(null);
    setParticipants([]);
    setConnectDisabled(false);
    setConnectText("Connect");
    setIsMuted(false);
  }

  // Reshuffle logic
  function scheduleReshuffle(currentRoom) {
    console.log("⏳ Scheduling reshuffle warning at 30s");
    warningTimerRef.current = setTimeout(() => {
      console.log("⚠️ Reshuffle warning fired");
      playAudio("/Reshuffle.mp3");
    }, 30 * 1000);

    console.log("⏳ Scheduling reshuffle at 60s");
    reshuffleTimerRef.current = setTimeout(async () => {
      console.log("🔄 Reshuffle triggered");
      try {
        stopMicTracks(currentRoom);
        disconnectRoom(currentRoom);
        console.log("🔄 Performing reshuffle…");
        playAudio("/RoameoRoam.mp3");
        await new Promise((res) => setTimeout(res, 2000)); // small delay
        await handleJoin(); // rejoin with same usernameRef
        console.log("✅ Reconnected after reshuffle as", usernameRef.current);
      } catch (e) {
        console.error("Reshuffle failed", e);
      }
    }, 60 * 1000);
  }

  function clearTimers() {
    clearTimeout(warningTimerRef.current);
    clearTimeout(reshuffleTimerRef.current);
  }

  return (
    <main>
      <h1>Roameo Radio</h1>
      <Status text={status} />
      <Controls
        connectText={connectText}
        connectDisabled={connectDisabled}
        onConnect={handleJoin}
        onDisconnect={handleDisconnect}
        onMute={() => toggleMute(room, setIsMuted)}
        isMuted={isMuted}
      />
      <section>
        <h2>Participants</h2>
        <ul>
          <li key="self">
            <UserBadge name={username || "Me"} self />
          </li>
          {participants.map((p) => (
            <li key={p.identity}>
              <UserBadge name={p.identity} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
