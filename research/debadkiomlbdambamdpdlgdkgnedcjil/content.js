(function () {
  const LOG_PREFIX = "[ZAPIFLOW]";

  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }

  function warn(...args) {
    console.warn(LOG_PREFIX, ...args);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function randomIntInclusive(min, max) {
    const a = Math.ceil(min);
    const b = Math.floor(max);
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  /** Plain text roughly visible in a Slate contenteditable (drops ZWSP / FEFF). */
  function editorPlainText(el) {
    return (el.innerText || "")
      .replace(/[\u200b\ufeff]/g, "")
      .replace(/\n+/g, " ")
      .trim();
  }

  function editorSeemsToContain(el, text) {
    const t = text.trim();
    if (!t) return false;
    const raw = editorPlainText(el);
    if (raw.includes(t)) return true;
    const head = t.slice(0, Math.min(48, t.length));
    return raw.includes(head);
  }

  /**
   * Prefer the editable with Flow's main placeholder; else the lowest visible Slate box (prompt bar).
   */
  function findFlowPromptEditor() {
    const candidates = [];
    for (const el of document.querySelectorAll(
      '[data-slate-editor="true"][contenteditable="true"]'
    )) {
      if (!isVisible(el)) continue;
      candidates.push(el);
    }
    if (!candidates.length) return null;

    const withPlaceholder = candidates.filter((el) => {
      const ph = el.querySelector("[data-slate-placeholder]");
      if (!ph) return false;
      const label = (ph.textContent || "").toLowerCase();
      return (
        label.includes("what do you want") ||
        label.includes("create") ||
        label.includes("generate")
      );
    });
    const pool = withPlaceholder.length ? withPlaceholder : candidates;
    return pool.sort(
      (a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom
    )[0];
  }

  function firstMatch(selectors) {
    for (const sel of selectors || []) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        /* invalid selector */
      }
    }
    return null;
  }

  /**
   * Focus like a user: scroll, then click inside the box so React/Slate activates the field.
   */
  async function focusEditorLikeUser(el) {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    await sleep(40);
    const r = el.getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, r.left + 8), r.right - 8);
    const cy = Math.min(Math.max(r.top + r.height / 2, r.top + 8), r.bottom - 8);
    const common = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1,
    };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...common, pointerId: 1, pointerType: "mouse" }));
    el.dispatchEvent(new MouseEvent("mousedown", common));
    el.dispatchEvent(new PointerEvent("pointerup", { ...common, pointerId: 1, pointerType: "mouse" }));
    el.dispatchEvent(new MouseEvent("mouseup", common));
    el.dispatchEvent(new MouseEvent("click", common));
    el.focus();
    await sleep(50);
  }

  async function selectAllInEditor(el) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    await sleep(30);
  }

  async function clearEditorContent(el) {
    await selectAllInEditor(el);
    try {
      document.execCommand("delete", false, null);
    } catch {
      el.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "deleteContentBackward",
        })
      );
    }
    await sleep(40);
  }

  function dispatchSyntheticPaste(el, text) {
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    const ev = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    try {
      Object.defineProperty(ev, "clipboardData", {
        value: dt,
        enumerable: true,
        configurable: true,
      });
    } catch {
      /* ignore */
    }
    return el.dispatchEvent(ev);
  }

  async function typeInsertTextEvents(el, text, charDelayMs) {
    el.focus();
    const endSel = window.getSelection();
    const endRange = document.createRange();
    endRange.selectNodeContents(el);
    endRange.collapse(false);
    endSel.removeAllRanges();
    endSel.addRange(endRange);
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      el.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          composed: true,
          inputType: "insertText",
          data: char,
        })
      );
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data: char,
        })
      );
      if (charDelayMs > 0) await sleep(charDelayMs);
    }
  }

  /**
   * Slate/React ignores raw DOM writes — drive the same path as typing/pasting.
   */
  async function clickPlusButton() {
    const selectors = globalThis.FLOW_BATCH_DEFAULT_SELECTORS.uploadButton || [];
    let btn = firstMatch(selectors.filter(s => !s.includes(':contains')));
    
    if (!btn || !isVisible(btn)) {
      btn = Array.from(document.querySelectorAll('button')).find(b => {
         return isVisible(b) && (b.textContent || '').includes('add_2');
      });
    }

    if (!btn || !isVisible(btn)) {
      for (const b of document.querySelectorAll('button')) {
        if (!isVisible(b)) continue;
        const text = b.textContent.trim().toLowerCase();
        if (text === 'add' || text === 'add_circle' || text === 'add_photo_alternate') {
          btn = b;
          break;
        }
      }
    }
    if (btn) {
      log("Found '+' button, clicking it.");
      btn.click();
      return true;
    }
    return false;
  }

  // Add a project asset (already in Flow) to the prompt by searching in the picker
  async function addAssetToPromptByName(assetName) {
    log(`addAsset: opening picker for "${assetName}"…`);

    const opened = await clickPlusButton();
    if (!opened) { warn(`addAsset: could not open picker for "${assetName}"`); return false; }
    await sleep(900);

    // Find the "Search assets" input specifically inside the asset picker panel
    let searchInput = null;
    for (let i = 0; i < 20; i++) {
      searchInput = Array.from(document.querySelectorAll('input'))
        .find(el => isVisible(el) && /search\s*asset/i.test(el.placeholder || ""));
      // Fallback: any input whose placeholder contains "search"
      if (!searchInput) {
        searchInput = Array.from(document.querySelectorAll('input'))
          .find(el => isVisible(el) && /search/i.test(el.placeholder || "") && el.type !== "hidden");
      }
      if (searchInput) break;
      await sleep(250);
    }

    if (searchInput) {
      // Clear and type using React-compatible events
      searchInput.focus();
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(100);
      for (const ch of assetName) {
        searchInput.value += ch;
        searchInput.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: ch }));
        searchInput.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ch }));
        await sleep(30);
      }
      await sleep(800);
      log(`addAsset: typed "${assetName}" in search`);
    }

    // Find matching item
    let matchedItem = null;
    for (let i = 0; i < 15; i++) {
      const items = Array.from(document.querySelectorAll('[role="listitem"], [role="option"], li, div'))
        .filter(el => isVisible(el) && el.querySelector("img"));

      matchedItem = items.find(el => {
        const txt = el.textContent.trim().toLowerCase();
        return txt === assetName.toLowerCase() || txt.startsWith(assetName.toLowerCase());
      });

      if (!matchedItem && searchInput && items.length > 0 && items.length <= 5) {
        matchedItem = items[0];
      }

      if (matchedItem) break;
      await sleep(300);
    }

    if (!matchedItem) {
      warn(`addAsset: no match found for "${assetName}"`);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await sleep(400);
      return false;
    }

    matchedItem.click();
    log(`addAsset: selected item for "${assetName}"`);
    await sleep(600);

    // Click "Add to Prompt"
    for (let i = 0; i < 10; i++) {
      const addBtn = Array.from(document.querySelectorAll("button"))
        .find(btn => isVisible(btn) && /add to prompt/i.test(btn.textContent));
      if (addBtn) {
        addBtn.click();
        log(`addAsset: "Add to Prompt" clicked for "${assetName}"`);
        await sleep(700);
        return true;
      }
      await sleep(300);
    }

    warn(`addAsset: "Add to Prompt" not found for "${assetName}"`);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }

  async function injectTextIntoFlowPrompt(el, text, charDelayMs) {
    if (!text) return false;

    // 1. Try synthetic paste
    dispatchSyntheticPaste(el, text);
    await sleep(200);
    if (editorSeemsToContain(el, text)) {
      log("Filled prompt via synthetic paste.");
      return true;
    }

    // 2. Try beforeinput
    log("Text not found, trying beforeinput...");
    const before = new InputEvent("beforeinput", {
      bubbles: true, cancelable: true, composed: true,
      inputType: "insertText", data: text,
    });
    el.dispatchEvent(before);
    el.dispatchEvent(new InputEvent("input", {
      bubbles: true, composed: true,
      inputType: "insertText", data: text,
    }));
    await sleep(200);
    if (editorSeemsToContain(el, text)) {
      log("Filled prompt via insertText beforeinput.");
      return true;
    }

    // 3. Try execCommand insertText — full text at once (instant)
    log("Trying execCommand insertText (full text)...");
    try { document.execCommand("insertText", false, text); } catch {}
    await sleep(200);
    if (editorSeemsToContain(el, text)) {
      log("Filled prompt via execCommand insertText.");
      return true;
    }

    // 4. Try InputEvents per character (last resort — slow but works)
    log("Trying per-character InputEvent insertText...");
    await typeInsertTextEvents(el, text, 0);
    await sleep(200);
    if (editorSeemsToContain(el, text)) {
      log("Filled prompt via synthetic InputEvents.");
      return true;
    }

    log("Prompt verification failed; editor text:", editorPlainText(el).slice(0, 120));
    return false;
  }

  function findCreateButtonByArrowIcon() {
    const candidates = [];
    for (const btn of document.querySelectorAll("button")) {
      if (!isVisible(btn)) continue;
      const icon = btn.querySelector("i.google-symbols");
      if (icon && icon.textContent?.trim() === "arrow_forward") {
        candidates.push(btn);
      }
    }
    if (!candidates.length) return null;
    return candidates.sort(
      (a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom
    )[0];
  }

  /**
   * Find the Create button by its visually-hidden <span> label.
   * Google Flow wraps "Create" in a clip-rect hidden span inside the button.
   */
  function findCreateButtonByHiddenLabel() {
    for (const btn of document.querySelectorAll("button")) {
      if (!isVisible(btn)) continue;
      const spans = btn.querySelectorAll("span");
      for (const span of spans) {
        if (span.textContent?.trim().toLowerCase() === "create") {
          return btn;
        }
      }
    }
    return null;
  }

  /**
   * Consolidated submit button discovery with diagnostic logging.
   */
  function findSubmitButton(selectors) {
    let btn = firstMatch(selectors.submitButton || []);
    if (btn && isVisible(btn)) {
      log("Submit button found via CSS selector.");
      return btn;
    }

    btn = findCreateButtonByArrowIcon();
    if (btn) {
      log("Submit button found via arrow_forward icon.");
      return btn;
    }

    btn = findCreateButtonByHiddenLabel();
    if (btn) {
      log("Submit button found via hidden 'Create' label.");
      return btn;
    }

    for (const b of document.querySelectorAll("button")) {
      if (!isVisible(b)) continue;
      if (b.textContent?.toLowerCase().includes("create")) {
        log("Submit button found via textContent scan.");
        return b;
      }
    }

    warn("Submit button NOT found by any strategy.");
    return null;
  }

  /* ── MAIN world React fiber click ──────────────────────────────────
   * Marks the target element, then asks the background service worker
   * to inject a function via chrome.scripting.executeScript in the
   * MAIN world. This bypasses both CSP and isTrusted checks — the
   * injected code calls React's onClick handler directly.
   * ---------------------------------------------------------------- */

  const FQ_MARKER_ATTR = "data-fq-click-target";
  let fqClickCounter = 0;

  async function clickViaReactFiber(el) {
    const token = String(++fqClickCounter);
    el.setAttribute(FQ_MARKER_ATTR, token);
    try {
      const result = await chrome.runtime.sendMessage({
        type: "REACT_FIBER_CLICK",
        token,
        markerAttr: FQ_MARKER_ATTR,
      });
      return result || { ok: false, reason: "no response from background" };
    } catch (e) {
      return { ok: false, reason: String(e?.message || e) };
    } finally {
      el.removeAttribute(FQ_MARKER_ATTR);
    }
  }

  /**
   * Click a button with full pointer/mouse event sequence (synthetic fallback).
   */
  function clickButtonSynthetic(btn) {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const common = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1,
    };
    btn.dispatchEvent(new PointerEvent("pointerdown", { ...common, pointerId: 1, pointerType: "mouse" }));
    btn.dispatchEvent(new MouseEvent("mousedown", common));
    btn.dispatchEvent(new PointerEvent("pointerup", { ...common, pointerId: 1, pointerType: "mouse" }));
    btn.dispatchEvent(new MouseEvent("mouseup", common));
    btn.dispatchEvent(new MouseEvent("click", { ...common, buttons: 0 }));
    btn.click();
  }

  /**
   * Try all click strategies: React fiber onSubmit → onClick → synthetic events
   */
  async function clickSubmitButton(btn) {
    // Attempt 1: React fiber direct call (bypasses isTrusted entirely)
    const fiberResult = await clickViaReactFiber(btn);
    if (fiberResult.ok) {
      log(`Submit via React fiber: ${fiberResult.method} at depth ${fiberResult.depth}`);
      return true;
    }
    warn("React fiber submit failed:", JSON.stringify(fiberResult));

    // Attempt 2: Full synthetic pointer/mouse event sequence
    warn("Trying synthetic click events (may not work with isTrusted checks)...");
    clickButtonSynthetic(btn);
    return true;
  }

  function submitViaEnter(el) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      el.dispatchEvent(
        new KeyboardEvent(type, {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }

  async function dismissOptionalOverlays(selectorsConfig) {
    const list = selectorsConfig.dismissOverlays || [];
    for (let i = 0; i < 3; i++) {
      const btn = firstMatch(list);
      if (btn && isVisible(btn)) {
        btn.click();
        await sleep(400);
      } else break;
    }
  }

  let runToken = 0;

  async function runQueue(payload) {
    const token = ++runToken;
    let prompts = (payload.prompts || []).map((p) => String(p).trim()).filter(Boolean);
    const waitMinMs = Math.max(0, payload.waitMinMs ?? 10_000);
    const waitMaxMs = Math.max(waitMinMs, payload.waitMaxMs ?? 30_000);
    const preferEnter = payload.preferEnter === true;
    const charDelayMs   = Math.max(0, payload.charDelayMs ?? 50);
    const refAssetNames = payload.refAssetNames || [];

    /** Only bundled defaults — never merge message-supplied selectors (reduces attack surface). */
    const selectors = globalThis.FLOW_BATCH_DEFAULT_SELECTORS;

    for (let i = 0; i < prompts.length; i++) {
      if (token !== runToken) {
        log("Stopped by user.");
        return { stopped: true, completed: i };
      }

      const text = prompts[i];

      await dismissOptionalOverlays(selectors);

      let input = findFlowPromptEditor();
      if (!input) {
        input = firstMatch(selectors.promptInput || []);
      }
      if (!input || !isVisible(input)) {
        const msg =
          "Could not find prompt field. Open a Flow project tab (…/flow/project/…) and try again.";
        log(msg);
        return { error: msg, completed: i, failedPromptIndex: i };
      }

      // Add matching project assets to the prompt before typing
      for (const assetName of refAssetNames) {
        if (token !== runToken) break;
        await addAssetToPromptByName(assetName);
        await focusEditorLikeUser(input);
      }

      const ok = await injectTextIntoFlowPrompt(input, text, charDelayMs);
      if (!ok) {
        return {
          error:
            "Could not set prompt text in a way Flow accepts. Try entering one prompt manually once, then retry the queue.",
          completed: i,
          failedPromptIndex: i,
        };
      }

      await sleep(200);

      let submitted = false;
      if (!preferEnter) {
        const submit = findSubmitButton(selectors);
        if (submit) {
          try {
            await clickSubmitButton(submit);
            submitted = true;
            log(`Submitted prompt ${i + 1}/${prompts.length}.`);
          } catch (e) {
            warn(`Click failed for prompt ${i + 1}:`, e?.message || e);
          }
        } else {
          warn(`No submit button found for prompt ${i + 1}, will try Enter.`);
        }
      }
      if (!submitted) {
        submitViaEnter(input);
        log(`Sent Enter to submit (prompt ${i + 1}/${prompts.length})`);
      }

      if (i < prompts.length - 1) {
        const pause = randomIntInclusive(waitMinMs, waitMaxMs);
        log(`Waiting ${Math.round(pause / 1000)}s before next prompt…`);
        await sleep(pause);
      }
    }

    return { done: true, completed: prompts.length };
  }

  // Count failure cards by the "Retry" span inside a button
  // This span ONLY appears on Google Flow failure cards
  function countFailCards() {
    var n = 0;
    document.querySelectorAll("button span").forEach(function(span) {
      if (span.children.length === 0 && span.textContent.trim() === "Retry") n++;
    });
    return n;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      return;
    }
    if (message?.type === "FLOW_BATCH_PING") {
      sendResponse({ ok: true, href: location.href });
      return;
    }
    if (message?.type === "FLOW_BATCH_RUN") {
      runQueue(message)
        .then((result) => sendResponse(result))
        .catch((e) => sendResponse({ error: String(e?.message || e) }));
      return true;
    }
    if (message?.type === "FLOW_BATCH_STOP") {
      runToken++;
      sendResponse({ ok: true });
    }

    if (message?.type === "FLOW_GET_AGENT_MODE") {
      const agentBtn = Array.from(document.querySelectorAll("button[aria-pressed]"))
        .find(b => /agent/i.test(b.textContent));
      const isOn = agentBtn?.getAttribute("aria-pressed") === "true";
      const found = !!agentBtn;
      sendResponse({ found, isOn });
      return;
    }

    if (message?.type === "FLOW_DISABLE_AGENT_MODE") {
      (async function () {
        const getAgentBtn = () =>
          Array.from(document.querySelectorAll("button[aria-pressed]"))
            .find(b => /agent/i.test(b.textContent));

        const btn = getAgentBtn();

        // Already off or not found
        if (!btn || btn.getAttribute("aria-pressed") !== "true") {
          sendResponse({ ok: true, skipped: true });
          return;
        }

        // Click in main world via background scripting (bypasses isolated world)
        const clickRes = await chrome.runtime.sendMessage({ type: "MAIN_WORLD_AGENT_CLICK" });
        log("Agent click result:", JSON.stringify(clickRes));

        // Wait up to 3s for aria-pressed to flip to false
        for (let i = 0; i < 15; i++) {
          await sleep(200);
          const b = getAgentBtn();
          if (!b || b.getAttribute("aria-pressed") === "false") {
            sendResponse({ ok: true });
            return;
          }
        }

        sendResponse({ ok: false, error: "Agent mode still on after click" });
      })();
      return true;
    }

    if (message?.type === "FLOW_GET_TILE_COUNT") {
      // Scroll ALL existing images into view to force lazy loading before snapshot
      // This prevents off-screen images from being mistaken as "new" during generation
      (async function() {
        const imgs = Array.from(document.querySelectorAll('img[alt="Generated image"]'));

        // Scroll each image into view to trigger lazy src loading
        for (const img of imgs) {
          img.scrollIntoView({ behavior: 'instant', block: 'nearest' });
        }

        // Wait for lazy images to load their src
        if (imgs.length > 0) await sleep(800);

        // Now capture the complete snapshot — all srcs should be loaded
        const allImgs = Array.from(document.querySelectorAll('img[alt="Generated image"]'));
        const realSrcs = allImgs.map(img => img.src).filter(src => src && src.startsWith('http'));

        // Also snapshot existing video srcs
        const videoSrcs = Array.from(document.querySelectorAll('video'))
          .map(v => v.src || v.querySelector('source')?.src || '')
          .filter(src => src && src.startsWith('http'));

        sendResponse({
          count: realSrcs.length,
          srcs: realSrcs,
          videoSrcs,
          failCount: countFailCards(),
        });
      })();
      return true; // async sendResponse
    }

    if (message?.type === "FLOW_WAIT_GENERATION") {
      const beforeSrcs      = new Set(message.beforeSrcs   || []);
      const beforeVideoSrcs = new Set(message.beforeVideoSrcs || []);
      const beforeFailCount = message.beforeFailCount ?? 0;
      const timeout         = message.timeoutMs    ?? 300000; // 5 min for videos

      // Detect new images
      function getRealImageUrls() {
        return Array.from(document.querySelectorAll('img[alt="Generated image"]'))
          .filter(img => img.src && img.src.startsWith('http') && !beforeSrcs.has(img.src))
          .map(img => img.src);
      }

      // Detect new videos — Flow renders completed videos as <video> elements with a src
      function getRealVideoUrls() {
        return Array.from(document.querySelectorAll('video'))
          .map(v => v.src || v.querySelector('source')?.src || '')
          .filter(src => src && src.startsWith('http') && !beforeVideoSrcs.has(src));
      }

      function hasNewMedia() {
        return getRealImageUrls().length > 0 || getRealVideoUrls().length > 0;
      }

      function getNewUrls() {
        return [...getRealImageUrls(), ...getRealVideoUrls()];
      }

      function hasNewFailure() {
        return countFailCards() > beforeFailCount;
      }

      if (hasNewMedia()) { sendResponse({ done: true, newUrls: getNewUrls() }); return; }
      if (hasNewFailure())   { sendResponse({ failed: true }); return; }

      let resolved = false;

      function finish(result) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        clearInterval(pollInterval);
        observer.disconnect();
        sendResponse(result);
      }

      const timer = setTimeout(() => finish({ timeout: true }), timeout);

      // Poll every 3s (videos take longer)
      const pollInterval = setInterval(function() {
        if (hasNewMedia()) finish({ done: true, newUrls: getNewUrls() });
        else if (hasNewFailure()) finish({ failed: true });
      }, 3000);

      // MutationObserver for fast detection
      const observer = new MutationObserver(function() {
        if (hasNewMedia()) finish({ done: true, newUrls: getNewUrls() });
        else if (hasNewFailure()) finish({ failed: true });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["alt", "src"],
      });

      return true;
    }

  });

  log("Content script ready on", location.href);
})();
