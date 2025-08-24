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

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Missing LiveKit credentials' }, { status: 500 });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user,
      name: user,
    });

    at.addGrant({ room, roomJoin: true });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (err) {
    console.error('Token generation error:', err);
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }
}
