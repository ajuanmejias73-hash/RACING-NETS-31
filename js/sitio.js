  // Envuelve cada letra de un elemento en su propio <span class="ltr">
  // para poder animarlas individualmente al pasar el cursor.
  function wrapLetters(node){
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) { // texto plano
        const frag = document.createDocumentFragment();
        const words = child.textContent.split(' ');
        words.forEach((word, wi) => {
          if (word.length > 0) {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            [...word].forEach(ch => {
              const s = document.createElement('span');
              s.className = 'ltr';
              s.textContent = ch;
              wordSpan.appendChild(s);
            });
            frag.appendChild(wordSpan);
          }
          if (wi < words.length - 1) {
            frag.appendChild(document.createTextNode(' '));
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        wrapLetters(child); // recursivo: entra en spans internos (ej. la palabra roja)
      }
    });
  }

  // Aplica el efecto a todo el texto visible de la página: títulos, párrafos,
  // botones, menú, tarjetas, footer, etc.
  const textSelectors = [
    'h1','h2','h3','h4','p','blockquote',
    '.eyebrow','.tag','.kicker','.badge',
    '.stat b','.stat span',
    'a.btn','.nav-links a','footer a','.logo',
    '.spec-row .label','.athlete-facts b','.athlete-facts span',
    '.product-shot span'
  ];
  document.querySelectorAll(textSelectors.join(',')).forEach(el => {
    el.classList.add('letter-fx');
    wrapLetters(el);
  });

  // Carrusel de fotos de la historia: auto-avance + control manual con flechas/puntos
  (function(){
    const root = document.getElementById('historiaCarousel');
    if (!root) return;
    const slides = root.querySelectorAll('.hc-slide');
    const dots = root.querySelectorAll('.hc-dot');
    let index = 0;
    let timer = null;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function show(i){
      index = (i + slides.length) % slides.length;
      slides.forEach((s, idx) => s.classList.toggle('active', idx === index));
      dots.forEach((d, idx) => d.classList.toggle('active', idx === index));
    }
    function resetTimer(){
      if (prefersReduced) return;
      clearInterval(timer);
      timer = setInterval(() => show(index + 1), 4500);
    }
    window.hcNav = function(dir){ show(index + dir); resetTimer(); };
    window.hcGoTo = function(i){ show(i); resetTimer(); };
    resetTimer();
  })();
