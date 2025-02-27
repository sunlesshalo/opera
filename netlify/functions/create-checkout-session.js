const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Simple in-memory rate limiter
// Allows up to 10 requests per IP per minute.
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function rateLimit(ip) {
  const currentTime = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, firstRequest: currentTime };
  // Reset if window passed
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
  if (!Array.isArray(lineItems)) return false;
  for (const item of lineItems) {
    // Check required properties exist
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
    // Sanitize product name and ensure values are numbers and positive.
    item.price_data.product_data.name = String(item.price_data.product_data.name).trim();
    item.price_data.unit_amount = Number(item.price_data.unit_amount);
    item.quantity = Number(item.quantity);
    if (item.price_data.unit_amount <= 0 || item.quantity <= 0) return false;
  }
  return true;
}

exports.handler = async (event, context) => {
  console.log("Received event:", event);

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    console.error("Method not allowed:", event.httpMethod);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Rate limiting by IP address
  const ip = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
  if (rateLimit(ip)) {
    console.error(`Rate limit exceeded for IP: ${ip}`);
    return { statusCode: 429, body: 'Too Many Requests' };
  }

  // Parse and validate request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error("Error parsing JSON:", err);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { lineItems } = body;
  if (!validateLineItems(lineItems)) {
    console.error("Invalid lineItems data:", lineItems);
    return { statusCode: 400, body: 'Invalid cart data' };
  }

  // Set success and cancel URLs from env or fallback to your live domain
  const successUrl = process.env.SUCCESS_URL || 'https://fastidious-belekoy-266e0b.netlify.app/success';
  const cancelUrl  = process.env.CANCEL_URL  || 'https://fastidious-belekoy-266e0b.netlify.app/cancel';

  console.log("Creating Stripe session with successUrl:", successUrl, "and cancelUrl:", cancelUrl);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log("Stripe session created successfully:", session.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error) {
    console.error("Error creating Stripe session:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
