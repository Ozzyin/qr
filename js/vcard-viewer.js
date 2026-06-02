// Apstore vCard Public Viewer and Exporter Engine

document.addEventListener('DOMContentLoaded', () => {
  // Initialize DB and pull Card ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const cardId = urlParams.get('id');

  if (!cardId) {
    renderError("No Card Specified", "Please scan a valid Apstore QR code or request the correct public sharing link.");
    return;
  }

  // Load card details from simulated DB
  const card = DB.getCardById(cardId);
  if (!card) {
    renderError("Digital Profile Not Found", "The profile link you followed might have been paused, deleted, or is temporarily unavailable.");
    return;
  }

  // Record a scan event for analytics
  DB.recordScan(cardId, 'QR Scan');

  // Load and render user portfolio
  renderProfile(card);
});

// Render dynamic profiles
function renderProfile(card) {
  const container = document.getElementById('vcard-main');
  
  // Set window title
  document.title = `${card.firstName} ${card.lastName} | Apstore Profile`;

  // 1. Render User Info & Bio
  document.getElementById('profile-fullname').textContent = `${card.firstName} ${card.lastName}`;
  document.getElementById('profile-jobtitle').textContent = card.jobTitle || 'Executive Profile';
  
  const companyEl = document.getElementById('profile-company');
  if (card.company) {
    companyEl.textContent = card.company;
    companyEl.style.display = 'inline-block';
  } else {
    companyEl.style.display = 'none';
  }

  const bioEl = document.getElementById('profile-bio');
  const bioContainer = document.getElementById('profile-bio-container');
  if (card.description) {
    bioEl.textContent = card.description;
    bioContainer.style.display = 'block';
  } else {
    bioContainer.style.display = 'none';
  }

  // 2. Render Avatar Picture
  const avatarWrapper = document.getElementById('profile-avatar-container');
  if (card.avatar) {
    avatarWrapper.innerHTML = `<img src="${card.avatar}" alt="${card.firstName}" class="avatar-image">`;
  } else {
    // Fallback to stylized initials
    const initials = ((card.firstName?.[0] || '') + (card.lastName?.[0] || '')).toUpperCase() || 'AS';
    avatarWrapper.innerHTML = `<div class="avatar-placeholder" id="avatar-initials">${initials}</div>`;
  }

  // 3. Setup Quick Action Contact buttons
  setupContactButtons(card);

  // 4. Setup Office Address block
  const addressContainer = document.getElementById('address-container');
  const addressBtn = document.getElementById('btn-address');
  const addressText = document.getElementById('profile-address');
  
  if (card.address) {
    addressText.textContent = card.address;
    addressBtn.href = `https://maps.google.com/?q=${encodeURIComponent(card.address)}`;
    addressContainer.style.display = 'block';
  } else {
    addressContainer.style.display = 'none';
  }

  // 5. Append Social Media Links list
  renderSocialLinks(card.socials);

  // 6. Apply Dynamic Custom Themes & CSS properties
  applyTheme(card);

  // 7. Check if Owner is Premium (to hide branding)
  const owner = DB.getUserById(card.userId);
  const banner = document.getElementById('branding-banner');
  if (owner && owner.subscription !== 'free') {
    if (banner) banner.style.display = 'none';
  }

  // 8. Bind VCF Export download actions
  const saveBtn = document.getElementById('btn-save-vcf');
  saveBtn.addEventListener('click', () => {
    exportVCF(card);
  });
}

// Map quick action grids
function setupContactButtons(card) {
  const callBtn = document.getElementById('btn-call');
  const workBtn = document.getElementById('btn-work-phone');
  const emailBtn = document.getElementById('btn-email');
  const webBtn = document.getElementById('btn-website');

  let activeButtonsCount = 0;

  if (card.phone) {
    callBtn.href = `tel:${card.phone}`;
    callBtn.style.display = 'flex';
    activeButtonsCount++;
  } else {
    callBtn.style.display = 'none';
  }

  if (card.workPhone) {
    workBtn.href = `tel:${card.workPhone}`;
    workBtn.style.display = 'flex';
    activeButtonsCount++;
  } else {
    workBtn.style.display = 'none';
  }

  if (card.email) {
    emailBtn.href = `mailto:${card.email}`;
    emailBtn.style.display = 'flex';
    activeButtonsCount++;
  } else {
    emailBtn.style.display = 'none';
  }

  if (card.website) {
    // Format link
    let webLink = card.website.trim();
    if (!/^https?:\/\//i.test(webLink)) {
      webLink = 'https://' + webLink;
    }
    webBtn.href = webLink;
    webBtn.style.display = 'flex';
    activeButtonsCount++;
  } else {
    webBtn.style.display = 'none';
  }

  // Re-adjust grid if items are empty
  const grid = document.getElementById('quick-actions-grid');
  if (activeButtonsCount === 0) {
    grid.parentElement.style.display = 'none';
  } else {
    grid.parentElement.style.display = 'flex';
    if (activeButtonsCount === 1) {
      grid.style.gridTemplateColumns = '1fr';
    } else {
      grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    }
  }
}

// Generate Social list cards
function renderSocialLinks(socials) {
  const list = document.getElementById('social-links-list');
  const container = document.getElementById('socials-container');
  list.innerHTML = '';
  
  if (!socials) {
    container.style.display = 'none';
    return;
  }

  const socialConfigs = [
    { key: 'linkedin', label: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', prefix: 'https://' },
    { key: 'github', label: 'GitHub Profile', icon: 'fa-brands fa-github', prefix: 'https://' },
    { key: 'twitter', label: 'Twitter / X', icon: 'fa-brands fa-x-twitter', prefix: 'https://' },
    { key: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram', prefix: 'https://' },
    { key: 'youtube', label: 'YouTube Channel', icon: 'fa-brands fa-youtube', prefix: 'https://' },
    { key: 'whatsapp', label: 'WhatsApp Chat', icon: 'fa-brands fa-whatsapp', prefix: 'https://wa.me/' },
    { key: 'facebook', label: 'Facebook', icon: 'fa-brands fa-facebook-f', prefix: 'https://' },
    { key: 'tiktok', label: 'TikTok', icon: 'fa-brands fa-tiktok', prefix: 'https://' },
    { key: 'discord', label: 'Discord', icon: 'fa-brands fa-discord', prefix: 'https://' }
  ];

  let hasLinks = false;

  socialConfigs.forEach(conf => {
    let handle = socials[conf.key];
    if (handle && handle.trim() !== '') {
      hasLinks = true;
      handle = handle.trim();
      let url = handle;
      
      // Ensure prefix
      if (!/^https?:\/\//i.test(url)) {
        // Strip out leading slashes
        if (url.startsWith('/')) url = url.slice(1);
        url = conf.prefix + url;
      }

      // Display handle text
      let displayText = handle.replace(/^(https?:\/\/)?(www\.)?/i, '');
      if (displayText.length > 25) {
        displayText = displayText.substring(0, 22) + '...';
      }

      const item = document.createElement('a');
      item.href = url;
      item.target = '_blank';
      item.className = `social-item ${conf.key}`;
      item.innerHTML = `
        <div class="social-icon-wrapper">
          <i class="${conf.icon}"></i>
        </div>
        <div class="social-info">
          <span class="social-name">${conf.label}</span>
          <p class="social-handle">${displayText}</p>
        </div>
        <i class="fa-solid fa-arrow-up-right-from-square arrow"></i>
      `;
      list.appendChild(item);
    }
  });

  if (!hasLinks) {
    container.style.display = 'none';
  } else {
    container.style.display = 'flex';
  }
}

// Apply visual customizer themes
function applyTheme(card) {
  const container = document.getElementById('vcard-main');
  const theme = card.theme || {};

  // Reset button shape classes
  container.classList.remove('btn-square', 'btn-rounded', 'btn-pill');
  const btnStyle = theme.buttonStyle || 'pill';
  container.classList.add(`btn-${btnStyle}`);

  // Reset Light/Dark visual classes
  container.classList.remove('theme-dark', 'theme-light');
  const themeMode = theme.themeMode || 'dark';
  container.classList.add(`theme-${themeMode}`);

  // Reset preset classes and apply current preset
  container.classList.remove('tpl-glass-sunset', 'tpl-neo-glow', 'tpl-executive', 'tpl-emerald-eco', 'tpl-minimalist');
  const preset = theme.preset || 'custom';
  if (preset !== 'custom') {
    container.classList.add(`tpl-${preset}`);
  }

  // Set colors as CSS inline overrides
  if (theme.bgColor) {
    document.documentElement.style.setProperty('--accent-primary', theme.bgColor);
    const orb1 = document.getElementById('theme-orb-1');
    if (orb1) orb1.style.background = theme.bgColor;
  }
  if (theme.primaryColor) {
    document.documentElement.style.setProperty('--accent-secondary', theme.primaryColor);
    const orb2 = document.getElementById('theme-orb-2');
    if (orb2) orb2.style.background = theme.primaryColor;
  }

  // Adjust text coloring based on gradients inside elements if light mode
  if (themeMode === 'light') {
    document.body.style.backgroundColor = '#f1f5f9';
  } else {
    document.body.style.backgroundColor = '#05070f';
  }
}

// Native contact saving .vcf compiler
function exportVCF(card) {
  // Format VCF data block
  const firstName = card.firstName || '';
  const lastName = card.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const company = card.company || '';
  const jobTitle = card.jobTitle || '';
  const phone = card.phone || '';
  const workPhone = card.workPhone || '';
  const email = card.email || '';
  const website = card.website || '';
  const address = card.address || '';
  const bio = card.description || '';

  // Social handles as notes
  let socialNotes = '';
  if (card.socials) {
    Object.keys(card.socials).forEach(k => {
      if (card.socials[k]) {
        socialNotes += ` ${k.toUpperCase()}: ${card.socials[k]};`;
      }
    });
  }

  // Clean strings for safe vcard compilation
  const sanitize = (str) => str.replace(/[\n\r]/g, ' ').replace(/[,;:]/g, '\\$&');

  let vcfLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${sanitize(lastName)};${sanitize(firstName)};;;`,
    `FN:${sanitize(fullName)}`,
    `ORG:${sanitize(company)}`,
    `TITLE:${sanitize(jobTitle)}`,
    `TEL;TYPE=CELL,VOICE:${phone}`,
    `TEL;TYPE=WORK,VOICE:${workPhone}`,
    `EMAIL;TYPE=PREF,INTERNET:${email}`,
    `URL:${website}`,
    `ADR;TYPE=WORK:;;${sanitize(address)};;;;`,
    `NOTE:${sanitize(bio)}`
  ];

  if (socialNotes) {
    vcfLines.push(`X-SOCIALPROFILE;TYPE=custom:${sanitize(socialNotes)}`);
  }

  // Add profile picture Base64 if available to sync image straight to telephone directory
  if (card.avatar) {
    // Strip Base64 header e.g. "data:image/png;base64,"
    const imgData = card.avatar.split(',')[1];
    const imgType = card.avatar.match(/data:image\/([a-zA-Z]*);/)?.[1]?.toUpperCase() || 'JPEG';
    if (imgData) {
      vcfLines.push(`PHOTO;TYPE=${imgType};ENCODING=b:${imgData}`);
    }
  }

  vcfLines.push('END:VCARD');
  const vcfString = vcfLines.join('\r\n');

  // Trigger blob download
  try {
    const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Set file name
    const fileName = `${firstName.toLowerCase() || 'contact'}_vcard.vcf`;
    
    // Download link routing
    if (navigator.msSaveBlob) { // IE10+
      navigator.msSaveBlob(blob, fileName);
    } else {
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Display springy success toast
    showToast("Contact Added Successfully!");
  } catch (error) {
    console.error("VCF download failed:", error);
    showToast("Download failed. Please try again.", "danger");
  }
}

// Show portfolio notification toasts
function showToast(msg, type = "success") {
  const toast = document.getElementById('vcard-toast');
  toast.textContent = msg;
  
  if (type === "danger") {
    toast.style.background = "var(--color-danger)";
  } else {
    toast.style.background = "var(--color-success)";
  }
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Custom Full-Screen Fallback Error displays
function renderError(heading, message) {
  const container = document.getElementById('vcard-main');
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 80vh; gap: 20px; padding: 24px;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: var(--color-danger);">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h1 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${heading}</h1>
      <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6;">${message}</p>
      <a href="index.html" class="btn btn-primary" style="margin-top: 10px; width: 100%;">
        Return to Apstore
      </a>
    </div>
  `;
}
