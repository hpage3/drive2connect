import { AccessToken } from 'livekit-server-sdk';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || "lobby";
  const user = searchParams.get('user');

  console.log("🔑 Incoming token request:");
  console.log("   Room param:", room);
  console.log("   User param:", user);

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("🚨 Missing LiveKit credentials", { apiKey, apiSecret });
    return new Response(JSON.stringify({ error: 'Missing LiveKit credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create a token tied to the requested room & user
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

    // v2 requires await here
    const jwt = await at.toJwt();

    console.log("✅ Token generated successfully");
    console.log("   Room granted:", room);
    console.log("   Identity granted:", user);
	console.log("   JWT Preview:", jwt.split(".")[1]); // log just the payload section


    return new Response(JSON.stringify({ token: jwt, room, user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('🚨 Token generation error:', err);
    return new Response(JSON.stringify({ error: 'Token generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
