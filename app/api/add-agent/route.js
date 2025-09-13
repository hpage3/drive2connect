// app/api/add-agent/route.js
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room") || "lobby";
  const identity = "RoameoBot";

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitHost = process.env.LIVEKIT_HOST; // use LIVEKIT_HOST (matches your env file)

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: "Roameo",
  });

  token.addGrant({ roomJoin: true, room });

  const jwt = await token.toJwt();

  return NextResponse.json({
    token: jwt,
    url: livekitHost,
    identity,
  });
}
