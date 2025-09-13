// app/api/add-agent/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room") || "lobby";
  const identity = "RoameoBot";

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitHost = process.env.LIVEKIT_HOST; // 👈 must match .env.local

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: "Roameo",
  });

  at.addGrant({ roomJoin: true, room });

  return NextResponse.json({
    token: at.toJwt(), // ✅ JWT string
    url: livekitHost,
    identity,
  });
}
