// Define 20 food & beverage products.
const products = [
  { id: 1, name: 'Apple Juice', price: 3.50 },
  { id: 2, name: 'Orange Juice', price: 3.00 },
  { id: 3, name: 'Banana Smoothie', price: 4.00 },
  { id: 4, name: 'Lemonade', price: 2.50 },
  { id: 5, name: 'Iced Tea', price: 2.75 },
  { id: 6, name: 'Coffee', price: 2.00 },
  { id: 7, name: 'Espresso', price: 2.50 },
  { id: 8, name: 'Cappuccino', price: 3.00 },
  { id: 9, name: 'Latte', price: 3.50 },
  { id: 10, name: 'Hot Chocolate', price: 3.00 },
  { id: 11, name: 'Water Bottle', price: 1.50 },
  { id: 12, name: 'Soda', price: 1.75 },
  { id: 13, name: 'Energy Drink', price: 2.50 },
  { id: 14, name: 'Milkshake', price: 4.50 },
  { id: 15, name: 'Protein Shake', price: 5.00 },
  { id: 16, name: 'Green Tea', price: 2.25 },
  { id: 17, name: 'Herbal Tea', price: 2.50 },
  { id: 18, name: 'Smoothie Bowl', price: 6.00 },
  { id: 19, name: 'Iced Coffee', price: 3.25 },
  { id: 20, name: 'Frappe', price: 4.00 },
];

const productsContainer = document.getElementById('products');
const cartItemsContainer = document.getElementById('cart-items');
const totalDisplay = document.getElementById('total');
const checkoutBtn = document.getElementById('checkoutBtn');

let cart = [];

// Function to render products
function displayProducts() {
  // Clear container in case of re-renders
  productsContainer.innerHTML = '';
  products.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.classList.add('product');
    productDiv.setAttribute('data-id', product.id);
    productDiv.innerHTML = `
      <h3>${product.name}</h3>
      <p>Price: $${product.price.toFixed(2)}</p>
      <button class="add-to-cart">Add to Cart</button>
    `;
    productsContainer.appendChild(productDiv);
  });
}

// Function to add product to cart
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  cart.push(product);
  displayCart();
}

// Function to display cart items and update total
function displayCart() {
  cartItemsContainer.innerHTML = '';
  cart.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - $${item.price.toFixed(2)}`;
    cartItemsContainer.appendChild(li);
  });
  updateTotal();
}

function updateTotal() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalDisplay.textContent = total.toFixed(2);
}

// Checkout process: create a Stripe Checkout Session and redirect
checkoutBtn.addEventListener('click', async function() {
  const lineItems = cart.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100), // amount in cents
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
    // Redirect directly using the returned session URL.
    window.location.href = session.url;
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('Error during checkout: ' + error.message);
  }
});

// Use event delegation for Add-to-Cart buttons.
productsContainer.addEventListener('click', function(event) {
  if (event.target && event.target.matches('button.add-to-cart')) {
    const productDiv = event.target.closest('.product');
    const productId = parseInt(productDiv.getAttribute('data-id'));
    addToCart(productId);
  }
});

// Ensure products are rendered after DOM loads.
document.addEventListener('DOMContentLoaded', displayProducts);
