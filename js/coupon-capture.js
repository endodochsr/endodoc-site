/* ============================================================
   EndoDoc — Captura de cupom via URL
   ------------------------------------------------------------
   Detecta ?cupom=CODIGO ou ?ref=CODIGO em qualquer página do
   site/app, salva no localStorage com expiração de 30 dias.
   O checkout (/app) lê esse valor pra pré-preencher o campo
   automaticamente.

   Como usar:
     - Cole <script src="/js/coupon-capture.js" defer></script>
       em todas as páginas onde a captura pode acontecer
     - No app.html, chame getStoredCoupon() pra ler o código

   API exposta em window.EndodocCoupon:
     • get()      → string | null  (código salvo, se não expirou)
     • set(code)  → bool
     • clear()    → void
     • source()   → 'url' | 'storage' | null  (de onde veio)
   ============================================================ */
(function(){
  const STORAGE_KEY = 'endodoc_coupon';
  const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

  function normalize(code){
    if(!code) return null;
    const s = String(code).trim().toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
    return s.length >= 3 && s.length <= 30 ? s : null;
  }

  function getStored(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!data || !data.code || !data.expiresAt) return null;
      if(Date.now() > data.expiresAt){
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    }catch(_){ return null; }
  }

  function setStored(code, source){
    const norm = normalize(code);
    if(!norm) return false;
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        code: norm,
        source: source || 'url',
        capturedAt: Date.now(),
        expiresAt: Date.now() + TTL_MS
      }));
      return true;
    }catch(_){ return false; }
  }

  function clear(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(_){}
  }

  // captura na URL (?cupom= ou ?ref=)
  let capturedNow = null;
  try{
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('cupom') || params.get('ref') || params.get('coupon');
    if(fromUrl){
      const norm = normalize(fromUrl);
      if(norm){
        setStored(norm, 'url');
        capturedNow = norm;
      }
    }
  }catch(_){}

  // limpa parâmetro da URL pra não ficar exposto/ser compartilhado por engano
  // mas mantém o histórico do navegador funcionando
  try{
    if(capturedNow && window.history && window.history.replaceState){
      const u = new URL(location.href);
      u.searchParams.delete('cupom');
      u.searchParams.delete('ref');
      u.searchParams.delete('coupon');
      const newUrl = u.pathname + (u.search ? u.search : '') + (u.hash || '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }catch(_){}

  window.EndodocCoupon = {
    get: () => {
      const s = getStored();
      return s ? s.code : null;
    },
    getFull: () => getStored(),
    set: (code) => setStored(code, 'manual'),
    clear,
    source: () => {
      const s = getStored();
      return s ? s.source : null;
    },
    capturedThisPage: () => capturedNow,
  };
})();
