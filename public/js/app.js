/* ================================================================
   app.js – Loja (Store Frontend)
   ================================================================ */

const API = "";
let carrinho = JSON.parse(localStorage.getItem("carrinho") || "[]");

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Formatação BRL ────────────────────────────────────────
function brl(v) {
  return parseFloat(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Carregar Produtos ─────────────────────────────────────
async function carregarProdutos() {
  const grid = document.getElementById("products-grid");
  const marca = document.getElementById("search-marca").value.trim();
  const url = marca ? `${API}/api/produtos?marca=${encodeURIComponent(marca)}` : `${API}/api/produtos`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.length) {
      grid.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Nenhum produto encontrado.</p></div>`;
      return;
    }

    grid.innerHTML = data.map((p) => {
      const stockClass = p.quantidade <= 0 ? "out" : p.quantidade <= 5 ? "low" : "";
      const stockText = p.quantidade <= 0 ? "Sem stock" : `${p.quantidade} em stock`;
      const imgSrc = p.fotoUrl || "https://via.placeholder.com/300x200?text=Sem+Foto";
      const disabled = p.quantidade <= 0 ? "disabled style='opacity:0.5;cursor:not-allowed;'" : "";

      return `
        <div class="card product-card">
          <img class="product-image" src="${imgSrc}" alt="${p.modelo}" onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Foto'" />
          <div class="product-info">
            <div class="product-brand">${p.marca || p.partitionKey}</div>
            <div class="product-name">${p.modelo || p.rowKey}</div>
            <div class="product-price">${brl(p.valor)}</div>
            <div class="product-stock ${stockClass}">${stockText}</div>
            <button class="btn btn-primary btn-sm mt-1" ${disabled}
              onclick='adicionarAoCarrinho(${JSON.stringify({ pk: p.partitionKey, rk: p.rowKey, marca: p.marca || p.partitionKey, modelo: p.modelo || p.rowKey, valor: p.valor, fotoUrl: p.fotoUrl || "" }).replace(/'/g, "\\'")})'
            >🛒 Adicionar</button>
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">❌</div><p>Erro ao carregar produtos.</p></div>`;
    console.error(err);
  }
}

// ── Carrinho ──────────────────────────────────────────────
function adicionarAoCarrinho(prod) {
  const idx = carrinho.findIndex((c) => c.pk === prod.pk && c.rk === prod.rk);
  if (idx >= 0) {
    carrinho[idx].qtd += 1;
  } else {
    carrinho.push({ ...prod, qtd: 1 });
  }
  salvarCarrinho();
  toast(`${prod.marca} ${prod.modelo} adicionado!`, "success");
}

function salvarCarrinho() {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  renderCarrinho();
}

function renderCarrinho() {
  const el = document.getElementById("cart-items");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");

  const total = carrinho.reduce((s, c) => s + c.valor * c.qtd, 0);
  countEl.textContent = carrinho.reduce((s, c) => s + c.qtd, 0);
  totalEl.textContent = brl(total);

  if (!carrinho.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><p>O carrinho está vazio</p></div>`;
    return;
  }

  el.innerHTML = carrinho.map((c, i) => `
    <div class="cart-item">
      <img src="${c.fotoUrl || 'https://via.placeholder.com/50?text=...'}" alt="" onerror="this.src='https://via.placeholder.com/50?text=...'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${c.marca} ${c.modelo}</div>
        <div class="cart-item-price">${brl(c.valor)} × ${c.qtd}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
        <div class="qty-control">
          <button onclick="alterarQtd(${i},-1)">−</button>
          <span>${c.qtd}</span>
          <button onclick="alterarQtd(${i},1)">+</button>
        </div>
        <button class="btn btn-danger btn-sm" style="padding:2px 8px;font-size:0.7rem;" onclick="removerItem(${i})">✕</button>
      </div>
    </div>`).join("");
}

function alterarQtd(i, delta) {
  carrinho[i].qtd += delta;
  if (carrinho[i].qtd <= 0) carrinho.splice(i, 1);
  salvarCarrinho();
}

function removerItem(i) {
  carrinho.splice(i, 1);
  salvarCarrinho();
}

function toggleCart() {
  document.getElementById("cart-sidebar").classList.toggle("open");
}

// ── Checkout ──────────────────────────────────────────────
function abrirCheckout() {
  if (!carrinho.length) return toast("Carrinho vazio!", "error");
  document.getElementById("cart-sidebar").classList.remove("open");
  document.getElementById("checkout-modal").classList.add("active");
  document.getElementById("checkout-total").textContent = brl(carrinho.reduce((s, c) => s + c.valor * c.qtd, 0));
}

function fecharCheckout() {
  document.getElementById("checkout-modal").classList.remove("active");
}

async function realizarCheckout(e) {
  e.preventDefault();
  const nome = document.getElementById("ck-nome").value.trim();
  const email = document.getElementById("ck-email").value.trim();
  const pagamento = document.querySelector('input[name="pagamento"]:checked').value;
  const entrega = document.querySelector('input[name="entrega"]:checked').value;

  const itens = carrinho.map((c) => ({
    marca: c.marca,
    modelo: c.modelo,
    quantidade: c.qtd,
  }));

  try {
    const res = await fetch(`${API}/api/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailCliente: email,
        nomeCliente: nome,
        itens,
        metodoPagamento: pagamento,
        metodoEntrega: entrega,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro");

    toast("Pedido confirmado com sucesso! 🎉", "success");
    carrinho = [];
    salvarCarrinho();
    fecharCheckout();
    document.getElementById("checkout-form").reset();
    carregarProdutos(); // refresh stock
  } catch (err) {
    toast(err.message, "error");
  }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
  renderCarrinho();
});
