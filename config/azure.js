const { TableClient, TableServiceClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

// ============================================================
//  Credenciais Azure (fornecidas na prova)
// ============================================================
const STORAGE_ACCOUNT_NAME = "stocompnuvem2p1";

const CONNECTION_STRING =
  "DefaultEndpointsProtocol=https;AccountName=stocompnuvem2p1;AccountKey=bBbYrr3Jz8l68Hgvwz5hx059PdOa12WBS5tYBXcKoMVfd8ubg+nizs51myuPF1vF7R1Ptfl14qrc+ASt7E44wA==;EndpointSuffix=core.windows.net";

const SAS_CONNECTION_STRING =
  "BlobEndpoint=https://stocompnuvem2p1.blob.core.windows.net/;QueueEndpoint=https://stocompnuvem2p1.queue.core.windows.net/;FileEndpoint=https://stocompnuvem2p1.file.core.windows.net/;TableEndpoint=https://stocompnuvem2p1.table.core.windows.net/;SharedAccessSignature=sv=2024-11-04&ss=bt&srt=sco&sp=rwdlacuiytfx&se=2026-04-20T21:43:50Z&st=2026-03-30T13:28:50Z&spr=https&sig=XoegV9uAYy9DlRXXFEIFUqXkbBE6BXaaUU3b%2F4sOqwQ%3D";

// ============================================================
//  Nomes das Tabelas e Container
// ============================================================
const TABELA_PRODUTOS = "toledoProdutos";
const TABELA_CLIENTES = "toledoClientes";
const TABELA_PEDIDOS = "toledoPedidos";
const CONTAINER_FOTOS = "fotos-produtos";

// ============================================================
//  Clientes Azure (Table Storage)
// ============================================================
function getTableClient(tableName) {
  return TableClient.fromConnectionString(SAS_CONNECTION_STRING, tableName);
}

// ============================================================
//  Cliente Azure (Blob Storage)
// ============================================================
const blobServiceClient = BlobServiceClient.fromConnectionString(SAS_CONNECTION_STRING);

function getContainerClient() {
  return blobServiceClient.getContainerClient(CONTAINER_FOTOS);
}

// ============================================================
//  Inicialização – garante que tabelas e container existam
// ============================================================
async function inicializarAzure() {
  console.log("⏳ Inicializando recursos Azure...");

  // --- Tabelas ---
  const tabelas = [TABELA_PRODUTOS, TABELA_CLIENTES, TABELA_PEDIDOS];
  for (const nome of tabelas) {
    try {
      const client = getTableClient(nome);
      await client.createTable();
      console.log(`  ✅ Tabela "${nome}" criada / já existe.`);
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`  ✅ Tabela "${nome}" já existe.`);
      } else {
        console.error(`  ❌ Erro ao criar tabela "${nome}":`, err.message);
      }
    }
  }

  // --- Container de Blobs (acesso público a nível de Blob) ---
  try {
    const containerClient = getContainerClient();
    await containerClient.createIfNotExists({ access: "blob" });
    console.log(`  ✅ Container "${CONTAINER_FOTOS}" criado / já existe (acesso público: blob).`);
  } catch (err) {
    console.error(`  ❌ Erro ao criar container:`, err.message);
  }

  console.log("🚀 Inicialização Azure concluída!\n");
}

module.exports = {
  STORAGE_ACCOUNT_NAME,
  CONNECTION_STRING,
  SAS_CONNECTION_STRING,
  TABELA_PRODUTOS,
  TABELA_CLIENTES,
  TABELA_PEDIDOS,
  CONTAINER_FOTOS,
  getTableClient,
  getContainerClient,
  blobServiceClient,
  inicializarAzure,
};
