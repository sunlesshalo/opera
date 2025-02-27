// Lista de produse (20) în RON, cu denumiri realiste pentru un bar la Opera din Cluj.
const products = [
  { id: 1, name: 'Vin roșu sec', price: 30.00 },
  { id: 2, name: 'Vin alb sec', price: 28.00 },
  { id: 3, name: 'Bere artizanală', price: 15.00 },
  { id: 4, name: 'Cafea', price: 12.00 },
  { id: 5, name: 'Ceai de mentă', price: 10.00 },
  { id: 6, name: 'Cocktail Cluj', price: 35.00 },
  { id: 7, name: 'Suc natural de portocale', price: 12.00 },
  { id: 8, name: 'Suc natural de mere', price: 10.00 },
  { id: 9, name: 'Limonadă proaspătă', price: 14.00 },
  { id: 10, name: 'Ciocolată caldă', price: 13.00 },
  { id: 11, name: 'Smoothie de fructe', price: 18.00 },
  { id: 12, name: 'Apă minerală', price: 5.00 },
  { id: 13, name: 'Platou cu brânzeturi', price: 40.00 },
  { id: 14, name: 'Platou cu mezeluri', price: 45.00 },
  { id: 15, name: 'Sandviș cu șuncă și cașcaval', price: 20.00 },
  { id: 16, name: 'Salată de sezon', price: 25.00 },
  { id: 17, name: 'Gustare de cartofi prăjiți', price: 18.00 },
  { id: 18, name: 'Biscuiți artizanali', price: 10.00 },
  { id: 19, name: 'Supă de legume', price: 22.00 },
  { id: 20, name: 'Clătite cu gem', price: 16.00 },
];

const productsContainer = document.getElementById('products');
const cartItemsContainer = document.getElementById('cart-items');
const totalDisplay = document.getElementById('total');
const checkoutBtn = document.getElementById('checkoutBtn');

let cart = [];

// Funcție pentru afișarea produselor
function displayProducts() {
  productsContainer.innerHTML = '';
  products.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.classList.add('product');
    productDiv.setAttribute('data-id', product.id);
    productDiv.innerHTML = `
      <h3>${product.name}</h3>
      <p>Preț: ${product.price.toFixed(2)} RON</p>
      <button class="add-to-cart">Adaugă în coș</button>
    `;
    productsContainer.appendChild(productDiv);
  });
}

// Adaugă produs în coș
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  cart.push(product);
  displayCart();
}

// Afișează produsele din coș și actualizează totalul
function displayCart() {
  cartItemsContainer.innerHTML = '';
  cart.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name} - ${item.price.toFixed(2)} RON`;
    cartItemsContainer.appendChild(li);
  });
  updateTotal();
}

function updateTotal() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalDisplay.textContent = total.toFixed(2);
}

// Procesul de checkout: creează un Checkout Session Stripe și redirecționează.
checkoutBtn.addEventListener('click', async function() {
  const lineItems = cart.map(item => ({
    price_data: {
      currency: 'ron',
      product_data: { name: item.name },
      unit_amount: Math.round(item.price * 100), // RON în bani mici
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
    // Redirecționează direct la URL-ul de checkout
    window.location.href = session.url;
  } catch (error) {
    console.error('Eroare la finalizarea comenzii:', error);
    alert('Eroare la finalizarea comenzii: ' + error.message);
  }
});

// Eveniment de delegare pentru butoanele "Adaugă în coș"
productsContainer.addEventListener('click', function(event) {
  if (event.target && event.target.matches('button.add-to-cart')) {
    const productDiv = event.target.closest('.product');
    const productId = parseInt(productDiv.getAttribute('data-id'));
    addToCart(productId);
  }
});

// Asigură-te că produsele sunt afișate după ce DOM-ul este încărcat
document.addEventListener('DOMContentLoaded', displayProducts);
