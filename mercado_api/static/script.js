document.querySelectorAll(".aba-botao").forEach(botao => {
    botao.addEventListener("click", () => {
        document.querySelectorAll(".aba-botao").forEach(b => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        document.querySelectorAll(".aba").forEach(secao => secao.classList.add("oculto"));
        document.getElementById(`aba-${botao.dataset.aba}`).classList.remove("oculto");
    });
});

const toastContainer = document.getElementById("toast-container");

function mostrarToast(mensagem, tipo) {
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

async function chamarApi(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(corpo?.detail || "Ocorreu um erro inesperado.");
    return corpo;
}

const formatarPreco = valor => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const selectCategoria = document.getElementById("produto-categoria");
const avisoSemCategoria = document.getElementById("aviso-sem-categoria");
const botaoProduto = document.getElementById("botao-produto");

const categoriaForm = {
    form: document.getElementById("form-categoria"),
    titulo: document.getElementById("titulo-form-categoria"),
    botao: document.getElementById("botao-categoria"),
    botaoCancelar: document.getElementById("botao-cancelar-categoria"),
    editandoId: null
};

function entrarModoEdicaoCategoria(categoria) {
    categoriaForm.editandoId = categoria.id;
    document.getElementById("categoria-nome").value = categoria.nome;
    document.getElementById("categoria-descricao").value = categoria.descricao ?? "";
    categoriaForm.titulo.textContent = "Editar categoria";
    categoriaForm.botao.textContent = "Salvar alterações";
    categoriaForm.botaoCancelar.classList.remove("oculto");
}

function sairModoEdicaoCategoria() {
    categoriaForm.editandoId = null;
    categoriaForm.form.reset();
    categoriaForm.titulo.textContent = "Nova categoria";
    categoriaForm.botao.textContent = "Adicionar categoria";
    categoriaForm.botaoCancelar.classList.add("oculto");
}

categoriaForm.botaoCancelar.addEventListener("click", sairModoEdicaoCategoria);

categoriaForm.form.addEventListener("submit", async evento => {
    evento.preventDefault();
    const categoria = {
        nome: document.getElementById("categoria-nome").value,
        descricao: document.getElementById("categoria-descricao").value
    };
    try {
        if (categoriaForm.editandoId === null) {
            await chamarApi("/categorias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(categoria)
            });
            mostrarToast("Categoria cadastrada com sucesso.", "sucesso");
        } else {
            await chamarApi(`/categorias/${categoriaForm.editandoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(categoria)
            });
            mostrarToast("Categoria atualizada com sucesso.", "sucesso");
        }
        sairModoEdicaoCategoria();
        await carregarCategorias();
        await carregarProdutos();
    } catch (erro) {
        mostrarToast(erro.message, "erro");
    }
});

async function carregarCategorias() {
    const categorias = await chamarApi("/categorias");
    const lista = document.getElementById("lista-categorias");
    lista.innerHTML = "";
    selectCategoria.innerHTML = "";
    document.getElementById("contador-categorias").textContent = categorias.length;

    const semCategorias = categorias.length === 0;
    document.getElementById("vazio-categorias").classList.toggle("oculto", !semCategorias);
    avisoSemCategoria.classList.toggle("oculto", !semCategorias);
    botaoProduto.disabled = semCategorias;

    categorias.forEach(categoria => {
        const item = document.createElement("li");
        item.innerHTML = `
            <div class="item-info">
                <span>${categoria.nome}</span>
                <span class="item-sub">${categoria.descricao ?? ""}</span>
            </div>
            <div class="acoes-linha">
                <button class="botao-editar" title="Editar">✎</button>
                <button class="botao-excluir" title="Excluir">✕</button>
            </div>
        `;
        item.querySelector(".botao-editar").addEventListener("click", () => entrarModoEdicaoCategoria(categoria));
        item.querySelector(".botao-excluir").addEventListener("click", () => excluirCategoria(categoria.id));
        lista.appendChild(item);

        const opcao = document.createElement("option");
        opcao.value = categoria.id;
        opcao.textContent = categoria.nome;
        selectCategoria.appendChild(opcao);
    });
}

async function excluirCategoria(id) {
    try {
        await chamarApi(`/categorias/${id}`, { method: "DELETE" });
        mostrarToast("Categoria excluída.", "sucesso");
        if (categoriaForm.editandoId === id) sairModoEdicaoCategoria();
        await carregarCategorias();
        await carregarProdutos();
    } catch (erro) {
        mostrarToast(erro.message, "erro");
    }
}

const produtoForm = {
    form: document.getElementById("form-produto"),
    titulo: document.getElementById("titulo-form-produto"),
    botao: botaoProduto,
    botaoCancelar: document.getElementById("botao-cancelar-produto"),
    editandoId: null
};

function entrarModoEdicaoProduto(produto) {
    produtoForm.editandoId = produto.id;
    document.getElementById("produto-nome").value = produto.nome;
    document.getElementById("produto-preco").value = produto.preco;
    document.getElementById("produto-estoque").value = produto.quantidade_estoque;
    selectCategoria.value = produto.categoria_id;
    produtoForm.titulo.textContent = "Editar produto";
    produtoForm.botao.textContent = "Salvar alterações";
    produtoForm.botaoCancelar.classList.remove("oculto");
}

function sairModoEdicaoProduto() {
    produtoForm.editandoId = null;
    produtoForm.form.reset();
    produtoForm.titulo.textContent = "Novo produto";
    produtoForm.botao.textContent = "Adicionar produto";
    produtoForm.botaoCancelar.classList.add("oculto");
}

produtoForm.botaoCancelar.addEventListener("click", sairModoEdicaoProduto);

produtoForm.form.addEventListener("submit", async evento => {
    evento.preventDefault();
    const produto = {
        nome: document.getElementById("produto-nome").value,
        preco: Number(document.getElementById("produto-preco").value),
        quantidade_estoque: Number(document.getElementById("produto-estoque").value) || 0,
        categoria_id: Number(selectCategoria.value)
    };
    try {
        if (produtoForm.editandoId === null) {
            await chamarApi("/produtos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(produto)
            });
            mostrarToast("Produto cadastrado com sucesso.", "sucesso");
        } else {
            await chamarApi(`/produtos/${produtoForm.editandoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(produto)
            });
            mostrarToast("Produto atualizado com sucesso.", "sucesso");
        }
        sairModoEdicaoProduto();
        await carregarProdutos();
    } catch (erro) {
        mostrarToast(erro.message, "erro");
    }
});

async function carregarProdutos() {
    const produtos = await chamarApi("/produtos");
    const corpo = document.getElementById("corpo-tabela-produtos");
    corpo.innerHTML = "";
    document.getElementById("contador-produtos").textContent = produtos.length;

    const semProdutos = produtos.length === 0;
    document.getElementById("tabela-produtos").classList.toggle("oculto", semProdutos);
    document.getElementById("vazio-produtos").classList.toggle("oculto", !semProdutos);

    produtos.forEach(produto => {
        const linha = document.createElement("tr");
        const classeEstoque = produto.quantidade_estoque <= 5 ? "estoque-baixo" : "";
        linha.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.categoria_nome}</td>
            <td class="preco">${formatarPreco(produto.preco)}</td>
            <td class="${classeEstoque}">${produto.quantidade_estoque}</td>
            <td><button class="botao-editar" title="Editar">✎</button></td>
            <td><button class="botao-excluir" title="Excluir">✕</button></td>
        `;
        linha.querySelector(".botao-editar").addEventListener("click", () => entrarModoEdicaoProduto(produto));
        linha.querySelector(".botao-excluir").addEventListener("click", () => excluirProduto(produto.id));
        corpo.appendChild(linha);
    });
}

async function excluirProduto(id) {
    try {
        await chamarApi(`/produtos/${id}`, { method: "DELETE" });
        mostrarToast("Produto excluído.", "sucesso");
        if (produtoForm.editandoId === id) sairModoEdicaoProduto();
        await carregarProdutos();
    } catch (erro) {
        mostrarToast(erro.message, "erro");
    }
}

(async function iniciar() {
    try {
        await carregarCategorias();
        await carregarProdutos();
    } catch (erro) {
        mostrarToast(erro.message, "erro");
    }
})();
