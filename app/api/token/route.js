import { AccessToken } from 'livekit-server-sdk';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || "lobby";
  const user = searchParams.get('user');
  console.log("🔑 Token request params:", { room, user });


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

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    // ✅ v2 requires await here
    const jwt = await at.toJwt();

    return new Response(JSON.stringify({ token: jwt }), {
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
