// products.js (ES module)
const USD_TO_INR = 83;

function formatPriceINR(priceUSD) {
  const inr = Number(priceUSD) * USD_TO_INR;
  const rounded = Math.round(inr / 100) * 100;
  return '₹' + rounded.toLocaleString('en-IN');
}

const sampleProducts = [
  {id:1, title:"Aero Running Shoe", price:69.99, category:"Footwear", subtype:"Running", tags:["men","fitness"], img:"images/aerorunning.png", createdAt:"2025-01-01"},
  {id:2, title:"Cloud Sneaker", price:89.00, category:"Footwear", subtype:"Casual", tags:["women","street"], img:"images/cloudsneakers.png", createdAt:"2025-02-15"},
  {id:3, title:"Studio Headphones", price:129.00, category:"Audio", subtype:"Over-Ear", tags:["wireless","music"], img:"images/studioheadphone.png", createdAt:"2025-03-12"},
  {id:4, title:"Vivid Hoodie", price:45.50, category:"Apparel", subtype:"Hoodies", tags:["unisex","cotton"], img:"images/vividhoodie.png", createdAt:"2025-04-02"},
  {id:5, title:"Trail Backpack", price:59.99, category:"Bags", subtype:"Outdoor", tags:["hiking","travel"], img:"images/trailbackpack.png", createdAt:"2025-04-20"},
  {id:6, title:"Wireless Earbuds", price:99.99, category:"Audio", subtype:"In-Ear", tags:["wireless","sport"], img:"images/wirelessearbuds.png", createdAt:"2025-05-02"},
  {id:7, title:"Performance Tee", price:19.99, category:"Apparel", subtype:"T-Shirt", tags:["fitness","men"], img:"images/performancetree.png", createdAt:"2025-05-10"},
  {id:8, title:"Classic Wallet", price:24.00, category:"Accessories", subtype:"Wallets", tags:["leather","men"], img:"images/classicwallet.png", createdAt:"2025-05-20"},
  {id:9, title:"Smartwatch Pro", price:199.99, category:"Wearables", subtype:"Smartwatch", tags:["fitness","wireless"], img:"images/smartwatchpro.png", createdAt:"2025-06-01"},
  {id:10, title:"Desk Lamp RGB", price:39.99, category:"Home", subtype:"Lighting", tags:["led","decor"], img:"images/desklamprgb.png", createdAt:"2025-06-08"},
];

let products = [];
let filtered = [];
let state = {
  page:1, perPage:8, q:'', category:'', subtypes: new Set(), tags: new Set(), sort:'relevance', priceMin:null, priceMax:null
};

const els = {
  productsGrid: document.getElementById('productsGrid'),
  search: document.getElementById('search'),
  clearSearch: document.getElementById('clear-search'),
  categorySelect: document.getElementById('categorySelect'),
  sortSelect: document.getElementById('sortSelect'),
  subtypeList: document.getElementById('subtypeList'),
  tagList: document.getElementById('tagList'),
  minPrice: document.getElementById('minPrice'),
  maxPrice: document.getElementById('maxPrice'),
  applyPrice: document.getElementById('applyPrice'),
  clearFilters: document.getElementById('clearFilters'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  currentPage: document.getElementById('currentPage'),
  pagesTotal: document.getElementById('pagesTotal'),
  perPage: document.getElementById('perPage'),
  cartBtn: document.getElementById('cartBtn'),
  cartCount: document.getElementById('cartCount'),
  cartDrawer: document.getElementById('cartDrawer'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  emptyCart: document.getElementById('emptyCart'),
  checkout: document.getElementById('checkout'),
  productModal: document.getElementById('productModal'),
  closeModal: document.getElementById('closeModal'),
  modalImage: document.getElementById('modalImage'),
  modalTitle: document.getElementById('modalTitle'),
  modalDesc: document.getElementById('modalDesc'),
  modalPrice: document.getElementById('modalPrice'),
  addToCartModal: document.getElementById('addToCartModal'),
  viewProduct: document.getElementById('viewProduct'),
  closeCart: document.getElementById('closeCart'),
  perPageSelect: document.getElementById('perPage')
};

// backdrop
let _backdrop = null;
function ensureBackdrop(){
  if(_backdrop) return _backdrop;
  _backdrop = document.createElement('div');
  _backdrop.className = 'ui-backdrop';
  Object.assign(_backdrop.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.45)',
    zIndex: '1100',
    display: 'none'
  });
  document.body.appendChild(_backdrop);
  _backdrop.addEventListener('click', ()=> { toggleModal(false); toggleCart(false); });
  return _backdrop;
}

// load
async function loadProducts(){
  products = sampleProducts.map(p => ({...p}));
  initControls();
  applyFilters();
}

// init controls
function initControls(){
  const cats = Array.from(new Set(products.map(p => p.category))).sort();
  if(els.categorySelect) els.categorySelect.innerHTML = `<option value="">All categories</option>` + cats.map(c=>`<option>${c}</option>`).join('');

  const subtypes = Array.from(new Set(products.map(p=>p.subtype))).sort();
  if(els.subtypeList) els.subtypeList.innerHTML = subtypes.map(s=>`<button class="chip" data-sub="${s}">${s}</button>`).join('');

  const tags = Array.from(new Set(products.flatMap(p=>p.tags))).sort();
  if(els.tagList) els.tagList.innerHTML = tags.map(t=>`<button class="chip" data-tag="${t}">${t}</button>`).join('');

  // toggles
  document.querySelectorAll('#subtypeList .chip').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const sub = btn.dataset.sub;
      if(state.subtypes.has(sub)){ state.subtypes.delete(sub); btn.classList.remove('active'); }
      else { state.subtypes.add(sub); btn.classList.add('active'); }
      state.page=1; applyFilters();
    });
  });
  document.querySelectorAll('#tagList .chip').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const tag = btn.dataset.tag;
      if(state.tags.has(tag)){ state.tags.delete(tag); btn.classList.remove('active'); }
      else { state.tags.add(tag); btn.classList.add('active'); }
      state.page=1; applyFilters();
    });
  });

  if(els.categorySelect) els.categorySelect.addEventListener('change', e=>{ state.category = e.target.value; state.page=1; applyFilters(); });
  if(els.sortSelect) els.sortSelect.addEventListener('change', e=>{ state.sort = e.target.value; applyFilters(); });

  if(els.search) els.search.addEventListener('input', debounce(e=>{ state.q = e.target.value.trim(); state.page=1; applyFilters(); }, 250));
  if(els.clearSearch) els.clearSearch.addEventListener('click', ()=>{ if(els.search) els.search.value=''; state.q=''; applyFilters(); });

  if(els.applyPrice) els.applyPrice.addEventListener('click', ()=> {
    state.priceMin = els.minPrice.value ? Number(els.minPrice.value) : null;
    state.priceMax = els.maxPrice.value ? Number(els.maxPrice.value) : null;
    state.page=1; applyFilters();
  });

  if(els.clearFilters) els.clearFilters.addEventListener('click', ()=> {
    state.subtypes.clear(); state.tags.clear();
    document.querySelectorAll('#subtypeList .chip').forEach(c=>c.classList.remove('active'));
    document.querySelectorAll('#tagList .chip').forEach(c=>c.classList.remove('active'));
    if(els.minPrice) els.minPrice.value=''; if(els.maxPrice) els.maxPrice.value='';
    state.priceMin = null; state.priceMax = null;
    state.category=''; if(els.categorySelect) els.categorySelect.value='';
    state.page=1; applyFilters();
  });

  if(els.perPage) els.perPage.addEventListener('change', ()=> { state.perPage = Number(els.perPage.value); state.page=1; applyFilters(); });
  if(els.prevPage) els.prevPage.addEventListener('click', ()=> { if(state.page>1){ state.page--; applyFilters(); }});
  if(els.nextPage) els.nextPage.addEventListener('click', ()=> { state.page++; applyFilters(); });

  // cart & modal
  if(els.cartBtn) {
    els.cartBtn.addEventListener('click', (e)=> {
      toggleCart(!els.cartDrawer.classList.contains('open'));
      e.stopPropagation();
    });
  }
  if(els.closeCart) els.closeCart.addEventListener('click', ()=> toggleCart(false));
  if(els.emptyCart) els.emptyCart.addEventListener('click', ()=> {
    if(!window.cart || window.cart.length === 0){ alert('Cart is already empty.'); return; }
    if(confirm('Empty the cart? This cannot be undone.')){ window.cart = []; localStorage.removeItem('cart'); renderCart(); toggleCart(false); }
  });
  els.checkout.addEventListener('click', ()=> window.location.href = 'checkout.html');

  if(els.closeModal) els.closeModal.addEventListener('click', ()=> toggleModal(false));
  if(els.viewProduct) els.viewProduct.addEventListener('click', ()=> { toggleModal(false); });

  if(els.addToCartModal) els.addToCartModal.addEventListener('click', ()=> {
    if(els.addToCartModal.dataset.id) addToCart(Number(els.addToCartModal.dataset.id), 1);
    toggleModal(false);
  });

  // backdrop
  ensureBackdrop();

  // click outside handlers
  document.addEventListener('click', (e) => {
    if (els.cartDrawer && els.cartDrawer.classList.contains('open')) {
      const clickedInsideCart = els.cartDrawer.contains(e.target);
      const clickedCartButton = els.cartBtn && els.cartBtn.contains(e.target);
      if (!clickedInsideCart && !clickedCartButton) toggleCart(false);
    }
    if (els.productModal && els.productModal.getAttribute('aria-hidden') === 'false') {
      const modalContent = document.querySelector('.modal-content');
      if (modalContent && !modalContent.contains(e.target)) toggleModal(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.productModal && els.productModal.getAttribute('aria-hidden') === 'false') toggleModal(false);
      if (els.cartDrawer && els.cartDrawer.classList.contains('open')) toggleCart(false);
    }
  });

  if(els.cartDrawer) els.cartDrawer.addEventListener('click', (e) => e.stopPropagation());
  const modalContentEl = document.querySelector('.modal-content');
  if (modalContentEl) modalContentEl.addEventListener('click', (e) => e.stopPropagation());

  const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
  window.cart = savedCart || [];
  renderCart();

  state.perPage = Number(els.perPage && els.perPage.value) || 8;
}

// filters & sort
function applyFilters(){
  filtered = products.filter(p=>{
    if(state.category && p.category !== state.category) return false;
    if(state.subtypes.size && !state.subtypes.has(p.subtype)) return false;
    if(state.tags.size && !p.tags.some(t=>state.tags.has(t))) return false;
    if(state.q){
      const q = state.q.toLowerCase();
      if(!(p.title.toLowerCase().includes(q) || (p.tags.join(' ').toLowerCase().includes(q)) || (p.subtype.toLowerCase().includes(q)))) return false;
    }
    if(state.priceMin !== null && p.price < state.priceMin) return false;
    if(state.priceMax !== null && p.price > state.priceMax) return false;
    return true;
  });

  if(state.sort === 'price-asc') filtered.sort((a,b)=>a.price-b.price);
  else if(state.sort === 'price-desc') filtered.sort((a,b)=>b.price-a.price);
  else if(state.sort === 'newest') filtered.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  const total = Math.max(1, Math.ceil(filtered.length / state.perPage));
  if(state.page > total) state.page = total;
  renderProducts();
  if(els.currentPage) els.currentPage.textContent = state.page;
  if(els.pagesTotal) els.pagesTotal.textContent = total;
}

// render
function renderProducts(){
  if(!els.productsGrid) return;
  els.productsGrid.innerHTML = '';
  const start = (state.page-1)*state.perPage;
  const pageItems = filtered.slice(start, start + state.perPage);

  if(pageItems.length === 0){
    els.productsGrid.innerHTML = `<div class="glass-panel" style="grid-column:1/-1">No products found.</div>`;
    return;
  }

  for(const p of pageItems){
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.title)}" loading="lazy">
      <div class="title">${escapeHtml(p.title)}</div>
      <div class="muted">${escapeHtml(p.subtype)} · ${escapeHtml(p.category)}</div>
      <div class="badges">${p.tags.map(t=>`<span class="badge">${t}</span>`).join('')}</div>
      <div class="price">${formatPriceINR(p.price)}</div>
      <div class="actions">
        <button class="viewBtn">Quick view</button>
        <button class="addBtn">Add to cart</button>
      </div>
    `;
    const viewBtn = card.querySelector('.viewBtn');
    const addBtn = card.querySelector('.addBtn');
    if(viewBtn) viewBtn.addEventListener('click', (ev)=> { ev.stopPropagation(); openModal(p); });
    if(addBtn) addBtn.addEventListener('click', (ev)=> { ev.stopPropagation(); addToCart(p.id,1); });
    els.productsGrid.appendChild(card);
  }
}

// modal
function openModal(product){
  if(!els.productModal) return console.warn('Modal element not present');
  if(els.modalImage) els.modalImage.src = product.img;
  if(els.modalTitle) els.modalTitle.textContent = product.title;
  if(els.modalDesc) els.modalDesc.textContent = `${product.subtype} — ${product.tags.join(', ')}`;
  if(els.modalPrice) els.modalPrice.textContent = `${formatPriceINR(product.price)}`;
  if(els.addToCartModal) els.addToCartModal.dataset.id = product.id;

  toggleModal(true);
}
function toggleModal(show){
  if(!els.productModal) return;
  ensureBackdrop();
  if(show){
    els.productModal.style.display = 'flex';
    els.productModal.setAttribute('aria-hidden','false');
    if(_backdrop) _backdrop.style.display = 'block';
    const btn = els.closeModal || els.productModal.querySelector('button');
    if(btn) btn.focus();
  } else {
    els.productModal.style.display = 'none';
    els.productModal.setAttribute('aria-hidden','true');
    if(_backdrop) _backdrop.style.display = 'none';
  }
}

// cart
function addToCart(id, qty=1){
  const idx = window.cart.findIndex(x=>x.id===id);
  if(idx>=0) window.cart[idx].qty += qty;
  else window.cart.push({id, qty});
  localStorage.setItem('cart', JSON.stringify(window.cart));
  renderCart();
  if (els.cartBtn) {
    try { els.cartBtn.animate([{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:200}); } catch(e){}
  }
}
function renderCart(){
  if(!els.cartItems) return;
  const lines = window.cart.map(ci=>{
    const p = products.find(x=>x.id===ci.id) || sampleProducts.find(x=>x.id===ci.id);
    const sub = (p? p.price*ci.qty : 0);
    return {p, qty:ci.qty, sub};
  });
  els.cartItems.innerHTML = lines.map(l=>`
    <div class="cart-item">
      <img src="${l.p.img}" alt="${escapeHtml(l.p.title)}">
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(l.p.title)}</div>
        <div class="muted">${l.qty} × ${formatPriceINR(l.p.price)}</div>
      </div>
      <div style="text-align:right">${formatPriceINR(l.sub)}</div>
    </div>
  `).join('') || `<div class="muted">Cart is empty</div>`;
  const total = lines.reduce((s,l)=>s+l.sub,0);
  if(els.cartTotal) els.cartTotal.textContent = `${formatPriceINR(total)}`;
  if(els.cartCount) els.cartCount.textContent = window.cart.reduce((s,i)=>s+i.qty,0);
}

// drawer
function toggleCart(open){
  if(!els.cartDrawer) return;
  if(open){
    els.cartDrawer.classList.add('open');
    ensureBackdrop();
    if(_backdrop) _backdrop.style.display = 'block';
  } else {
    els.cartDrawer.classList.remove('open');
    if(_backdrop) _backdrop.style.display = 'none';
  }
}

// utils
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }
function debounce(fn,wait=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

loadProducts();