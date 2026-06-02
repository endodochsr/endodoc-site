/* ============================================================
   EndoDoc — Meta Pixel + Cookie Consent (LGPD)
   ------------------------------------------------------------
   Único script que cuida de:
   - Banner de cookies (aceitar/rejeitar/configurar)
   - Persistência da escolha em localStorage
   - Carregamento condicional do Meta Pixel (só após consentimento)
   - Exposição de window.fbqTrack() pra disparar eventos do app

   Como usar:
   Inclua em todas as páginas, ANTES do </body>:
     <script src="/js/meta-pixel-cookies.js" defer></script>

   Pra disparar eventos depois do carregamento:
     window.fbqTrack('Lead');
     window.fbqTrack('CompleteRegistration', { value: 0 });
     window.fbqTrack('Subscribe', { value: 59, currency: 'BRL' });
============================================================ */

(function(){
  // Pixel ID da Meta (Business Manager → Events Manager → Pixel EndoDoc)
  const PIXEL_ID = '1980002546077873';

  // Google Analytics 4 Measurement ID (GA Admin → Streams de dados → EndoDoc Web → ID da métrica)
  const GA4_ID = 'G-0MRXC6CCY8';

  const STORAGE_KEY = 'endodoc-cookie-consent-v1';

  // ===== Estado: lê escolha salva =====
  function getConsent(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch(e){ return null; }
  }
  function setConsent(value){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }catch(e){}
  }

  // ===== Carrega o Pixel da Meta =====
  function loadPixel(){
    if(window._pixelLoaded) return;
    if(!PIXEL_ID || PIXEL_ID === '__PIXEL_ID_PLACEHOLDER__'){
      console.warn('Meta Pixel ID não configurado ainda');
      return;
    }
    window._pixelLoaded = true;
    // Snippet oficial do Meta
    !function(f,b,e,v,n,t,s){
      if(f.fbq) return; n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq) f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
      t=b.createElement(e); t.async=!0; t.src=v;
      s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');

    // Disparar eventos que foram enfileirados antes do load
    if(window._pixelQueue && Array.isArray(window._pixelQueue)){
      for(const ev of window._pixelQueue){
        try{ fbq('track', ev.event, ev.params || {}); }catch(_){}
      }
      window._pixelQueue = [];
    }
  }

  // ===== Carrega o Google Analytics 4 =====
  function loadGA4(){
    if(window._ga4Loaded) return;
    if(!GA4_ID || GA4_ID === '__GA4_ID_PLACEHOLDER__'){
      console.warn('GA4 Measurement ID não configurado ainda');
      return;
    }
    window._ga4Loaded = true;
    // gtag.js — script oficial do GA4
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4_ID, {
      anonymize_ip: true,             // LGPD: anonimiza último octeto do IP
      allow_google_signals: false,    // Não compartilha com Google Ads sem consent explícito
      send_page_view: true            // Dispara PageView automático
    });

    // Disparar eventos que foram enfileirados
    if(window._ga4Queue && Array.isArray(window._ga4Queue)){
      for(const ev of window._ga4Queue){
        try{ gtag('event', ev.event, ev.params || {}); }catch(_){}
      }
      window._ga4Queue = [];
    }
  }

  // Função pública pra disparar eventos
  window.fbqTrack = function(event, params){
    // Se Pixel não carregou ainda (sem consentimento ou ID), enfileira
    if(typeof fbq === 'undefined'){
      window._pixelQueue = window._pixelQueue || [];
      window._pixelQueue.push({ event, params: params || {} });
      return;
    }
    try{ fbq('track', event, params || {}); }catch(e){}
  };

  // Função pública pra disparar eventos no Google Analytics
  window.gaTrack = function(event, params){
    if(typeof gtag === 'undefined'){
      window._ga4Queue = window._ga4Queue || [];
      window._ga4Queue.push({ event, params: params || {} });
      return;
    }
    try{ gtag('event', event, params || {}); }catch(e){}
  };

  // Helper: dispara o evento NOS DOIS (Meta + Google) — usa quando faz sentido pra ambos
  window.trackEvent = function(event, params){
    if(window.fbqTrack) window.fbqTrack(event, params);
    if(window.gaTrack) window.gaTrack(event, params);
  };

  // ===== Banner de cookies =====
  function renderBanner(){
    if(document.getElementById('cookie-banner')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cookie-banner';
    wrap.innerHTML = `
      <style>
        #cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#16302f;color:#f5efe6;
          padding:18px 24px;box-shadow:0 -4px 24px rgba(0,0,0,.18);
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;
          font-size:14px;line-height:1.55;
          transform:translateY(0);transition:transform .3s ease;}
        #cookie-banner.hidden{transform:translateY(100%)}
        #cookie-banner .ck-wrap{max-width:1100px;margin:0 auto;display:flex;gap:20px;align-items:center;flex-wrap:wrap}
        #cookie-banner .ck-text{flex:1;min-width:260px;color:#cfe6e4}
        #cookie-banner .ck-text b{color:#fff}
        #cookie-banner .ck-text a{color:#ffd1b3;text-decoration:underline}
        #cookie-banner .ck-buttons{display:flex;gap:8px;flex-wrap:wrap}
        #cookie-banner button{padding:10px 16px;border-radius:9px;border:none;cursor:pointer;
          font-weight:600;font-size:13.5px;font-family:inherit;transition:.15s}
        #cookie-banner .ck-accept{background:#f2683c;color:#fff}
        #cookie-banner .ck-accept:hover{background:#d85829}
        #cookie-banner .ck-reject{background:transparent;color:#cfe6e4;border:1px solid rgba(255,255,255,.25)}
        #cookie-banner .ck-reject:hover{background:rgba(255,255,255,.08)}
        @media(max-width:640px){
          #cookie-banner{padding:14px 16px;font-size:13px}
          #cookie-banner .ck-wrap{gap:12px}
          #cookie-banner .ck-buttons{width:100%}
          #cookie-banner .ck-buttons button{flex:1}
        }
      </style>
      <div class="ck-wrap">
        <div class="ck-text">
          🍪 <b>Usamos cookies</b> pra melhorar sua experiência, medir desempenho dos anúncios e entender como o site é usado. Compartilhamos dados anônimos com Meta (Facebook/Instagram) e Google Analytics. Veja nossa <a href="/privacidade" target="_blank">Política de Privacidade</a>.
        </div>
        <div class="ck-buttons">
          <button class="ck-reject" onclick="window._cookieReject()">Só essenciais</button>
          <button class="ck-accept" onclick="window._cookieAccept()">Aceitar todos</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }
  function hideBanner(){
    const el = document.getElementById('cookie-banner');
    if(el){ el.classList.add('hidden'); setTimeout(()=>el.remove(), 350); }
  }

  window._cookieAccept = function(){
    setConsent({ marketing: true, ts: Date.now() });
    hideBanner();
    loadPixel();
    loadGA4();
  };
  window._cookieReject = function(){
    setConsent({ marketing: false, ts: Date.now() });
    hideBanner();
    // não carrega Pixel nem GA4
  };
  // Função pública pra reabrir o banner (link no footer)
  window.openCookieSettings = function(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    renderBanner();
  };

  // ===== Boot =====
  function boot(){
    const consent = getConsent();
    if(consent === null){
      // primeira visita — mostra banner
      renderBanner();
    } else if(consent.marketing){
      // já aceitou — carrega Pixel + GA4 direto
      loadPixel();
      loadGA4();
    }
    // se rejeitou, não faz nada
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
