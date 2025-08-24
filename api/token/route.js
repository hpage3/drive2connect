import { AccessToken } from 'livekit-server-sdk';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room');
  const user = searchParams.get('user');

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return new Response(JSON.stringify({ error: 'Missing LiveKit credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user,
      name: user,
    });

    at.addGrant({ room, roomJoin: true });

    const token = at.toJwt();

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Token generation error:', err);
    return new Response(JSON.stringify({ error: 'Token generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
