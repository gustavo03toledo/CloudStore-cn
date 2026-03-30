/* ================================================================
   cliente.js – Área do Cliente
   ================================================================ */

const API = "";
let clienteAtual = null;

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
function mudarTabCliente(tab, btn) {
  document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  btn.classList.add("active");

  if (tab === "pedidos") carregarMeusPedidos();
}

// ── Identificar cliente ───────────────────────────────────
async function identificarCliente(e) {
  if (e) e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();

  if (!email) return toast("Informe o e-mail.", "error");

  try {
    const res = await fetch(`${API}/api/clientes`);
    const todos = await res.json();
    const cliente = todos.find((c) => (c.email || c.partitionKey).toLowerCase() === email);

    if (!cliente) {
      toast("Nenhum cliente encontrado com esse e-mail. Cadastre-se primeiro na área Admin.", "error");
      return;
    }

    clienteAtual = cliente;
    localStorage.setItem("clienteEmail", email);

    mostrarDashboard(cliente);
  } catch (err) {
    toast("Erro de conexão.", "error");
  }
}

function mostrarDashboard(c) {
  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");

  document.getElementById("client-name").textContent = c.nome;
  document.getElementById("ed-pk").value = c.partitionKey;
  document.getElementById("ed-rk").value = c.rowKey;
  document.getElementById("ed-nome").value = c.nome;
  document.getElementById("ed-email").value = c.email || c.partitionKey;
  document.getElementById("ed-telefone").value = c.telefone || "";
  document.getElementById("ed-endereco").value = c.endereco || "";
  document.getElementById("ed-ra").value = c.ra || "";
}

function logout() {
  clienteAtual = null;
  localStorage.removeItem("clienteEmail");
  document.getElementById("login-section").classList.remove("hidden");
  document.getElementById("dashboard-section").classList.add("hidden");
  document.getElementById("login-email").value = "";
}

// ── Atualizar dados ───────────────────────────────────────
async function atualizarDados(e) {
  e.preventDefault();
  const pk = document.getElementById("ed-pk").value;
  const rk = document.getElementById("ed-rk").value;

  const body = {
    nome: document.getElementById("ed-nome").value.trim(),
    telefone: document.getElementById("ed-telefone").value.trim(),
    endereco: document.getElementById("ed-endereco").value.trim(),
    ra: document.getElementById("ed-ra").value.trim(),
  };

  try {
    const res = await fetch(`${API}/api/clientes/${encodeURIComponent(pk)}/${encodeURIComponent(rk)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro");

    toast("Dados atualizados com sucesso!", "success");
    document.getElementById("client-name").textContent = body.nome;
  } catch (err) {
    toast(err.message, "error");
  }
}

// ── Meus pedidos ──────────────────────────────────────────
async function carregarMeusPedidos() {
  if (!clienteAtual) return;
  const email = (clienteAtual.email || clienteAtual.partitionKey).toLowerCase();
  const tbody = document.getElementById("tabela-meus-pedidos");

  try {
    const res = await fetch(`${API}/api/pedidos/cliente/${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhum pedido encontrado.</td></tr>`;
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
          <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itensStr}">${itensStr}</td>
          <td class="text-success" style="font-weight:600;">${brl(p.valorTotal)}</td>
          <td>${p.metodoPagamento || "—"}</td>
          <td>${p.metodoEntrega || "—"}</td>
          <td><span class="badge badge-success">${p.status || "Confirmado"}</span></td>
          <td style="font-size:0.8rem;">${p.dataPedido ? new Date(p.dataPedido).toLocaleDateString("pt-BR") : "—"}</td>
        </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erro ao carregar pedidos.</td></tr>`;
  }
}

// ── Init: auto-login se email guardado ────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("clienteEmail");
  if (saved) {
    document.getElementById("login-email").value = saved;
    identificarCliente();
  }
});
