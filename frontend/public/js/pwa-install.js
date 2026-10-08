// ProjectHub PWA Install Prompt & Service Worker Registration
(function () {
  'use strict';

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for worker updates
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('PWA: New version available. Refresh to update.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.debug('PWA ServiceWorker registration notice:', err);
        });
    });
  }

  // If already running inside installed standalone app, skip install banners
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    return;
  }

  let deferredPrompt = null;
  const DISMISS_KEY = 'projecthub_pwa_dismissed';

  // 2. Android / Chrome beforeinstallprompt handler
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (sessionStorage.getItem(DISMISS_KEY)) {
      return;
    }

    showInstallBanner({
      type: 'native',
      onInstall: async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          hideInstallBanner();
        }
        deferredPrompt = null;
      }
    });
  });

  // App installed event
  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredPrompt = null;
    console.log('PWA: ProjectHub successfully installed as mobile app!');
  });

  // 3. iOS Safari detection
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  if (isIos && !isStandalone && !sessionStorage.getItem(DISMISS_KEY)) {
    // Only show iOS instruction if on mobile screen and not dismissed
    if (window.innerWidth <= 768) {
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          if (!sessionStorage.getItem(DISMISS_KEY)) {
            showInstallBanner({ type: 'ios' });
          }
        }, 2000);
      });
    }
  }

  function showInstallBanner({ type, onInstall }) {
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-surface-container-high/95 backdrop-blur-md border border-primary/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-on-surface animate-fade-in';
    banner.style.boxShadow = '0 12px 32px rgba(0,0,0,0.45)';

    if (type === 'native') {
      banner.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-primary-container/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
            <span class="material-symbols-outlined text-[22px]">install_mobile</span>
          </div>
          <div class="min-w-0">
            <div class="text-xs font-bold text-on-surface truncate">Install ProjectHub App</div>
            <div class="text-[11px] text-on-surface-variant truncate">Fast full-screen mobile access</div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button id="pwaInstallActionBtn" type="button" class="px-3 py-1.5 rounded-lg bg-primary-container hover:bg-indigo-600 text-on-primary font-semibold text-xs shadow-sm transition-all active:scale-95">
            Install
          </button>
          <button id="pwaDismissBtn" type="button" aria-label="Close" class="p-1 rounded-lg text-outline hover:text-on-surface transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      `;
    } else {
      // iOS Guide
      banner.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/40 flex items-center justify-center text-secondary shrink-0">
            <span class="material-symbols-outlined text-[22px]">add_to_home_screen</span>
          </div>
          <div class="min-w-0">
            <div class="text-xs font-bold text-on-surface">Install on iPhone / iPad</div>
            <div class="text-[10px] text-on-surface-variant">Tap Share <span class="material-symbols-outlined text-[13px] align-middle">ios_share</span> &bull; Add to Home Screen</div>
          </div>
        </div>
        <div class="shrink-0">
          <button id="pwaDismissBtn" type="button" aria-label="Close" class="p-1 rounded-lg text-outline hover:text-on-surface transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      `;
    }

    document.body.appendChild(banner);

    const installBtn = document.getElementById('pwaInstallActionBtn');
    if (installBtn && onInstall) {
      installBtn.addEventListener('click', onInstall);
    }

    const dismissBtn = document.getElementById('pwaDismissBtn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        sessionStorage.setItem(DISMISS_KEY, 'true');
        hideInstallBanner();
      });
    }
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.remove();
    }
  }
})();
