
interface QueueItem {
  id: number;
  timestamp: string;
  text: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface QueueState {
  items: QueueItem[];
  activeItemIndex: number;
  status: 'idle' | 'running' | 'paused';
  globalStyle: string;
  delayBetweenPrompts: number;
}

const STYLE_TEMPLATES: Record<string, string> = {
  none: '',
  mspaint: 'Style constraint: An extremely simple childish drawing made in MS Paint. White background, thick uneven black outlines, wobbly hand-drawn lines, simple stick figure human with round head and line body, simple dot eyes, flat colors only, no realistic shading, no 3D, no cinematic lighting, horizontal 16:9 frame format.',
  cinematic: 'Style constraint: A high-fidelity cinematic photograph, photorealistic, cinematic lighting, 8k resolution, highly detailed, horizontal 16:9 frame format.'
};

export default defineBackground(() => {
  console.log('Snow Flow background script initialized');

  // Configure extension to open side panel on toolbar icon click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));

  let delayTimeoutId: any = null;

  // Listen for control commands from the popup UI
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_QUEUE' || message.action === 'RESUME_QUEUE') {
      clearTimeout(delayTimeoutId);
      processNextQueueItem();
    } else if (message.action === 'PAUSE_QUEUE' || message.action === 'STOP_QUEUE') {
      clearTimeout(delayTimeoutId);
    } else if (message.action === 'GENERATION_COMPLETE') {
      // Content script reports that an image is fully generated
      handleGenerationSuccess(message.imageUrl, message.promptId);
    } else if (message.action === 'GENERATION_FAILED') {
      handleGenerationFailure(message.error, message.promptId);
    }

    if (message.action === 'DEBUGGER_INSERT_TEXT') {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ ok: false, error: 'No tab ID' });
        return;
      }
      debuggerInsertText(tabId, message.text)
        .then(() => sendResponse({ ok: true }))
        .catch((err: any) => sendResponse({ ok: false, error: err.message || String(err) }));
      return true;
    }

    if (message.action === 'DEBUGGER_CLICK') {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ ok: false, error: 'No tab ID' });
        return;
      }
      debuggerClick(tabId, message.x, message.y)
        .then(() => sendResponse({ ok: true }))
        .catch((err: any) => sendResponse({ ok: false, error: err.message || String(err) }));
      return true;
    }

    if (message.action === 'DEBUGGER_DETACH') {
      const tabId = sender.tab?.id;
      if (tabId) {
        chrome.debugger.detach({ tabId }).catch(() => {});
      }
    }

    if (message.type === 'REACT_FIBER_CLICK') {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ ok: false, reason: 'no tab id' });
        return;
      }
      
      chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: reactFiberSubmit,
        args: [message.token, message.markerAttr]
      }).then((results) => {
        const val = results?.[0]?.result;
        sendResponse(val || { ok: false, reason: 'no result from main world injection' });
      }).catch((err) => {
        sendResponse({ ok: false, reason: err.message || String(err) });
      });

      return true; // Keep channel open for async response
    }
  });

  // Master controller that finds the active item and triggers injection
  async function processNextQueueItem() {
    chrome.storage.local.get('snowFlowQueue', async (res) => {
      const state = res.snowFlowQueue as QueueState | undefined;
      if (!state || state.status !== 'running') return;

      const activeIndex = state.activeItemIndex;
      if (activeIndex >= state.items.length) {
        // Queue finished!
        state.status = 'idle';
        chrome.storage.local.set({ snowFlowQueue: state });
        console.log('Queue processing complete!');
        return;
      }

      const item = state.items[activeIndex];
      
      // Update item status to generating
      item.status = 'generating';
      chrome.storage.local.set({ snowFlowQueue: state });

      // Find Google Flow tab (supports flow.google, subdomains, and localized paths)
      const tabs = await chrome.tabs.query({
        url: [
          '*://labs.google/fx/*',
          '*://*.labs.google/fx/*',
          '*://*.google.com/fx/*',
          '*://flow.google/*',
          '*://*.flow.google/*'
        ]
      });
      const flowTabs = tabs.filter(t => {
        if (!t.url) return false;
        return t.url.includes('/flow') || t.url.includes('flow.google');
      });
      
      if (flowTabs.length === 0) {
        console.error('Google Flow tab not found! Pausing queue.');
        state.status = 'paused';
        item.status = 'failed';
        chrome.storage.local.set({ snowFlowQueue: state });
        return;
      }

      // We use the first matching Google Flow tab
      const flowTab = flowTabs[0];
      if (flowTab.id === undefined) return;

      // Construct the full prompt combining original prompt + template style injection
      const templateStyle = STYLE_TEMPLATES[state.globalStyle] || '';
      let finalPrompt = item.text;
      if (templateStyle && !finalPrompt.includes('Style constraint:')) {
        finalPrompt = `${finalPrompt.trim()} ${templateStyle}`;
      }

      // Send instruction to the content script running on that tab
      chrome.tabs.sendMessage(flowTab.id, {
        action: 'INJECT_AND_GENERATE',
        prompt: finalPrompt,
        promptId: item.id
      }).catch((err) => {
        console.error('Snow Flow: Failed to communicate with content script. Tab might need a reload.', err);
        // Gracefully pause and mark item as failed, so user knows to reload the tab
        chrome.storage.local.get('snowFlowQueue', (currentRes) => {
          const currentState = currentRes.snowFlowQueue as QueueState | undefined;
          if (currentState && currentState.status === 'running') {
            currentState.status = 'paused';
            currentState.items[currentState.activeItemIndex].status = 'failed';
            chrome.storage.local.set({ snowFlowQueue: currentState });
          }
        });
      });
    });
  }

  // Handle successful image generation callback from the content script
  function handleGenerationSuccess(imageUrl: string, promptId: number) {
    chrome.storage.local.get('snowFlowQueue', (res) => {
      const state = res.snowFlowQueue as QueueState | undefined;
      if (!state || state.status !== 'running') return;

      const activeIndex = state.activeItemIndex;
      if (activeIndex >= state.items.length || state.items[activeIndex].id !== promptId) return;

      const item = state.items[activeIndex];
      item.status = 'completed';

      // Download the generated image using chrome.downloads API
      // Clean description text to construct a safe filename
      const cleanDesc = item.text
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30)
        .replace(/__+/g, '_')
        .toLowerCase();
      
      const filename = `SnowFlow/${item.timestamp}_${cleanDesc}.png`;

      chrome.downloads.download({
        url: imageUrl,
        filename: filename,
        conflictAction: 'overwrite'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError.message);
        } else {
          console.log(`Successfully queued download: ${filename} (ID: ${downloadId})`);
        }
      });

      // Advance queue pointer
      state.activeItemIndex += 1;
      chrome.storage.local.set({ snowFlowQueue: state }, () => {
        // Wait configured delay before generating next prompt
        console.log(`Waiting ${state.delayBetweenPrompts} seconds before next item...`);
        delayTimeoutId = setTimeout(() => {
          processNextQueueItem();
        }, state.delayBetweenPrompts * 1000);
      });
    });
  }

  // Handle image generation failure callback from the content script
  function handleGenerationFailure(error: string, promptId: number) {
    chrome.storage.local.get('snowFlowQueue', (res) => {
      const state = res.snowFlowQueue as QueueState | undefined;
      if (!state || state.status !== 'running') return;

      const activeIndex = state.activeItemIndex;
      if (activeIndex >= state.items.length || state.items[activeIndex].id !== promptId) return;

      const item = state.items[activeIndex];
      item.status = 'failed';
      
      // Move to next item even if this failed
      state.activeItemIndex += 1;
      chrome.storage.local.set({ snowFlowQueue: state }, () => {
        delayTimeoutId = setTimeout(() => {
          processNextQueueItem();
        }, state.delayBetweenPrompts * 1000);
      });
    });
  }
});

// reactFiberSubmit executes in the page's MAIN world to extract React event callbacks
function reactFiberSubmit(token: string, markerAttr: string) {
  const el = document.querySelector(`[${markerAttr}="${token}"]`) as HTMLElement | null;
  if (!el) return { ok: false, reason: 'element not found in MAIN world' };

  // Find React fiber key
  const fiberKey = Object.keys(el).find(k => 
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  if (!fiberKey) return { ok: false, reason: 'no React fiber on element' };

  // Walk the fiber tree and collect handlers
  let fiber = (el as any)[fiberKey];
  let depth = 0;
  let onSubmit: any = null;
  let onSubmitDepth = -1;
  let onClick: any = null;
  let onClickDepth = -1;

  while (fiber && depth < 30) {
    const props = fiber.memoizedProps;
    if (props) {
      if (!onSubmit && typeof props.onSubmit === 'function') {
        onSubmit = props.onSubmit;
        onSubmitDepth = depth;
      }
      if (!onClick && typeof props.onClick === 'function') {
        onClick = props.onClick;
        onClickDepth = depth;
      }
    }
    fiber = fiber.return;
    depth++;
  }

  // Also check __reactProps$
  const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
  if (propsKey) {
    const directProps = (el as any)[propsKey];
    if (!onClick && typeof directProps.onClick === 'function') {
      onClick = directProps.onClick;
      onClickDepth = -1;
    }
  }

  if (onSubmit) {
    try {
      onSubmit(true);
      return { ok: true, method: 'onSubmit', depth: onSubmitDepth };
    } catch (e: any) {
      // fall through
    }
  }

  if (onClick) {
    try {
      const rect = el.getBoundingClientRect();
      onClick({
        type: 'click',
        target: el,
        currentTarget: el,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 0,
        isTrusted: true,
        preventDefault: () => {},
        stopPropagation: () => {},
        isPropagationStopped: () => false,
        isDefaultPrevented: () => false,
        nativeEvent: { type: 'click', isTrusted: true },
      });
      return { ok: true, method: 'onClick', depth: onClickDepth };
    } catch (e: any) {
      return { ok: false, reason: 'onClick threw: ' + e.message, hadOnSubmit: !!onSubmit };
    }
  }

  return { ok: false, reason: 'neither onSubmit nor onClick found in fiber tree' };
}

async function attachDebugger(tabId: number) {
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
  } catch (err: any) {
    if (!err.message || !err.message.includes('already attached')) {
      throw err;
    }
  }
}

async function debuggerInsertText(tabId: number, text: string) {
  await attachDebugger(tabId);
  await chrome.debugger.sendCommand({ tabId }, 'Input.insertText', { text });
}

async function debuggerClick(tabId: number, x: number, y: number) {
  await attachDebugger(tabId);
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseMoved', x, y, button: 'none', modifiers: 0
  });
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1, modifiers: 0
  });
  await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1, modifiers: 0
  });
}

