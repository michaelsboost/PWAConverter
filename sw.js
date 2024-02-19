// Service worker code
const cacheName = 'PWAConverter-cache';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(["./index.html","./LICENSE","./README.md","./imgs/logo.svg","./imgs/header.png","./imgs/logo.png","./js/libraries.js","./js/import.js","./js/app.js","./css/style.css","./libraries/pico.gitignore","./libraries/font-awesome/LICENSE.txt","./libraries/jszip/FileSaver.js","./libraries/jszip/jszip.min.js","./libraries/jszip/jszip-utils.js","./libraries/jszip/Blob.js","./libraries/pico/pico.classless.min.css","./libraries/pico/.github/CONTRIBUTING.md","./libraries/pico/.github/ISSUE_TEMPLATE/bug_report.md","./libraries/pico/.github/ISSUE_TEMPLATE/config.yml","./libraries/tailwind/tailwind.min.css","./libraries/tailwind/tailwind-mod.min.css","./libraries/tailwind/tailwind.min.js","./libraries/font-awesome/webfonts/fa-v4compatibility.ttf","./libraries/font-awesome/webfonts/fa-brands-400.ttf","./libraries/font-awesome/webfonts/fa-solid-900.ttf","./libraries/font-awesome/webfonts/fa-solid-900.woff2","./libraries/font-awesome/webfonts/fa-v4compatibility.woff2","./libraries/font-awesome/webfonts/fa-brands-400.woff2","./libraries/font-awesome/webfonts/fa-regular-400.ttf","./libraries/font-awesome/webfonts/fa-regular-400.woff2","./libraries/font-awesome/css/regular.min.css","./libraries/font-awesome/css/v5-font-face.min.css","./libraries/font-awesome/css/fontawesome.min.css","./libraries/font-awesome/css/brands.min.css","./libraries/font-awesome/css/fontawesome.css","./libraries/font-awesome/css/solid.min.css","./libraries/font-awesome/css/solid.css","./libraries/font-awesome/css/v4-shims.css","./libraries/font-awesome/css/v4-font-face.css","./libraries/font-awesome/css/all.css","./libraries/font-awesome/css/v4-font-face.min.css","./libraries/font-awesome/css/all.min.css","./libraries/font-awesome/css/v5-font-face.css","./libraries/font-awesome/css/svg-with-js.css","./libraries/font-awesome/css/v4-shims.min.css","./libraries/font-awesome/css/brands.css","./libraries/font-awesome/css/regular.css","./libraries/font-awesome/css/svg-with-js.min.css","./libraries/font-awesome/js/v4-shims.js","./libraries/font-awesome/js/fontawesome.min.js","./libraries/font-awesome/js/brands.min.js","./libraries/font-awesome/js/all.min.js","./libraries/font-awesome/js/regular.min.js","./libraries/font-awesome/js/regular.js","./libraries/font-awesome/js/conflict-detection.js","./libraries/font-awesome/js/all.js","./libraries/font-awesome/js/solid.min.js","./libraries/font-awesome/js/conflict-detection.min.js","./libraries/font-awesome/js/solid.js","./libraries/font-awesome/js/v4-shims.min.js","./libraries/font-awesome/js/fontawesome.js","./libraries/font-awesome/js/brands.js"]);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});