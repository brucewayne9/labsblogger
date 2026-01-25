/*
 * Desktop Theme Switcher
 * Allows users to switch between color palette presets
 */

const DESKTOPS = [
  { id: 'classic', name: 'Classic', description: 'Balanced mix of blues & oranges' },
  { id: 'ocean', name: 'Ocean', description: 'Cool blues & teals' },
  { id: 'sunset', name: 'Sunset', description: 'Warm oranges & browns' },
  { id: 'midnight', name: 'Midnight', description: 'Deep navy & dark blues' },
  { id: 'breeze', name: 'Breeze', description: 'Light & airy' },
  { id: 'ember', name: 'Ember', description: 'Bold & energetic' }
];

// Get current desktop from localStorage or default to 'classic'
function getCurrentDesktop() {
  return localStorage.getItem('selectedDesktop') || 'classic';
}

// Set desktop theme
function setDesktop(desktopId) {
  document.documentElement.setAttribute('data-desktop', desktopId);
  localStorage.setItem('selectedDesktop', desktopId);

  // Update active state in switcher UI
  document.querySelectorAll('.desktop-option').forEach(option => {
    option.classList.remove('active');
    if (option.dataset.desktop === desktopId) {
      option.classList.add('active');
    }
  });
}

// Apply desktop on page load
function applyDesktop() {
  const desktop = getCurrentDesktop();
  setDesktop(desktop);
}

// Create desktop switcher UI
function createDesktopSwitcher() {
  const currentDesktop = getCurrentDesktop();

  const switcherHTML = `
    <div class="desktop-switcher">
      <button class="desktop-toggle" aria-label="Change desktop theme">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M7 3C7 2.44772 7.44772 2 8 2H12C12.5523 2 13 2.44772 13 3V4H7V3Z" fill="currentColor" opacity="0.5"/>
          <rect x="2" y="4" width="16" height="12" rx="2" fill="currentColor"/>
          <rect x="3" y="5" width="14" height="9" rx="1" fill="currentColor" opacity="0.3"/>
          <circle cx="10" cy="17" r="1" fill="currentColor" opacity="0.5"/>
        </svg>
        <span class="desktop-toggle-text">Desktop</span>
      </button>

      <div class="desktop-menu">
        <div class="desktop-menu-header">
          <h3>Choose Desktop</h3>
          <p>Select your preferred color palette</p>
        </div>
        <div class="desktop-options">
          ${DESKTOPS.map(desktop => `
            <button
              class="desktop-option ${desktop.id === currentDesktop ? 'active' : ''}"
              data-desktop="${desktop.id}"
              title="${desktop.description}">
              <div class="desktop-preview" data-desktop="${desktop.id}">
                <div class="desktop-color desktop-color-1"></div>
                <div class="desktop-color desktop-color-2"></div>
                <div class="desktop-color desktop-color-3"></div>
              </div>
              <div class="desktop-info">
                <strong>${desktop.name}</strong>
                <span>${desktop.description}</span>
              </div>
              <svg class="desktop-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  return switcherHTML;
}

// Initialize desktop switcher
function initDesktopSwitcher() {
  // Apply saved desktop immediately
  applyDesktop();

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInsertSwitcher);
  } else {
    tryInsertSwitcher();
  }
}

// Try to insert switcher, retry if navbar not found yet
function tryInsertSwitcher() {
  const inserted = insertSwitcher();

  // If navbar not found, set up observer to watch for it
  if (!inserted) {
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector('.navbar')) {
        observer.disconnect();
        insertSwitcher();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also try again after a short delay
    setTimeout(() => {
      if (!document.querySelector('.desktop-switcher')) {
        insertSwitcher();
      }
    }, 500);
  }
}

function insertSwitcher() {
  // Check if already inserted
  if (document.querySelector('.desktop-switcher')) {
    return true;
  }

  // Find navbar or create container
  const navbar = document.querySelector('.navbar');

  if (!navbar) return false;

  // Insert switcher into navbar
  const navActions = navbar.querySelector('.nav-actions') ||
                     navbar.querySelector('.navbar-actions') ||
                     navbar.querySelector('.nav-buttons');

  if (navActions) {
    const switcherContainer = document.createElement('div');
    switcherContainer.innerHTML = createDesktopSwitcher();
    navActions.insertBefore(switcherContainer.firstElementChild, navActions.firstChild);

    // Attach event listeners
    attachSwitcherEvents();
    return true;
  }

  return false;
}

function attachSwitcherEvents() {
  const toggle = document.querySelector('.desktop-toggle');
  const menu = document.querySelector('.desktop-menu');
  const options = document.querySelectorAll('.desktop-option');

  if (!toggle || !menu) return;

  // Toggle menu
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.desktop-switcher')) {
      menu.classList.remove('show');
    }
  });

  // Handle desktop selection
  options.forEach(option => {
    option.addEventListener('click', () => {
      const desktopId = option.dataset.desktop;
      setDesktop(desktopId);
      menu.classList.remove('show');

      // Show confirmation toast
      showDesktopToast(desktopId);
    });
  });
}

function showDesktopToast(desktopId) {
  const desktop = DESKTOPS.find(d => d.id === desktopId);
  if (!desktop) return;

  // Remove existing toast
  const existingToast = document.querySelector('.desktop-toast');
  if (existingToast) existingToast.remove();

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'desktop-toast';
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
    </svg>
    <span>Switched to <strong>${desktop.name}</strong> desktop</span>
  `;
  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);

  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Initialize on script load
initDesktopSwitcher();
