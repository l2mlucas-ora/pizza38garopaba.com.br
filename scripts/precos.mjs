// Lê os preços no cardápio da própria casa e grava nas páginas.
//
// A pizzaria publica um feed de produtos (o mesmo que alimenta catálogo de
// Facebook/Google) em /feeds/facebook/catalog, com título, categoria e preço
// de cada item. É dado oficial dela, em XML, atualizado quando ela mexe no
// cardápio — então o preço do site pode sair de lá em vez de ser digitado.
//
// Por que reescrever o HTML e não buscar no navegador:
//   1. O domínio da dvstore não manda `Access-Control-Allow-Origin`. Uma
//      página em pizza38garopaba.com.br NÃO consegue ler esse feed — o
//      navegador bloqueia, e não tem o que a gente faça do nosso lado.
//   2. Mesmo que desse, preço que chega por JavaScript pisca vazio no
//      carregamento e não existe para o Google.
//   3. Se a dvstore cair ou mudar o formato, o site continua com o último
//      preço bom em vez de mostrar espaço em branco.
//
// Então isto roda FORA do navegador: aqui na máquina, ou de madrugada pelo
// GitHub Actions (.github/workflows/precos.yml no repositório do site). O que
// vai ao ar continua sendo HTML puro com o número escrito dentro.
//
// Mora DENTRO do repositório do site, e não em Pizza38/scripts/, porque quem
// mais vai rodá-lo é o GitHub Actions — que só enxerga este repositório. Os
// caminhos saem da pasta do próprio arquivo, então funciona dos dois lugares.
//
//   node site/scripts/precos.mjs            → da pasta do projeto
//   node scripts/precos.mjs                 → de dentro do repositório do site
//   ... --conferir                          → só avisa, não grava (sai 1 se mudou)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FEED = "https://pizzaria38.dvstore.com.br/feeds/facebook/catalog";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGINAS = ["index.html", "cardapio.html"];
const conferir = process.argv.includes("--conferir");

/**
 * De onde sai cada preço do site.
 *
 * `categoria` casa com <g:product_type> e pega o MENOR preço do grupo — é o
 * "a partir de" que a página promete. Os dois calzones moram na mesma
 * categoria, então ali o critério é menor/maior.
 */
const ORIGEM = {
  "pizza-pequena": { categoria: "PIZZAS PEQUENAS", escolha: "menor" },
  "pizza-grande": { categoria: "PIZZAS GRANDES", escolha: "menor" },
  "pizza-familia": { categoria: "PIZZA FAMILIA", escolha: "menor" },
  "calzone-p": { categoria: "Kalzone", escolha: "menor" },
  "calzone-g": { categoria: "Kalzone", escolha: "maior" },
};

/** Centavos, sempre inteiro. Float não toca em preço. */
function centavos(texto) {
  const m = /([\d.,]+)/.exec(texto || "");
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const reais = (c) =>
  "R$ " + (c / 100).toFixed(2).replace(".", ",");

async function lerFeed() {
  const r = await fetch(FEED, { headers: { "User-Agent": "pizza38-site/1.0" } });
  if (!r.ok) throw new Error(`o feed respondeu ${r.status}`);
  const xml = await r.text();

  const itens = [];
  for (const bloco of xml.split("<item>").slice(1)) {
    const campo = (nome) =>
      (new RegExp(`<g:${nome}>([\\s\\S]*?)</g:${nome}>`).exec(bloco) || [])[1]?.trim();
    const preco = centavos(campo("price"));
    if (preco == null) continue;
    itens.push({
      titulo: campo("title") || "",
      categoria: campo("product_type") || "",
      disponivel: (campo("availability") || "in stock") === "in stock",
      preco,
    });
  }
  if (!itens.length) throw new Error("o feed veio sem item nenhum");
  return itens;
}

function apurar(itens) {
  const tabela = {};
  for (const [chave, regra] of Object.entries(ORIGEM)) {
    const grupo = itens
      .filter((i) => i.disponivel && i.categoria === regra.categoria)
      .map((i) => i.preco);
    if (!grupo.length) {
      // Categoria sumiu do cardápio: melhor manter o que está no ar do que
      // publicar um preço inventado ou um buraco.
      console.warn(`  ! "${regra.categoria}" não veio no feed — mantendo o preço atual`);
      continue;
    }
    tabela[chave] = regra.escolha === "maior" ? Math.max(...grupo) : Math.min(...grupo);
  }
  return tabela;
}

const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const itens = await lerFeed();
const tabela = apurar(itens);
console.log(`Feed: ${itens.length} itens.`);
for (const [k, v] of Object.entries(tabela)) console.log(`  ${k.padEnd(15)} ${reais(v)}`);

let mudou = false;

for (const rel of PAGINAS) {
  const arquivo = path.join(RAIZ, rel);
  const antes = await readFile(arquivo, "utf8");
  let depois = antes;

  for (const [chave, valor] of Object.entries(tabela)) {
    // Troca só o texto DENTRO do elemento marcado — o `<small>a partir de</small>`
    // e as classes ficam de pé. Regex mira a marca, não o número: procurar por
    // "R$ 39,90" trocaria também o preço de outra coisa que custe o mesmo.
    const re = new RegExp(
      `(data-preco="${chave}"[^>]*>(?:\\s*<small>[^<]*</small>)?)[^<]*`,
      "g"
    );
    depois = depois.replace(re, (_, cabeca) => cabeca + reais(valor));
  }

  depois = depois.replace(
    /(<span data-preco-data>)[^<]*/g,
    (_, cabeca) => cabeca + hoje
  );

  if (depois !== antes) {
    mudou = true;
    console.log(`  ~ ${rel} mudou`);
    if (!conferir) await writeFile(arquivo, depois);
  }
}

if (!mudou) {
  console.log("\nNada mudou: o site já está com os preços do cardápio.");
} else if (conferir) {
  console.error("\nO cardápio mudou e o site não acompanhou. Rode sem --conferir.");
  // `process.exitCode` e não `process.exit()`: com o fetch ainda fechando
  // conexão, o exit abrupto derruba o Node no Windows com um assert do libuv
  // e o shell recebe 127 em vez de 1 — o CI leria isso como erro de comando.
  process.exitCode = 1;
} else {
  console.log("\nPáginas atualizadas. Confira o diff antes de publicar.");
}
