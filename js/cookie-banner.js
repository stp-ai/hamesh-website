/**
 * Cookie Consent Banner
 * ha-mesh.com
 */
(function() {
    'use strict';

    if (localStorage.getItem('hamesh_cookie_consent')) return;

    var banner = document.createElement('div');
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'הסכמה לשימוש בעוגיות');
    banner.innerHTML =
        '<div class="cb-inner">' +
            '<p class="cb-text">אתר זה משתמש בעוגיות (cookies) לשיפור חוויית הגלישה ולצרכי ניתוח סטטיסטי. ' +
            '<a href="/privacy/" class="cb-link">מדיניות פרטיות</a></p>' +
            '<div class="cb-buttons">' +
                '<button id="cbAccept" class="cb-btn cb-btn-accept">מסכימ/ה</button>' +
                '<button id="cbDecline" class="cb-btn cb-btn-decline">דחייה</button>' +
            '</div>' +
        '</div>';

    var style = document.createElement('style');
    style.textContent =
        '#cookieBanner {' +
            'position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;' +
            'background: #1E1145; color: rgba(255,255,255,0.9);' +
            'padding: 1rem 1.5rem; font-family: "Heebo", sans-serif;' +
            'box-shadow: 0 -4px 20px rgba(0,0,0,0.3);' +
            'transform: translateY(100%); animation: cbSlideUp 0.5s 1s forwards;' +
        '}' +
        '@keyframes cbSlideUp { to { transform: translateY(0); } }' +
        '.cb-inner {' +
            'max-width: 1100px; margin: 0 auto;' +
            'display: flex; align-items: center; justify-content: space-between;' +
            'gap: 1.5rem; direction: rtl;' +
        '}' +
        '.cb-text { font-size: 0.9rem; line-height: 1.6; flex: 1; }' +
        '.cb-link { color: #F97316; text-decoration: underline; }' +
        '.cb-link:hover { color: #FB923C; }' +
        '.cb-buttons { display: flex; gap: 0.75rem; flex-shrink: 0; }' +
        '.cb-btn {' +
            'border: none; border-radius: 8px; padding: 0.5rem 1.25rem;' +
            'font-family: "Heebo", sans-serif; font-size: 0.9rem; font-weight: 500;' +
            'cursor: pointer; transition: all 0.3s ease;' +
        '}' +
        '.cb-btn-accept {' +
            'background: linear-gradient(135deg, #3B82F6, #8B5CF6);' +
            'color: #fff;' +
        '}' +
        '.cb-btn-accept:hover { opacity: 0.9; transform: translateY(-1px); }' +
        '.cb-btn-decline {' +
            'background: transparent; color: rgba(255,255,255,0.6);' +
            'border: 1px solid rgba(255,255,255,0.2);' +
        '}' +
        '.cb-btn-decline:hover { color: #fff; border-color: rgba(255,255,255,0.4); }' +
        '@media (max-width: 600px) {' +
            '.cb-inner { flex-direction: column; text-align: center; gap: 1rem; }' +
            '.cb-buttons { justify-content: center; }' +
        '}';

    document.head.appendChild(style);
    document.body.appendChild(banner);

    function closeBanner(consent) {
        localStorage.setItem('hamesh_cookie_consent', consent);
        banner.style.animation = 'none';
        banner.style.transform = 'translateY(100%)';
        banner.style.transition = 'transform 0.4s ease';
        setTimeout(function() { banner.remove(); }, 500);
    }

    document.getElementById('cbAccept').addEventListener('click', function() {
        closeBanner('accepted');
    });

    document.getElementById('cbDecline').addEventListener('click', function() {
        closeBanner('declined');
    });
})();
