/* ============================================================
   Pizza 38 — site.js

   Tudo aqui é JavaScript puro. Nenhuma biblioteca, nenhum build: o
   site é HTML servido direto, e é para continuar assim. Biblioteca de
   animação custaria 40 kB para fazer o que o IntersectionObserver faz
   de graça — e quebraria no dia em que o CDN saísse do ar.

   Os dados da casa (WhatsApp, horário) vêm de atributos no <body>,
   num lugar só, para não caçar número espalhado pelo HTML.
   ============================================================ */
(function () {
  'use strict';

  var corpo = document.body;
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     WhatsApp: todo elemento com data-zap vira link wa.me com a
     mensagem já escrita. O número mora no <body data-zap="...">.
     ---------------------------------------------------------- */
  var numero = (corpo.getAttribute('data-zap') || '').replace(/\D/g, '');
  var links = document.querySelectorAll('[data-zap-msg]');
  for (var i = 0; i < links.length; i++) {
    var el = links[i];
    var texto = el.getAttribute('data-zap-msg') || '';
    if (!numero) {
      /* Sem número confirmado, o link fica desligado em vez de quebrado:
         mandar alguém para uma conversa que não existe é pior que não ter
         o botão. */
      el.setAttribute('aria-disabled', 'true');
      el.style.opacity = '.45';
      el.style.pointerEvents = 'none';
      continue;
    }
    el.setAttribute('href', 'https://wa.me/' + numero + (texto ? '?text=' + encodeURIComponent(texto) : ''));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  }

  /* ----------------------------------------------------------
     Menu no celular
     ---------------------------------------------------------- */
  var botao = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (botao && menu) {
    botao.addEventListener('click', function () {
      var aberto = menu.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('aberto'); botao.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('aberto')) botao.click();
    });
  }

  /* ----------------------------------------------------------
     Topo fixo e barra de ação.

     Os dois reagem à mesma pergunta — "o herói ainda está na tela?" —
     e por isso usam UM observador numa âncora, não um listener de
     scroll. Evento de rolagem dispara dezenas de vezes por segundo e
     é o jeito mais fácil de travar o dedo num celular fraco.
     ---------------------------------------------------------- */
  var topo = document.querySelector('.topo');
  var barra = document.querySelector('.barra-fixa');
  var ancora = document.getElementById('fim-do-heroi');

  if (ancora && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      var passou = !entradas[0].isIntersecting;
      if (topo) topo.classList.toggle('fixo', passou);
      if (barra) barra.classList.toggle('visivel', passou);
    }, { rootMargin: '0px' }).observe(ancora);
  } else if (topo) {
    topo.classList.add('fixo');
  }

  /* ----------------------------------------------------------
     Revelação na rolagem — uma vez só.

     Reaparecer a cada passagem vira pisca-pisca em quem rola para
     cima e para baixo procurando uma informação. Depois de revelar,
     o observador larga o elemento.
     ---------------------------------------------------------- */
  var reveláveis = document.querySelectorAll('.sobe');
  if (reduzido || !('IntersectionObserver' in window)) {
    for (var r = 0; r < reveláveis.length; r++) reveláveis[r].classList.add('visivel');
  } else {
    var olho = new IntersectionObserver(function (entradas, obs) {
      for (var k = 0; k < entradas.length; k++) {
        if (!entradas[k].isIntersecting) continue;
        entradas[k].target.classList.add('visivel');
        obs.unobserve(entradas[k].target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    for (var j = 0; j < reveláveis.length; j++) olho.observe(reveláveis[j]);
  }

  /* ----------------------------------------------------------
     Parallax do herói.

     Deslocamento pequeno e preso a requestAnimationFrame. Só roda
     enquanto o herói está na tela — continuar calculando depois disso
     é gastar bateria para ninguém ver.
     ---------------------------------------------------------- */
  var fundo = document.querySelector('.heroi__fundo');
  if (fundo && !reduzido) {
    var heroi = document.querySelector('.heroi');
    var naTela = true, agendado = false;

    var aplicar = function () {
      fundo.style.transform = 'translateY(' + (window.scrollY * 0.18).toFixed(1) + 'px)';
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        naTela = e[0].isIntersecting;
        // Recolocar ao reentrar não é firula. Enquanto o herói está fora da
        // tela o listener não faz nada, então a foto fica congelada no
        // deslocamento de quando ele saiu; quem rolava até o rodapé e
        // voltava encontrava o fundo torto, com uma faixa escura no topo.
        if (naTela) aplicar();
      }).observe(heroi);
    }

    window.addEventListener('scroll', function () {
      if (!naTela || agendado) return;
      agendado = true;
      requestAnimationFrame(function () { aplicar(); agendado = false; });
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Aberto agora.

     Calculado no relógio de quem visita, com o horário declarado no
     <body data-abre data-fecha data-dias>. `data-dias` é a lista de
     dias em que a casa abre (0 = domingo).

     Vale dizer o que isto NÃO sabe: feriado, folga e noite em que o
     forno quebrou. Por isso a frase é "costuma abrir", e o botão de
     pedir continua lá mesmo fechado — quem quer pedir para amanhã não
     pode esbarrar num aviso.
     ---------------------------------------------------------- */
  var marcador = document.querySelector('[data-agora]');
  if (marcador) {
    var abre = Number(corpo.getAttribute('data-abre') || 18);
    var fecha = Number(corpo.getAttribute('data-fecha') || 23);
    var dias = (corpo.getAttribute('data-dias') || '0,1,2,3,4,5,6').split(',').map(Number);
    var agora = new Date();
    var hora = agora.getHours() + agora.getMinutes() / 60;
    var hoje = dias.indexOf(agora.getDay()) !== -1;
    var aberto = hoje && hora >= abre && hora < fecha;

    marcador.classList.toggle('agora--aberto', aberto);
    var frase = marcador.querySelector('[data-agora-texto]');
    if (frase) {
      frase.textContent = aberto
        ? 'Aberto agora · até ' + String(fecha).padStart(2, '0') + 'h'
        : 'Fechado · costuma abrir às ' + String(abre).padStart(2, '0') + 'h';
    }
  }

  /* ----------------------------------------------------------
     Abas do link da bio.

     Só existe em /links/. Troca de painel sem recarregar, e o
     endereço guarda a aba: `/links/#achar` abre já na certa, que é
     o que permite apontar a bio para uma aba específica durante uma
     campanha.

     `replaceState` em vez de `location.hash = ...`: mudar o hash
     direto faz o navegador pular para o elemento de mesmo id e a
     página dá um solavanco a cada clique.
     ---------------------------------------------------------- */
  var abas = document.querySelector('[data-abas]');
  if (abas) {
    var botoes = abas.querySelectorAll('[role="tab"]');

    var mostrar = function (nome, gravar) {
      var achou = false;
      for (var a = 0; a < botoes.length; a++) {
        var bt = botoes[a];
        var alvo = document.getElementById(bt.getAttribute('aria-controls'));
        var ativo = bt.dataset.aba === nome;
        if (ativo) achou = true;
        bt.setAttribute('aria-selected', ativo ? 'true' : 'false');
        bt.tabIndex = ativo ? 0 : -1;
        if (alvo) alvo.hidden = !ativo;
      }
      if (achou && gravar && history.replaceState) {
        history.replaceState(null, '', '#' + nome);
      }
      return achou;
    };

    for (var b = 0; b < botoes.length; b++) {
      botoes[b].addEventListener('click', function () {
        mostrar(this.dataset.aba, true);
      });
      botoes[b].addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var lista = Array.prototype.slice.call(botoes);
        var i = lista.indexOf(this) + (e.key === 'ArrowRight' ? 1 : -1);
        var proximo = lista[(i + lista.length) % lista.length];
        proximo.focus();
        mostrar(proximo.dataset.aba, true);
      });
    }

    // Um só caminho para "abrir a aba do endereço", com a primeira aba como
    // rede. Sem a rede, um `#promo` que não existe mais — link velho de
    // campanha — escondia os três painéis e a página ficava em branco.
    var doEndereco = function () {
      var nome = (location.hash || '').replace('#', '');
      if (!mostrar(nome, false)) mostrar(botoes[0].dataset.aba, false);
    };

    doEndereco();
    window.addEventListener('hashchange', doEndereco);
  }

  /* ----------------------------------------------------------
     Ano no rodapé — para ninguém publicar "2026" em 2030.
     ---------------------------------------------------------- */
  var ano = document.querySelector('[data-ano]');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
