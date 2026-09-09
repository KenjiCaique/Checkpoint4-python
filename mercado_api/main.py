import os
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

PASTA_ATUAL = os.path.dirname(os.path.abspath(__file__))
NOME_BANCO = os.path.join(PASTA_ATUAL, "mercado.db")

def obter_conexao():
    conexao = sqlite3.connect(NOME_BANCO)
    conexao.row_factory = sqlite3.Row
    conexao.execute("PRAGMA foreign_keys = ON")
    return conexao

def criar_tabelas():
    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            preco REAL NOT NULL,
            quantidade_estoque INTEGER DEFAULT 0,
            categoria_id INTEGER NOT NULL,
            FOREIGN KEY (categoria_id) REFERENCES categorias (id)
        )
    """)

    conexao.commit()
    conexao.close()

criar_tabelas()

PASTA_STATIC = os.path.join(PASTA_ATUAL, "static")

app = FastAPI(title="API de Mercado", version="1.0.0")

@app.post("/categorias")
def criar_categoria(categoria: dict):
    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute(
        "INSERT INTO categorias (nome, descricao) VALUES (?, ?)",
        (categoria["nome"], categoria.get("descricao"))
    )

    conexao.commit()
    novo_id = cursor.lastrowid
    conexao.close()

    return buscar_categoria(novo_id)

@app.get("/categorias")
def listar_categorias():
    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("SELECT * FROM categorias")
    linhas = cursor.fetchall()
    conexao.close()

    categorias = []
    for linha in linhas:
        categorias.append(dict(linha))

    return categorias

@app.get("/categorias/{categoria_id}")
def buscar_categoria(categoria_id: int):
    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("SELECT * FROM categorias WHERE id = ?", (categoria_id,))
    linha = cursor.fetchone()
    conexao.close()

    if linha is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    return dict(linha)

@app.put("/categorias/{categoria_id}")
def atualizar_categoria(categoria_id: int, dados: dict):
    categoria_existente = buscar_categoria(categoria_id)

    nome = dados.get("nome", categoria_existente["nome"])
    descricao = dados.get("descricao", categoria_existente["descricao"])

    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute(
        "UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?",
        (nome, descricao, categoria_id)
    )

    conexao.commit()
    conexao.close()

    return buscar_categoria(categoria_id)

@app.delete("/categorias/{categoria_id}")
def excluir_categoria(categoria_id: int):
    buscar_categoria(categoria_id)

    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("DELETE FROM produtos WHERE categoria_id = ?", (categoria_id,))
    cursor.execute("DELETE FROM categorias WHERE id = ?", (categoria_id,))

    conexao.commit()
    conexao.close()

    return {"mensagem": "Categoria excluída com sucesso"}

@app.post("/produtos")
def criar_produto(produto: dict):
    buscar_categoria(produto["categoria_id"])

    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute(
        "INSERT INTO produtos (nome, preco, quantidade_estoque, categoria_id) VALUES (?, ?, ?, ?)",
        (
            produto["nome"],
            produto["preco"],
            produto.get("quantidade_estoque", 0),
            produto["categoria_id"]
        )
    )

    conexao.commit()
    novo_id = cursor.lastrowid
    conexao.close()

    return buscar_produto(novo_id)

@app.get("/produtos")
def listar_produtos():
    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
        SELECT produtos.id, produtos.nome, produtos.preco, produtos.quantidade_estoque,
               produtos.categoria_id, categorias.nome AS categoria_nome
        FROM produtos
        JOIN categorias ON produtos.categoria_id = categorias.id
    """)
    linhas = cursor.fetchall()
    conexao.close()

    produtos = []
    for linha in linhas:
        produtos.append(dict(linha))

    return produtos

@app.get("/produtos/{produto_id}")
def buscar_produto(produto_id: int):
    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("""
        SELECT produtos.id, produtos.nome, produtos.preco, produtos.quantidade_estoque,
               produtos.categoria_id, categorias.nome AS categoria_nome
        FROM produtos
        JOIN categorias ON produtos.categoria_id = categorias.id
        WHERE produtos.id = ?
    """, (produto_id,))
    linha = cursor.fetchone()
    conexao.close()

    if linha is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    return dict(linha)

@app.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, dados: dict):
    produto_existente = buscar_produto(produto_id)

    nome = dados.get("nome", produto_existente["nome"])
    preco = dados.get("preco", produto_existente["preco"])
    quantidade_estoque = dados.get("quantidade_estoque", produto_existente["quantidade_estoque"])
    categoria_id = dados.get("categoria_id", produto_existente["categoria_id"])

    buscar_categoria(categoria_id)

    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute(
        "UPDATE produtos SET nome = ?, preco = ?, quantidade_estoque = ?, categoria_id = ? WHERE id = ?",
        (nome, preco, quantidade_estoque, categoria_id, produto_id)
    )

    conexao.commit()
    conexao.close()

    return buscar_produto(produto_id)

@app.delete("/produtos/{produto_id}")
def excluir_produto(produto_id: int):
    buscar_produto(produto_id)

    conexao = obter_conexao()
    cursor = conexao.cursor()

    cursor.execute("DELETE FROM produtos WHERE id = ?", (produto_id,))

    conexao.commit()
    conexao.close()

    return {"mensagem": "Produto excluído com sucesso"}

app.mount("/", StaticFiles(directory=PASTA_STATIC, html=True), name="static")
