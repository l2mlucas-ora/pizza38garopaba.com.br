/* ============================================================
   Medição de acesso — Cloudflare Web Analytics.

   Sem cookie e sem dado pessoal: conta visitas, páginas, origem e país.
   Não precisa de aviso de consentimento, e nada aqui identifica quem visita.

   O token mora só aqui. Vem do painel da Cloudflare:
   Analytics & Logs → Web Analytics → pizza38garopaba.com.br → JS snippet
   (o valor de "token" dentro de data-cf-beacon). Não é segredo: ele sai
   em toda página que o usa.

   O "Automatic setup" do painel não serve para este site: ele injeta o
   script pelo proxy da Cloudflare, e o DNS aqui é "DNS only" (nuvem
   cinza) de propósito — com proxy, o GitHub Pages não emite o HTTPS.

   Cliques no "Peça sua pizza" não são evento: a Cloudflare não tem evento
   personalizado. Todo botão de pedir passa por /pedir/, que conta como
   página e segue para o delivery. Ver pedir/index.html.
   ============================================================ */
(function () {
  var TOKEN = '';

  // Sem token, o medidor fica desligado, e não quebra nada.
  if (!TOKEN) return;
  // Localhost, pré-visualização e o endereço do github.io não contam: só a
  // visita de verdade, no domínio da casa.
  if (location.hostname !== 'www.pizza38garopaba.com.br') return;
  // Robôs de teste também não (capturar.mjs, gerador do PDF da história):
  // cada captura seria uma visita falsa no painel.
  if (navigator.webdriver) return;

  var s = document.createElement('script');
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  // spa: false — o site não é SPA, e /pedir/ troca o endereço com
  // history.replaceState, que o modo SPA contaria como outra visita.
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TOKEN, spa: false }));
  document.head.appendChild(s);
  // /pedir/ usa isto para saber se há medição a esperar (e se o script
  // foi bloqueado por um bloqueador de anúncio, para não segurar ninguém).
  window.medidor = s;
})();
