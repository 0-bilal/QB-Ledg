 // Default access code (for demo purposes)
    const DEFAULT_ACCESS_CODE = '8121';

    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const accessCodeInput = document.getElementById('accessCode');
    const codeCounter = document.getElementById('codeCounter');
    const rememberCheckbox = document.getElementById('remember');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const themeToggle = document.getElementById('themeToggle');
    const languageToggle = document.getElementById('languageToggle');

    // Code Input Formatting and Validation
    accessCodeInput.addEventListener('input', function(e) {
      let value = e.target.value;
      
      // Remove any non-numeric characters
      value = value.replace(/[^0-9]/g, '');
      
      // Limit to 8 digits
      if (value.length > 4) {
        value = value.slice(0, 4);
      }
      
      e.target.value = value;
      updateCodeCounter(value);
      validateCodeInput(value);
    });

    // Format code input with spacing
    accessCodeInput.addEventListener('keyup', function(e) {
      let value = e.target.value.replace(/[^0-9]/g, '');
      
      // Add space after 4 digits for visual formatting
      if (value.length > 4) {
        const formatted = value.slice(0, 4) + ' ' + value.slice(4, 4);
        e.target.value = formatted;
        // Update the actual value without spaces for validation
        e.target.dataset.actualValue = value;
      } else {
        e.target.dataset.actualValue = value;
      }
    });

    // Prevent non-numeric input
    accessCodeInput.addEventListener('keypress', function(e) {
      const char = String.fromCharCode(e.which);
      if (!/[0-9]/.test(char) && e.which !== 4 && e.which !== 46) {
        e.preventDefault();
      }
    });

    function updateCodeCounter(value) {
      const count = value.length;
      codeCounter.textContent = `${count}/4`;
      
      if (count === 4) {
        codeCounter.classList.add('complete');
      } else {
        codeCounter.classList.remove('complete');
      }
    }

    function validateCodeInput(value) {
      const input = accessCodeInput;
      
      if (value.length === 0) {
        input.classList.remove('valid', 'invalid');
      } else if (value.length === 4) {
        input.classList.add('valid');
        input.classList.remove('invalid');
      } else if (value.length > 0) {
        input.classList.remove('valid', 'invalid');
      }
    }

    // Form Submission
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      let accessCode = accessCodeInput.dataset.actualValue || accessCodeInput.value.replace(/\s/g, '');
      const remember = rememberCheckbox.checked;

      // Clear previous messages
      hideMessages();

      // Validation
      if (!accessCode) {
        showError('يرجى إدخال رمز الدخول');
        return;
      }

      if (accessCode.length !== 4) {
        showError('رمز الدخول يجب أن يتكون من 4 أرقام بالضبط');
        accessCodeInput.classList.add('invalid');
        return;
      }

      if (!/^\d{4}$/.test(accessCode)) {
        showError('رمز الدخول يجب أن يحتوي على أرقام فقط');
        accessCodeInput.classList.add('invalid');
        return;
      }

      // Show loading state
      setLoading(true);

      try {
        // Simulate API call
        await simulateLogin(accessCode, remember);
        
        // Success
        showSuccess('تم التحقق من الرمز بنجاح! جارِ الدخول...');
        
        // Store session info
        if (remember) {
          localStorage.setItem('qb_ledg_remember', 'true');
          localStorage.setItem('qb_ledg_access_code', btoa(accessCode)); // Basic encoding
        }
        
        sessionStorage.setItem('qb_ledg_session', JSON.stringify({
          accessCode: btoa(accessCode),
          loginTime: new Date().toISOString(),
          remember: remember
        }));

        // Redirect after delay
        setTimeout(() => {
          window.location.href = 'home.html'; // Redirect to main app
        }, 1500);

      } catch (error) {
        accessCodeInput.classList.add('invalid');
        showError(error.message || 'رمز الدخول غير صحيح');
      } finally {
        setLoading(false);
      }
    });

    // Simulate Login API Call
    async function simulateLogin(accessCode, remember) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Check access code
          if (accessCode === DEFAULT_ACCESS_CODE) {
            resolve({ success: true });
          } else {
            reject(new Error('رمز الدخول غير صحيح. يرجى التحقق من الرمز والمحاولة مرة أخرى'));
          }
        }, 1200); // Simulate network delay
      });
    }

    // Loading State Management
    function setLoading(loading) {
      if (loading) {
        loginButton.disabled = true;
        loginButton.innerHTML = 'جاري التحقق من الرمز... <span class="loading"></span>';
      } else {
        loginButton.disabled = false;
        loginButton.innerHTML = 'دخول النظام';
      }
    }

    // Message Management
    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.classList.add('show');
      successMessage.classList.remove('show');
    }

    function showSuccess(message) {
      successMessage.textContent = message;
      successMessage.classList.add('show');
      errorMessage.classList.remove('show');
    }

    function hideMessages() {
      errorMessage.classList.remove('show');
      successMessage.classList.remove('show');
    }

    // Theme Toggle (placeholder for future implementation)
    themeToggle.addEventListener('click', function() {
      // Toggle between light and dark themes
      if (this.textContent === '🌙') {
        this.textContent = '☀️';
        this.title = 'تبديل للمظهر المظلم';
        // Add light theme logic here
      } else {
        this.textContent = '🌙';
        this.title = 'تبديل للمظهر الفاتح';
        // Add dark theme logic here
      }
    });

    // Language Toggle (placeholder for future implementation)
    languageToggle.addEventListener('click', function() {
      // Toggle between Arabic and English
      if (this.textContent === 'EN | عربي') {
        this.textContent = 'عربي | EN';
        // Add English language logic here
      } else {
        this.textContent = 'EN | عربي';
        // Add Arabic language logic here
      }
    });

    // Footer Link Handlers
    document.getElementById('forgotPassword').addEventListener('click', function(e) {
      e.preventDefault();
      showError('لاسترداد رمز الدخول، يرجى التواصل مع الإدارة');
      setTimeout(hideMessages, 3000);
    });

    document.getElementById('createAccount').addEventListener('click', function(e) {
      e.preventDefault();
      showError('للحصول على رمز دخول جديد، يرجى التواصل مع الإدارة');
      setTimeout(hideMessages, 3000);
    });

    document.getElementById('helpSupport').addEventListener('click', function(e) {
      e.preventDefault();
      showSuccess('للحصول على المساعدة، يرجى التواصل مع الإدارة');
      setTimeout(hideMessages, 3000);
    });

    // Check for remembered login
    window.addEventListener('DOMContentLoaded', function() {
      const rememberedCode = localStorage.getItem('qb_ledg_access_code');
      if (rememberedCode) {
        try {
          const decodedCode = atob(rememberedCode);
          accessCodeInput.value = decodedCode;
          accessCodeInput.dataset.actualValue = decodedCode;
          rememberCheckbox.checked = true;
          updateCodeCounter(decodedCode);
          validateCodeInput(decodedCode);
        } catch (e) {
          localStorage.removeItem('qb_ledg_access_code');
        }
      }

      accessCodeInput.focus();

      // Check if user is already logged in
      const session = sessionStorage.getItem('qb_ledg_session');
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          showSuccess('مرحباً بك مرة أخرى! جارِ التوجيه...');
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 1000);
        } catch (e) {
          sessionStorage.removeItem('qb_ledg_session');
        }
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', function(e) {
      // Enter key to submit form when focused on code input
      if (e.key === 'Enter' && accessCodeInput.contains(document.activeElement)) {
        loginForm.dispatchEvent(new Event('submit'));
      }
      
      // Escape key to clear form
      if (e.key === 'Escape') {
        loginForm.reset();
        hideMessages();
        accessCodeInput.focus();
        updateCodeCounter('');
        accessCodeInput.classList.remove('valid', 'invalid');
      }

      // Backspace handling for formatted input
      if (e.key === 'Backspace' && accessCodeInput.contains(document.activeElement)) {
        setTimeout(() => {
          const value = accessCodeInput.value.replace(/\s/g, '');
          accessCodeInput.dataset.actualValue = value;
          updateCodeCounter(value);
          validateCodeInput(value);
        }, 0);
      }
    });

    // Input Validation Feedback
    accessCodeInput.addEventListener('blur', function() {
      const value = this.dataset.actualValue || this.value.replace(/\s/g, '');
      if (value.length > 0 && value.length !== 4) {
        this.classList.add('invalid');
        this.classList.remove('valid');
      }
    });

    accessCodeInput.addEventListener('focus', function() {
      this.classList.remove('invalid');
    });

 

    // Paste handling for 8-digit codes
    accessCodeInput.addEventListener('paste', function(e) {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      const cleaned = paste.replace(/[^0-9]/g, '').slice(0, 4);
      
      if (cleaned.length === 4) {
        this.value = cleaned.slice(0, 4) + ' ' + cleaned.slice(4, 4);
        this.dataset.actualValue = cleaned;
        updateCodeCounter(cleaned);
        validateCodeInput(cleaned);
        showSuccess('تم لصق رمز الدخول بنجاح');
        
        // Auto-submit after paste
        setTimeout(() => {
          loginForm.dispatchEvent(new Event('submit'));
        }, 1000);
      } else {
        showError('يرجى لصق رمز صحيح مكون من 4 أرقام');
      }
    });

    // Utility Functions - Updated for access code system
    function isValidAccessCode(value) {
      return /^\d{4}$/.test(value);
    }

    // Track form interactions - Updated for access code
    accessCodeInput.addEventListener('focus', () => trackEvent('login_code_focus'));
    loginForm.addEventListener('submit', () => trackEvent('login_attempt'));

    // Security: Clear sensitive data on page unload
    window.addEventListener('beforeunload', function() {
      // Clear access code field
      accessCodeInput.value = '';
      accessCodeInput.dataset.actualValue = '';
      
      // Clear any temporary data
      if (!rememberCheckbox.checked) {
        localStorage.removeItem('qb_ledg_access_code');
      }
    });

    console.log('QB-Ledg Access Code Login System Initialized');
    console.log('Demo access code: 8121');

    // Auto-hide messages after 5 seconds
    function autoHideMessage(element) {
      setTimeout(() => {
        element.classList.remove('show');
      }, 5000);
    }

    // Override show functions to include auto-hide
    const originalShowError = showError;
    const originalShowSuccess = showSuccess;

    showError = function(message) {
      originalShowError(message);
      autoHideMessage(errorMessage);
    };

    showSuccess = function(message) {
      originalShowSuccess(message);
      autoHideMessage(successMessage);
    };

    // Prevent form submission on double-click
    let submitInProgress = false;
    loginForm.addEventListener('submit', function(e) {
      if (submitInProgress) {
        e.preventDefault();
        return false;
      }
      submitInProgress = true;
      
      // Reset flag after a delay
      setTimeout(() => {
        submitInProgress = false;
      }, 2000);
    });

    // Handle network connectivity
    window.addEventListener('online', function() {
      hideMessages();
      showSuccess('تم استعادة الاتصال بالإنترنت');
    });

    window.addEventListener('offline', function() {
      hideMessages();
      showError('لا يوجد اتصال بالإنترنت. يرجى التحقق من الاتصال.');
    });

    // Security: Clear sensitive data on page unload
    window.addEventListener('beforeunload', function() {
      // Clear password field
      passwordInput.value = '';
      
      // Clear any temporary data
      if (!rememberCheckbox.checked) {
        usernameInput.value = '';
      }
    });

    // Demo credentials helper (remove in production)
    let clickCount = 0;
    document.querySelector('.logo-container').addEventListener('click', function() {
      clickCount++;
      if (clickCount >= 5) {
        showSuccess(`بيانات تجريبية: المستخدم: ${DEFAULT_CREDENTIALS.username} | كلمة المرور: ${DEFAULT_CREDENTIALS.password}`);
        clickCount = 0;
      }
    });

    // Enhanced accessibility - Updated for access code
    function announceToScreenReader(message) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    // Announce form validation results
    const originalShowErrorWithAnnouncement = showError;
    const originalShowSuccessWithAnnouncement = showSuccess;

    showError = function(message) {
      originalShowErrorWithAnnouncement(message);
      announceToScreenReader(`خطأ: ${message}`);
    };

    showSuccess = function(message) {
      originalShowSuccessWithAnnouncement(message);
      announceToScreenReader(`نجح: ${message}`);
    }; '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    

    // Progressive Web App support (basic)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        // Register service worker here if needed
        console.log('Service Worker support detected');
      });
    }

    // Handle print styles
    window.addEventListener('beforeprint', function() {
      document.body.classList.add('printing');
    });

    window.addEventListener('afterprint', function() {
      document.body.classList.remove('printing');
    });

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.textContent = `
      @media print {
        .printing .theme-selector,
        .printing .language-selector,
        .printing .password-toggle,
        .printing .login-button {
          display: none !important;
        }
        
        .printing .login-card {
          box-shadow: none;
          border: 1px solid #000;
        }
        
        .printing .form-input {
          border: 1px solid #000;
          background: white !important;
          color: black !important;
        }
        
        .printing .app-title {
          color: black !important;
        }
      }
    `;
    document.head.appendChild(printStyles);

    // Analytics placeholder (replace with actual analytics)
    function trackEvent(eventName, eventData = {}) {
      console.log('Analytics Event:', eventName, eventData);
      // Replace with actual analytics implementation
      // Example: gtag('event', eventName, eventData);
    }

    // Track form interactions
    usernameInput.addEventListener('focus', () => trackEvent('login_username_focus'));
    passwordInput.addEventListener('focus', () => trackEvent('login_password_focus'));
    loginForm.addEventListener('submit', () => trackEvent('login_attempt'));

    // Performance monitoring
    if ('performance' in window) {
      window.addEventListener('load', function() {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
          trackEvent('page_load_time', { loadTime: Math.round(loadTime) });
        }, 0);
      });
    }

    // Error reporting placeholder
    window.addEventListener('error', function(event) {
      console.error('JavaScript Error:', event.error);
      trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Mobile-specific enhancements - Updated for access code
    if ('ontouchstart' in window) {
      // Add touch-specific styles
      document.body.classList.add('touch-device');
      
      // Prevent zoom on input focus (iOS)
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
      
      // Handle virtual keyboard
      let initialViewportHeight = window.innerHeight;
      
      window.addEventListener('resize', function() {
        const currentHeight = window.innerHeight;
        const heightDiff = initialViewportHeight - currentHeight;
        
        // If keyboard is likely open (height reduced significantly)
        if (heightDiff > 150) {
          document.body.classList.add('keyboard-open');
          document.querySelector('.login-container').style.minHeight = currentHeight + 'px';
        } else {
          document.body.classList.remove('keyboard-open');
          document.querySelector('.login-container').style.minHeight = '100vh';
        }
      });
    }

    // Add CSS for mobile enhancements - Updated for code input
    const mobileStyles = document.createElement('style');
    mobileStyles.textContent = `
      @media (max-width: 768px) {
        .touch-device .code-input {
          font-size: 18px; /* Prevent zoom on iOS while keeping readability */
        }
        
        .keyboard-open .login-container {
          padding-top: var(--space-2);
          padding-bottom: var(--space-2);
        }
        
        .keyboard-open .login-card {
          margin-top: 0;
          margin-bottom: 0;
        }
        
        .keyboard-open .login-header {
          margin-bottom: var(--space-4);
        }
        
        .keyboard-open .logo-container {
          width: 60px;
          height: 60px;
          margin-bottom: var(--space-2);
        }
        
        .keyboard-open .app-title {
          font-size: 20px;
          margin-bottom: var(--space-1);
        }
        
        .keyboard-open .login-footer {
          margin-top: var(--space-4);
        }

        /* Improve code input on mobile */
        .code-input {
          font-size: 20px;
          letter-spacing: 3px;
        }

        .code-input:focus {
          letter-spacing: 4px;
        }

        .code-helper {
          font-size: 11px;
        }

        /* Virtual keyboard optimization */
        .keyboard-open .code-input {
          transform: translateY(-20px);
        }
      }

      /* Additional styles for better UX */
      .code-input::selection {
        background: var(--accent-500);
        color: white;
      }

      .code-input::-moz-selection {
        background: var(--accent-500);
        color: white;
      }

      /* Loading animation enhancement */
      .login-button .loading {
        display: inline-block;
        vertical-align: middle;
      }

      /* Success state animation */
      @keyframes successPulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }

      .code-input.valid {
        animation: successPulse 1s ease-out;
      }

      /* Error state animation enhancement */
      @keyframes errorPulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }

      .code-input.invalid {
        animation: shake 0.5s ease-in-out, errorPulse 1s ease-out;
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .code-input {
          border-width: 2px;
        }
        
        .code-input:focus {
          border-width: 3px;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .login-card,
        .code-input,
        .login-button,
        .loading {
          animation: none !important;
          transition: none !important;
        }
        
        .logo-container::before {
          animation: none !important;
        }
      }

      /* Dark mode enhancements */
      @media (prefers-color-scheme: dark) {
        .code-input {
          background: var(--primary-800);
          color: var(--primary-100);
        }
      }
    `;
    document.head.appendChild(mobileStyles);

    // Progressive Web App enhancements
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        // Could register service worker for offline functionality
        console.log('PWA support detected');
      });
    }

    // Clipboard API enhancements for modern browsers
    if (navigator.clipboard && navigator.clipboard.readText) {
      // Add a button to read from clipboard (optional)
      const clipboardButton = document.createElement('button');
      clipboardButton.type = 'button';
      clipboardButton.className = 'clipboard-btn';
      clipboardButton.innerHTML = '📋';
      clipboardButton.title = 'لصق من الحافظة';
      clipboardButton.style.cssText = `
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
        opacity: 0.7;
      `;

      clipboardButton.addEventListener('click', async function() {
        try {
          const text = await navigator.clipboard.readText();
          const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
          
          if (cleaned.length === 4) {
            accessCodeInput.value = cleaned.slice(0, 4) + ' ' + cleaned.slice(4, 4);
            accessCodeInput.dataset.actualValue = cleaned;
            updateCodeCounter(cleaned);
            validateCodeInput(cleaned);
            showSuccess('تم لصق الرمز من الحافظة');
          } else {
            showError('لا يوجد رمز صحيح في الحافظة');
          }
        } catch (err) {
          console.log('Clipboard read failed:', err);
        }
      });

      // Add clipboard button to the input container
      const inputContainer = accessCodeInput.parentElement;
      inputContainer.style.position = 'relative';
      inputContainer.appendChild(clipboardButton);
      
      // Adjust input padding to accommodate button
      accessCodeInput.style.paddingLeft = '50px';
    }

    // Biometric authentication support (if available)
    if (window.PublicKeyCredential) {
      console.log('WebAuthn support detected - could implement biometric login');
      // Future enhancement: implement fingerprint/face ID login
    }

    // Network status monitoring
    function updateNetworkStatus() {
      if (navigator.onLine) {
        // Online
        document.body.classList.remove('offline');
        if (document.body.classList.contains('was-offline')) {
          showSuccess('تم استعادة الاتصال');
          document.body.classList.remove('was-offline');
        }
      } else {
        // Offline
        document.body.classList.add('offline', 'was-offline');
        showError('لا يوجد اتصال بالإنترنت');
      }
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Haptic feedback for mobile devices (if supported)
    function hapticFeedback(type = 'light') {
      if (navigator.vibrate) {
        switch(type) {
          case 'success':
            navigator.vibrate([50, 30, 50]);
            break;
          case 'error':
            navigator.vibrate([100, 50, 100, 50, 100]);
            break;
          case 'light':
          default:
            navigator.vibrate(50);
            break;
        }
      }
    }

    // Add haptic feedback to interactions
    accessCodeInput.addEventListener('input', () => {
      const value = accessCodeInput.dataset.actualValue || accessCodeInput.value.replace(/\s/g, '');
      if (value.length === 4) {
        hapticFeedback('success');
      }
    });

    // Override success/error functions to include haptic feedback
    const originalShowErrorHaptic = showError;
    const originalShowSuccessHaptic = showSuccess;

    showError = function(message) {
      originalShowErrorHaptic(message);
      hapticFeedback('error');
    };

    showSuccess = function(message) {
      originalShowSuccessHaptic(message);
      hapticFeedback('success');
    };

    console.log('QB-Ledg Access Code Login System Fully Initialized');
    console.log('Demo: Click logo 3 times to see demo code (8121)');
    console.log('Features: Auto-submit, Paste support, Haptic feedback, Network monitoring');
