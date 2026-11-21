// === אימות קודי הפעלה (חתימה דיגיטלית ECDSA P-256) ===
// קוד = <מזהה>.<חתימה>. רק מי שמחזיק במפתח הפרטי (admin.html) יכול לייצר קודים תקפים.
(function () {
  const STORAGE_KEY = "yalla_premium_code";

  function b64urlToBytes(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = atob(s);
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }

  function extractCode(input) {
    input = (input || "").trim();
    const m = input.match(/[?&#]unlock=([A-Za-z0-9_\-.]+)/);
    return m ? m[1] : input.replace(/\s+/g, "");
  }

  async function verify(code) {
    try {
      code = extractCode(code);
      const [id, sig] = code.split(".");
      if (!id || !sig || !window.crypto?.subtle) return false;
      const key = await crypto.subtle.importKey("jwk", window.APP_CONFIG.PUBLIC_KEY,
        { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key,
        b64urlToBytes(sig), new TextEncoder().encode("yalla:" + id));
    } catch (e) { return false; }
  }

  function read() { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } }
  function save(code) { try { localStorage.setItem(STORAGE_KEY, extractCode(code)); } catch (e) { } }

  window.License = {
    isPremium: false,
    async init() {
      // קישור הפעלה: ?unlock=CODE
      const fromUrl = new URLSearchParams(location.search).get("unlock");
      if (fromUrl && await verify(fromUrl)) {
        save(fromUrl);
        history.replaceState(null, "", location.pathname);
        this.isPremium = true;
        this.justUnlocked = true;
        return true;
      }
      const stored = read();
      this.isPremium = !!(stored && await verify(stored));
      return this.isPremium;
    },
    async activate(input) {
      if (await verify(input)) { save(input); this.isPremium = true; return true; }
      return false;
    }
  };
})();
