// Apstore User Workspace Dashboard Controller

const vcardLogoBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NzYgNTEyIiBmaWxsPSIjNjM2NmYxIj48cGF0aCBkPSJNOTYgMEM0MyAwIDAgNDMgMCA5NlY0MTZjMCA1MyA0MyA5NiA5NiA5Nkg0ODBjNTMgMCA5Ni00MyA5Ni05NlY5NmMwLTUzLTQzLTk2LTk2LTk2SDk2ek0xMjggMTM2QTQwIDQwIDAgMSAxIDEyOCAyMTZhNDAgNDAgMCAxIDEgMC04MHpNMzUyIDE0NEg0ODBjOC44IDAgMTYgNy4yIDE2IDE2cy03LjIgMTYtMTYgMTZIMzUyYy04LjggMC0xNi03LjItMTYtMTZzNy4yLTE2IDE2LTE2em0wIDY0SDQ4MGM4LjggMCAxNiA3LjIgMTYgMTZzLTcuMiAxNi0xNiAxNkgzNTJjLTguOCAwLTE2LTcuMi0xNi0xNnM3LjItMTYgMTYtMTZ6bS0yMjQgODBIMjI0YzM1LjMgMCA2NCAyOC43IDY0IDY0djMySDY0VjM1MmMwLTM1LjMgMjguNy02NCA2NC02NHptMjI0IDE2SDQ4MGM4LjggMCAxNiA3LjIgMTYgMTZzLTcuMiAxNi0xNiAxNkgzNTJjLTguOCAwLTE2LTcuMi0xNi0xNnM3LjItMTYgMTYtMTZ6Ii8+PC9zdmc+";

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard route and synchronize session
  const currentUser = Auth.getCurrentUser();
  if (!currentUser) return; // guardRoute handles redirects

  // 2. Backfill avatarMin silently (90x90px Grayscale) for any existing cards missing it
  const cards = DB.getCardsByUserId(currentUser.id);
  cards.forEach(card => {
    if (card.avatar && !card.avatarMin) {
      DB.compressImage(card.avatar, 90, 90, 0.25, true, (minAvatar) => {
        card.avatarMin = minAvatar;
        DB.updateCard(currentUser.id, card.id, card);
      });
    }
  });

  // 3. Initialize application frameworks
  initDashboardUI(currentUser);
  initBuilderEngine(currentUser);
  initCardsStorage(currentUser);
  initAnalyticsEngine(currentUser);
  initBillingAndCheckout(currentUser);
  initSettings(currentUser);

  // 4. Process URL routing checks
  handleUrlRouting();
});

// --- DASHBOARD UI COORDINATION ---
function initDashboardUI(user) {
  // Display Username and tier badges
  document.getElementById('user-display-name').textContent = user.name;
  document.getElementById('welcome-user-name').textContent = user.name.split(' ')[0];
  
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const avatarBadge = document.getElementById('user-avatar-badge');
  avatarBadge.textContent = initials;

  // Set date in header
  const dateEl = document.getElementById('header-date');
  if (dateEl) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }

  updateGlobalSubscriptionBadges(user);

  // Sidebar Tab Swapping
  const menuBtns = document.querySelectorAll('.menu-item');
  const panels = document.querySelectorAll('.tab-panel');
  const breadcrumb = document.getElementById('lbl-breadcrumb');

  menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      
      // Update sidebar highlights
      menuBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update Active panels
      panels.forEach(p => p.classList.remove('active'));
      const activePanel = document.getElementById(`panel-${tab}`);
      activePanel.classList.add('active');

      // Update Breadcrumbs
      breadcrumb.textContent = btn.textContent.trim();

      // Hook: Refresh viewports when switching
      if (tab === 'overview') {
        renderOverviewDashboard(user);
      } else if (tab === 'cards') {
        renderCardsGrid(user);
      } else if (tab === 'analytics') {
        renderAnalyticsTimeline(user);
      } else if (tab === 'billing') {
        renderBillingOverview(user);
      }
    });
  });

  // Action links
  document.getElementById('btn-dashboard-signout')?.addEventListener('click', () => {
    Auth.signOut();
  });

  document.getElementById('btn-table-create-new')?.addEventListener('click', () => {
    routeToTab('builder');
  });

  document.getElementById('btn-cards-panel-create')?.addEventListener('click', () => {
    routeToTab('builder');
  });

  // Load initial view
  renderOverviewDashboard(user);
}

// Route programmatically
function routeToTab(tabName) {
  const btn = document.querySelector(`.menu-item[data-tab="${tabName}"]`);
  btn?.click();
}

function updateGlobalSubscriptionBadges(user) {
  const badges = [
    document.getElementById('user-tier-badge'),
    document.getElementById('stat-subscription-type'),
    document.getElementById('bill-active-badge')
  ];

  const tier = user.subscription.toUpperCase();
  const badgeClass = `badge-${user.subscription}`;

  badges.forEach(b => {
    if (!b) return;
    b.textContent = `${tier} Plan`;
    b.className = `badge ${badgeClass}`;
  });

  // Toggle quick upgrade button
  const quickUpgrade = document.getElementById('btn-quick-upgrade');
  if (quickUpgrade) {
    if (user.subscription !== 'free') {
      quickUpgrade.style.display = 'none';
    } else {
      quickUpgrade.style.display = 'inline-flex';
      quickUpgrade.addEventListener('click', (e) => {
        e.preventDefault();
        routeToTab('billing');
      });
    }
  }
}

// Render home metrics
function renderOverviewDashboard(user) {
  const cards = DB.getCardsByUserId(user.id);
  
  // Scans summary count
  const totalScans = cards.reduce((sum, c) => sum + (c.scansCount || 0), 0);
  document.getElementById('stat-total-scans').textContent = totalScans;
  document.getElementById('stat-active-cards').textContent = cards.length;

  // Render capacities based on plan limits
  let capacity = '2';
  if (user.subscription === 'pro') capacity = '10';
  if (user.subscription === 'enterprise') capacity = 'Unlimited';
  document.getElementById('stat-card-quota').textContent = `Capacity: ${cards.length} / ${capacity} used`;

  const dynamicCount = cards.filter(c => c.type === 'dynamic').length;
  document.getElementById('stat-dynamic-qrs').textContent = dynamicCount;

  // Billing status info text
  const billingInfo = document.getElementById('stat-billing-info');
  if (user.subscription === 'free') {
    billingInfo.textContent = 'Upgrade to unlock dynamic controls';
  } else {
    billingInfo.textContent = `Active ${user.billingCycle || 'monthly'} premium subscription`;
  }

  // Render Recent Cards table body
  const tableBody = document.getElementById('overview-table-body');
  tableBody.innerHTML = '';

  if (cards.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 1.5rem; margin-bottom: 8px;"><i class="fa-solid fa-folder-open"></i></div>
          No digital cards created yet. Click "Create vCard" above to start building!
        </td>
      </tr>
    `;
    return;
  }

  // Sort descending by date
  const sortedCards = [...cards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  sortedCards.forEach(c => {
    const row = document.createElement('tr');
    
    // Status visual
    const statusText = c.status === 'active' ? 'Active' : 'Paused';
    const statusClass = c.status === 'active' ? 'active' : 'paused';

    const formattedDate = new Date(c.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    row.innerHTML = `
      <td style="font-weight: 600; color: var(--text-primary);">${c.title}</td>
      <td>${c.firstName} ${c.lastName}</td>
      <td><span class="badge ${c.type === 'dynamic' ? 'badge-pro' : 'badge-free'}">${c.type}</span></td>
      <td><i class="fa-solid fa-chart-simple" style="margin-right: 6px; font-size: 0.8rem; color: var(--accent-primary);"></i>${c.scansCount || 0}</td>
      <td><span class="status-pill ${statusClass}">${statusText}</span></td>
      <td>${formattedDate}</td>
      <td>
        <div class="row-actions-group">
          <button class="btn btn-secondary btn-sm btn-action-edit" data-id="${c.id}"><i class="fa-solid fa-pencil"></i></button>
          <a href="view.html?id=${c.id}&d=${DB.encodeCardForUrl(c)}" target="_blank" class="btn btn-glass btn-sm"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        </div>
      </td>
    `;
    
    tableBody.appendChild(row);
  });

  // Bind edit action inside table
  tableBody.querySelectorAll('.btn-action-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.getAttribute('data-id');
      editCardProfile(user.id, cardId);
    });
  });
}

// --- PANEL 2: INTERACTIVE BUILDER ENGINE ---
let livePreviewQR = null;

function initBuilderEngine(user) {
  // Accordion Expand Actions
  const accordions = document.querySelectorAll('.form-accordion-step');
  accordions.forEach(acc => {
    const header = acc.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = acc.classList.contains('active');
      
      // Close all
      accordions.forEach(a => a.classList.remove('active'));
      
      if (!isActive) {
        acc.classList.add('active');
      }
    });
  });

  // Initialize QR preview canvas inside builder
  const canvasContainer = document.getElementById('live-qr-canvas');
  if (canvasContainer) {
    if (typeof QRCodeStyling === 'undefined') {
      console.warn("QRCodeStyling library not loaded. QR preview is disabled.");
      canvasContainer.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px; border: 1px dashed var(--border-glass); border-radius: 12px; height: 100%; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-weight: 500;">
          QR Engine Offline
        </div>
      `;
    } else {
      const dirPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      livePreviewQR = new QRCodeStyling({
        width: 160,
        height: 160,
        type: "canvas",
        data: window.location.protocol + '//' + window.location.host + dirPath + "view.html?id=placeholder",
        dotsOptions: { color: "#6366f1", type: "rounded" },
        backgroundOptions: { color: "#ffffff" },
        cornersSquareOptions: { type: "rounded", color: "#6366f1" }
      });
      livePreviewQR.append(canvasContainer);
    }
  }

  // Builder Tabs preview toggler
  const prevTabs = document.querySelectorAll('.preview-tab');
  const viewports = document.querySelectorAll('.preview-viewport');

  prevTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const prevType = tab.getAttribute('data-prev');
      
      prevTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      viewports.forEach(v => v.classList.remove('active'));
      document.getElementById(`viewport-${prevType}`).classList.add('active');
    });
  });

  // Upload Profile Avatar file reader sync
  const avatarInput = document.getElementById('vc-avatar');
  const uploadBtn = document.getElementById('btn-avatar-upload');
  const fileLbl = document.getElementById('lbl-file-name');
  const avatarBase64 = document.getElementById('card-avatar-base64');

  uploadBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileLbl.textContent = file.name;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        
        // 1. Compress main profile picture (180x180px for desktop cache)
        DB.compressImage(base64String, 180, 180, 0.75, false, (mainAvatar) => {
          avatarBase64.value = mainAvatar;
          
          // Update live phone preview mockup
          const liveAvatar = document.getElementById('live-avatar-box');
          liveAvatar.innerHTML = `<img src="${mainAvatar}" alt="avatar" class="live-avatar-image">`;
          
          // 2. Compress highly lightweight thumbnail (90x90px Grayscale for mobile QR URL sync)
          DB.compressImage(mainAvatar, 90, 90, 0.25, true, (minAvatar) => {
            document.getElementById('card-avatar-min-base64').value = minAvatar;
            showDashboardToast("Avatar photo optimized and synchronized successfully.");
          });
        });
      };
      reader.readAsDataURL(file);
    }
  });

  // Color picker HEX label syncs
  const bindColorHexLabel = (pickerId, labelId) => {
    const picker = document.getElementById(pickerId);
    const label = document.getElementById(labelId);
    picker.addEventListener('input', () => {
      label.textContent = picker.value.toUpperCase();
      updateLivePhoneMockupAndQR();
    });
  };

  bindColorHexLabel('vc-theme-bg', 'lbl-theme-bg-hex');
  bindColorHexLabel('vc-theme-primary', 'lbl-theme-primary-hex');
  bindColorHexLabel('vc-qr-dots', 'lbl-qr-dots-hex');
  bindColorHexLabel('vc-qr-corners', 'lbl-qr-corners-hex');

  // Input elements change triggers
  const formInputs = [
    'vc-title', 'vc-type', 'vc-firstname', 'vc-lastname', 'vc-jobtitle', 
    'vc-company', 'vc-bio', 'vc-website', 'vc-phone', 'vc-workphone', 
    'vc-email', 'vc-address', 'vc-soc-linkedin', 'vc-soc-github', 
    'vc-soc-twitter', 'vc-soc-instagram', 'vc-soc-youtube', 'vc-soc-whatsapp',
    'vc-soc-facebook', 'vc-soc-tiktok', 'vc-soc-discord', 'vc-qr-dots-type', 
    'vc-qr-corners-type', 'vc-qr-logo', 'vc-template-preset'
  ];

  formInputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateLivePhoneMockupAndQR);
    document.getElementById(id)?.addEventListener('change', updateLivePhoneMockupAndQR);
  });

  // Buttons shapes & theme modes click handlers
  document.querySelectorAll('input[name="vc-shape"]').forEach(r => {
    r.addEventListener('change', updateLivePhoneMockupAndQR);
  });
  document.querySelectorAll('input[name="vc-theme-mode"]').forEach(r => {
    r.addEventListener('change', updateLivePhoneMockupAndQR);
  });

  // Handle preset templates selection
  const presetSelector = document.getElementById('vc-template-preset');
  const templatePresets = {
    'glass-sunset': { bg: '#ff7e5f', primary: '#feb47b', shape: 'pill', mode: 'light' },
    'neo-glow': { bg: '#0c0721', primary: '#ff007f', shape: 'rounded', mode: 'dark' },
    'executive': { bg: '#111111', primary: '#d4af37', shape: 'square', mode: 'dark' },
    'emerald-eco': { bg: '#0c3823', primary: '#198754', shape: 'pill', mode: 'dark' },
    'minimalist': { bg: '#ffffff', primary: '#0f172a', shape: 'rounded', mode: 'light' }
  };

  presetSelector?.addEventListener('change', () => {
    const val = presetSelector.value;
    if (val && templatePresets[val]) {
      const p = templatePresets[val];
      // Set color values
      document.getElementById('vc-theme-bg').value = p.bg;
      document.getElementById('lbl-theme-bg-hex').textContent = p.bg.toUpperCase();
      document.getElementById('vc-theme-primary').value = p.primary;
      document.getElementById('lbl-theme-primary-hex').textContent = p.primary.toUpperCase();
      
      // Select shape radio
      const shapeRadio = document.querySelector(`input[name="vc-shape"][value="${p.shape}"]`);
      if (shapeRadio) shapeRadio.checked = true;
      
      // Select mode radio
      const modeRadio = document.querySelector(`input[name="vc-theme-mode"][value="${p.mode}"]`);
      if (modeRadio) modeRadio.checked = true;
      
      updateLivePhoneMockupAndQR();
    }
  });

  // Form submission handler
  const builderForm = document.getElementById('form-vcard-builder');
  builderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const cardId = document.getElementById('edit-card-id').value;

    const payload = {
      title: document.getElementById('vc-title').value.trim(),
      type: document.getElementById('vc-type').value,
      firstName: document.getElementById('vc-firstname').value.trim(),
      lastName: document.getElementById('vc-lastname').value.trim(),
      jobTitle: document.getElementById('vc-jobtitle').value.trim(),
      company: document.getElementById('vc-company').value.trim(),
      description: document.getElementById('vc-bio').value.trim(),
      phone: document.getElementById('vc-phone').value.trim(),
      workPhone: document.getElementById('vc-workphone').value.trim(),
      email: document.getElementById('vc-email').value.trim(),
      website: document.getElementById('vc-website').value.trim(),
      address: document.getElementById('vc-address').value.trim(),
      avatar: avatarBase64.value,
      avatarMin: document.getElementById('card-avatar-min-base64').value || "",
      socials: {
        linkedin: document.getElementById('vc-soc-linkedin').value.trim(),
        github: document.getElementById('vc-soc-github').value.trim(),
        twitter: document.getElementById('vc-soc-twitter').value.trim(),
        instagram: document.getElementById('vc-soc-instagram').value.trim(),
        youtube: document.getElementById('vc-soc-youtube').value.trim(),
        whatsapp: document.getElementById('vc-soc-whatsapp').value.trim(),
        facebook: document.getElementById('vc-soc-facebook').value.trim(),
        tiktok: document.getElementById('vc-soc-tiktok').value.trim(),
        discord: document.getElementById('vc-soc-discord').value.trim()
      },
      theme: {
        bgColor: document.getElementById('vc-theme-bg').value,
        primaryColor: document.getElementById('vc-theme-primary').value,
        buttonStyle: document.querySelector('input[name="vc-shape"]:checked').value,
        themeMode: document.querySelector('input[name="vc-theme-mode"]:checked').value,
        preset: document.getElementById('vc-template-preset').value
      },
      qrStyle: {
        dotsColor: document.getElementById('vc-qr-dots').value,
        dotsType: document.getElementById('vc-qr-dots-type').value,
        cornersColor: document.getElementById('vc-qr-corners').value,
        cornersType: document.getElementById('vc-qr-corners-type').value,
        logoPreset: document.getElementById('vc-qr-logo').value
      }
    };

    let result;
    if (cardId) {
      // Editing
      result = DB.updateCard(user.id, cardId, payload);
    } else {
      // Creating
      result = DB.createCard(user.id, payload);
    }

    if (result.success) {
      showDashboardToast(cardId ? "vCard profile successfully updated!" : "Digital vCard QR successfully generated!");
      
      // Reset form and return to My Cards
      resetBuilderForm();
      
      setTimeout(() => {
        routeToTab('cards');
      }, 800);
    } else {
      showDashboardToast(result.message, "danger");
    }
  });

  document.getElementById('btn-builder-reset').addEventListener('click', resetBuilderForm);

  // Sync premium styles limitation check
  syncPremiumStylingLocks(user);
}

// Reset builderaccordion form
function resetBuilderForm() {
  const form = document.getElementById('form-vcard-builder');
  form.reset();
  
  // Title changes
  document.getElementById('builder-editor-title').textContent = "Create Premium QR vCard";
  document.getElementById('edit-card-id').value = "";
  document.getElementById('card-avatar-base64').value = "";
  document.getElementById('card-avatar-min-base64').value = "";
  document.getElementById('lbl-file-name').textContent = "No file selected";

  // Re-sync hex labels
  document.getElementById('lbl-theme-bg-hex').textContent = "#6366F1";
  document.getElementById('lbl-theme-primary-hex').textContent = "#A855F7";
  document.getElementById('lbl-qr-dots-hex').textContent = "#6366F1";
  document.getElementById('lbl-qr-corners-hex').textContent = "#A855F7";

  // Reset live avatar to standard initials
  document.getElementById('live-avatar-box').innerHTML = "AS";

  updateLivePhoneMockupAndQR();
}

// Sync restrictions depending on user tier subscription
function syncPremiumStylingLocks(user) {
  const typeSelector = document.getElementById('vc-type');
  const premiumTag = document.getElementById('builder-premium-tag');

  if (user.subscription === 'free') {
    premiumTag.style.display = 'none';
    
    // Warn or force static selection on free
    typeSelector.addEventListener('change', () => {
      if (typeSelector.value === 'dynamic') {
        showDashboardToast("Dynamic editing is a PRO premium feature. Auto-reverting.", "warning");
        typeSelector.value = 'static';
      }
    });
    
    // Lock custom colors features visually if desired (can warn on submit or let them preview but restrict saving)
  } else {
    premiumTag.style.display = 'inline-block';
  }
}

// Live customizer sandbox updater
function updateLivePhoneMockupAndQR() {
  const fn = document.getElementById('vc-firstname').value.trim() || 'First';
  const ln = document.getElementById('vc-lastname').value.trim() || 'Last';
  const job = document.getElementById('vc-jobtitle').value.trim() || 'Your Profession';
  const comp = document.getElementById('vc-company').value.trim() || 'Your Company';
  const bio = document.getElementById('vc-bio').value.trim() || 'Your biography statements will display inside this frosted-glass panel.';
  
  // Update texts
  document.getElementById('live-fullname').textContent = `${fn} ${ln}`;
  document.getElementById('live-jobtitle').textContent = job;
  document.getElementById('live-company').textContent = comp;
  document.getElementById('live-bio').textContent = bio;

  // Initials initials
  const avatarBox = document.getElementById('live-avatar-box');
  const avatarVal = document.getElementById('card-avatar-base64').value;
  if (!avatarVal) {
    const initials = ((fn[0] || '') + (ln[0] || '')).toUpperCase();
    avatarBox.textContent = initials || 'AS';
  }

  // Theme modifications
  const phoneContainer = document.getElementById('live-phone-card');
  const themeBg = document.getElementById('vc-theme-bg').value;
  const themePrimary = document.getElementById('vc-theme-primary').value;
  
  const shape = document.querySelector('input[name="vc-shape"]:checked').value;
  const mode = document.querySelector('input[name="vc-theme-mode"]:checked').value;
  const template = document.getElementById('vc-template-preset').value;

  // Apply button styling shape and template class
  phoneContainer.className = `mock-phone-vcard theme-${mode} btn-${shape} tpl-${template}`;

  // Apply custom CSS inline overrides
  phoneContainer.style.background = `linear-gradient(135deg, ${themeBg}50 0%, ${themePrimary}50 100%)`;
  
  // Set custom gradients on mockup avatar
  avatarBox.style.background = `linear-gradient(135deg, ${themeBg} 0%, ${themePrimary} 100%)`;

  // --- LIVE QR STYLING RENDERS ---
  if (!livePreviewQR) return;

  const qrColor = document.getElementById('vc-qr-dots').value;
  const qrCornersColor = document.getElementById('vc-qr-corners').value;
  
  const dotsType = document.getElementById('vc-qr-dots-type').value;
  const cornersType = document.getElementById('vc-qr-corners-type').value;
  const logoPreset = document.getElementById('vc-qr-logo').value;

  const qrUpdatePayload = {
    dotsOptions: {
      color: qrColor,
      type: dotsType
    },
    cornersSquareOptions: {
      color: qrCornersColor,
      type: cornersType === 'square' ? 'square' : (cornersType === 'rounded' ? 'extra-rounded' : 'square')
    },
    cornersDotOptions: {
      color: qrCornersColor,
      type: cornersType === 'dot' ? 'dot' : 'square'
    }
  };

  // Center logo inserts
  if (logoPreset === 'vcard') {
    // Elegant business card SVG presets or nice custom presets
    qrUpdatePayload.image = vcardLogoBase64;
    qrUpdatePayload.imageOptions = {
      hideBackgroundDots: true,
      imageSize: 0.35,
      margin: 4
    };
  } else if (logoPreset === 'avatar' && avatarVal) {
    qrUpdatePayload.image = avatarVal;
    qrUpdatePayload.imageOptions = {
      hideBackgroundDots: true,
      imageSize: 0.35,
      margin: 4
    };
  } else {
    qrUpdatePayload.image = "";
  }

  // Perform smooth redraw update
  livePreviewQR.update(qrUpdatePayload);
}

// Edit Mode builder preloader
function editCardProfile(userId, cardId) {
  const card = DB.getCardById(cardId);
  if (!card) return;

  // Move to Builder tab
  routeToTab('builder');

  // Prepopulate form fields
  document.getElementById('builder-editor-title').textContent = "Edit Digital vCard Profile";
  document.getElementById('edit-card-id').value = cardId;
  document.getElementById('card-avatar-base64').value = card.avatar || "";
  document.getElementById('card-avatar-min-base64').value = card.avatarMin || "";

  document.getElementById('vc-title').value = card.title;
  document.getElementById('vc-type').value = card.type;
  document.getElementById('vc-firstname').value = card.firstName;
  document.getElementById('vc-lastname').value = card.lastName;
  document.getElementById('vc-jobtitle').value = card.jobTitle;
  document.getElementById('vc-company').value = card.company;
  document.getElementById('vc-bio').value = card.description;
  
  document.getElementById('vc-website').value = card.website;
  document.getElementById('vc-phone').value = card.phone;
  document.getElementById('vc-workphone').value = card.workPhone;
  document.getElementById('vc-email').value = card.email;
  document.getElementById('vc-address').value = card.address;

  // Socials
  document.getElementById('vc-soc-linkedin').value = card.socials?.linkedin || "";
  document.getElementById('vc-soc-github').value = card.socials?.github || "";
  document.getElementById('vc-soc-twitter').value = card.socials?.twitter || "";
  document.getElementById('vc-soc-instagram').value = card.socials?.instagram || "";
  document.getElementById('vc-soc-youtube').value = card.socials?.youtube || "";
  document.getElementById('vc-soc-whatsapp').value = card.socials?.whatsapp || "";
  document.getElementById('vc-soc-facebook').value = card.socials?.facebook || "";
  document.getElementById('vc-soc-tiktok').value = card.socials?.tiktok || "";
  document.getElementById('vc-soc-discord').value = card.socials?.discord || "";

  // Themes Color pickers
  document.getElementById('vc-theme-bg').value = card.theme?.bgColor || "#6366f1";
  document.getElementById('lbl-theme-bg-hex').textContent = (card.theme?.bgColor || "#6366f1").toUpperCase();
  
  document.getElementById('vc-theme-primary').value = card.theme?.primaryColor || "#a855f7";
  document.getElementById('lbl-theme-primary-hex').textContent = (card.theme?.primaryColor || "#a855f7").toUpperCase();

  // Radio triggers shapes
  const shape = card.theme?.buttonStyle || "pill";
  document.querySelector(`input[name="vc-shape"][value="${shape}"]`).checked = true;

  // Theme Modes
  const mode = card.theme?.themeMode || "dark";
  document.querySelector(`input[name="vc-theme-mode"][value="${mode}"]`).checked = true;

  // Preset templates
  document.getElementById('vc-template-preset').value = card.theme?.preset || "custom";

  // QRs styles
  document.getElementById('vc-qr-dots').value = card.qrStyle?.dotsColor || "#6366f1";
  document.getElementById('lbl-qr-dots-hex').textContent = (card.qrStyle?.dotsColor || "#6366f1").toUpperCase();

  document.getElementById('vc-qr-corners').value = card.qrStyle?.cornersColor || "#a855f7";
  document.getElementById('lbl-qr-corners-hex').textContent = (card.qrStyle?.cornersColor || "#a855f7").toUpperCase();

  document.getElementById('vc-qr-dots-type').value = card.qrStyle?.dotsType || "rounded";
  document.getElementById('vc-qr-corners-type').value = card.qrStyle?.cornersType || "rounded";
  document.getElementById('vc-qr-logo').value = card.qrStyle?.logoPreset || "none";

  // Avatar photos label sync
  if (card.avatar) {
    document.getElementById('lbl-file-name').textContent = "Current Profile Avatar";
    document.getElementById('live-avatar-box').innerHTML = `<img src="${card.avatar}" alt="avatar" class="live-avatar-image">`;
  } else {
    document.getElementById('lbl-file-name').textContent = "No file selected";
    document.getElementById('live-avatar-box').innerHTML = ((card.firstName?.[0] || '') + (card.lastName?.[0] || '')).toUpperCase();
  }

  // Open first accordion section
  const accordions = document.querySelectorAll('.form-accordion-step');
  accordions.forEach(a => a.classList.remove('active'));
  accordions[0].classList.add('active');

  // Trigger preview update
  updateLivePhoneMockupAndQR();

  showDashboardToast(`Loaded Profile Editor: "${card.title}"`);
}

// --- PANEL 3: MY CARDS GRID STORAGE ---
function initCardsStorage(user) {
  const searchInput = document.getElementById('card-search-input');
  const typeFilter = document.getElementById('card-filter-type');

  const filterAndRender = () => {
    const query = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;
    renderCardsGrid(user, query, type);
  };

  searchInput?.addEventListener('input', filterAndRender);
  typeFilter?.addEventListener('change', filterAndRender);
}

function renderCardsGrid(user, searchQuery = "", typeFilter = "all") {
  const grid = document.getElementById('cards-grid-viewport');
  if (!grid) return;

  grid.innerHTML = '';
  
  let cards = DB.getCardsByUserId(user.id);

  // Search filter
  if (searchQuery) {
    cards = cards.filter(c => 
      c.title.toLowerCase().includes(searchQuery) ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery) ||
      c.company.toLowerCase().includes(searchQuery)
    );
  }

  // Type filter
  if (typeFilter !== 'all') {
    cards = cards.filter(c => c.type === typeFilter);
  }

  if (cards.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-viewport glass-card">
        <div class="empty-icon"><i class="fa-solid fa-address-book"></i></div>
        <h3>No digital cards match criteria</h3>
        <p>Try resetting filters or click below to build your next premium custom vCard.</p>
        <button class="btn btn-primary" id="btn-empty-card-new"><i class="fa-solid fa-plus"></i> Create vCard</button>
      </div>
    `;
    
    document.getElementById('btn-empty-card-new')?.addEventListener('click', () => {
      routeToTab('builder');
    });
    return;
  }

  cards.forEach(c => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-item-box glass-card';
    
    // Status visual
    const statusChecked = c.status === 'active' ? 'checked' : '';

    // Avatar preview
    let avatarEl = '';
    if (c.avatar) {
      avatarEl = `<img src="${c.avatar}" alt="${c.firstName}">`;
    } else {
      avatarEl = ((c.firstName?.[0] || '') + (c.lastName?.[0] || '')).toUpperCase();
    }

    cardEl.innerHTML = `
      <div class="card-item-header">
        <div>
          <h3>${c.title}</h3>
          <span class="badge ${c.type === 'dynamic' ? 'badge-pro' : 'badge-free'}" style="margin-top: 4px;">${c.type}</span>
        </div>
        <label class="status-switch">
          <input type="checkbox" ${statusChecked} class="toggle-card-status" data-id="${c.id}">
          <span class="status-slider"></span>
        </label>
      </div>

      <div class="card-item-body">
        <div class="card-avatar-mock">${avatarEl}</div>
        <div class="card-meta">
          <span class="meta-name">${c.firstName} ${c.lastName}</span>
          <span class="meta-stats"><i class="fa-solid fa-chart-simple" style="color: var(--accent-primary); margin-right: 4px;"></i>${c.scansCount || 0} scans</span>
        </div>
      </div>

      <div class="card-item-footer">
        <button class="btn btn-secondary btn-sm edit-card-btn" data-id="${c.id}">Edit</button>
        <button class="btn btn-glass btn-sm download-qr-btn" data-id="${c.id}">QR Code</button>
        
        <!-- Action actions dropdown wrapper -->
        <button class="btn btn-secondary btn-sm copy-link-btn" data-id="${c.id}" style="padding: 6px;"><i class="fa-solid fa-link"></i> Link</button>
      </div>

      <!-- Delete floating button -->
      <button class="btn btn-glass btn-sm delete-card-btn" data-id="${c.id}" style="position: absolute; top: 12px; right: 60px; padding: 4px 8px; font-size: 0.72rem; border-color: rgba(239, 68, 68, 0.15); color: #f87171;">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    grid.appendChild(cardEl);
  });

  // Bind Actions listeners
  grid.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.getAttribute('data-id');
      editCardProfile(user.id, cardId);
    });
  });

  // Toggle status
  grid.querySelectorAll('.toggle-card-status').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const cardId = toggle.getAttribute('data-id');
      const status = e.target.checked ? 'active' : 'paused';
      DB.updateCardStatus(user.id, cardId, status);
      showDashboardToast(`vCard sharing is now ${status.toUpperCase()}!`);
    });
  });

  // Delete profile
  grid.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.getAttribute('data-id');
      const card = DB.getCardById(cardId);
      
      if (confirm(`Are you sure you want to delete "${card.title}"? All scan tracking data will be lost.`)) {
        DB.deleteCard(user.id, cardId);
        showDashboardToast("vCard profile successfully deleted.", "danger");
        renderCardsGrid(user);
        renderOverviewDashboard(user);
      }
    });
  });

  // Copy Sharing link
  grid.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.getAttribute('data-id');
      const card = DB.getCardById(cardId);
      const encodedPayload = DB.encodeCardForUrl(card);
      const dirPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      const shareUrl = window.location.protocol + '//' + window.location.host + dirPath + `view.html?id=${cardId}&d=${encodedPayload}`;
      
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          showDashboardToast("Public profile link copied to clipboard!");
        })
        .catch(err => {
          console.error("Clipboard copy failed:", err);
          showDashboardToast("Could not copy link automatically.", "warning");
        });
    });
  });

  // Hook QR download popup modal dialog
  grid.querySelectorAll('.download-qr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.getAttribute('data-id');
      openQRDownloadPopover(user.id, cardId);
    });
  });
}

// Open custom QR download modal
let popoverQR = null;
function openQRDownloadPopover(userId, cardId) {
  const card = DB.getCardById(cardId);
  if (!card) return;

  const overlay = document.getElementById('download-popover');
  const previewDiv = document.getElementById('popover-qr-display');
  
  if (!overlay) return;

  if (typeof QRCodeStyling === 'undefined') {
    showDashboardToast("QR Exporter Engine is offline. Cannot download graphics.", "danger");
    return;
  }

  overlay.classList.add('active');
  previewDiv.innerHTML = '';

  // Render canvas QR
  const encodedPayload = DB.encodeCardForUrl(card);
  const dirPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  
  // Resolve center image and options natively in constructor
  let qrImage = "";
  if (card.qrStyle?.logoPreset === 'vcard') {
    qrImage = vcardLogoBase64;
  } else if (card.qrStyle?.logoPreset === 'avatar' && card.avatar) {
    qrImage = card.avatar;
  }

  const qrOptions = {
    width: 350,
    height: 350,
    type: "canvas",
    data: window.location.protocol + '//' + window.location.host + dirPath + `view.html?id=${cardId}&d=${encodedPayload}`,
    dotsOptions: {
      color: card.qrStyle?.dotsColor || "#6366f1",
      type: card.qrStyle?.dotsType || "rounded"
    },
    backgroundOptions: {
      color: "#ffffff"
    },
    cornersSquareOptions: {
      color: card.qrStyle?.cornersColor || "#a855f7",
      type: card.qrStyle?.cornersType === 'square' ? 'square' : (card.qrStyle?.cornersType === 'rounded' ? 'extra-rounded' : 'square')
    },
    cornersDotOptions: {
      color: card.qrStyle?.cornersColor || "#a855f7",
      type: card.qrStyle?.cornersType === 'dot' ? 'dot' : 'square'
    }
  };

  if (qrImage) {
    qrOptions.image = qrImage;
    qrOptions.imageOptions = { hideBackgroundDots: true, imageSize: 0.35, margin: 4 };
  }

  popoverQR = new QRCodeStyling(qrOptions);

  // Draw
  popoverQR.append(previewDiv);

  // Close bindings
  const closeBtn = document.getElementById('btn-close-popover');
  const closePopover = () => overlay.classList.remove('active');
  
  closeBtn.addEventListener('click', closePopover);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePopover();
  });

  // Bind download actions click triggers
  const downloadBtns = overlay.querySelectorAll('.download-action-btn');
  downloadBtns.forEach(btn => {
    // Clone node to prevent multiple stacked click handlers on consecutive opens
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    const format = newBtn.getAttribute('data-format');
    newBtn.addEventListener('click', () => {
      popoverQR.download({
        name: `${card.title.toLowerCase().replace(/\s+/g, '_')}_qr`,
        extension: format
      });
      showDashboardToast(`QR Code successfully downloaded as ${format.toUpperCase()}!`);
      closePopover();
    });
  });
}

// --- PANEL 4: DEEP DIVE ANALYTICS ---
let chartsInstances = {};

function initAnalyticsEngine(user) {
  const cardSelector = document.getElementById('analytics-card-selector');
  if (!cardSelector) return;

  // Dynamic filling card options
  const syncSelectorOptions = () => {
    const cards = DB.getCardsByUserId(user.id);
    cardSelector.innerHTML = '<option value="all">Aggregate Data (All Cards)</option>';
    
    cards.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.title;
      cardSelector.appendChild(opt);
    });
  };

  syncSelectorOptions();

  // Listen to select updates
  cardSelector.addEventListener('change', () => {
    renderAnalyticsTimeline(user);
  });

  // Re-draw charts when dark/light mode is switched
  window.addEventListener('apstore-theme-change', () => {
    if (document.getElementById('analytics-card-selector')) {
      renderAnalyticsTimeline(user);
    }
  });
}

function renderAnalyticsTimeline(user) {
  const cardSelector = document.getElementById('analytics-card-selector');
  const selection = cardSelector ? cardSelector.value : 'all';
  
  const cards = DB.getCardsByUserId(user.id);
  
  if (cards.length === 0) {
    renderAnalyticsEmptyState();
    return;
  }

  // Fetch target scans history
  let scans = [];
  if (selection === 'all') {
    cards.forEach(c => {
      scans = [...scans, ...DB.getAnalyticsByCardId(c.id)];
    });
  } else {
    scans = DB.getAnalyticsByCardId(selection);
  }

  // Clear empty state blocks if exist and rebuild charts structure
  rebuildChartsContainerIfEmpty();

  // Group and sort data lists
  processAndRenderCharts(scans);
}

function renderAnalyticsEmptyState() {
  const row = document.querySelector('.analytics-charts-grid');
  row.innerHTML = `
    <div class="empty-state-viewport glass-card" style="grid-column: 1 / -1;">
      <div class="empty-icon"><i class="fa-solid fa-chart-line"></i></div>
      <h3>No tracking analytics available</h3>
      <p>Please build dynamic or static cards first, and let mobile visitors scan to populate metrics.</p>
      <button class="btn btn-primary" onclick="routeToTab('builder')"><i class="fa-solid fa-plus"></i> Create vCard</button>
    </div>
  `;
}

function rebuildChartsContainerIfEmpty() {
  const container = document.querySelector('.analytics-charts-grid');
  const isEmpty = container.querySelector('.empty-state-viewport');

  if (isEmpty) {
    container.innerHTML = `
      <div class="chart-container-widget glass-card timeline-card">
        <div class="widget-header">
          <h3>Total Scan Timelines</h3>
          <span class="badge badge-free">Last 30 Days</span>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="chart-timeline"></canvas>
        </div>
      </div>

      <div class="chart-container-widget glass-card">
        <div class="widget-header">
          <h3>Scanners Device Systems</h3>
          <span class="badge badge-free">Platform Breakdowns</span>
        </div>
        <div class="chart-canvas-wrapper small-chart">
          <canvas id="chart-devices"></canvas>
        </div>
      </div>

      <div class="chart-container-widget glass-card">
        <div class="widget-header">
          <h3>Geographic Scan Centers</h3>
          <span class="badge badge-free">Visitor Demographics</span>
        </div>
        <div class="chart-canvas-wrapper small-chart">
          <canvas id="chart-locations"></canvas>
        </div>
      </div>
    `;
  }
}

// Chart.js processing logic
function processAndRenderCharts(scans) {
  // 1. Group Timeline over last 30 Days
  const timelineData = getTimelineMetrics(scans);
  
  // 2. Group Device Metrics
  const deviceData = getCountMetrics(scans, 'device');

  // 3. Group Geo Location Metrics
  const geoData = getCountMetrics(scans, 'country');

  // Destroy previous instances to prevent canvas flickering overlapping
  if (chartsInstances.timeline) chartsInstances.timeline.destroy();
  if (chartsInstances.devices) chartsInstances.devices.destroy();
  if (chartsInstances.locations) chartsInstances.locations.destroy();

  // Dynamic colors matching active theme
  const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const gridColor = activeTheme === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';
  const textColor = activeTheme === 'light' ? '#475569' : '#94a3b8';

  // Draw timeline Line Chart
  const ctxTimeline = document.getElementById('chart-timeline').getContext('2d');
  chartsInstances.timeline = new Chart(ctxTimeline, {
    type: 'line',
    data: {
      labels: timelineData.labels,
      datasets: [{
        label: 'Scans Volume',
        data: timelineData.values,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.35,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#a855f7'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Inter', size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }
      }
    }
  });

  // Draw Devices Doughnut Chart
  const ctxDevices = document.getElementById('chart-devices').getContext('2d');
  chartsInstances.devices = new Chart(ctxDevices, {
    type: 'doughnut',
    data: {
      labels: deviceData.labels,
      datasets: [{
        data: deviceData.values,
        backgroundColor: ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter', size: 11 } } }
      }
    }
  });

  // Draw Geo Locations Bar Chart
  const ctxLocations = document.getElementById('chart-locations').getContext('2d');
  chartsInstances.locations = new Chart(ctxLocations, {
    type: 'bar',
    data: {
      labels: geoData.labels,
      datasets: [{
        data: geoData.values,
        backgroundColor: 'rgba(168, 85, 247, 0.65)',
        borderRadius: 5,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Inter', size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } }
      }
    }
  });
}

function getTimelineMetrics(scans) {
  const now = new Date();
  const days = [];
  const counts = [];
  
  // Format past 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push(dayLabel);
    
    // Count matches
    const dateStr = d.toISOString().split('T')[0];
    const matchesCount = scans.filter(s => s.timestamp.split('T')[0] === dateStr).length;
    counts.push(matchesCount);
  }

  return { labels: days, values: counts };
}

function getCountMetrics(scans, property) {
  const dictionary = {};
  
  scans.forEach(s => {
    const val = s[property] || 'Other';
    dictionary[val] = (dictionary[val] || 0) + 1;
  });

  // Extract keys and values sorted descending
  const sorted = Object.entries(dictionary).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  return {
    labels: sorted.map(x => x[0]),
    values: sorted.map(x => x[1])
  };
}

// --- PANEL 5: BILLING & PLANS ---
function initBillingAndCheckout(user) {
  const checkoutOverlay = document.getElementById('checkout-modal');
  const closeCheckoutBtn = document.getElementById('btn-close-checkout');

  // Plan triggers upgrading clicks
  const upgradeBtns = document.querySelectorAll('.btn-upgrade-trigger');
  upgradeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tier = btn.getAttribute('data-tier');
      openCheckoutGateway(tier);
    });
  });

  closeCheckoutBtn?.addEventListener('click', () => {
    checkoutOverlay.classList.remove('active');
  });

  // Visual Interactive flip card credit card handlers!
  const numInput = document.getElementById('pay-number');
  const holderInput = document.getElementById('pay-name');
  const expiryInput = document.getElementById('pay-expiry');
  const cvvInput = document.getElementById('pay-cvv');
  const cardMockup = document.getElementById('interactive-card');

  // Input mappingfront side
  holderInput.addEventListener('input', () => {
    document.getElementById('cc-holder-display').textContent = holderInput.value.toUpperCase() || 'CLIENT NAME';
  });

  numInput.addEventListener('input', (e) => {
    // Spacing credit card digits automatically (4-4-4-4 spacing)
    let val = numInput.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = val.match(/\d{4,16}/g);
    let match = matches && matches[0] || '';
    let parts = [];

    for (let i=0, len=match.length; i<len; i+=4) {
      parts.push(match.substring(i, i+4));
    }

    if (parts.length > 0) {
      numInput.value = parts.join(' ');
    } else {
      numInput.value = val;
    }

    // CC number visual text
    document.getElementById('cc-num-display').textContent = numInput.value || '•••• •••• •••• ••••';

    // Provider detect Visa vs Mastercard vs Amex
    const providerIcon = document.getElementById('cc-provider-icon');
    const ccLogoDisplay = document.getElementById('cc-logo-display');
    const startChar = val[0];

    if (startChar === '4') {
      providerIcon.innerHTML = '<i class="fa-brands fa-cc-visa" style="color: #60a5fa;"></i>';
      ccLogoDisplay.innerHTML = '<i class="fa-brands fa-cc-visa"></i>';
    } else if (startChar === '5') {
      providerIcon.innerHTML = '<i class="fa-brands fa-cc-mastercard" style="color: #fb923c;"></i>';
      ccLogoDisplay.innerHTML = '<i class="fa-brands fa-cc-mastercard"></i>';
    } else if (startChar === '3') {
      providerIcon.innerHTML = '<i class="fa-brands fa-cc-amex" style="color: #2dd4bf;"></i>';
      ccLogoDisplay.innerHTML = '<i class="fa-brands fa-cc-amex"></i>';
    } else {
      providerIcon.innerHTML = '<i class="fa-solid fa-credit-card"></i>';
      ccLogoDisplay.innerHTML = '<i class="fa-solid fa-qrcode chip-icon"></i>';
    }
  });

  // Expiry date spacing slash MM/YY
  expiryInput.addEventListener('input', () => {
    let val = expiryInput.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (val.length >= 2) {
      expiryInput.value = val.substring(0,2) + '/' + val.substring(2,4);
    } else {
      expiryInput.value = val;
    }
    document.getElementById('cc-expiry-display').textContent = expiryInput.value || 'MM/YY';
  });

  // Visual Flip CC mock to back side on CVV Focus!
  cvvInput.addEventListener('focus', () => {
    cardMockup.classList.add('flip');
  });

  cvvInput.addEventListener('blur', () => {
    cardMockup.classList.remove('flip');
  });

  cvvInput.addEventListener('input', () => {
    document.getElementById('cc-cvv-display').textContent = cvvInput.value || '•••';
  });

  // Authorize checkout Transaction submit
  const paymentForm = document.getElementById('form-stripe-payment');
  paymentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const payBtn = document.getElementById('btn-pay-submit');
    const targetTier = document.getElementById('checkout-tier-target').value;

    // Show loaders
    payBtn.disabled = true;
    payBtn.innerHTML = `Processing Transaction... <span class="payment-spin"></span>`;

    // Trigger mock latency spinners
    setTimeout(() => {
      const result = DB.updateUserSubscription(user.id, targetTier, 'monthly');
      
      if (result.success) {
        // Upgrade complete
        showDashboardToast(`Subscription successful! Upgraded to ${targetTier.toUpperCase()}.`, "success");
        
        // Hide overlay, reload stats & badges
        checkoutOverlay.classList.remove('active');
        paymentForm.reset();
        
        // Reset interactive visual CC values
        document.getElementById('cc-num-display').textContent = '•••• •••• •••• ••••';
        document.getElementById('cc-holder-display').textContent = 'CLIENT NAME';
        document.getElementById('cc-expiry-display').textContent = 'MM/YY';
        document.getElementById('cc-cvv-display').textContent = '•••';

        // Reload views
        const refreshedUser = Auth.getCurrentUser();
        updateGlobalSubscriptionBadges(refreshedUser);
        renderOverviewDashboard(refreshedUser);
        renderBillingOverview(refreshedUser);
        syncPremiumStylingLocks(refreshedUser);

        // Auto trigger additional bootstrap logs
        routeToTab('overview');
      } else {
        showDashboardToast("Billing processing failed. Please try again.", "danger");
      }

      // Re-enable
      payBtn.disabled = false;
      payBtn.innerHTML = `Authorize Transaction <i class="fa-solid fa-shield-halved" style="margin-left: 4px;"></i>`;
    }, 2200);

  });

  renderBillingOverview(user);
}

function renderBillingOverview(user) {
  const cards = DB.getCardsByUserId(user.id);
  
  // Set capacity text
  let limit = '2';
  if (user.subscription === 'pro') limit = '10';
  if (user.subscription === 'enterprise') limit = 'Unlimited';

  document.getElementById('bill-quota-numbers').textContent = `${cards.length} / ${limit} cards used`;
  
  // Progress percentages
  const pct = limit === 'Unlimited' ? 0 : Math.min(100, (cards.length / parseInt(limit)) * 100);
  document.getElementById('bill-quota-fill').style.width = `${pct}%`;

  // Custom terms descriptions
  const terms = document.getElementById('bill-cycle-terms');
  if (user.subscription === 'free') {
    terms.textContent = "Your account is on the Free Starter plan. Limitations apply. Upgrade below to unlock full dynamic tools.";
  } else {
    terms.textContent = `Your ${user.subscription.toUpperCase()} Plan is active. Renewal cycle: Monthly. Storage system sync: LocalStorage database registry.`;
  }

  // Dynamic visual grids actions button modifiers (Disable buttons if already at or above chosen tier!)
  const rowPro = document.getElementById('row-tier-pro');
  const rowEnt = document.getElementById('row-tier-enterprise');

  const btnPro = rowPro.querySelector('.btn-upgrade-trigger');
  const btnEnt = rowEnt.querySelector('.btn-upgrade-trigger');

  if (user.subscription === 'pro') {
    btnPro.disabled = true;
    btnPro.textContent = "Current Plan";
    btnPro.className = "btn btn-glass";
    
    btnEnt.disabled = false;
    btnEnt.textContent = "Upgrade Plan";
    btnEnt.className = "btn btn-primary btn-upgrade-trigger";
  } else if (user.subscription === 'enterprise') {
    btnPro.disabled = true;
    btnPro.textContent = "Locked";
    btnPro.className = "btn btn-secondary";
    
    btnEnt.disabled = true;
    btnEnt.textContent = "Current Plan";
    btnEnt.className = "btn btn-glass";
  } else {
    btnPro.disabled = false;
    btnPro.textContent = "Upgrade Now";
    btnPro.className = "btn btn-primary btn-upgrade-trigger";

    btnEnt.disabled = false;
    btnEnt.textContent = "Select Enterprise";
    btnEnt.className = "btn btn-secondary btn-upgrade-trigger";
  }
}

function openCheckoutGateway(tier) {
  const modal = document.getElementById('checkout-modal');
  if (!modal) return;

  const planName = document.getElementById('checkout-plan-name');
  const planAmount = document.getElementById('checkout-plan-amount');
  const targetInput = document.getElementById('checkout-tier-target');

  targetInput.value = tier;

  if (tier === 'pro') {
    planName.textContent = 'Pro Plan';
    planAmount.textContent = '$9';
  } else {
    planName.textContent = 'Enterprise Plan';
    planAmount.textContent = '$29';
  }

  modal.classList.add('active');
}

// --- PANEL 6: ACCOUNT SETTINGS ---
function initSettings(user) {
  // Pre-populate fields
  document.getElementById('set-fullname').value = user.name;
  document.getElementById('set-email').value = user.email;

  const setForm = document.getElementById('form-settings-profile');
  setForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('set-fullname').value.trim();
    const pass = document.getElementById('set-password').value;

    const result = DB.updateUserProfile(user.id, name, pass || null);
    if (result.success) {
      showDashboardToast("Profile successfully modified!");
      
      // Sync names values in sidebar
      document.getElementById('user-display-name').textContent = name;
      document.getElementById('welcome-user-name').textContent = name.split(' ')[0];
      
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      document.getElementById('user-avatar-badge').textContent = initials;
      
      // Update persistent session name cache
      Auth.createSession(result.user);
      
      document.getElementById('set-password').value = '';
    } else {
      showDashboardToast("Error updating settings profile.", "danger");
    }
  });

  // WIPE STORAGE BUTTON
  document.getElementById('btn-reset-db').addEventListener('click', () => {
    if (confirm("WARNING: This will wipe all created vCards, credentials, timeline analytics, and log you out. This action CANNOT be undone! Proceed?")) {
      localStorage.clear();
      showDashboardToast("Storage reset! Redirection in progress...", "danger");
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    }
  });

  // EXPORT JSON BUTTON
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const cards = DB.getCardsByUserId(user.id);
    const dataStr = JSON.stringify(cards, null, 2);
    
    try {
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `apstore_${user.name.toLowerCase().replace(/\s+/g, '_')}_cards.json`;
      link.click();
      
      showDashboardToast("Card configuration database exported!");
    } catch (e) {
      console.error(e);
      showDashboardToast("JSON export failed.", "danger");
    }
  });
}

// --- URL DECODERS & ROUTING ---
function handleUrlRouting() {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  const preSelectedTier = urlParams.get('tier');

  if (tab) {
    routeToTab(tab);
  }

  if (tab === 'billing' && preSelectedTier) {
    setTimeout(() => {
      openCheckoutGateway(preSelectedTier);
    }, 500);
  }
}

// --- DASHBOARD NOTIFICATION TOASTS ---
function showDashboardToast(msg, type = "success") {
  const container = document.getElementById('dashboard-toast-bin');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '<i class="fa-solid fa-circle-check"></i>';
  if (type === "warning") icon = '<i class="fa-solid fa-circle-exclamation"></i>';
  if (type === "danger") icon = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `
    ${icon}
    <span>${msg}</span>
  `;

  container.appendChild(toast);
  
  // slide
  setTimeout(() => toast.classList.add('show'), 50);

  // delete
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
