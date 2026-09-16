import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { account_number, bank_code } = await request.json();

    if (!account_number || !bank_code) {
      return NextResponse.json(
        { error: 'Account number and bank code are required' },
        { status: 400 }
      );
    }

    // In production, integrate with Paystack's resolve account API
    // You'll need to add your Paystack secret key to environment variables
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (paystackSecretKey) {
      // Real Paystack API call
      const response = await fetch(`https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`, {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status && data.data) {
          return NextResponse.json({
            account_name: data.data.account_name,
            account_number: data.data.account_number,
            bank_id: data.data.bank_id
          });
        }
      }
    }

    // Fallback for demo purposes (remove in production)
    // This simulates the API response structure with realistic Nigerian names
    const mockAccountNames = [
      "ADEBAYO JOHNSON",
      "CHIOMA OKAFOR", 
      "EMEKA NWANKWO",
      "FATIMA IBRAHIM",
      "GRACE ADEYEMI",
      "DAVID OBAFEMI",
      "KUNLE ADESOYE",
      "NIKE AKINWANDE",
      "CHUKWUDI OKORO",
      "AMINA ALIYU",
      "OLUWASEUN OLADELE",
      "CHIDINMA EZE",
      "ADEWALE OSHODIN",
      "TOYIN SULAIMAN",
      "IBRAHIM YUSUF"
    ];

    // Use account number to consistently return the same name
    const index = parseInt(account_number.slice(-1)) % mockAccountNames.length;
    
    return NextResponse.json({
      account_name: mockAccountNames[index],
      account_number: account_number,
      bank_code: bank_code,
      demo: true // Flag to indicate this is demo data
    });

  } catch (error) {
    console.error('Account verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify account' },
      { status: 500 }
    );
  }
}
