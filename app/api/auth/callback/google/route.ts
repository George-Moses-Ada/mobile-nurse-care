import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('Google OAuth callback:', { code: code ? 'present' : 'missing', error });

  if (error) {
    console.error('OAuth error from Google:', error);
    return NextResponse.redirect('/login?error=oauth_error');
  }

  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect('/login?error=no_code');
  }

  try {
    // Build redirect URI from request
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/google`;
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'present' : 'missing');
    console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing');

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
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response:', JSON.stringify(tokenData));

    if (tokenData.error) {
      console.error('Token error:', tokenData);
      return NextResponse.redirect('/login?error=token_error&details=' + encodeURIComponent(tokenData.error_description || tokenData.error));
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    console.log('User info:', JSON.stringify(userInfo));

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
    return NextResponse.redirect('/login?error=oauth_failed&details=' + encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'));
  }
}
