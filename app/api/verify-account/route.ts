import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { account_number, bank_code } = await request.json();

    console.log('Account verification request:', { account_number, bank_code });

    if (!account_number || !bank_code) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    console.log('Paystack secret key configured:', !!paystackSecretKey);
    
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      );
    }

    // Real Paystack API call
    const apiUrl = `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`;
    console.log('Calling Paystack API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Paystack API response status:', response.status);
    
    const data = await response.json();
    console.log('Paystack API response data:', data);

    if (response.ok) {
      if (data.status && data.data) {
        console.log('Account verified successfully:', data.data.account_name);
        return NextResponse.json({
          account_name: data.data.account_name,
          account_number: data.data.account_number,
          bank_id: data.data.bank_id
        });
      } else {
        console.log('Paystack returned false status:', data.message);
        return NextResponse.json(
          { error: data.message || 'Account not found' },
          { status: 404 }
        );
      }
    } else {
      console.log('Paystack API error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to verify account' },
        { status: response.status }
      );
    }

  } catch (error) {
    console.error('Account verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}
