// Apstore Authentication and Session Manager

const Auth = {
  SESSION_KEY: 'apstore_session',

  // Register a new client
  signUp(name, email, password, subscription = 'free') {
    if (!name || !email || !password) {
      return { success: false, message: 'Please fill in all registration fields.' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    // Call simulated DB engine
    const result = DB.createUser(name, email, password, subscription);
    
    if (result.success) {
      // Auto sign in user upon successful registration
      this.createSession(result.user);
      return { success: true, user: result.user };
    }
    
    return result;
  },

  // Log in an existing client
  signIn(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Please enter both email and password.' };
    }

    const user = DB.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'No account associated with this email.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Invalid password. Please try again.' };
    }

    // Create session
    this.createSession(user);
    return { success: true, user };
  },

  // Log out the current user
  signOut() {
    localStorage.removeItem(this.SESSION_KEY);
    // Redirect to landing
    window.location.href = 'index.html';
  },

  // Get active session user
  getCurrentUser() {
    const session = localStorage.getItem(this.SESSION_KEY);
    if (!session) return null;
    
    try {
      const parsedSession = JSON.parse(session);
      // Fetch latest user data from DB to ensure subscription changes or profile edits are synced
      return DB.getUserById(parsedSession.id);
    } catch (e) {
      this.signOut();
      return null;
    }
  },

  // Check login state
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  // Store session tokens
  createSession(user) {
    const sessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionPayload));
  },

  // Route security gate
  guardRoute() {
    const currentUser = this.getCurrentUser();
    const currentPath = window.location.pathname.toLowerCase();
    const isDashboard = currentPath.includes('dashboard.html');

    if (isDashboard && !currentUser) {
      // Force exit to index landing page with auth command
      window.location.href = 'index.html?auth=login';
    } else if (!isDashboard && currentUser && currentPath.includes('index.html')) {
      // If user is already logged in and visits landing, give visual pathways to dashboard
      const headerBtns = document.getElementById('auth-header-actions');
      if (headerBtns) {
        headerBtns.innerHTML = `
          <a href="dashboard.html" class="btn btn-glass" style="padding: 8px 18px; font-size: 0.88rem;">
            Dashboard Panel
          </a>
          <button onclick="Auth.signOut()" class="btn btn-secondary" style="padding: 8px 18px; font-size: 0.88rem;">
            Log Out
          </button>
        `;
      }
    }
  }
};

// Check guard rules immediately on script import
document.addEventListener('DOMContentLoaded', () => {
  Auth.guardRoute();
});

window.Auth = Auth; // Expose globally
