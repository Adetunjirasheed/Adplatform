/**
 * AdPlatform - Main Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Navbar Toggle
  const navToggle = document.getElementById('navbarToggle');
  const navMenu = document.getElementById('navbarNav');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }

  // 2. Flash Message Auto Dismiss
  const flashMsg = document.getElementById('flashMessage');
  if (flashMsg) {
    setTimeout(() => {
      flashMsg.style.transition = 'opacity 0.5s ease';
      flashMsg.style.opacity = '0';
      setTimeout(() => flashMsg.remove(), 500);
    }, 5000);
  }
});

// Helper: Get CSRF Token
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

// Helper: Format Currency (₦)
function formatNaira(amount) {
  return '₦' + Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Helper: Copy to Clipboard
function copyToClipboard(text, btnElement) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const orig = btnElement.innerText;
      btnElement.innerText = 'Copied!';
      setTimeout(() => { btnElement.innerText = orig; }, 2000);
    }
  });
}

