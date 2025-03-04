const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using the service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optionally, if you wish to verify webhook signatures, configure the endpoint secret here:
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
  console.log("Webhook received:", event.body);

  // If verifying signatures, uncomment the following block:
  /*
  const signature = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, signature, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
  */

  // Without signature verification:
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    console.error("Error parsing webhook event:", err);
    return { statusCode: 400, body: 'Invalid payload' };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    console.log("Processing checkout.session.completed event for session:", session.id);

    // Extract metadata.
    // We expect that when creating the Checkout Session,
    // you pass the list of products as a JSON string in metadata.products
    // and a custom field "loc" in metadata.loc.
    let productsMetadata = "";
    if (session.metadata && session.metadata.products) {
      productsMetadata = session.metadata.products;
    }

    // Extract total amount from the session
    const order_value = session.amount_total;

    // Prepare buyer details. Store the buyer's name and, if available, append the address.
    let buyer_name = "";
    if (session.customer_details) {
      buyer_name = session.customer_details.name || "";
      if (session.customer_details.address) {
        buyer_name += " (" + JSON.stringify(session.customer_details.address) + ")";
      }
    }

    // Use the custom field "loc" from metadata if available
    const locValue = (session.metadata && session.metadata.loc) ? session.metadata.loc : "";

    // For ordered_items, store the products metadata.
    const ordered_items = productsMetadata;

    // Set status to "pending" to satisfy the check constraint (allowed values: 'pending', 'prepared')
    const status = "pending";

    // Log the data we are about to insert
    console.log("Inserting order with data:", {
      ordered_items,
      order_value,
      buyer_name,
      loc: locValue,
      status,
    });

    // Insert the order into Supabase using your existing table schema
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          ordered_items,  // JSON string of products
          order_value,    // total amount
          buyer_name,     // buyer's name (and address, if any)
          loc: locValue,  // custom field from metadata
          status,         // 'pending'
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

    console.log("Order inserted successfully:", data);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Order recorded" })
    };
  }

  // For unhandled events, return success.
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Event not handled" })
  };
};
