export default defineContentScript({
  matches: ['*://labs.google/*', '*://*.google.com/*'],
  main() {
    // Only run on Google Flow pages
    if (!window.location.href.includes('/fx/')) return;

    console.log('Snow Flow Content Script injected & listening');

    // Message listener for active generation commands
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'INJECT_AND_GENERATE') {
        runGenerationCycle(message.prompt, message.promptId);
      }
    });
  }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForElement<T>(fn: () => T | null | undefined, timeoutMs = 15000): Promise<T | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const res = fn();
    if (res) return res;
    await sleep(500);
  }
  return null;
}

// Convert blob URL to Data URL so background service worker can download it across origins
async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Wait for a newly generated image or a failure state to appear in the DOM (MutationObserver + Polling fallback)
async function waitForNewImage(beforeImages: Set<string>, timeoutMs = 90000): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Helper function to check the current DOM state
    function check() {
      if (resolved) return;

      const allImgs = Array.from(document.querySelectorAll('img'));
      // Find any image that has a valid source and is NOT in the baseline beforeImages set
      const newImg = allImgs.find(img => img.src && (img.src.startsWith('http') || img.src.startsWith('blob:')) && !beforeImages.has(img.src));

      if (newImg) {
        resolved = true;
        cleanup();
        resolve(newImg.src);
        return;
      }

      // Check for a failure card (Google Flow displays a button with text "Retry" or "Wiederholen")
      const retryButtons = Array.from(document.querySelectorAll('button span')).some(span => {
        const text = span.textContent?.trim().toLowerCase() || '';
        return text === 'retry' || text === 'wiederholen' || text === 'recommencer';
      });

      if (retryButtons) {
        resolved = true;
        cleanup();
        reject(new Error('Generation failed (Retry card detected in Flow UI)'));
        return;
      }
    }

    // Set up a backup polling interval in case MutationObserver is delayed
    const pollInterval = setInterval(check, 1500);

    // Set up a MutationObserver to instantly check DOM changes (faster than polling)
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'alt']
    });

    // Timeout fallback
    const timer = setTimeout(() => {
      resolved = true;
      cleanup();
      reject(new Error('Image generation timed out after 90 seconds'));
    }, timeoutMs);

    function cleanup() {
      clearInterval(pollInterval);
      clearTimeout(timer);
      observer.disconnect();
    }

    // Run initial check
    check();
  });
}

// Find the Create/Send button in the editor interface
function locateCreateButton(): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll('button'));
  
  // High priority: check for "arrow_forward" text or icon inside the button (Google Flow default icon)
  for (const btn of buttons) {
    const txt = btn.textContent?.toLowerCase() || '';
    const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
    if (txt.includes('arrow_forward') || label.includes('arrow_forward')) {
      return btn;
    }
  }

  const keywords = ['erstellen', 'create', 'generate', 'send', 'absenden', 'run', 'créer'];
  for (const btn of buttons) {
    const txt = btn.textContent?.toLowerCase() || '';
    const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
    if (keywords.some(kw => txt.includes(kw) || label.includes(kw))) {
      return btn;
    }
  }

  // Div-styled icon buttons or custom elements
  const roleButtons = Array.from(document.querySelectorAll('div[role="button"]'));
  for (const div of roleButtons) {
    const txt = div.textContent?.toLowerCase() || '';
    const label = div.getAttribute('aria-label')?.toLowerCase() || '';
    if (txt.includes('arrow_forward') || label.includes('arrow_forward') || keywords.some(kw => txt.includes(kw) || label.includes(kw))) {
      return div as HTMLElement;
    }
  }

  // Fallback: search for submit button
  for (const btn of buttons) {
    if (btn.type === 'submit') return btn;
  }

  return null;
}

// Helper to dispatch paste events mimicking human clipboard actions (Slate/React editors intercept this)
function dispatchSyntheticPaste(el: HTMLElement, text: string): boolean {
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  const ev = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  try {
    Object.defineProperty(ev, 'clipboardData', {
      value: dt,
      enumerable: true,
      configurable: true,
    });
  } catch (e) {
    // ignore
  }
  return el.dispatchEvent(ev);
}

// Clean text by dropping zero-width spaces/FEFF characters
function editorPlainText(el: HTMLElement): string {
  return (el.innerText || '')
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

// Check if contenteditable text matches the prompt input
function editorSeemsToContain(el: HTMLElement, text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const raw = editorPlainText(el);
  if (raw.includes(t)) return true;
  const head = t.slice(0, Math.min(48, t.length));
  return raw.includes(head);
}

const FQ_MARKER_ATTR = 'data-fq-click-target';
let fqClickCounter = 0;

// Ask the background script to run React Fiber bypass click in MAIN world
async function clickViaReactFiber(el: HTMLElement): Promise<{ ok: boolean; method?: string; reason?: string }> {
  const token = String(++fqClickCounter);
  el.setAttribute(FQ_MARKER_ATTR, token);
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'REACT_FIBER_CLICK',
      token,
      markerAttr: FQ_MARKER_ATTR,
    });
    return result || { ok: false, reason: 'no response from background' };
  } catch (e: any) {
    return { ok: false, reason: e.message || String(e) };
  } finally {
    el.removeAttribute(FQ_MARKER_ATTR);
  }
}

// Click button using React Fiber call or mouse event sequence fallback
async function clickSubmitButton(btn: HTMLElement): Promise<boolean> {
  const fiberResult = await clickViaReactFiber(btn);
  if (fiberResult.ok) {
    console.log(`Snow Flow: Submitted via React fiber (${fiberResult.method})`);
    return true;
  }
  console.warn('Snow Flow: React fiber submit failed:', JSON.stringify(fiberResult));

  // Fallback: Full synthetic pointer/mouse event sequence
  console.log('Snow Flow: Falling back to synthetic mouse clicks...');
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
  btn.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerId: 1, pointerType: 'mouse' }));
  btn.dispatchEvent(new MouseEvent('mousedown', common));
  btn.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerId: 1, pointerType: 'mouse' }));
  btn.dispatchEvent(new MouseEvent('mouseup', common));
  btn.dispatchEvent(new MouseEvent('click', { ...common, buttons: 0 }));
  btn.click();
  return true;
}

// Fallback keyboard Enter submission
function submitViaEnter(el: HTMLElement) {
  for (const type of ['keydown', 'keypress', 'keyup']) {
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      })
    );
  }
}

// Inject prompt, click generate, monitor, and report results back to background script
async function runGenerationCycle(prompt: string, promptId: number) {
  try {
    console.log(`Snow Flow: Executing Prompt ID ${promptId}: "${prompt}"`);

    // 1. Locate textarea or contenteditable textbox
    const inputElement = await waitForElement(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('textarea, div[role="textbox"], div[contenteditable="true"]'));
      return elements.find(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    }, 15000);

    if (!inputElement) {
      throw new Error('Unable to find the prompt input field (textarea or contenteditable textbox)');
    }

    // 2. Capture baseline set of images currently rendered on page
    const beforeImages = new Set(
      Array.from(document.querySelectorAll('img'))
        .map(el => el.src)
        .filter(src => src && (src.startsWith('http') || src.startsWith('blob:')))
    );

    // 3. Inject text and trigger React/Lexical/Slate state updates
    inputElement.focus();
    
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      const textarea = inputElement as HTMLTextAreaElement;
      
      // Clear first
      textarea.value = '';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (valueSetter) {
        valueSetter.call(textarea, prompt);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        textarea.value = prompt;
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else {
      // Contenteditable div (Google Flow textbox)
      inputElement.focus();
      
      // Select all and clear
      const range = document.createRange();
      range.selectNodeContents(inputElement);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('delete', false, undefined);
      
      await sleep(100);

      // Attempt 1: Synthetic paste (triggers Slate's input parser directly)
      dispatchSyntheticPaste(inputElement, prompt);
      await sleep(200);

      // Attempt 2: Fallback to execCommand + events if text not registered
      if (!editorSeemsToContain(inputElement, prompt)) {
        console.warn('Snow Flow: Synthetic paste failed, falling back to input events...');
        const beforeInputEvent = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: prompt
        });
        inputElement.dispatchEvent(beforeInputEvent);
        
        document.execCommand('insertText', false, prompt);
        
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    await sleep(800); // Wait for React model binding to settle

    // 4. Locate and click Generate button
    const createBtn = locateCreateButton();
    if (!createBtn) {
      throw new Error('Unable to find the Create/Generate button');
    }

    console.log('Snow Flow: Triggering clicks and Enter key triggers');
    
    // Attempt button click via React Fiber or fallback clicks
    let submitted = false;
    try {
      await clickSubmitButton(createBtn);
      submitted = true;
    } catch (e: any) {
      console.warn('Snow Flow: Click failed, will try keyboard Enter fallback:', e.message);
    }

    if (!submitted) {
      submitViaEnter(inputElement);
    }

    // 5. Wait for the newly generated image to appear in the DOM
    console.log('Snow Flow: Waiting for generation completion...');
    const generatedUrl = await waitForNewImage(beforeImages, 90000);

    // Convert blob URL to Data URL if needed so background downloads work without origin blocks
    let downloadUrl = generatedUrl;
    if (generatedUrl.startsWith('blob:')) {
      console.log('Snow Flow: Converting blob URL to Data URL for background download');
      downloadUrl = await blobUrlToDataUrl(generatedUrl);
    }

    console.log('Snow Flow: Asset ready. Sending URL to downloader...');

    // Report success to background service worker
    chrome.runtime.sendMessage({
      action: 'GENERATION_COMPLETE',
      imageUrl: downloadUrl,
      promptId: promptId
    });

  } catch (err: any) {
    console.error('Snow Flow Automation Loop Error:', err);
    chrome.runtime.sendMessage({
      action: 'GENERATION_FAILED',
      error: err.message || 'Automation failed',
      promptId: promptId
    });
  }
}
