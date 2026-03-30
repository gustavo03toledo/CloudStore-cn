const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { getTableClient, TABELA_CLIENTES } = require("../config/azure");

// ──────────────────────────────────────────────────────────
//  GET /api/clientes  –  Listar todos
// ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_CLIENTES);
    const clientes = [];
    const iterator = tableClient.listEntities();
    for await (const entity of iterator) {
      clientes.push(entity);
    }
    res.json(clientes);
  } catch (err) {
    console.error("Erro ao listar clientes:", err.message);
    res.status(500).json({ error: "Erro ao listar clientes." });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/clientes/:pk/:rk  –  Obter um cliente
// ──────────────────────────────────────────────────────────
router.get("/:partitionKey/:rowKey", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_CLIENTES);
    const entity = await tableClient.getEntity(req.params.partitionKey, req.params.rowKey);
    res.json(entity);
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ error: "Cliente não encontrado." });
    res.status(500).json({ error: "Erro ao obter cliente." });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/clientes  –  Cadastrar cliente
//  PartitionKey = email,  RowKey = UUID
// ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { nome, email, telefone, endereco, ra } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ error: "Campos obrigatórios: nome, email." });
    }

    const tableClient = getTableClient(TABELA_CLIENTES);

    const entity = {
      partitionKey: email.trim().toLowerCase(),
      rowKey: uuidv4(),
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      telefone: telefone || "",
      endereco: endereco || "",
      ra: ra || "",
      dataCadastro: new Date().toISOString(),
    };

    await tableClient.createEntity(entity);
    res.status(201).json({ message: "Cliente cadastrado com sucesso!", entity });
  } catch (err) {
    console.error("Erro ao cadastrar cliente:", err.message);
    res.status(500).json({ error: "Erro ao cadastrar cliente." });
  }
});

// ──────────────────────────────────────────────────────────
//  PUT /api/clientes/:pk/:rk  –  Atualizar cliente
// ──────────────────────────────────────────────────────────
router.put("/:partitionKey/:rowKey", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_CLIENTES);
    const existing = await tableClient.getEntity(req.params.partitionKey, req.params.rowKey);
    const { nome, telefone, endereco, ra } = req.body;

    const updated = {
      partitionKey: req.params.partitionKey,
      rowKey: req.params.rowKey,
      nome: nome || existing.nome,
      email: existing.email,
      telefone: telefone !== undefined ? telefone : existing.telefone,
      endereco: endereco !== undefined ? endereco : existing.endereco,
      ra: ra !== undefined ? ra : existing.ra,
      dataCadastro: existing.dataCadastro,
      dataAtualizacao: new Date().toISOString(),
    };

    await tableClient.updateEntity(updated, "Replace");
    res.json({ message: "Cliente atualizado com sucesso!", entity: updated });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err.message);
    res.status(500).json({ error: "Erro ao atualizar cliente." });
  }
});

// ──────────────────────────────────────────────────────────
//  DELETE /api/clientes/:pk/:rk  –  Eliminar cliente
// ──────────────────────────────────────────────────────────
router.delete("/:partitionKey/:rowKey", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_CLIENTES);
    await tableClient.deleteEntity(req.params.partitionKey, req.params.rowKey);
    res.json({ message: "Cliente eliminado com sucesso!" });
  } catch (err) {
    console.error("Erro ao eliminar cliente:", err.message);
    res.status(500).json({ error: "Erro ao eliminar cliente." });
  }
});

module.exports = router;
