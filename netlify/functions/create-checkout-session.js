const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { lineItems } = JSON.parse(event.body);

    // Use environment variables if set, otherwise use your live domain.
    const successUrl = process.env.SUCCESS_URL || 'https://fastidious-belekoy-266e0b.netlify.app/success';
    const cancelUrl  = process.env.CANCEL_URL  || 'https://fastidious-belekoy-266e0b.netlify.app/cancel';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
