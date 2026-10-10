import { NextRequest, NextResponse } from 'next/server';

// Google OAuth callback endpoint
export async function GET(request: NextRequest) {
  console.log('=== Google OAuth callback START ===');
  
  try {
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

    // Build redirect URI from request
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/google`;
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'present' : 'missing');
    console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing');
    console.log('Client Secret Fallback:', process.env.GOOGLE_CLIENT_SECRET_FALLBACK ? 'present' : 'missing');

    // Use environment variable or fallback to secondary variable
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET_FALLBACK;

    console.log('About to fetch token from Google...');

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    console.log('Token response status:', tokenResponse.status);
    
    const tokenData = await tokenResponse.json();
    console.log('Token response:', JSON.stringify(tokenData));

    if (tokenData.error) {
      console.error('Token error:', tokenData);
      return NextResponse.redirect('/login?error=token_error&details=' + encodeURIComponent(tokenData.error_description || tokenData.error));
    }

    console.log('About to fetch user info from Google...');

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    console.log('User info:', JSON.stringify(userInfo));

    console.log('About to redirect to register...');

    // Create or get user in your system
    // For now, redirect to register with the user info
    const params = new URLSearchParams({
      email: userInfo.email,
      name: userInfo.name,
      google_id: userInfo.id,
      picture: userInfo.picture,
    });

    console.log('=== Google OAuth callback SUCCESS ===');
    return NextResponse.redirect(`/register?${params.toString()}`);
  } catch (error) {
    console.error('=== Google OAuth callback ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.redirect('/login?error=oauth_failed&details=' + encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'));
  }
}
