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
      document.getElementById('exportPWA').classList = "";
      
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
  
          // Insert the script tag before the closing body tag
          const scriptTag = `
    <script>
      // service worker for progressive web app
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js')
        })
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
    const serviceWorkerCode = `// Service worker code
const cacheName = '${appName}-cache';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(${JSON.stringify(filesToCache)});
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
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