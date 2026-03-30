const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { getTableClient, TABELA_PEDIDOS, TABELA_PRODUTOS } = require("../config/azure");

// ──────────────────────────────────────────────────────────
//  GET /api/pedidos  –  Listar todos
// ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_PEDIDOS);
    const pedidos = [];
    const iterator = tableClient.listEntities();
    for await (const entity of iterator) {
      pedidos.push(entity);
    }
    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao listar pedidos:", err.message);
    res.status(500).json({ error: "Erro ao listar pedidos." });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/pedidos/cliente/:email  –  Pedidos de um cliente
// ──────────────────────────────────────────────────────────
router.get("/cliente/:email", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_PEDIDOS);
    const email = req.params.email.toLowerCase();
    const pedidos = [];
    const filter = `PartitionKey eq '${email}'`;
    const iterator = tableClient.listEntities({ queryOptions: { filter } });
    for await (const entity of iterator) {
      pedidos.push(entity);
    }
    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao listar pedidos do cliente:", err.message);
    res.status(500).json({ error: "Erro ao listar pedidos do cliente." });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/pedidos  –  Criar pedido (com validação de stock)
//  PartitionKey = email do cliente,  RowKey = UUID (ID pedido)
// ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { emailCliente, nomeCliente, itens, metodoPagamento, metodoEntrega } = req.body;
    // itens = [{ marca, modelo, quantidade }]

    if (!emailCliente || !itens || !itens.length) {
      return res.status(400).json({ error: "Campos obrigatórios: emailCliente, itens[]." });
    }

    const produtoTable = getTableClient(TABELA_PRODUTOS);
    const pedidoTable = getTableClient(TABELA_PEDIDOS);

    let valorTotal = 0;
    const itensValidados = [];

    // ── Validar stock e preço de cada item ──
    for (const item of itens) {
      let produto;
      try {
        const rk = item.modelo.trim().replace(/\s+/g, "-");
        produto = await produtoTable.getEntity(item.marca.trim(), rk);
      } catch (err) {
        return res.status(404).json({
          error: `Produto não encontrado: ${item.marca} ${item.modelo}`,
        });
      }

      const qtdPedida = parseInt(item.quantidade, 10) || 1;
      const qtdDisponivel = produto.quantidade || 0;

      if (qtdDisponivel < qtdPedida) {
        return res.status(400).json({
          error: `Stock insuficiente para "${produto.marca} ${produto.modelo}". Disponível: ${qtdDisponivel}, Pedido: ${qtdPedida}.`,
        });
      }

      const subtotal = (produto.valor || 0) * qtdPedida;
      valorTotal += subtotal;

      itensValidados.push({
        marca: produto.marca,
        modelo: produto.modelo,
        valorUnitario: produto.valor,
        quantidade: qtdPedida,
        subtotal,
        fotoUrl: produto.fotoUrl || "",
      });

      // ── Decrementar stock ──
      const novaQtd = qtdDisponivel - qtdPedida;
      await produtoTable.updateEntity(
        {
          partitionKey: produto.partitionKey,
          rowKey: produto.rowKey,
          marca: produto.marca,
          modelo: produto.modelo,
          valor: produto.valor,
          quantidade: novaQtd,
          fotoUrl: produto.fotoUrl,
          dataCriacao: produto.dataCriacao,
          dataAtualizacao: new Date().toISOString(),
        },
        "Replace"
      );
    }

    // ── Criar entidade do pedido ──
    const pedidoId = uuidv4();
    const pedido = {
      partitionKey: emailCliente.trim().toLowerCase(),
      rowKey: pedidoId,
      emailCliente: emailCliente.trim().toLowerCase(),
      nomeCliente: nomeCliente || "",
      itens: JSON.stringify(itensValidados),
      valorTotal,
      metodoPagamento: metodoPagamento || "Não informado",
      metodoEntrega: metodoEntrega || "Não informado",
      status: "Confirmado",
      dataPedido: new Date().toISOString(),
    };

    await pedidoTable.createEntity(pedido);

    res.status(201).json({ message: "Pedido criado com sucesso!", pedido });
  } catch (err) {
    console.error("Erro ao criar pedido:", err.message);
    res.status(500).json({ error: "Erro ao criar pedido." });
  }
});

module.exports = router;
