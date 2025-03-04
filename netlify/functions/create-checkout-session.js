const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Simple in-memory rate limiter
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function rateLimit(ip) {
  const currentTime = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, firstRequest: currentTime };
  if (currentTime - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.firstRequest = currentTime;
  }
  entry.count++;
  rateLimitStore.set(ip, entry);
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

// Validate and sanitize the cart data (lineItems)
function validateLineItems(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return false;
  for (const item of lineItems) {
    if (
      !item.price_data ||
      typeof item.price_data !== 'object' ||
      !item.price_data.currency ||
      !item.price_data.product_data ||
      typeof item.price_data.product_data.name !== 'string' ||
      isNaN(item.price_data.unit_amount) ||
      !item.quantity
    ) {
      return false;
    }
    item.price_data.product_data.name = String(item.price_data.product_data.name).trim();
    item.price_data.unit_amount = Number(item.price_data.unit_amount);
    item.quantity = Number(item.quantity);
    if (item.price_data.unit_amount <= 0 || item.quantity <= 0) return false;
  }
  return true;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

exports.handler = async (event, context) => {
  console.log("Received event:", event);

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.error("Method not allowed:", event.httpMethod);
    return { 
      statusCode: 405, 
      headers: jsonHeaders, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  // Rate limiting by IP address
  const ip = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
  if (rateLimit(ip)) {
    console.error(`Rate limit exceeded for IP: ${ip}`);
    return { 
      statusCode: 429, 
      headers: jsonHeaders, 
      body: JSON.stringify({ error: 'Too Many Requests' }) 
    };
  }

  // Parse and validate request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error("Error parsing JSON:", err);
    return { 
      statusCode: 400, 
      headers: jsonHeaders, 
      body: JSON.stringify({ error: 'Invalid JSON' }) 
    };
  }

  // Expecting lineItems (an array) and optionally a custom "loc" value from the client.
  const { lineItems, loc } = body;
  if (!lineItems || !validateLineItems(lineItems)) {
    console.error("Invalid or missing lineItems data:", lineItems);
    return { 
      statusCode: 400, 
      headers: jsonHeaders, 
      body: JSON.stringify({ error: 'Invalid or missing line_items data' }) 
    };
  }

  // Set success and cancel URLs from env or fallback to your live domain
  const successUrl = process.env.SUCCESS_URL || 'https://fastidious-belekoy-266e0b.netlify.app/success';
  const cancelUrl  = process.env.CANCEL_URL  || 'https://fastidious-belekoy-266e0b.netlify.app/cancel';

  console.log("Creating Stripe session with successUrl:", successUrl, "and cancelUrl:", cancelUrl);

  try {
    // Include metadata with the products list; we'll send "loc" as metadata too.
    const metadata = {
      products: JSON.stringify(lineItems.map(item => ({
        name: item.price_data.product_data.name,
        unit_amount: item.price_data.unit_amount,
        quantity: item.quantity
      }))),
      loc: loc || ""
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required', // Ask for billing address
      custom_fields: [
        {
          key: 'loc',
          label: { type: 'custom', custom: 'Location' },
          type: 'text',
          optional: true // set to false if you want to force input
        }
      ],
      metadata: metadata
    });

    console.log("Stripe session created successfully:", session.id);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error) {
    console.error("Error creating Stripe session:", error);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
