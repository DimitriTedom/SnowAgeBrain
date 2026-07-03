import './style.css';
import logoImg from '@/assets/SnowRanks Logo.png';

// Exact style constraint blocks we can auto-inject if requested
const STYLE_TEMPLATES: Record<string, string> = {
  none: '',
  mspaint: 'Style constraint: An extremely simple childish drawing made in MS Paint. White background, thick uneven black outlines, wobbly hand-drawn lines, simple stick figure human with round head and line body, simple dot eyes, flat colors only, no realistic shading, no 3D, no cinematic lighting, horizontal 16:9 frame format.',
  cinematic: 'Style constraint: A high-fidelity cinematic photograph, photorealistic, cinematic lighting, 8k resolution, highly detailed, horizontal 16:9 frame format.'
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="sidepanel-container">
    <header>
      <div class="logo-area">
        <img src="${logoImg}" alt="SnowRanks Logo" class="sidepanel-logo" />
        <h1>Snow Flow</h1>
      </div>
      <span class="badge">Side Panel</span>
    </header>
    
    <div class="main-content">
      <div class="form-group">
        <label for="prompts-input">Queue Prompts (one per line):</label>
        <textarea id="prompts-input" placeholder="0000_A simple stick figure holding a phone. Style constraint...&#10;0002_A stick figure with a giant brain..."></textarea>
      </div>
      
      <div class="settings-grid">
        <div class="form-group">
          <label for="delay-input">Delay (sec):</label>
          <input type="number" id="delay-input" min="1" max="60" value="5" />
        </div>
        <div class="form-group">
          <label for="style-input">Inject Style template:</label>
          <select id="style-input">
            <option value="none" selected>None (Already in text)</option>
            <option value="mspaint">MS Paint (Savanna Niche)</option>
            <option value="cinematic">Cinematic 16:9</option>
          </select>
        </div>
      </div>
      
      <div class="actions">
        <button id="start-btn" class="btn primary">Start</button>
        <button id="pause-btn" class="btn secondary" disabled>Pause</button>
        <button id="clear-btn" class="btn danger">Clear</button>
      </div>
      
      <div class="progress-section">
        <div class="progress-bar-container">
          <div id="progress-bar" class="progress-bar" style="width: 0%"></div>
        </div>
        <div class="progress-text">
          <span id="progress-stats">0 / 0 completed</span>
          <span id="queue-status" class="status-idle">Idle</span>
        </div>
      </div>
      
      <div class="queue-list-container">
        <h3>Active Queue</h3>
        <div id="queue-list" class="queue-list">
          <div class="empty-list-msg">No prompts loaded. Paste some above and click Start.</div>
        </div>
      </div>
    </div>
    
    <footer>
      <p>Snow Flow v1.0.0 &copy; Dimitri SnowDev</p>
    </footer>
  </div>
`;

// Element References
const promptsInput = document.querySelector<HTMLTextAreaElement>('#prompts-input')!;
const delayInput = document.querySelector<HTMLInputElement>('#delay-input')!;
const styleInput = document.querySelector<HTMLSelectElement>('#style-input')!;
const startBtn = document.querySelector<HTMLButtonElement>('#start-btn')!;
const pauseBtn = document.querySelector<HTMLButtonElement>('#pause-btn')!;
const clearBtn = document.querySelector<HTMLButtonElement>('#clear-btn')!;
const progressBar = document.querySelector<HTMLDivElement>('#progress-bar')!;
const progressStats = document.querySelector<HTMLSpanElement>('#progress-stats')!;
const queueStatus = document.querySelector<HTMLSpanElement>('#queue-status')!;
const queueList = document.querySelector<HTMLDivElement>('#queue-list')!;

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

// Update the UI elements based on state changes
function updateUI(state: QueueState | null) {
  if (!state || state.items.length === 0) {
    progressBar.style.width = '0%';
    progressStats.textContent = '0 / 0 completed';
    queueStatus.textContent = 'Idle';
    queueStatus.className = 'status-idle';
    queueList.innerHTML = '<div class="empty-list-msg">No prompts loaded. Paste some above and click Start.</div>';
    
    startBtn.textContent = 'Start';
    pauseBtn.textContent = 'Pause';
    pauseBtn.disabled = true;
    
    promptsInput.disabled = false;
    delayInput.disabled = false;
    styleInput.disabled = false;
    return;
  }

  // Populate inputs if they differ (allows state recovery on popup reopen)
  if (promptsInput.value === '') {
    const rawLines = state.items.map(item => {
      // Re-stitch prompt lines
      return `${item.timestamp}_${item.text}`;
    });
    promptsInput.value = rawLines.join('\n');
  }
  
  delayInput.value = String(state.delayBetweenPrompts);
  styleInput.value = state.globalStyle;

  // Button States
  if (state.status === 'running') {
    startBtn.textContent = 'Restart';
    pauseBtn.textContent = 'Pause';
    pauseBtn.disabled = false;
    queueStatus.textContent = 'Running';
    queueStatus.className = 'status-running';
  } else if (state.status === 'paused') {
    startBtn.textContent = 'Restart';
    pauseBtn.textContent = 'Resume';
    pauseBtn.disabled = false;
    queueStatus.textContent = 'Paused';
    queueStatus.className = 'status-paused';
  } else {
    startBtn.textContent = 'Start';
    pauseBtn.textContent = 'Pause';
    pauseBtn.disabled = true;
    queueStatus.textContent = 'Idle';
    queueStatus.className = 'status-idle';
  }

  const isBusy = state.status === 'running' || state.status === 'paused';
  promptsInput.disabled = isBusy;
  delayInput.disabled = isBusy;
  styleInput.disabled = isBusy;

  // Progress Bar & Stats
  const completedCount = state.items.filter(i => i.status === 'completed').length;
  const totalCount = state.items.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  progressBar.style.width = `${percentage}%`;
  progressStats.textContent = `${completedCount} / ${totalCount} completed`;

  // Render Queue List
  let listHTML = '';
  state.items.forEach(item => {
    // Show active item index status clearly
    const isActive = state.items[state.activeItemIndex]?.id === item.id;
    const activeClass = isActive && state.status === 'running' ? 'style="border: 1px solid #06b6d4;"' : '';
    
    listHTML += `
      <div class="queue-item" ${activeClass}>
        <span class="item-time">${item.timestamp}</span>
        <span class="item-text" title="${item.text}">${item.text}</span>
        <span class="item-status status-${item.status}">${item.status}</span>
      </div>
    `;
  });
  queueList.innerHTML = listHTML;

  // Auto-scroll to active item
  const activeEl = queueList.querySelector('[style*="border"]');
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Action: Start Automation
startBtn.addEventListener('click', () => {
  const rawText = promptsInput.value.trim();
  if (!rawText) return;

  const lines = rawText.split('\n').filter(l => l.trim() !== '');
  const items = lines.map((line, idx) => {
    // Check if line starts with 4-digit number followed by underscore, e.g. "0000_"
    const match = line.match(/^(\d{4})_(.*)$/);
    let timestamp = String(idx * 2).padStart(4, '0'); // fall back to sequential 2s interval
    let text = line;
    
    if (match) {
      timestamp = match[1];
      text = match[2];
    }
    
    return {
      id: idx,
      timestamp,
      text,
      status: 'pending' as const
    };
  });

  const state: QueueState = {
    items,
    activeItemIndex: 0,
    status: 'running',
    globalStyle: styleInput.value,
    delayBetweenPrompts: parseInt(delayInput.value) || 5
  };

  chrome.storage.local.set({ snowFlowQueue: state }, () => {
    // Notify background script to start queue
    chrome.runtime.sendMessage({ action: 'START_QUEUE' });
  });
});

// Action: Pause / Resume Automation
pauseBtn.addEventListener('click', () => {
  chrome.storage.local.get('snowFlowQueue', (res) => {
    const state = res.snowFlowQueue as QueueState | undefined;
    if (!state) return;

    if (state.status === 'running') {
      state.status = 'paused';
      chrome.storage.local.set({ snowFlowQueue: state }, () => {
        chrome.runtime.sendMessage({ action: 'PAUSE_QUEUE' });
      });
    } else if (state.status === 'paused') {
      state.status = 'running';
      chrome.storage.local.set({ snowFlowQueue: state }, () => {
        chrome.runtime.sendMessage({ action: 'RESUME_QUEUE' });
      });
    }
  });
});

// Action: Clear Queue
clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('snowFlowQueue', () => {
    promptsInput.value = '';
    chrome.runtime.sendMessage({ action: 'STOP_QUEUE' });
    updateUI(null);
  });
});

// Listen for storage changes to sync popup layout
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.snowFlowQueue) {
    updateUI(changes.snowFlowQueue.newValue);
  }
});

// Helper to render preview dynamically
function renderPreview(rawText: string) {
  const lines = rawText.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) {
    queueList.innerHTML = '<div class="empty-list-msg">No prompts loaded. Paste some above and click Start.</div>';
    progressBar.style.width = '0%';
    progressStats.textContent = '0 / 0 completed';
    return;
  }
  
  let listHTML = '';
  lines.forEach((line, idx) => {
    const match = line.match(/^(\d{4})_(.*)$/);
    let timestamp = String(idx * 2).padStart(4, '0');
    let text = line;
    if (match) {
      timestamp = match[1];
      text = match[2];
    }
    listHTML += `
      <div class="queue-item">
        <span class="item-time">${timestamp}</span>
        <span class="item-text" title="${text}">${text}</span>
        <span class="item-status status-pending">pending</span>
      </div>
    `;
  });
  queueList.innerHTML = listHTML;
  progressBar.style.width = '0%';
  progressStats.textContent = `0 / ${lines.length} completed`;
}

// Action: Listen to real-time input to render live queue previews
promptsInput.addEventListener('input', () => {
  chrome.storage.local.get('snowFlowQueue', (res) => {
    const state = res.snowFlowQueue as QueueState | undefined;
    if (!state || state.status === 'idle') {
      renderPreview(promptsInput.value);
    }
  });
});

// Initial Load
chrome.storage.local.get('snowFlowQueue', (res) => {
  const state = res.snowFlowQueue || null;
  updateUI(state);
  // If idle, render whatever is in the textarea as a preview
  if (!state || state.status === 'idle') {
    renderPreview(promptsInput.value);
  }
});
