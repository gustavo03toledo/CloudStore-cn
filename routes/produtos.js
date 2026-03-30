const express = require("express");
const router = express.Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { getTableClient, getContainerClient, TABELA_PRODUTOS } = require("../config/azure");

// Multer – armazena em memória para enviar direto ao Azure Blob
const upload = multer({ storage: multer.memoryStorage() });

// ──────────────────────────────────────────────────────────
//  GET /api/produtos  –  Listar todos (filtro opcional por marca)
// ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_PRODUTOS);
    const { marca } = req.query;

    let filter = undefined;
    if (marca) {
      filter = `PartitionKey eq '${marca}'`;
    }

    const produtos = [];
    const iterator = tableClient.listEntities({ queryOptions: { filter } });
    for await (const entity of iterator) {
      produtos.push(entity);
    }

    res.json(produtos);
  } catch (err) {
    console.error("Erro ao listar produtos:", err.message);
    res.status(500).json({ error: "Erro ao listar produtos." });
  }
});

// ──────────────────────────────────────────────────────────
//  GET /api/produtos/:pk/:rk  –  Obter um produto
// ──────────────────────────────────────────────────────────
router.get("/:partitionKey/:rowKey", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_PRODUTOS);
    const entity = await tableClient.getEntity(req.params.partitionKey, req.params.rowKey);
    res.json(entity);
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ error: "Produto não encontrado." });
    res.status(500).json({ error: "Erro ao obter produto." });
  }
});

// ──────────────────────────────────────────────────────────
//  POST /api/produtos  –  Criar produto (com upload de foto)
// ──────────────────────────────────────────────────────────
router.post("/", upload.single("foto"), async (req, res) => {
  try {
    const { marca, modelo, valor, quantidade } = req.body;

    if (!marca || !modelo || !valor || !quantidade) {
      return res.status(400).json({ error: "Campos obrigatórios: marca, modelo, valor, quantidade." });
    }

    let fotoUrl = "";

    // Upload da imagem ao Azure Blob Storage
    if (req.file) {
      const containerClient = getContainerClient();
      const blobName = `${uuidv4()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });
      fotoUrl = blockBlobClient.url;
    }

    const tableClient = getTableClient(TABELA_PRODUTOS);

    // PartitionKey = marca, RowKey = modelo (normalizado)
    const partitionKey = marca.trim();
    const rowKey = modelo.trim().replace(/\s+/g, "-");

    const entity = {
      partitionKey,
      rowKey,
      marca: marca.trim(),
      modelo: modelo.trim(),
      valor: parseFloat(valor),
      quantidade: parseInt(quantidade, 10),
      fotoUrl,
      dataCriacao: new Date().toISOString(),
    };

    await tableClient.createEntity(entity);
    res.status(201).json({ message: "Produto criado com sucesso!", entity });
  } catch (err) {
    console.error("Erro ao criar produto:", err.message);
    if (err.statusCode === 409) {
      return res.status(409).json({ error: "Já existe um produto com esta marca e modelo." });
    }
    res.status(500).json({ error: "Erro ao criar produto." });
  }
});

// ──────────────────────────────────────────────────────────
//  PUT /api/produtos/:pk/:rk  –  Atualizar produto
// ──────────────────────────────────────────────────────────
router.put("/:partitionKey/:rowKey", upload.single("foto"), async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_PRODUTOS);
    const { marca, modelo, valor, quantidade } = req.body;

    // Buscar entidade existente
    const existing = await tableClient.getEntity(req.params.partitionKey, req.params.rowKey);

    let fotoUrl = existing.fotoUrl || "";

    // Se nova foto enviada, faz upload e apaga antiga
    if (req.file) {
      const containerClient = getContainerClient();

      // Apagar blob antigo se existir
      if (fotoUrl) {
        try {
          const oldBlobName = fotoUrl.split("/").pop();
          await containerClient.getBlockBlobClient(oldBlobName).deleteIfExists();
        } catch (_) {}
      }

      const blobName = `${uuidv4()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });
      fotoUrl = blockBlobClient.url;
    }

    const updated = {
      partitionKey: req.params.partitionKey,
      rowKey: req.params.rowKey,
      marca: marca || existing.marca,
      modelo: modelo || existing.modelo,
      valor: valor ? parseFloat(valor) : existing.valor,
      quantidade: quantidade !== undefined ? parseInt(quantidade, 10) : existing.quantidade,
      fotoUrl,
      dataCriacao: existing.dataCriacao,
      dataAtualizacao: new Date().toISOString(),
    };

    await tableClient.updateEntity(updated, "Replace");
    res.json({ message: "Produto atualizado com sucesso!", entity: updated });
  } catch (err) {
    console.error("Erro ao atualizar produto:", err.message);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});

// ──────────────────────────────────────────────────────────
//  DELETE /api/produtos/:pk/:rk  –  Eliminar produto
// ──────────────────────────────────────────────────────────
router.delete("/:partitionKey/:rowKey", async (req, res) => {
  try {
    const tableClient = getTableClient(TABELA_PRODUTOS);

    // Buscar para obter URL da foto
    try {
      const entity = await tableClient.getEntity(req.params.partitionKey, req.params.rowKey);
      if (entity.fotoUrl) {
        const containerClient = getContainerClient();
        const blobName = entity.fotoUrl.split("/").pop();
        await containerClient.getBlockBlobClient(blobName).deleteIfExists();
      }
    } catch (_) {}

    await tableClient.deleteEntity(req.params.partitionKey, req.params.rowKey);
    res.json({ message: "Produto eliminado com sucesso!" });
  } catch (err) {
    console.error("Erro ao eliminar produto:", err.message);
    res.status(500).json({ error: "Erro ao eliminar produto." });
  }
});

module.exports = router;
