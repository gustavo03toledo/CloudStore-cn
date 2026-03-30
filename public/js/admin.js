/* ================================================================
   admin.js – Painel de Administração
   ================================================================ */

const API = "";

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function brl(v) {
  return parseFloat(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Tabs ──────────────────────────────────────────────────
function mudarTab(tab, btn) {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  btn.classList.add("active");

  if (tab === "produtos") carregarProdutosAdmin();
  if (tab === "clientes") carregarClientes();
  if (tab === "pedidos") carregarPedidosAdmin();
}

// ══════════════════════════════════════════════════════════
//  PRODUTOS
// ══════════════════════════════════════════════════════════

async function carregarProdutosAdmin() {
  const tbody = document.getElementById("tabela-produtos");
  const marca = document.getElementById("admin-search-marca").value.trim();
  const url = marca ? `${API}/api/produtos?marca=${encodeURIComponent(marca)}` : `${API}/api/produtos`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    document.getElementById("stat-produtos").textContent = data.length;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum produto.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((p) => `
      <tr>
        <td><img class="table-img" src="${p.fotoUrl || 'https://via.placeholder.com/40?text=...'}" alt="" onerror="this.src='https://via.placeholder.com/40?text=...'" /></td>
        <td>${p.marca || p.partitionKey}</td>
        <td>${p.modelo || p.rowKey}</td>
        <td>${brl(p.valor)}</td>
        <td><span class="badge ${p.quantidade <= 0 ? 'badge-danger' : p.quantidade <= 5 ? 'badge-warning' : 'badge-success'}">${p.quantidade}</span></td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="editarProduto('${p.partitionKey}','${p.rowKey}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarProduto('${p.partitionKey}','${p.rowKey}')">🗑️</button>
        </td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar.</td></tr>`;
  }
}

function abrirModalProduto() {
  document.getElementById("modal-produto-titulo").textContent = "Novo Produto";
  document.getElementById("form-produto").reset();
  document.getElementById("prod-edit-pk").value = "";
  document.getElementById("prod-edit-rk").value = "";
  document.getElementById("prod-marca").disabled = false;
  document.getElementById("prod-modelo").disabled = false;
  document.getElementById("foto-preview").style.display = "none";
  document.getElementById("file-label").textContent = "📷 Clique para selecionar uma imagem";
  document.getElementById("modal-produto").classList.add("active");
}

function fecharModalProduto() {
  document.getElementById("modal-produto").classList.remove("active");
}

async function editarProduto(pk, rk) {
  try {
    const res = await fetch(`${API}/api/produtos/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`);
    const p = await res.json();

    document.getElementById("modal-produto-titulo").textContent = "Editar Produto";
    document.getElementById("prod-edit-pk").value = pk;
    document.getElementById("prod-edit-rk").value = rk;
    document.getElementById("prod-marca").value = p.marca || pk;
    document.getElementById("prod-marca").disabled = true;
    document.getElementById("prod-modelo").value = p.modelo || rk;
    document.getElementById("prod-modelo").disabled = true;
    document.getElementById("prod-valor").value = p.valor;
    document.getElementById("prod-quantidade").value = p.quantidade;

    if (p.fotoUrl) {
      document.getElementById("foto-preview").src = p.fotoUrl;
      document.getElementById("foto-preview").style.display = "block";
    } else {
      document.getElementById("foto-preview").style.display = "none";
    }

    document.getElementById("modal-produto").classList.add("active");
  } catch (err) {
    toast("Erro ao carregar produto.", "error");
  }
}

async function salvarProduto(e) {
  e.preventDefault();
  const pk = document.getElementById("prod-edit-pk").value;
  const rk = document.getElementById("prod-edit-rk").value;
  const isEdit = pk && rk;

  const formData = new FormData();
  formData.append("marca", document.getElementById("prod-marca").value.trim());
  formData.append("modelo", document.getElementById("prod-modelo").value.trim());
  formData.append("valor", document.getElementById("prod-valor").value);
  formData.append("quantidade", document.getElementById("prod-quantidade").value);

  const foto = document.getElementById("prod-foto").files[0];
  if (foto) formData.append("foto", foto);

  const url = isEdit
    ? `${API}/api/produtos/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`
    : `${API}/api/produtos`;

  try {
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro");

    toast(data.message, "success");
    fecharModalProduto();
    carregarProdutosAdmin();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function eliminarProduto(pk, rk) {
  if (!confirm("Tem a certeza que deseja eliminar este produto?")) return;
  try {
    const res = await fetch(`${API}/api/produtos/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`, { method: "DELETE" });
    const data = await res.json();
    toast(data.message, "success");
    carregarProdutosAdmin();
  } catch (err) {
    toast("Erro ao eliminar.", "error");
  }
}

function previewFile(input) {
  const preview = document.getElementById("foto-preview");
  const label = document.getElementById("file-label");
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(input.files[0]);
    label.textContent = `📎 ${input.files[0].name}`;
  }
}

// ══════════════════════════════════════════════════════════
//  CLIENTES
// ══════════════════════════════════════════════════════════

async function carregarClientes() {
  const tbody = document.getElementById("tabela-clientes");
  try {
    const res = await fetch(`${API}/api/clientes`);
    const data = await res.json();

    document.getElementById("stat-clientes").textContent = data.length;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum cliente.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((c) => `
      <tr>
        <td>${c.nome}</td>
        <td>${c.email || c.partitionKey}</td>
        <td>${c.telefone || "—"}</td>
        <td>${c.ra || "—"}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="editarCliente('${c.partitionKey}','${c.rowKey}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarCliente('${c.partitionKey}','${c.rowKey}')">🗑️</button>
        </td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar.</td></tr>`;
  }
}

function abrirModalCliente() {
  document.getElementById("modal-cliente-titulo").textContent = "Novo Cliente";
  document.getElementById("form-cliente").reset();
  document.getElementById("cli-edit-pk").value = "";
  document.getElementById("cli-edit-rk").value = "";
  document.getElementById("cli-email").disabled = false;
  document.getElementById("modal-cliente").classList.add("active");
}

function fecharModalCliente() {
  document.getElementById("modal-cliente").classList.remove("active");
}

async function editarCliente(pk, rk) {
  try {
    const res = await fetch(`${API}/api/clientes/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`);
    const c = await res.json();

    document.getElementById("modal-cliente-titulo").textContent = "Editar Cliente";
    document.getElementById("cli-edit-pk").value = pk;
    document.getElementById("cli-edit-rk").value = rk;
    document.getElementById("cli-nome").value = c.nome;
    document.getElementById("cli-email").value = c.email || pk;
    document.getElementById("cli-email").disabled = true;
    document.getElementById("cli-telefone").value = c.telefone || "";
    document.getElementById("cli-endereco").value = c.endereco || "";
    document.getElementById("cli-ra").value = c.ra || "";

    document.getElementById("modal-cliente").classList.add("active");
  } catch (err) {
    toast("Erro ao carregar cliente.", "error");
  }
}

async function salvarCliente(e) {
  e.preventDefault();
  const pk = document.getElementById("cli-edit-pk").value;
  const rk = document.getElementById("cli-edit-rk").value;
  const isEdit = pk && rk;

  const body = {
    nome: document.getElementById("cli-nome").value.trim(),
    email: document.getElementById("cli-email").value.trim(),
    telefone: document.getElementById("cli-telefone").value.trim(),
    endereco: document.getElementById("cli-endereco").value.trim(),
    ra: document.getElementById("cli-ra").value.trim(),
  };

  const url = isEdit
    ? `${API}/api/clientes/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`
    : `${API}/api/clientes`;

  try {
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro");

    toast(data.message, "success");
    fecharModalCliente();
    carregarClientes();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function eliminarCliente(pk, rk) {
  if (!confirm("Tem a certeza que deseja eliminar este cliente?")) return;
  try {
    const res = await fetch(`${API}/api/clientes/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`, { method: "DELETE" });
    const data = await res.json();
    toast(data.message, "success");
    carregarClientes();
  } catch (err) {
    toast("Erro ao eliminar.", "error");
  }
}

// ══════════════════════════════════════════════════════════
//  PEDIDOS
// ══════════════════════════════════════════════════════════

async function carregarPedidosAdmin() {
  const tbody = document.getElementById("tabela-pedidos");
  try {
    const res = await fetch(`${API}/api/pedidos`);
    const data = await res.json();

    document.getElementById("stat-pedidos").textContent = data.length;
    const receita = data.reduce((s, p) => s + (p.valorTotal || 0), 0);
    document.getElementById("stat-receita").textContent = brl(receita).replace("R$\u00a0", "");

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhum pedido.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((p) => {
      let itensStr = "—";
      try {
        const itens = JSON.parse(p.itens);
        itensStr = itens.map((i) => `${i.marca} ${i.modelo} (×${i.quantidade})`).join(", ");
      } catch (_) {}

      return `
        <tr>
          <td style="font-size:0.75rem;font-family:monospace;">${p.rowKey ? p.rowKey.substring(0,8) : "—"}…</td>
          <td>${p.emailCliente || p.partitionKey}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itensStr}">${itensStr}</td>
          <td class="text-success" style="font-weight:600;">${brl(p.valorTotal)}</td>
          <td>${p.metodoPagamento || "—"}</td>
          <td><span class="badge badge-success">${p.status || "Confirmado"}</span></td>
          <td style="font-size:0.8rem;">${p.dataPedido ? new Date(p.dataPedido).toLocaleDateString("pt-BR") : "—"}</td>
        </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erro ao carregar.</td></tr>`;
  }
}

// ══════════════════════════════════════════════════════════
//  Stats & Init
// ══════════════════════════════════════════════════════════

async function carregarStats() {
  try {
    const [pRes, cRes, oRes] = await Promise.all([
      fetch(`${API}/api/produtos`),
      fetch(`${API}/api/clientes`),
      fetch(`${API}/api/pedidos`),
    ]);
    const [prods, clis, ords] = await Promise.all([pRes.json(), cRes.json(), oRes.json()]);

    document.getElementById("stat-produtos").textContent = prods.length;
    document.getElementById("stat-clientes").textContent = clis.length;
    document.getElementById("stat-pedidos").textContent = ords.length;
    const receita = ords.reduce((s, p) => s + (p.valorTotal || 0), 0);
    document.getElementById("stat-receita").textContent = brl(receita).replace("R$\u00a0", "");
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", () => {
  carregarStats();
  carregarProdutosAdmin();
});
