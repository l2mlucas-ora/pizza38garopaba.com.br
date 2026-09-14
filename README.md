# pizza38garopaba.com.br

Site e link da bio da **Pizza 38** — Garopaba, SC, desde 1988.

HTML, CSS e JavaScript puros. Sem build, sem dependência, sem `node_modules`:
o que está aqui é o que vai ao ar. Publicar é um `git push` — GitHub Pages lê
o `CNAME` e serve em `www.pizza38garopaba.com.br`.

```
index.html      início
historia.html   1988 até hoje
cardapio.html   tamanhos, calzones, sabores
contato.html    endereço, horário, entrega
links/          o link da bio (noindex) — substitui o biolink.info
404.html
assets/
  styles.css    fonte da verdade visual: as cores saem do brasão da casa
  site.js       menu, revelação, topo fixo, abas da bio, aberto/fechado
  logo.jpg      arquivo original da casa — não se redesenha
  fotos/        fotos do forno mandadas pela pizzaria
```

Para ver de pé, antes de publicar:

```bash
python -m http.server 8092
```

Decisões, guardrails e a lista do que ainda falta a casa confirmar estão no
`CLAUDE.md` da pasta de cima.

Site por [Extrema Consultoria](https://extremaconsultoria.com.br).
