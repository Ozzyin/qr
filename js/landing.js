// Apstore Landing Page Interaction Controller

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State Checks
  syncHeaderAuthActions();

  // 2. Initialize Live Sandbox QR Generator
  initSandboxQR();

  // 3. Setup Billing Cycle Toggle
  initBillingCycle();

  // 4. Setup Authentication Modal Overlays
  initAuthModals();
});

// --- HEADER LOGIN SYNCS ---
function syncHeaderAuthActions() {
  const actionsContainer = document.getElementById('auth-header-actions');
  if (!actionsContainer) return;

  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    actionsContainer.innerHTML = `
      <a href="dashboard.html" class="btn btn-glass" style="padding: 8px 18px; font-size: 0.88rem;">
        Dashboard Panel <i class="fa-solid fa-gauge-high" style="margin-left: 4px;"></i>
      </a>
      <button class="btn btn-secondary" style="padding: 8px 18px; font-size: 0.88rem;" id="btn-header-signout">
        Log Out
      </button>
    `;
    
    document.getElementById('btn-header-signout')?.addEventListener('click', () => {
      Auth.signOut();
    });
  }
}

// --- INTERACTIVE HERO SANDBOX ENGINE ---
let sandboxQR = null;

function initSandboxQR() {
  const qrContainer = document.getElementById('sb-qr-code');
  if (!qrContainer) return;

  const nameInput = document.getElementById('sb-name');
  const titleInput = document.getElementById('sb-title');
  const companyInput = document.getElementById('sb-company');
  const colorPicker = document.getElementById('sb-color');
  const colorHexText = document.getElementById('sb-color-hex');

  const updateSandbox = () => {
    const name = nameInput.value.trim() || 'Your Name';
    const title = titleInput.value.trim() || 'Your Job Title';
    const company = companyInput.value.trim() || 'Your Company';
    const color = colorPicker.value || '#6366f1';

    // 1. Update visual preview mockup texts
    document.getElementById('sb-mobile-name').textContent = name;
    document.getElementById('sb-mobile-title').textContent = title;
    document.getElementById('sb-mobile-company').textContent = company;
    
    // Update initials placeholder
    const names = name.split(' ');
    const initials = ((names[0]?.[0] || '') + (names[1]?.[0] || '')).toUpperCase() || 'AS';
    const avatarEl = document.getElementById('sb-mobile-avatar');
    avatarEl.textContent = initials;
    avatarEl.style.background = `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`;

    // 2. Set Hex Text Label
    colorHexText.textContent = color.toUpperCase();

    // 3. Re-render styling colors on QR vectors instantly
    if (sandboxQR && typeof sandboxQR.update === 'function') {
      sandboxQR.update({
        dotsOptions: { color: color },
        cornersSquareOptions: { color: color }
      });
    }
  };

  // Safety check: CDN might be slow, blocked, or offline
  if (typeof QRCodeStyling === 'undefined') {
    console.warn("QRCodeStyling library not loaded yet or offline. QR preview is disabled.");
    qrContainer.innerHTML = `
      <div style="font-size: 0.65rem; color: var(--text-secondary); text-align: center; padding: 12px; border: 1px dashed var(--border-glass); border-radius: 8px; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-weight: 500;">
        QR Engine Offline
      </div>
    `;
  } else {
    // Initialize qrCode template from CDN
    sandboxQR = new QRCodeStyling({
      width: 98,
      height: 98,
      type: "canvas",
      data: "http://localhost:8000/view.html?id=crd_sample",
      dotsOptions: {
        color: "#6366f1",
        type: "rounded"
      },
      backgroundOptions: {
        color: "#ffffff"
      },
      cornersSquareOptions: {
        type: "extra-rounded",
        color: "#6366f1"
      },
      cornersDotOptions: {
        type: "dot",
        color: "#a855f7"
      }
    });

    // Append generated canvas
    sandboxQR.append(qrContainer);
  }

  // Add listeners
  nameInput.addEventListener('input', updateSandbox);
  titleInput.addEventListener('input', updateSandbox);
  companyInput.addEventListener('input', updateSandbox);
  colorPicker.addEventListener('input', updateSandbox);

  // Initial trigger to sync hex colors
  updateSandbox();
}

// --- BILLING TIMELINE TOGGLES ---
function initBillingCycle() {
  const toggleBtn = document.getElementById('btn-toggle-cycle');
  const container = toggleBtn?.parentElement;
  
  if (!toggleBtn) return;

  const monthlyLbl = document.getElementById('cycle-monthly');
  const yearlyLbl = document.getElementById('cycle-yearly');

  const proPrice = document.getElementById('price-pro');
  const entPrice = document.getElementById('price-enterprise');

  let isYearly = false;

  toggleBtn.addEventListener('click', () => {
    isYearly = !isYearly;

    if (isYearly) {
      container.classList.add('yearly-active');
      monthlyLbl.classList.remove('active');
      yearlyLbl.classList.add('active');
      
      // Animate price swaps with scale-up effects
      animatePrice(proPrice, 7);
      animatePrice(entPrice, 22);
    } else {
      container.classList.remove('yearly-active');
      monthlyLbl.classList.add('active');
      yearlyLbl.classList.remove('active');
      
      animatePrice(proPrice, 9);
      animatePrice(entPrice, 29);
    }
  });
}

function animatePrice(el, targetAmount) {
  el.style.transform = 'scale(0.8)';
  el.style.opacity = '0.5';
  
  setTimeout(() => {
    el.textContent = targetAmount;
    el.style.transform = 'scale(1)';
    el.style.opacity = '1';
  }, 200);
}

// --- AUTHENTICATION DIALOG PORTAL ---
function initAuthModals() {
  const modal = document.getElementById('auth-modal');
  const openLoginBtn = document.getElementById('btn-show-login');
  const openSignupBtn = document.getElementById('btn-show-signup');
  const closeModalBtn = document.getElementById('btn-close-modal');
  
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');

  const switchReg = document.getElementById('switch-to-register');
  const switchLogin = document.getElementById('switch-to-login');

  const selectPricingBtns = document.querySelectorAll('.btn-pricing-select');

  if (!modal) return;

  const showModal = (tab = 'login', chosenTier = 'free') => {
    modal.classList.add('active');
    
    // Set active subscription hidden tag
    document.getElementById('signup-subscription').value = chosenTier;

    if (tab === 'login') {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.add('active');
      signupForm.classList.remove('active');
    } else {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.add('active');
      loginForm.classList.remove('active');
    }
  };

  const hideModal = () => {
    modal.classList.remove('active');
  };

  // Nav actions listeners
  openLoginBtn?.addEventListener('click', () => showModal('login'));
  openSignupBtn?.addEventListener('click', () => showModal('signup'));
  closeModalBtn?.addEventListener('click', hideModal);

  // Tab selections
  loginTab.addEventListener('click', () => showModal('login'));
  signupTab.addEventListener('click', () => showModal('signup'));

  // Switch links
  switchReg.addEventListener('click', () => showModal('signup'));
  switchLogin.addEventListener('click', () => showModal('login'));

  // Close modal when clicking dark overlay backdrops
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  // Pricing cards selections
  selectPricingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tier = btn.getAttribute('data-tier');
      
      if (Auth.isLoggedIn()) {
        if (tier === 'free') {
          showNotification("You are already registered! Visit Billing in your dashboard to modify plans.", "warning");
        } else {
          // If logged in, redirect directly to dashboard billing tab!
          window.location.href = `dashboard.html?tab=billing&tier=${tier}`;
        }
      } else {
        // Unlogged: take them to register directly with pre-selected premium status!
        showModal('signup', tier);
      }
    });
  });

  // Handle URL auth routing parameter checks (e.g. ?auth=login)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth') === 'login') {
    showModal('login');
  }

  // --- FORM SUBMISSIONS ---
  
  // LOGIN FORM
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;

    const result = Auth.signIn(email, pass);
    if (result.success) {
      showNotification(`Welcome back, ${result.user.name}! Access granted.`, "success");
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      showNotification(result.message, "danger");
    }
  });

  // SIGNUP FORM
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-password').value;
    const tier = document.getElementById('signup-subscription').value || 'free';

    const result = Auth.signUp(name, email, pass, tier);
    if (result.success) {
      showNotification(`Account registered! Logging in...`, "success");
      
      setTimeout(() => {
        // If they chose a premium plan, forward directly to payment portal, else to standard overview
        if (tier !== 'free') {
          window.location.href = `dashboard.html?tab=billing&tier=${tier}`;
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 1000);
    } else {
      showNotification(result.message, "danger");
    }
  });
}

// --- SYSTEM TOAST NOTIFICATIONS BIN ---
function showNotification(message, type = "success") {
  const container = document.getElementById('toast-bin');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === "warning") icon = '<i class="fa-solid fa-circle-exclamation"></i>';
  if (type === "danger") icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);
  
  // Animate slide in
  setTimeout(() => toast.classList.add('show'), 50);

  // Animate delete
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
