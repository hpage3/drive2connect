"use client";

import { useState } from "react";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { useShuffle } from "@/hooks/useShuffle";
import Controls from "@/components/Controls";
import StatusBadge from "@/components/StatusBadge";
import MapView from "@/components/MapView";
import AdPlayer from "@/components/AdPlayer";

export default function Home() {
  const LK_WS_URL = "wss://drive2connect-hvmppwa2.livekit.cloud";
  const TOKEN_API = "/api/token";

  const { room, username, isMuted, status, join, leave, toggleMute, send } =
    useVoiceRoom(LK_WS_URL);

  const [connectDisabled, setConnectDisabled] = useState(true);
  const [connectText, setConnectText] = useState("Getting Location…");
  const [showAd, setShowAd] = useState(false);

  async function handleJoin() {
    setConnectDisabled(true);
    setConnectText("Connecting...");
    setShowAd(true);
  }

  // 🔄 Shuffle at :00, :15, :30, :45
  useShuffle(() => {
    if (room) {
      leave();
      setShowAd(true);
    }
  });

  return (
    <div className="relative w-full h-screen">
      <MapView
        onReady={() => {
          setConnectDisabled(false);
          setConnectText("Connect");
        }}
      />

      {room && <StatusBadge username={username} />}

      {!room && !showAd && (
        <button
          onClick={handleJoin}
          disabled={connectDisabled}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 
                     px-6 py-3 rounded-xl font-bold z-50 
                     bg-green-600 text-white hover:bg-green-700"
        >
          {connectText}
        </button>
      )}

      {showAd && (
        <AdPlayer
          src="/RoameoRoam.mp3"
          onEnded={async () => {
            try {
              await join(TOKEN_API);
              setConnectText("Connected");
            } catch (err) {
              console.error("Join failed after ad:", err);
              setConnectDisabled(false);
              setConnectText("Connect");
            } finally {
              setShowAd(false); // ✅ Always reset, success or fail
            }
          }}
        />
      )}

      {room && (
        <>
          <button
            onClick={leave}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 
                       px-6 py-3 rounded-xl font-bold z-50 
                       bg-red-600 text-white hover:bg-red-700"
          >
            Disconnect
          </button>
          <Controls isMuted={isMuted} toggleMute={toggleMute} send={send} />
        </>
      )}

      {status && !room && !showAd && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-md z-50">
          {status}
        </div>
      )}
    </div>
  );
}
