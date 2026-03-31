# 📘 Documentação do Sistema – CloudStore E-commerce

**Disciplina:** Computação em Nuvem  
**Aluno:** Gustavo Toledo  
**Data:** 30/03/2026  
**Prova Prática:** Aplicação E-commerce integrada com Microsoft Azure

---

## 1. Visão Geral

Sistema e-commerce completo desenvolvido com **Node.js/Express** integrado aos serviços **Azure Table Storage** (armazenamento de dados) e **Azure Blob Storage** (armazenamento de imagens de produtos).

### Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Backend** | Node.js + Express.js |
| **Base de Dados** | Azure Table Storage (NoSQL) |
| **Armazenamento de Ficheiros** | Azure Blob Storage |
| **Frontend** | HTML5, CSS3 (tema dark), JavaScript Vanilla |
| **SDK Azure** | `@azure/data-tables` + `@azure/storage-blob` |

---

## 2. Estrutura do Projeto

```
prova comp-nuvem 30-03/
├── server.js                  # Servidor Express (porta 3000)
├── package.json               # Dependências do projeto
│
├── config/
│   └── azure.js               # Conexão Azure, inicialização de tabelas e container
│
├── routes/
│   ├── produtos.js            # CRUD de Produtos + upload de imagens
│   ├── clientes.js            # CRUD de Clientes
│   └── pedidos.js             # Criação de Pedidos + validação de stock
│
└── public/
    ├── index.html             # Loja (catálogo, carrinho, checkout)
    ├── admin.html             # Painel de Administrador
    ├── cliente.html           # Área do Cliente
    ├── css/
    │   └── style.css          # Design system (tema escuro, glassmorphism)
    └── js/
        ├── app.js             # Lógica da loja e carrinho
        ├── admin.js           # Lógica CRUD do painel admin
        └── cliente.js         # Lógica da área do cliente
```

---

## 3. Configuração Azure

### 3.1 Credenciais Utilizadas

| Parâmetro | Valor |
|---|---|
| **Storage Account** | `stocompnuvem2p1` |
| **Connection String** | Configurada em `config/azure.js` (AccountKey + SAS Token) |

### 3.2 Recursos Criados Automaticamente

Ao iniciar o servidor, o sistema cria automaticamente (se não existirem):

| Recurso | Tipo | Nome |
|---|---|---|
| Tabela de Produtos | Azure Table | `toledoProdutos` |
| Tabela de Clientes | Azure Table | `toledoClientes` |
| Tabela de Pedidos | Azure Table | `toledoPedidos` |
| Container de Imagens | Azure Blob | `fotos-produtos` (acesso público: Blob) |

### 3.3 Estratégia de PartitionKey e RowKey

Seguindo as boas práticas da **Aula 3** (PartitionKey para performance de consulta):

| Tabela | PartitionKey | RowKey | Justificação |
|---|---|---|---|
| `toledoProdutos` | **Marca** (ex: Samsung) | **Modelo** normalizado (ex: Galaxy-S24) | Permite filtrar todos os produtos de uma marca eficientemente |
| `toledoClientes` | **E-mail** do cliente | UUID (identificador único) | O e-mail identifica o cliente e facilita consultas |
| `toledoPedidos` | **E-mail** do cliente | UUID (ID do pedido) | Todos os pedidos de um cliente compartilham a mesma PartitionKey, otimizando a consulta de histórico |

---

## 4. API REST – Endpoints

### 4.1 Produtos (`/api/produtos`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/produtos` | Listar todos os produtos |
| `GET` | `/api/produtos?marca=Samsung` | Filtrar produtos por marca (PartitionKey) |
| `GET` | `/api/produtos/:pk/:rk` | Obter um produto específico |
| `POST` | `/api/produtos` | Criar produto (multipart/form-data com foto) |
| `PUT` | `/api/produtos/:pk/:rk` | Atualizar produto (aceita nova foto) |
| `DELETE` | `/api/produtos/:pk/:rk` | Eliminar produto (remove blob da foto) |

**Campos do produto:** `marca`, `modelo`, `valor`, `quantidade`, `foto` (ficheiro de imagem)

**Exemplo de criação (via formulário):**
```
POST /api/produtos
Content-Type: multipart/form-data

marca: Samsung
modelo: Galaxy S24
valor: 4999.99
quantidade: 15
foto: [ficheiro de imagem]
```

### 4.2 Clientes (`/api/clientes`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/clientes` | Listar todos os clientes |
| `GET` | `/api/clientes/:pk/:rk` | Obter um cliente específico |
| `POST` | `/api/clientes` | Cadastrar novo cliente |
| `PUT` | `/api/clientes/:pk/:rk` | Atualizar dados do cliente |
| `DELETE` | `/api/clientes/:pk/:rk` | Eliminar cliente |

**Campos do cliente:** `nome`, `email`, `telefone`, `endereco`, `ra` (registo académico)

### 4.3 Pedidos (`/api/pedidos`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/pedidos` | Listar todos os pedidos |
| `GET` | `/api/pedidos/cliente/:email` | Listar pedidos de um cliente (histórico) |
| `POST` | `/api/pedidos` | Criar novo pedido (com validação de stock) |

**Exemplo de criação de pedido:**
```json
POST /api/pedidos
{
  "emailCliente": "toledo@fatec.com",
  "nomeCliente": "Toledo",
  "itens": [
    { "marca": "Samsung", "modelo": "Galaxy S24", "quantidade": 2 },
    { "marca": "Apple", "modelo": "iPhone 16", "quantidade": 1 }
  ],
  "metodoPagamento": "PIX",
  "metodoEntrega": "Expressa"
}
```

**Validação de Checkout (conforme requisitos da prova):**
1. Para cada item, o sistema busca o produto na tabela `toledoProdutos`
2. Verifica se `quantidadeDisponível >= quantidadePedida`
3. Se stock insuficiente → retorna **erro 400** com mensagem detalhada
4. Se válido → decrementa o stock e cria o pedido na tabela `toledoPedidos`

---

## 5. Gestão de Blobs (Imagens)

Seguindo os conceitos da **Aula 2** sobre Azure Blob Storage:

1. **Container:** `fotos-produtos` (criado automaticamente com acesso público a nível de Blob)
2. **Upload:** Cada imagem é enviada como um Blob com nome único (`UUID-nomeOriginal`)
3. **URL Pública:** Após upload, a URL gerada segue o padrão:
   ```
   https://stocompnuvem2p1.blob.core.windows.net/fotos-produtos/<uuid>-<nome>.jpg
   ```
4. **Exibição:** A URL é armazenada no campo `fotoUrl` da tabela `toledoProdutos` e exibida nos cards de produto no frontend
5. **Eliminação:** Ao eliminar um produto, o blob correspondente também é removido

---

## 6. Interface do Utilizador (Frontend)

### 6.1 Loja (`index.html` – `/`)
- Catálogo de produtos em grid responsivo com cards
- Barra de pesquisa com filtro por marca
- Carrinho lateralcom gestão de quantidades (persistido em localStorage)
- Modal de checkout com seleção de pagamento (Cartão, Boleto, PIX) e entrega (Padrão, Expressa, Retirada)

### 6.2 Painel de Administrador (`admin.html` – `/admin.html`)
- Dashboard com estatísticas em tempo real (total de produtos, clientes, pedidos, receita)
- Aba **Produtos:** tabela com CRUD completo (criar/editar/eliminar com upload de foto)
- Aba **Clientes:** tabela com CRUD completo
- Aba **Pedidos:** visualização de todos os pedidos com detalhes

### 6.3 Área do Cliente (`cliente.html` – `/cliente.html`)
- Login simplificado por e-mail
- Edição de dados pessoais (nome, telefone, endereço, RA)
- Histórico de pedidos filtrado automaticamente pelo e-mail do cliente (PartitionKey)

---

## 7. Como Executar

### Pré-requisitos
- Node.js instalado (v18+)
- Acesso à internet (para comunicar com o Azure)

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor
node server.js

# 3. Aceder no browser
# Loja:       http://localhost:3000
# Admin:      http://localhost:3000/admin.html
# Cliente:    http://localhost:3000/cliente.html
```

### Saída esperada ao iniciar:
```
⏳ Inicializando recursos Azure...
  ✅ Tabela "toledoProdutos" criada / já existe.
  ✅ Tabela "toledoClientes" criada / já existe.
  ✅ Tabela "toledoPedidos" criada / já existe.
  ✅ Container "fotos-produtos" criado / já existe (acesso público: blob).
🚀 Inicialização Azure concluída!
✅ Servidor a correr em http://localhost:3000
```

---

## 8. Resultados dos Testes

Todos os 12 testes executados passaram com sucesso:

| # | Teste | Resultado |
|---|---|---|
| 1 | Cadastrar cliente Toledo (`toledo@fatec.com`) | ✅ |
| 2 | Cadastrar cliente Ana Costa (`ana@fatec.com`) | ✅ |
| 3 | Cadastrar 3 produtos (Galaxy S24, iPhone 16, Galaxy Tab S10) | ✅ |
| 4 | Listar todos os produtos (3 retornados) | ✅ |
| 5 | Filtrar por marca Samsung (2 retornados) | ✅ |
| 6 | Listar todos os clientes (2 retornados) | ✅ |
| 7 | Criar pedido com 2 itens (R$ 30.997,97 via PIX) | ✅ |
| 8 | Verificar decremento de stock (15→12, 8→6) | ✅ |
| 9 | Tentar comprar com stock insuficiente → **Bloqueado** | ✅ |
| 10 | Atualizar dados do cliente Toledo | ✅ |
| 11 | Consultar histórico de pedidos por e-mail | ✅ |
| 12 | Obter produto específico por PK/RK | ✅ |

---

## 9. Dependências (package.json)

| Pacote | Versão | Função |
|---|---|---|
| `express` | ^4.18.2 | Framework web HTTP |
| `@azure/data-tables` | ^13.2.2 | SDK para Azure Table Storage |
| `@azure/storage-blob` | ^12.17.0 | SDK para Azure Blob Storage |
| `multer` | ^1.4.5 | Upload de ficheiros (multipart/form-data) |
| `uuid` | ^9.0.0 | Geração de identificadores únicos |

---

## 10. Considerações de Segurança

> **Nota para ambiente de produção:** A connection string com AccountKey está diretamente no código-fonte, conforme solicitado para a prova da FATEC. Em ambiente real, deve-se:
> - Usar o **Azure Key Vault** para armazenar segredos
> - Utilizar variáveis de ambiente (`process.env`)
> - Implementar autenticação de utilizadores (ex: Azure AD)
> - Adicionar HTTPS com certificado SSL
