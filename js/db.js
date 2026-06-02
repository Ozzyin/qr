// Apstore Simulated Database Engine

const DB = {
  // Storage keys
  KEYS: {
    USERS: 'apstore_users',
    CARDS: 'apstore_global_cards',
    ANALYTICS: 'apstore_analytics'
  },

  // Initialize storage
  init() {
    let users = localStorage.getItem(this.KEYS.USERS);
    if (!users) {
      localStorage.setItem(this.KEYS.USERS, JSON.stringify([]));
      this.createTestUser();
    } else {
      try {
        const parsed = JSON.parse(users);
        if (parsed.length === 0) {
          this.createTestUser();
        }
      } catch (e) {
        localStorage.setItem(this.KEYS.USERS, JSON.stringify([]));
        this.createTestUser();
      }
    }
    if (!localStorage.getItem(this.KEYS.CARDS)) {
      localStorage.setItem(this.KEYS.CARDS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.ANALYTICS)) {
      localStorage.setItem(this.KEYS.ANALYTICS, JSON.stringify([]));
    }
  },

  // Helper: Create unique ID
  generateId(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  // --- USER OPERATIONS ---
  getUsers() {
    return JSON.parse(localStorage.getItem(this.KEYS.USERS)) || [];
  },

  saveUsers(users) {
    localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
  },

  getUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  },

  getUserByEmail(email) {
    if (!email) return null;
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createUser(name, email, password, subscription = 'free') {
    const users = this.getUsers();
    
    // Check if user already exists
    if (this.getUserByEmail(email)) {
      return { success: false, message: 'Email address already registered' };
    }

    const newUser = {
      id: 'usr_' + this.generateId(),
      name,
      email,
      password, // In a simulated setup, store securely in plaintext for simulation purposes
      subscription, // 'free' | 'pro' | 'enterprise'
      billingCycle: 'monthly', // 'monthly' | 'yearly'
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Bootstrap first sample card and analytics for immediate high-fidelity viewing
    this.bootstrapSampleCard(newUser.id);

    return { success: true, user: newUser };
  },

  updateUserSubscription(userId, tier, cycle = 'monthly') {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].subscription = tier;
      users[index].billingCycle = cycle;
      this.saveUsers(users);
      
      // Inject supplementary mock analytics representing business growth upon premium upgrade
      const userCards = this.getCardsByUserId(userId);
      userCards.forEach(card => {
        this.generateMockScans(card.id, tier === 'enterprise' ? 120 : 60);
      });
      
      return { success: true, user: users[index] };
    }
    return { success: false, message: 'User not found' };
  },

  updateUserProfile(userId, name, password = null) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index].name = name;
      if (password) {
        users[index].password = password;
      }
      this.saveUsers(users);
      return { success: true, user: users[index] };
    }
    return { success: false, message: 'User not found' };
  },

  createTestUser() {
    this.createUser('Nikhil Sunil', 'demo@apstore.com', 'demo123', 'pro');
  },

  // --- CARD OPERATIONS ---
  getCards() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CARDS)) || [];
    } catch (e) {
      console.error("Failed to parse cards from storage, resetting:", e);
      localStorage.setItem(this.KEYS.CARDS, JSON.stringify([]));
      return [];
    }
  },

  saveCards(cards) {
    localStorage.setItem(this.KEYS.CARDS, JSON.stringify(cards));
  },

  getCardById(id) {
    return this.getCards().find(c => c.id === id) || null;
  },

  encodeCardForUrl(card) {
    if (!card) return '';
    try {
      // Short key mappings for high-efficiency compression
      const stripped = {
        id: card.id,
        ui: card.userId,
        ti: card.title,
        ty: card.type,
        fn: card.firstName,
        ln: card.lastName,
        jt: card.jobTitle,
        co: card.company,
        ds: card.description,
        ph: card.phone,
        wp: card.workPhone,
        em: card.email,
        ws: card.website,
        ad: card.address,
      };

      if (card.socials) {
        stripped.so = {};
        const s = card.socials;
        if (s.linkedin) stripped.so.li = s.linkedin;
        if (s.github) stripped.so.gh = s.github;
        if (s.twitter) stripped.so.tw = s.twitter;
        if (s.instagram) stripped.so.in = s.instagram;
        if (s.youtube) stripped.so.yt = s.youtube;
        if (s.whatsapp) stripped.so.wa = s.whatsapp;
        if (s.facebook) stripped.so.fb = s.facebook;
        if (s.tiktok) stripped.so.tk = s.tiktok;
        if (s.discord) stripped.so.di = s.discord;
      }

      if (card.theme) {
        stripped.th = {
          bg: card.theme.bgColor,
          pc: card.theme.primaryColor,
          bs: card.theme.buttonStyle,
          tm: card.theme.themeMode,
          pr: card.theme.preset
        };
      }

      if (card.qrStyle) {
        stripped.qs = {
          dc: card.qrStyle.dotsColor,
          dt: card.qrStyle.dotsType,
          cc: card.qrStyle.cornersColor,
          ct: card.qrStyle.cornersType,
          lp: card.qrStyle.logoPreset
        };
      }

      if (card.avatarMin) {
        stripped.av = card.avatarMin;
      }

      const json = JSON.stringify(stripped);
      const base64 = btoa(encodeURIComponent(json));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.error("Failed to encode card for URL:", e);
      return '';
    }
  },

  decodeCardFromUrl(encoded) {
    if (!encoded) return null;
    try {
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const json = decodeURIComponent(atob(base64));
      const compressed = JSON.parse(json);
      
      // Decompress short keys back to full keys
      const card = {
        id: compressed.id,
        userId: compressed.ui,
        title: compressed.ti,
        type: compressed.ty,
        firstName: compressed.fn || '',
        lastName: compressed.ln || '',
        jobTitle: compressed.jt || '',
        company: compressed.co || '',
        description: compressed.ds || '',
        phone: compressed.ph || '',
        workPhone: compressed.wp || '',
        email: compressed.em || '',
        website: compressed.ws || '',
        address: compressed.ad || '',
        avatar: compressed.av || '',
        avatarMin: compressed.av || '',
        status: 'active',
        scansCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (compressed.so) {
        card.socials = {
          linkedin: compressed.so.li || '',
          github: compressed.so.gh || '',
          twitter: compressed.so.tw || '',
          instagram: compressed.so.in || '',
          youtube: compressed.so.yt || '',
          whatsapp: compressed.so.wa || '',
          facebook: compressed.so.fb || '',
          tiktok: compressed.so.tk || '',
          discord: compressed.so.di || ''
        };
      } else {
        card.socials = {
          linkedin: '', github: '', twitter: '', instagram: '',
          youtube: '', whatsapp: '', facebook: '', tiktok: '', discord: ''
        };
      }

      if (compressed.th) {
        card.theme = {
          bgColor: compressed.th.bg || '#6366f1',
          primaryColor: compressed.th.pc || '#a855f7',
          buttonStyle: compressed.th.bs || 'pill',
          themeMode: compressed.th.tm || 'dark',
          preset: compressed.th.pr || 'custom'
        };
      }

      if (compressed.qs) {
        card.qrStyle = {
          dotsColor: compressed.qs.dc || '#6366f1',
          dotsType: compressed.qs.dt || 'rounded',
          cornersColor: compressed.qs.cc || '#a855f7',
          cornersType: compressed.qs.ct || 'rounded',
          logoPreset: compressed.qs.lp || 'vcard'
        };
      }

      return card;
    } catch (e) {
      console.error("Failed to decode card from URL:", e);
      return null;
    }
  },

  compressImage(base64, maxWidth, maxHeight, quality, toGrayscale, callback) {
    if (!base64) {
      callback('');
      return;
    }
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Grayscale compression for massive URL-size reduction and artistic headshots
      if (toGrayscale) {
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          console.warn("Grayscale filtering failed (CORS), skipping filter:", e);
        }
      }
      
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      callback(compressedBase64);
    };
    img.onerror = () => {
      callback(base64);
    };
  },



  getCardsByUserId(userId) {
    return this.getCards().filter(c => c.userId === userId);
  },

  createCard(userId, cardData) {
    const cards = this.getCards();
    const user = this.getUserById(userId);

    if (!user) {
      return { success: false, message: 'Invalid User session' };
    }

    // Limit check
    const existingCards = this.getCardsByUserId(userId);
    if (user.subscription === 'free' && existingCards.length >= 2) {
      return { success: false, message: 'Free tier limits reached (Max 2 cards). Please upgrade to PRO!' };
    } else if (user.subscription === 'pro' && existingCards.length >= 10) {
      return { success: false, message: 'PRO tier limits reached (Max 10 cards). Upgrade to ENTERPRISE for unlimited setups!' };
    }

    const newCard = {
      id: 'crd_' + this.generateId(6),
      userId,
      title: cardData.title || 'My vCard',
      type: cardData.type || 'static', // 'static' | 'dynamic'
      status: 'active', // 'active' | 'paused'
      firstName: cardData.firstName || '',
      lastName: cardData.lastName || '',
      jobTitle: cardData.jobTitle || '',
      company: cardData.company || '',
      description: cardData.description || '',
      phone: cardData.phone || '',
      workPhone: cardData.workPhone || '',
      email: cardData.email || '',
      website: cardData.website || '',
      address: cardData.address || '',
      avatar: cardData.avatar || '', // base64 representation
      avatarMin: cardData.avatarMin || '', // low-res thumbnail
      socials: {
        linkedin: cardData.socials?.linkedin || '',
        github: cardData.socials?.github || '',
        twitter: cardData.socials?.twitter || '',
        instagram: cardData.socials?.instagram || '',
        youtube: cardData.socials?.youtube || '',
        whatsapp: cardData.socials?.whatsapp || '',
        facebook: cardData.socials?.facebook || '',
        tiktok: cardData.socials?.tiktok || '',
        discord: cardData.socials?.discord || ''
      },
      theme: {
        bgColor: cardData.theme?.bgColor || '#6366f1',
        primaryColor: cardData.theme?.primaryColor || '#6366f1',
        buttonStyle: cardData.theme?.buttonStyle || 'pill', // 'square' | 'rounded' | 'pill'
        themeMode: cardData.theme?.themeMode || 'dark' // 'dark' | 'light'
      },
      qrStyle: {
        dotsColor: cardData.qrStyle?.dotsColor || '#6366f1',
        dotsType: cardData.qrStyle?.dotsType || 'rounded',
        cornersColor: cardData.qrStyle?.cornersColor || '#6366f1',
        cornersType: cardData.qrStyle?.cornersType || 'square',
        logoPreset: cardData.qrStyle?.logoPreset || 'none' // 'none' | 'vcard' | 'avatar'
      },
      scansCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    cards.push(newCard);
    this.saveCards(cards);

    // Populate initial dummy metrics so charts instantly animate for this new card
    this.generateMockScans(newCard.id, 25);

    return { success: true, card: newCard };
  },

  updateCard(userId, cardId, cardData) {
    const cards = this.getCards();
    const index = cards.findIndex(c => c.id === cardId && c.userId === userId);
    
    if (index === -1) {
      return { success: false, message: 'Card not found or access denied' };
    }

    const card = cards[index];
    const user = this.getUserById(userId);

    // Static QRs can be edited, but it's technically a new target link.
    // If the QR remains static it cannot change target but simulated dynamic is editable.
    // In our system, dynamic cards update details, while static cards are also editable, 
    // but the dashboard warns users on creation.

    // Merge updates
    cards[index] = {
      ...card,
      title: cardData.title || card.title,
      firstName: cardData.firstName !== undefined ? cardData.firstName : card.firstName,
      lastName: cardData.lastName !== undefined ? cardData.lastName : card.lastName,
      jobTitle: cardData.jobTitle !== undefined ? cardData.jobTitle : card.jobTitle,
      company: cardData.company !== undefined ? cardData.company : card.company,
      description: cardData.description !== undefined ? cardData.description : card.description,
      phone: cardData.phone !== undefined ? cardData.phone : card.phone,
      workPhone: cardData.workPhone !== undefined ? cardData.workPhone : card.workPhone,
      email: cardData.email !== undefined ? cardData.email : card.email,
      website: cardData.website !== undefined ? cardData.website : card.website,
      address: cardData.address !== undefined ? cardData.address : card.address,
      avatar: cardData.avatar !== undefined ? cardData.avatar : card.avatar,
      avatarMin: cardData.avatarMin !== undefined ? cardData.avatarMin : card.avatarMin,
      socials: {
        ...card.socials,
        ...cardData.socials
      },
      theme: {
        ...card.theme,
        ...cardData.theme
      },
      qrStyle: {
        ...card.qrStyle,
        ...cardData.qrStyle
      },
      updatedAt: new Date().toISOString()
    };

    this.saveCards(cards);
    return { success: true, card: cards[index] };
  },

  updateCardStatus(userId, cardId, status) {
    const cards = this.getCards();
    const index = cards.findIndex(c => c.id === cardId && c.userId === userId);
    if (index !== -1) {
      cards[index].status = status; // 'active' | 'paused'
      this.saveCards(cards);
      return { success: true };
    }
    return { success: false, message: 'Card not found' };
  },

  deleteCard(userId, cardId) {
    let cards = this.getCards();
    const initialLength = cards.length;
    cards = cards.filter(c => !(c.id === cardId && c.userId === userId));
    
    if (cards.length < initialLength) {
      this.saveCards(cards);
      // Clean up analytics
      this.deleteAnalyticsForCard(cardId);
      return { success: true };
    }
    return { success: false, message: 'Card not found or access denied' };
  },

  // --- ANALYTICS & SCANS ---
  getAnalytics() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.ANALYTICS)) || [];
    } catch (e) {
      console.error("Failed to parse analytics from storage, resetting:", e);
      localStorage.setItem(this.KEYS.ANALYTICS, JSON.stringify([]));
      return [];
    }
  },

  saveAnalytics(analytics) {
    localStorage.setItem(this.KEYS.ANALYTICS, JSON.stringify(analytics));
  },

  getAnalyticsByCardId(cardId) {
    return this.getAnalytics().filter(a => a.cardId === cardId);
  },

  deleteAnalyticsForCard(cardId) {
    let analytics = this.getAnalytics();
    analytics = analytics.filter(a => a.cardId !== cardId);
    this.saveAnalytics(analytics);
  },

  recordScan(cardId, referrer = 'QR Scan') {
    const cards = this.getCards();
    const index = cards.findIndex(c => c.id === cardId);
    if (index === -1) return;

    // Check status
    if (cards[index].status !== 'active') return;

    // Increment scan count cache on card
    cards[index].scansCount = (cards[index].scansCount || 0) + 1;
    this.saveCards(cards);

    // Detect browser agent to mock device
    const userAgent = navigator.userAgent;
    let device = 'Other';
    if (/iPhone|iPad|iPod/i.test(userAgent)) device = 'iOS';
    else if (/Android/i.test(userAgent)) device = 'Android';
    else if (/Windows/i.test(userAgent)) device = 'Windows';
    else if (/Macintosh/i.test(userAgent)) device = 'macOS';

    // Geo random mock lists
    const geolocations = [
      { country: 'United States', cities: ['San Francisco', 'New York', 'Seattle'] },
      { country: 'United Kingdom', cities: ['London', 'Manchester', 'Edinburgh'] },
      { country: 'India', cities: ['Mumbai', 'Bangalore', 'Delhi'] },
      { country: 'Germany', cities: ['Berlin', 'Munich', 'Frankfurt'] },
      { country: 'United Arab Emirates', cities: ['Dubai', 'Abu Dhabi'] },
      { country: 'Singapore', cities: ['Singapore'] }
    ];
    // Heavily skew towards domestic USA/local depending on index
    const geo = geolocations[Math.floor(Math.random() * geolocations.length)];
    const city = geo.cities[Math.floor(Math.random() * geo.cities.length)];

    const scanEntry = {
      id: 'scn_' + this.generateId(),
      cardId,
      timestamp: new Date().toISOString(),
      device,
      country: geo.country,
      city,
      referrer
    };

    const analytics = this.getAnalytics();
    analytics.push(scanEntry);
    this.saveAnalytics(analytics);
  },

  // --- BOOTSTRAP INITIAL DATA ---
  bootstrapSampleCard(userId) {
    const cardData = {
      title: 'Digital Business Card',
      type: 'dynamic',
      firstName: 'Nikhil',
      lastName: 'Sunil',
      jobTitle: 'Principal Lead Engineer',
      company: 'Apstore Technologies',
      description: 'Building next-generation digital identities and state of the art scannable tools for global commerce. Scan to connect!',
      phone: '+1 (555) 019-2834',
      workPhone: '+1 (555) 789-3212',
      email: 'nikhil@apstore.com',
      website: 'www.apstore.com',
      address: 'Suite 400, Infinite Loop, Cupertino, CA',
      socials: {
        linkedin: 'linkedin.com/in/nikhilsunil',
        github: 'github.com/nikhilsunil',
        twitter: 'twitter.com/nikhilsunil',
        instagram: 'instagram.com/nikhilsunil',
        youtube: '',
        whatsapp: '',
        facebook: '',
        tiktok: '',
        discord: ''
      },
      theme: {
        bgColor: '#6366f1',
        primaryColor: '#a855f7',
        buttonStyle: 'pill',
        themeMode: 'dark'
      },
      qrStyle: {
        dotsColor: '#6366f1',
        dotsType: 'rounded',
        cornersColor: '#a855f7',
        cornersType: 'rounded',
        logoPreset: 'vcard'
      }
    };
    
    // Save card without calling createCard to bypass user subscription locks during sign up
    const cards = this.getCards();
    const cardId = 'crd_sample';
    
    const newCard = {
      ...cardData,
      id: cardId,
      userId,
      scansCount: 84,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    cards.push(newCard);
    this.saveCards(cards);
    
    // Populating beautiful dashboard trends spanning last 30 days
    this.generateMockScans(cardId, 84);
  },

  generateMockScans(cardId, count = 40) {
    const analytics = this.getAnalytics();
    const devices = ['iOS', 'iOS', 'Android', 'Android', 'macOS', 'Windows', 'Other'];
    const geolocations = [
      { country: 'United States', cities: ['San Francisco', 'New York', 'Austin'] },
      { country: 'United States', cities: ['Los Angeles', 'Chicago', 'Boston'] },
      { country: 'United Kingdom', cities: ['London', 'Birmingham'] },
      { country: 'Germany', cities: ['Berlin', 'Munich'] },
      { country: 'India', cities: ['Bangalore', 'Mumbai'] },
      { country: 'Singapore', cities: ['Singapore'] },
      { country: 'United Arab Emirates', cities: ['Dubai'] }
    ];
    const referrers = ['QR Scan', 'QR Scan', 'QR Scan', 'Direct Link', 'Social Share'];

    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      // Spread timeline backwards over 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);
      const scanDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));
      
      const device = devices[Math.floor(Math.random() * devices.length)];
      const geo = geolocations[Math.floor(Math.random() * geolocations.length)];
      const city = geo.cities[Math.floor(Math.random() * geo.cities.length)];
      const referrer = referrers[Math.floor(Math.random() * referrers.length)];

      analytics.push({
        id: 'scn_' + this.generateId(),
        cardId,
        timestamp: scanDate.toISOString(),
        device,
        country: geo.country,
        city,
        referrer
      });
    }

    this.saveAnalytics(analytics);
  }
};

// Initialize DB immediately on load
DB.init();
window.DB = DB; // expose to console for advanced testing
