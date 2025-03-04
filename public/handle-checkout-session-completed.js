const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Use a service role key to have full access to Supabase (store it securely as an env variable)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optionally, if you wish to verify webhook signatures, require and configure that here.
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
  // NOTE: If verifying webhook signature, you'll need to get the signature header and use stripe.webhooks.constructEvent
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    console.error("Error parsing webhook event:", err);
    return { statusCode: 400, body: 'Invalid payload' };
  }

  // For example, if verifying signature:
  // const signature = event.headers['stripe-signature'];
  // try {
  //   stripeEvent = stripe.webhooks.constructEvent(event.body, signature, endpointSecret);
  // } catch (err) {
  //   console.error("Webhook signature verification failed.", err);
  //   return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  // }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // Extract relevant details.
    const stripe_session_id = session.id;
    const total_amount = session.amount_total; // in smallest currency unit
    // You must have stored products in the metadata when creating the session
    // For example, pass JSON string of products via metadata: metadata: { products: JSON.stringify(products) }
    let products = [];
    if (session.metadata && session.metadata.products) {
      try {
        products = JSON.parse(session.metadata.products);
      } catch (err) {
        console.error("Error parsing products from metadata:", err);
      }
    }
    const customer_details = session.customer_details || {};
    const custom_fields = session.custom_fields || {};

    // Insert the order into Supabase.
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          stripe_session_id,
          total_amount,
          products,
          customer_details,
          custom_fields,
          status: 'paid',
        }
      ]);

    if (error) {
      console.error("Error inserting order into Supabase:", error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    console.log("Order inserted successfully:", data);
    return { statusCode: 200, body: JSON.stringify({ message: "Order recorded" }) };
  }

  // For other event types, simply return success.
  return { statusCode: 200, body: JSON.stringify({ message: "Event not handled" }) };
};
