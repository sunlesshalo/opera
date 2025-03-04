const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using your service role key (DO NOT expose this key in client-side code)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optionally, if you wish to verify webhook signatures, set your endpoint secret here:
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
  console.log("Webhook received:", event.body);

  // If verifying the signature, uncomment the following lines:
  // const signature = event.headers['stripe-signature'];
  // let stripeEvent;
  // try {
  //   stripeEvent = stripe.webhooks.constructEvent(event.body, signature, endpointSecret);
  // } catch (err) {
  //   console.error("Webhook signature verification failed:", err);
  //   return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  // }

  // Without signature verification:
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    console.error("Error parsing webhook event:", err);
    return { statusCode: 400, body: 'Invalid payload' };
  }

  // Handle the checkout session completion event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    // Extract data from the session:
    const stripe_session_id = session.id;
    const total_amount = session.amount_total; // in smallest currency unit
    // Retrieve the list of products from metadata (if provided during session creation)
    let products = [];
    if (session.metadata && session.metadata.products) {
      try {
        products = JSON.parse(session.metadata.products);
      } catch (err) {
        console.error("Error parsing products metadata:", err);
      }
    }
    // Capture customer details (address, email, name, etc.)
    const customer_details = session.customer_details || {};
    // Capture any custom fields, such as "loc"
    let custom_fields = {};
    if (session.metadata && session.metadata.loc) {
      custom_fields.loc = session.metadata.loc;
    }

    // Insert the order data into Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          stripe_session_id,
          total_amount,
          products,
          customer_details,
          custom_fields,
          status: 'paid' // You can adjust the status as needed
        }
      ]);

    if (error) {
      console.error("Error inserting order into Supabase:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log("Order recorded successfully:", data);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Order recorded" })
    };
  }

  // For events that are not handled, return a success response.
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Event not handled" })
  };
};
