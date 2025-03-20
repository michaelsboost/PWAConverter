// Project App
const app = {
  // Array to store metadata
  metadata: {},
  filesToCache: [],
  indexHTML: "",

  // Function to handle importing the zip file
  importPWA: async () => {
    const fileInput = document.getElementById('loadFile');
    const file = fileInput.files[0];

    if (!file || file.type !== 'application/zip') {
      document.getElementById('exportPWA').classList = "hidden";
      alert('Please select a valid zip file.');
      return;
    }

    try {
      document.getElementById('exportPWA').classList = "mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md";
      
      // Extract metadata from the zip file
      const { metadata, zipContents } = await app.extractMetadataAndFilesToCache(file);

      // Update metadata object
      Object.assign(app.metadata, metadata);

      // Store zipContents in the app object
      app.zipContents = zipContents;

      // Populate input fields with metadata
      // document.getElementById('appName').value = app.metadata.appName || '';
//       document.getElementById('appTitle').value = app.metadata.appTitle || '';
//       document.getElementById('appDesc').value = app.metadata.appDesc || '';
    } catch (error) {
      console.error('Error importing PWA:', error);
    }
  },

  // Function to extract metadata and files to cache from the zip file
  extractMetadataAndFilesToCache: async (file) => {
      try {
          // Use FileReader to read the zip file content
          const zipData = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsArrayBuffer(file);
          });
  
          // Use JSZip to load the zip data asynchronously
          const zip = await JSZip.loadAsync(zipData);
  
          // Get the content of index.html file
          let indexHtml = await zip.file('index.html').async("text");
          
          // Check if the <link> tag with rel="manifest" exists
          const manifestLinkRegex = /<link\s+rel="manifest"\s+href="([^"]+)"\s*\/?>/i;
          const manifestLinkMatch = indexHtml.match(manifestLinkRegex);
          
          // Match the closing title tag
          const closingTitleTagRegex = /<\/title>/i;
          const closingTitleTagIndex = indexHtml.search(closingTitleTagRegex);
          
          if (closingTitleTagIndex !== -1) {
              // Insert the manifest link right after the closing title tag
              indexHtml = indexHtml.slice(0, closingTitleTagIndex + 8) + '\n    <link rel="manifest" href="manifest.json">' + indexHtml.slice(closingTitleTagIndex + 8);
          } else {
              console.error('Closing title tag not found in index.html');
          }
  
          // Insert the script tag before the closing body tag
          const scriptTag = `
    <script src="https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js"></script>
    <script>
      // service worker for progressive web app
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                // Notify the user and reload if they confirm
                if (confirm('A new version is available. Reload now?')) {
                  window.location.reload();
                }
              }
            });
          });
        });
    
        // Ensure immediate activation of a new service worker
        navigator.serviceWorker.ready.then(registration => {
          registration.active.postMessage({ type: 'SKIP_WAITING' });
        });
      }
    </script>`;
          indexHtml = indexHtml.replace(/<\/body>/i, `${scriptTag}
  </body>`);
          app.indexHTML = indexHtml;
  
          // Regular expressions to find metadata within index.html
          const appNameRegex = /<meta\s+name="application-name"\s+content="([^"]+)"\s*\/?>/i;
          const appTitleRegex = /<title>([^<]+)<\/title>/i;
          const appDescRegex = /<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/i;
  
          // Match the regular expressions against the index.html content
          const appNameMatch = indexHtml.match(appNameRegex);
          const appTitleMatch = indexHtml.match(appTitleRegex);
          const appDescMatch = indexHtml.match(appDescRegex);
  
          // Extract metadata if matches are found
          const metadata = {};
          if (appNameMatch) {
              metadata.appName = appNameMatch[1];
          } else {
              metadata.appName = prompt('Enter the Application Name:');
          }
          if (appTitleMatch) {
              metadata.appTitle = appTitleMatch[1];
          } else {
              metadata.appTitle = prompt('Enter the Application Title:');
          }
          if (appDescMatch) {
              metadata.appDesc = appDescMatch[1];
          } else {
              metadata.appDesc = prompt('Enter the Application Description:');
          }
  
          // Store the list of files to cache
          const filesToCache = Object.values(zip.files)
              .filter(file => file !== null && file !== undefined)
              .map(file => ({
                  path: file.name,
                  content: file._data,
              }));
  
          // Update the filesToCache array directly
          app.filesToCache = filesToCache;
  
          // Return the extracted metadata and updated index.html content
          return { metadata, indexHtml };
      } catch (error) {
          console.error('Error extracting metadata and files to cache:', error);
          return { metadata: {}, indexHtml: '' }; // Return an empty metadata object and empty string for index.html content in case of error
      }
  },

  // Function to handle converting to a PWA
  convertToPWA: () => {
    // Get user input for additional metadata
//     app.metadata.appName = document.getElementById('appName').value;
//     app.metadata.appTitle = document.getElementById('appTitle').value;
//     app.metadata.appDesc = document.getElementById('appDesc').value;
    // You can also handle other metadata here

    // Generate service worker code based on metadata and imported files
    const serviceWorkerCode = app.generateServiceWorker(app.metadata, app.filesToCache);

    // Optionally, generate other PWA files (manifest.json, icons, etc.)

    // Download the generated files as a zip
    app.downloadPWA(serviceWorkerCode, app.filesToCache);
  },

  // Function to generate service worker code
  generateServiceWorker: (metadata, importedFiles) => {
    // Generate service worker code based on metadata and imported files
    const appName = metadata.appName || 'Your App Name';
    const appTitle = metadata.appTitle || 'Your App Title';
    const appDesc = metadata.appDesc || 'Your App Description';

    // Create the service worker code
    let filesToCache = [];

    // Add imported files to the cache
    importedFiles.forEach((file) => {
      filesToCache.push(`./${file.path}`); // Assuming 'path' is the property containing the file path
    });

    // Create the service worker code with dynamic caching
    const serviceWorkerCode = `// Import Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const { registerRoute } = workbox.routing;
const { NetworkFirst, StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;
const { clientsClaim, skipWaiting } = workbox.core;

// Define cache name dynamically based on the project name
const cacheName = '${appName}-cache';

// Force update when a new service worker is available
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Immediately apply new service worker
});

// Clear old caches when activating a new service worker
self.addEventListener('activate', async (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== cacheName) // Keep only the latest cache
          .map(name => caches.delete(name)) // Delete old caches
      );
    })
  );
  clientsClaim(); // Take control of all open clients
});

// Use Network First for scripts, styles, and documents (ensures updates)
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'document',
  new NetworkFirst({
    cacheName: cacheName,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache images, fonts, audio, and video for performance
registerRoute(
  ({ request }) =>
    request.destination === 'image' || request.destination === 'font' ||
    request.destination === 'audio' || request.destination === 'video',
  new CacheFirst({
    cacheName: cacheName,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50, // Limit stored assets
        maxAgeSeconds: 7 * 24 * 60 * 60, // Cache for 7 days
      }),
    ],
  })
);

// Listen for messages to skip waiting and apply new updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});`;

    return serviceWorkerCode;
  },

  // Function to download the PWA
  downloadPWA: async (serviceWorkerCode) => {
    try {
      const fileInput = document.getElementById('loadFile');
      const file = fileInput.files[0];
      
      if (!file) {
        alert('Please select a zip file first.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(event) {
        const zip = new JSZip();
        zip.loadAsync(event.target.result).then(function(contents) {

          // Add service worker file
          zip.file('sw.js', serviceWorkerCode);
    
          // Add manifest file
          const manifestJSONCode = `{
    "theme_color":      "hsl(207, 31%, 11%)",
    "background_color": "hsl(207, 31%, 11%)",
    "display":          "standalone",
    "start_url":        "./index.html",
    "lang":             "en-US",
    "name":             "${app.metadata.appName || "Your App Name"}",
    "short_name":       "${app.metadata.appName || "Your App Name"}",
    "description" :     "${app.metadata.appDesc || "Your App Description"}",
    "icons": [
        {
            "src":     "./imgs/icon-192x192.png",
            "sizes":   "192x192",
            "type":    "image/png",
            "purpose": "any"
        },
        {
            "src":     "./imgs/icon-256x256.png",
            "sizes":   "256x256",
            "type":    "image/png",
            "purpose": "any"
        },
        {
            "src":     "./imgs/icon-384x384.png",
            "sizes":   "384x384",
            "type":    "image/png",
            "purpose": "any"
        },
        {
            "src":     "./imgs/icon-512x512.png",
            "sizes":   "512x512",
            "type":    "image/png",
            "purpose": "maskable"
        }
    ]
}`;
          zip.file('manifest.json', manifestJSONCode);
          
          // Save service worker script to load in index.html
          zip.file('index.html', app.indexHTML);
          
          const base64Content = document.getElementById('logo').src;
          // base64 encoded data doesn't contain commas    
          let base64ContentArray = base64Content.split(",");
          // base64 content cannot contain whitespaces but nevertheless skip if there are!
          let mimeType = base64Content.substring("data:image/".length, base64Content.indexOf(";base64"));
      
          let logoType;
          if (mimeType === 'image/png') {
            zip.file("imgs/logo.png", logo.src.split('base64,')[1],{base64: true});
            logoType = 'png';
          }
          if (mimeType === 'image/jpeg') {
            zip.file("imgs/logo.jpeg", logo.src.split('base64,')[1],{base64: true});
            logoType = 'jpeg';
          }
          if (mimeType === 'image/svg+xml') {
            zip.file("imgs/logo.svg", logo.src.split('base64,')[1],{base64: true});
            logoType = 'svg';
          }
    
          // save images for manifest.json
          zip.file("imgs/icon-192x192.png", document.querySelectorAll('[data-image]')[0].src.split('base64,')[1],{base64: true});
          zip.file("imgs/icon-256x256.png", document.querySelectorAll('[data-image]')[1].src.split('base64,')[1],{base64: true});
          zip.file("imgs/icon-384x384.png", document.querySelectorAll('[data-image]')[2].src.split('base64,')[1],{base64: true});
          zip.file("imgs/icon-512x512.png", document.querySelectorAll('[data-image]')[3].src.split('base64,')[1],{base64: true});
          zip.file("imgs/logo.png",         document.querySelectorAll('[data-image]')[4].src.split('base64,')[1],{base64: true});
          
          // Generate a new zip file
          zip.generateAsync({type:"blob"}).then(function(content) {
            // Trigger the download of the new zip file
            saveAs(content, `${app.metadata.appName || "appName"}-pwa.zip`);
          });
        });
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error generating and downloading PWA:', error);
    }
  },

  // Function to validate file
  validateFile: () => {
    const fileInput = document.getElementById('loadFile');
    const file = fileInput.files[0];

    if (file && file.type !== 'application/zip') {
      alert('Please select a valid zip file.');
      fileInput.value = ''; // Clear the file input
      return;
    }

    // If the file is valid, proceed with importing and extracting metadata
    app.importPWA();
  },

  // Initialize application function
  init: () => {
    // Function to validate file
    document.getElementById('loadFile').onchange = () => {
      app.validateFile();
    };

    // Convert to PWA when button is clicked
    document.getElementById('exportPWA').onclick = () => {
      app.convertToPWA();
    };

    // Convert logo to png images for manifest.json
    let embedImage = (source, size) => {
      // Load images
      let image = new Image();
      image.src = source;
      image.onload = function() {
        let canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(this, 0, 0, size, size);
        let imageURL = canvas.toDataURL("image/png");
        let newImage = document.createElement("img");
            newImage.classList.add("hidden");
            newImage.setAttribute("data-image", "");
            newImage.src = imageURL;

        // Append new image
        document.body.appendChild(newImage);
      }
    }
    
    // Function to load logo
    importlogo.onchange = () => {
      let reader = new FileReader();
    
      reader.onload = (e) => {
        // grab file
        logo.src = e.target.result;

        // remove images if they already exist for exporting
        if (document.querySelector('[data-image]')) {
          document.querySelectorAll('[data-image]').forEach((child, index) => {
            child.remove();
          });
        }

        // convert create logo image sizes for manifest.json
        let imageArr = ['192', '256', '384', '512', logo.width];
        for (let i of imageArr) {
          embedImage(logo.src, i);
        }
      }
      reader.readAsDataURL(importlogo.files[0]);
    }

    // Convert create logo image sizes for manifest.json
    let imageArr = ['192', '256', '384', '512', logo.width];
    for (let i of imageArr) {
      embedImage(logo.src, i);
    }
  }
};

// Check if FileReader API is available
if (!window.FileReader) {
  alert('File API & FileReader API not supported!');
}

// Initialize application
app.init();