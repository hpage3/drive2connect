import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room');
  const user = searchParams.get('user');

  if (!room || !user) {
    return NextResponse.json({ error: 'Missing room or user' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user,
    name: user,
  });
  at.addGrant({ room, roomJoin: true });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}
