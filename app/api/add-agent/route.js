// app/api/add-agent/route.js
import { NextResponse } from 'next/server';
import pkg from 'livekit-server-sdk';

const { AccessToken } = pkg;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room') || 'lobby';
  const identity = 'RoameoBot';

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitHost = process.env.LIVEKIT_HOST;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: 'Roameo',
  });

  at.addGrant({ roomJoin: true, room });

  return NextResponse.json({
    token: at.toJwt(), // 🔥 this will now be a string
    url: livekitHost,
    identity,
  });
}
