checkoutBtn.addEventListener('click', async function() {
  const lineItems = cart.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100), // Stripe expects cents
    },
    quantity: 1,
  }));

  try {
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItems }),
    });
    const session = await response.json();
    // Instead of using stripe.redirectToCheckout, redirect directly:
    window.location.href = session.url;
  } catch (error) {
    console.error('Error processing checkout:', error);
    alert('Error processing checkout: ' + error.message);
  }
});
