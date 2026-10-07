import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/login?error=oauth_error');
  }

  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/callback/google`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect('/login?error=token_error');
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    // Create or get user in your system
    // For now, redirect to register with the user info
    const params = new URLSearchParams({
      email: userInfo.email,
      name: userInfo.name,
      google_id: userInfo.id,
      picture: userInfo.picture,
    });

    return NextResponse.redirect(`/register?${params.toString()}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect('/login?error=oauth_failed');
  }
}
