import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
    import { TGALoader } from 'three/addons/loaders/TGALoader.js';
    import JSZip from 'jszip';

    const __originalWarn = console.warn.bind(console);
    console.warn = (...args) => {
      const msg = String(args[0] || '');
      if (msg.includes('FBXLoader: Image type "fbm" is not supported')) {
        setStatus('FBXLoader reported .fbm image type. Try changing Embedded FBX texture type and reload the FBX.');
      }
      __originalWarn(...args);
    };

    const SKETCHFAB_API = 'https://api.sketchfab.com/v3';

    const state = {
      sketchfabToken: localStorage.getItem('sketchfab_token') || '',
      selectedFiles: [],
      selectedMainFile: null,
      patchedUploadFile: null,
      selectedTextures: [],
      textureUrls: [],
      results: [],
      urlMap: new Map(),
      objectUrls: [],
      selectedLicense: 'by'
    };

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    function setStatus(message) {
      $('status').textContent = message;
      window.parent?.postMessage({
        type: 'dashboard:model3d-share-status',
        status: String(message || '')
      }, window.location.origin);
    }

    function authHeaders() {
      return state.sketchfabToken ? { Authorization: `Token ${state.sketchfabToken}` } : {};
    }

    async function fetchJson(url, options = {}) {
      const res = await fetch(url, options);
      let data;
      try { data = await res.json(); } catch (_) { data = {}; }
      if (!res.ok) throw new Error(data.detail || data.error || data.message || (await res.text()).trim() || 'API error');
      return data;
    }

    function isTextureFile(file) {
      return /\.(png|jpe?g|webp|bmp|gif|tga)$/i.test(file?.name || '');
    }

    function isPackageRecommended(file) {
      const n = file?.name?.toLowerCase() || '';
      return n.endsWith('.fbx') || n.endsWith('.obj') || n.endsWith('.dae') || n.endsWith('.blend');
    }

    function pickMainFile(files) {
      const priority = ['.glb', '.gltf', '.zip', '.fbx', '.obj', '.blend', '.dae', '.stl', '.ply'];
      for (const ext of priority) {
        const found = files.find(f => f.name.toLowerCase().endsWith(ext));
        if (found) return found;
      }
      return files[0] || null;
    }

    function pickPreviewFile(files) {
      for (const ext of ['.glb', '.gltf', '.zip', '.fbx']) {
        const found = files.find(f => f.name.toLowerCase().endsWith(ext));
        if (found) return found;
      }
      return null;
    }

    function clearObjectUrls() {
      state.objectUrls.forEach(URL.revokeObjectURL);
      state.objectUrls = [];
      state.textureUrls = [];
      state.urlMap = new Map();
    }

    function buildFileMaps(files) {
      clearObjectUrls();
      state.selectedTextures = files.filter(isTextureFile);

      for (const file of files) {
        const url = URL.createObjectURL(file);
        state.objectUrls.push(url);

        if (isTextureFile(file)) {
          state.textureUrls.push({ file, url, stem: file.name.replace(/\.[^.]+$/, '').toLowerCase() });
        }

        const rel = (file.webkitRelativePath || file.name).replaceAll('\\', '/');
        const base = rel.split('/').pop();
        const parentless = rel.replace(/^.*?\.fbm\//i, '');
        const stem = base.replace(/\.[^.]+$/, '').toLowerCase();

        const keys = new Set([
          rel, rel.toLowerCase(),
          file.name, file.name.toLowerCase(),
          base, base.toLowerCase(),
          parentless, parentless.toLowerCase(),
          stem
        ]);

        const fbmIndex = rel.toLowerCase().indexOf('.fbm/');
        if (fbmIndex !== -1) {
          const fbmSuffix = rel.slice(fbmIndex + 5);
          keys.add(fbmSuffix);
          keys.add(fbmSuffix.toLowerCase());
        }

        for (const key of keys) state.urlMap.set(key, url);
      }

      renderTextureList();
    }

    function renderTextureList() {
      const el = $('textureList');
      if (!state.selectedTextures.length) {
        el.innerHTML = '<p class="muted">No texture files selected.</p>';
        return;
      }

      el.innerHTML = state.selectedTextures.map((file, index) => `
        <label class="textureItem">
          <input type="radio" name="primaryTexture" value="${index}" ${index === 0 ? 'checked' : ''}>
          ${esc(file.webkitRelativePath || file.name)}
        </label>
      `).join('');
    }

    function getPrimaryTextureIndex() {
      const checked = document.querySelector('input[name="primaryTexture"]:checked');
      return checked ? Number(checked.value) : 0;
    }

    function normalizeAssetPath(value) {
      return decodeURIComponent(String(value || ''))
        .replace(/^file:\/\//i, '')
        .replace(/^https?:\/\/[^/]+\//i, '')
        .replace(/^blob:null\//i, '')
        .replace(/^blob:[^/]+\/?/i, '')
        .replace(/^null\//i, '')
        .replaceAll('\\', '/')
        .replace(/^\.?\//, '')
        .trim();
    }

    function resolveLocalAssetURL(raw) {
      const clean = normalizeAssetPath(raw);
      const base = clean.split('/').pop();
      const noQueryBase = base?.split('?')[0]?.split('#')[0];
      const cleanNoQuery = clean.split('?')[0].split('#')[0];

      const candidates = [
        clean,
        cleanNoQuery,
        clean.toLowerCase(),
        cleanNoQuery.toLowerCase(),
        base,
        noQueryBase,
        base?.toLowerCase(),
        noQueryBase?.toLowerCase(),
        clean.replace(/^.*?\.fbm\//i, ''),
        cleanNoQuery.replace(/^.*?\.fbm\//i, ''),
        clean.replace(/^.*?\//, ''),
        cleanNoQuery.replace(/^.*?\//, '')
      ].filter(Boolean);

      for (const c of candidates) {
        if (state.urlMap.has(c)) return state.urlMap.get(c);
      }

      return raw;
    }

    async function getFilesFromDataTransfer(dataTransfer) {
      const directFiles = [...(dataTransfer?.files || [])];
      const items = [...(dataTransfer?.items || [])];
      const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean);

      if (!entries.length) return directFiles;

      async function readEntry(entry, path = '') {
        if (entry.isFile) {
          return new Promise(resolve => {
            entry.file(file => {
              Object.defineProperty(file, 'webkitRelativePath', { value: path + file.name, configurable: true });
              resolve([file]);
            }, () => resolve([]));
          });
        }

        if (entry.isDirectory) {
          const reader = entry.createReader();
          const children = [];

          async function readBatch() {
            const batch = await new Promise(resolve => reader.readEntries(resolve));
            if (!batch.length) return;
            children.push(...batch);
            await readBatch();
          }

          await readBatch();
          const nested = await Promise.all(children.map(child => readEntry(child, path + entry.name + '/')));
          return nested.flat();
        }

        return [];
      }

      const nested = await Promise.all(entries.map(entry => readEntry(entry)));
      const files = nested.flat();
      return files.length ? files : directFiles;
    }

    async function makeUploadFile() {
      if (!state.selectedFiles.length) return null;

      const originalMain = state.selectedMainFile || pickMainFile(state.selectedFiles);
      if (!originalMain) return null;

      const patchedMain = await makePatchedFbxFileIfNeeded(originalMain);
      const shouldZip = state.selectedFiles.length > 1 || isPackageRecommended(originalMain);

      // Single packed FBX: upload the same patched FBX that made the preview work.
      if (!shouldZip) return patchedMain;

      // Multi-file upload: zip everything, replacing the main FBX with the patched copy.
      const zip = new JSZip();

      for (const file of state.selectedFiles) {
        const isMain = file === originalMain || file.name === originalMain.name;
        const fileToAdd = isMain ? patchedMain : file;
        const originalPath = file.webkitRelativePath || file.name;
        const path = isMain ? originalPath.replace(/[^/\\]+$/, patchedMain.name) : originalPath;
        zip.file(path, fileToAdd);
      }

      if (patchedMain !== originalMain) {
        zip.file(
          'README_TEXTURE_PATCH.txt',
          `This upload includes a patched FBX because the original embedded texture references ended in .fbm.\n` +
          `Patch target extension: ${getEmbeddedTextureExtensionHint()}\n` +
          `Original FBX: ${originalMain.name}\n` +
          `Patched FBX: ${patchedMain.name}\n`
        );
      }

      const base = originalMain.name.replace(/\.[^.]+$/, '');
      const blob = await zip.generateAsync({ type: 'blob' });
      return new File([blob], `${base}_with_textures.zip`, { type: 'application/zip' });
    }

    async function selectModelFiles(files, options = {}) {
      files = [...files].filter(Boolean);
      if (!files.length) return;

      const main = pickMainFile(files);
      const preview = pickPreviewFile(files);

      state.selectedFiles = files;
      state.selectedMainFile = main;
      state.patchedUploadFile = null;
      $('postUploadActions')?.classList.remove('show');
      buildFileMaps(files);

      $('selectedModelName').textContent = files.length > 1
        ? `${main.name} + ${files.length - 1} support file(s)`
        : main.name;

      if (!$('uploadName').value) $('uploadName').value = main.name.replace(/\.[^.]+$/, '');

      if (options.preview === false) {
        setStatus(`${main.name} selected for background upload.`);
        return;
      }

      if (preview) {
        setStatus(`Previewing ${preview.name}…`);
        try {
          await viewer.loadLocalFile(preview);
          setStatus(`Preview loaded: ${preview.name}. Texture files selected: ${state.selectedTextures.length}.`);
        } catch (err) {
          setStatus(`Preview failed: ${err.message}`);
        }
        return;
      }

      setStatus(`${main.name} selected. Preview supports GLB/glTF/ZIP/FBX.`);
    }


    function extractSketchfabModelUid(uploadResponseText) {
      try {
        const data = JSON.parse(uploadResponseText);

        const candidates = [
          data.uid,
          data.id,
          data.modelId,
          data.model_id,
          data.uri,
          data.url,
          data.viewerUrl,
          data.model?.uid,
          data.model?.id,
          data.model?.uri,
          data.model?.url
        ].filter(Boolean).map(String);

        for (const value of candidates) {
          const uidMatch = value.match(/[a-f0-9]{32}/i);
          if (uidMatch) return uidMatch[0];
        }
      } catch {}

      const match = String(uploadResponseText || '').match(/[a-f0-9]{32}/i);
      return match ? match[0] : '';
    }

    function showPostUploadLinks(uid) {
      const box = $('postUploadActions');
      const view = $('openModelLink');
      const props = $('openPropertiesLink');
      if (!box || !view || !props || !uid) return;

      const modelUrl = `https://sketchfab.com/3d-models/${uid}`;
      const propertiesUrl = `${modelUrl}/properties`;

      view.href = modelUrl;
      props.href = propertiesUrl;
      box.classList.add('show');

      if ($('aiReminderUsed')?.checked) {
        setStatus(`Upload accepted. Opening Sketchfab model properties so you can enable the AI disclosure toggle.\n${propertiesUrl}`);

        // Open automatically after upload if AI checkbox enabled.
        setTimeout(() => {
          openAiNoticeModal(propertiesUrl);
        }, 350);
      }
    }



    const LICENSE_LABELS = {
      'by': 'CC Attribution',
      'by-sa': 'CC Attribution-ShareAlike',
      'by-nd': 'CC Attribution-NoDerivatives',
      'by-nc': 'CC Attribution-NonCommercial',
      'by-nc-sa': 'CC Attribution-NonCommercial-ShareAlike',
      'by-nc-nd': 'CC Attribution-NonCommercial-NoDerivatives',
      'cc0': 'CC0',
      'free-st': 'Free Standard',
      'st': 'Standard',
      'ed': 'Editorial'
    };

    function setDownloadMode(mode) {
      const normalized = ['no', 'free', 'store'].includes(mode) ? mode : 'no';
      $('downloadMode').value = normalized;

      document.querySelectorAll('[data-download-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.downloadMode === normalized);
      });

      $('freeLicensePanel')?.classList.toggle('show', normalized === 'free');

      if (normalized === 'store') {
        setStatus('Store uploads cannot be configured through the public Sketchfab upload API. Configure Store/Fab manually after upload.');
      }
    }

    function currentModalLicenseSlug() {
      if ($('licenseFreeStandard')?.checked) return 'free-st';

      const nc = $('licenseNonCommercial')?.checked;
      const nd = $('licenseNoDerivatives')?.checked;
      const sa = $('licenseShareAlike')?.checked;

      if (nc && nd) return 'by-nc-nd';
      if (nc && sa) return 'by-nc-sa';
      if (nc) return 'by-nc';
      if (nd) return 'by-nd';
      if (sa) return 'by-sa';
      return 'by';
    }

    function syncLicenseModalFromState() {
      const slug = state.selectedLicense || 'by';

      if ($('licenseFreeStandard')) $('licenseFreeStandard').checked = slug === 'free-st';
      if ($('licenseNonCommercial')) $('licenseNonCommercial').checked = slug.includes('-nc');
      if ($('licenseNoDerivatives')) $('licenseNoDerivatives').checked = slug.includes('-nd');
      if ($('licenseShareAlike')) $('licenseShareAlike').checked = slug.includes('-sa');

      if (slug !== 'free-st' && $('licenseFreeStandard')) {
        $('licenseFreeStandard').checked = false;
      }
    }

    function updateLicenseLabel() {
      const label = LICENSE_LABELS[state.selectedLicense] || LICENSE_LABELS.by;
      if ($('selectedLicenseLabel')) $('selectedLicenseLabel').textContent = label;
    }

    function openLicenseModal() {
      syncLicenseModalFromState();
      $('licenseModalBackdrop')?.classList.add('show');
      $('licenseModalBackdrop')?.setAttribute('aria-hidden', 'false');
    }

    function closeLicenseModal() {
      $('licenseModalBackdrop')?.classList.remove('show');
      $('licenseModalBackdrop')?.setAttribute('aria-hidden', 'true');
    }

    function selectLicenseFromModal() {
      state.selectedLicense = currentModalLicenseSlug();
      updateLicenseLabel();
      closeLicenseModal();
    }

    function setupLicenseControls() {
      document.querySelectorAll('[data-download-mode]').forEach(btn => {
        btn.onclick = () => setDownloadMode(btn.dataset.downloadMode);
      });

      $('changeLicenseBtn').onclick = openLicenseModal;
      $('closeLicenseModalBtn').onclick = closeLicenseModal;
      $('cancelLicenseBtn').onclick = closeLicenseModal;
      $('selectLicenseBtn').onclick = selectLicenseFromModal;

      $('licenseModalBackdrop').addEventListener('click', event => {
        if (event.target === $('licenseModalBackdrop')) closeLicenseModal();
      });

      $('licenseFreeStandard').addEventListener('change', () => {
        if ($('licenseFreeStandard').checked) {
          $('licenseNonCommercial').checked = false;
          $('licenseNoDerivatives').checked = false;
          $('licenseShareAlike').checked = false;
        }
      });

      ['licenseNonCommercial', 'licenseNoDerivatives', 'licenseShareAlike'].forEach(id => {
        $(id).addEventListener('change', () => {
          $('licenseFreeStandard').checked = false;
          if (id === 'licenseNoDerivatives' && $('licenseNoDerivatives').checked) {
            $('licenseShareAlike').checked = false;
          }
          if (id === 'licenseShareAlike' && $('licenseShareAlike').checked) {
            $('licenseNoDerivatives').checked = false;
          }
        });
      });

      updateLicenseLabel();
      setDownloadMode($('downloadMode')?.value || 'no');
    }


    async function uploadToSketchfab() {
      if (!state.sketchfabToken) {
        const status = 'Paste and save a Sketchfab API token first.';
        setStatus(status);
        return { ok: false, status };
      }
      const file = await makeUploadFile();
      if (!file) {
        const status = 'Choose or drop a model first.';
        setStatus(status);
        return { ok: false, status };
      }

      const form = new FormData();
      form.set('modelFile', file);
      form.set('name', $('uploadName').value || file.name.replace(/\.[^.]+$/, ''));
      form.set('description', $('uploadDescription').value || '');
      form.set('tags', $('uploadTags').value || '');
      const categories = selectedCategories();
      if (categories.length) {
        form.set('categories', categories.join(','));
        form.set('category', categories[0]);
      }

      const visibility = $('visibilitySelect')?.value || 'public';
      form.set('private', visibility === 'private' ? '1' : '0');

      const publishNow = $('uploadDraft')?.checked ?? true;
      form.set('isPublished', publishNow ? '1' : '0');

      const downloadMode = $('downloadMode')?.value || 'no';

      // UI only has No / Free / Store.
      // Free uses the selected license. Default is CC Attribution => "by".
      // Store is not exposed by the public upload API and must be configured manually.
      if (downloadMode === 'free') {
        form.set('license', state.selectedLicense || 'by');
      }

      if ($('allowTextureInspection')?.checked) {
        form.set('isInspectable', '1');
      } else {
        form.set('isInspectable', '0');
      }

      if ($('ageRestricted')?.checked) {
        form.set('isAgeRestricted', '1');
      }

      // Website-only toggles:
      // - Allow comments
      // - Promotional content
      // - Created with generative AI tools
      // They are not documented upload API fields. Do not send fake fields.
      form.set('source', '3d-model-sharer');

      setStatus(`Uploading ${file.name}${file.name.endsWith('.zip') ? ' packaged with textures / patched FBX if needed' : ''}…`);
      try {
        const res = await fetch(`${SKETCHFAB_API}/models`, { method: 'POST', headers: authHeaders(), body: form });
        const text = await res.text();
        if (!res.ok) throw new Error(text);

        const uid = extractSketchfabModelUid(text);
        if (uid) {
          showPostUploadLinks(uid);
          const modelUrl = `https://sketchfab.com/3d-models/${uid}`;
          if (!$('aiReminderUsed')?.checked) {
            setStatus(`Upload accepted by Sketchfab. Use “Open model properties” to adjust website-only settings if needed.`);
          }
          return { ok: true, uid, modelUrl, status: $('status').textContent || 'Upload accepted by Sketchfab.' };
        } else {
          setStatus(`Upload accepted by Sketchfab: ${text}\nCould not detect model UID automatically. Use Sketchfab dashboard to edit properties.`);
          return { ok: true, status: $('status').textContent || 'Upload accepted by Sketchfab.' };
        }
      } catch (err) {
        setStatus(`Upload failed: ${err.message}`);
        return { ok: false, status: $('status').textContent || `Upload failed: ${err.message}` };
      }
    }

    async function fetchDashboardModelFile(modelUrl, fileName) {
      const res = await fetch(modelUrl);
      if (!res.ok) throw new Error(`Failed to fetch model from dashboard (${res.status}).`);
      const blob = await res.blob();
      return new File([blob], fileName || 'dashboard-model.glb', { type: blob.type || 'model/gltf-binary' });
    }

    async function shareDashboardModelToTarget(payload) {
      const target = String(payload?.target || 'sketchfab').toLowerCase();
      if (target !== 'sketchfab') throw new Error('Only Sketchfab sharing is available right now.');
      const file = await fetchDashboardModelFile(payload.modelUrl, payload.fileName);
      await selectModelFiles([file], { preview: false });
      if (payload.name) $('uploadName').value = payload.name;
      if (payload.description) $('uploadDescription').value = payload.description;
      return await uploadToSketchfab();
    }

    window.addEventListener('message', async event => {
      const payload = event.data || {};
      if (!payload || payload.type !== 'dashboard:model3d-share') return;
      const requestId = payload.requestId || '';
      try {
        const result = await shareDashboardModelToTarget(payload);
        event.source?.postMessage({
          type: 'dashboard:model3d-share-result',
          requestId,
          ...result
        }, event.origin || window.location.origin);
      } catch (err) {
        event.source?.postMessage({
          type: 'dashboard:model3d-share-result',
          requestId,
          ok: false,
          status: err?.message || '3D model share failed.'
        }, event.origin || window.location.origin);
      }
    });

    async function searchSketchfab() {
      const params = new URLSearchParams({
        type: 'models',
        q: $('queryInput').value.trim() || 'model',
        sort_by: $('sortInput').value,
        count: '12'
      });
      if ($('downloadableInput').checked) params.set('downloadable', 'true');

      setStatus('Searching Sketchfab…');
      try {
        const data = await fetchJson(`${SKETCHFAB_API}/search?${params}`);
        state.results = data.results || [];
        renderResults();
        setStatus(`Found ${state.results.length} Sketchfab models.`);
      } catch (err) {
        setStatus(`Search failed: ${err.message}`);
      }
    }

    function renderResults() {
      $('results').innerHTML = state.results.length ? state.results.map(model => `
        <article class="result">
          <img src="${esc(model.thumbnails?.images?.[0]?.url || '')}" alt="" />
          <div>
            <strong>${esc(model.name)}</strong>
            <small>${esc(model.user?.displayName || model.user?.username || 'Unknown')}</small>
            <div class="toolbar">
              <button data-import="${esc(model.uid)}" ${model.isDownloadable ? '' : 'disabled'}>Import</button>
              <button data-open="${esc(model.viewerUrl || `https://sketchfab.com/3d-models/${model.uid}`)}">Open</button>
            </div>
          </div>
        </article>
      `).join('') : '<p class="muted">No results.</p>';

      document.querySelectorAll('[data-import]').forEach(btn => {
        btn.onclick = () => importSketchfab(btn.dataset.import);
      });
      document.querySelectorAll('[data-open]').forEach(btn => {
        btn.onclick = () => window.open(btn.dataset.open, '_blank', 'noopener');
      });
    }

    async function importSketchfab(uid) {
      if (!state.sketchfabToken) return setStatus('Paste and save a Sketchfab API token first.');
      const model = state.results.find(r => r.uid === uid);
      setStatus(`Requesting Sketchfab download for ${model?.name || uid}…`);

      try {
        const info = await fetchJson(`${SKETCHFAB_API}/models/${uid}/download`, { headers: authHeaders() });
        const item = info.glb || info.gltf;
        if (!item?.url) throw new Error('No GLB/glTF URL returned.');
        await viewer.loadFromSketchfabDownload(item.url, Boolean(info.gltf && !info.glb), model?.name || uid);
      } catch (err) {
        setStatus(`Import failed: ${err.message}`);
      }
    }

    const FALLBACK_CATEGORIES = [
      { name: 'Animals & Pets', slug: 'animals-pets' },
      { name: 'Architecture', slug: 'architecture' },
      { name: 'Art & Abstract', slug: 'art-abstract' },
      { name: 'Cars & Vehicles', slug: 'cars-vehicles' },
      { name: 'Characters & Creatures', slug: 'characters-creatures' },
      { name: 'Cultural Heritage & History', slug: 'cultural-heritage-history' },
      { name: 'Electronics & Gadgets', slug: 'electronics-gadgets' },
      { name: 'Fashion & Style', slug: 'fashion-style' },
      { name: 'Food & Drink', slug: 'food-drink' },
      { name: 'Furniture & Home', slug: 'furniture-home' },
      { name: 'Music', slug: 'music' },
      { name: 'Nature & Plants', slug: 'nature-plants' },
      { name: 'News & Politics', slug: 'news-politics' },
      { name: 'People', slug: 'people' },
      { name: 'Places & Travel', slug: 'places-travel' },
      { name: 'Science & Technology', slug: 'science-technology' },
      { name: 'Sports & Fitness', slug: 'sports-fitness' },
      { name: 'Weapons & Military', slug: 'weapons-military' }
    ];

    function normalizeCategory(raw) {
      return {
        name: raw.name || raw.label || raw.displayName || raw.slug || raw.uid || 'Category',
        slug: raw.slug || raw.uid || raw.id || raw.name
      };
    }

    function renderCategories(categories = FALLBACK_CATEGORIES) {
      const el = $('categoryList');
      if (!el) return;
      el.innerHTML = categories.map(cat => `
        <label class="categoryItem">
          <input type="checkbox" name="category" value="${esc(cat.slug)}">
          ${esc(cat.name)}
        </label>
      `).join('');
    }

    async function fetchSketchfabCategories() {
      const status = $('categoryStatus');
      try {
        if (status) status.textContent = 'Fetching categories from Sketchfab API…';
        const res = await fetch(`${SKETCHFAB_API}/categories`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error || 'Category fetch failed');

        const raw = data.results || data.categories || data;
        const categories = Array.isArray(raw) ? raw.map(normalizeCategory) : FALLBACK_CATEGORIES;
        renderCategories(categories);
        if (status) status.textContent = `Loaded ${categories.length} categories from API.`;
      } catch (err) {
        renderCategories(FALLBACK_CATEGORIES);
        if (status) status.textContent = `Using fallback categories. API fetch failed: ${err.message}`;
      }
    }

    function selectedCategories() {
      return [...document.querySelectorAll('input[name="category"]:checked')].map(el => el.value);
    }



    function setupUI() {
      $('sketchfabToken').value = state.sketchfabToken;
      setupLicenseControls();

      fetchSketchfabCategories();
      $('refreshCategoriesBtn').onclick = fetchSketchfabCategories;

      $('closeAiNoticeBtn').onclick = closeAiNoticeModal;
      $('continueToPropertiesBtn').onclick = () => {
        closeAiNoticeModal();
        window.open(pendingPropertiesUrl, '_blank', 'noopener');
      };

      $('chooseModelBtn').onclick = () => $('modelFileInput').click();
      $('chooseFolderBtn').onclick = () => $('modelFolderInput').click();
      $('modelFileInput').onchange = (e) => selectModelFiles(e.target.files);
      $('modelFolderInput').onchange = (e) => selectModelFiles(e.target.files);

      const dz = $('dropzone');
      ['dragenter', 'dragover'].forEach(type => dz.addEventListener(type, e => {
        e.preventDefault();
        dz.classList.add('dragover');
      }));
      ['dragleave', 'drop'].forEach(type => dz.addEventListener(type, e => {
        e.preventDefault();
        dz.classList.remove('dragover');
      }));
      dz.addEventListener('drop', async e => {
        const files = await getFilesFromDataTransfer(e.dataTransfer);
        selectModelFiles(files);
      });

      $('clearModelBtn').onclick = () => {
        state.selectedFiles = [];
        state.selectedMainFile = null;
        state.patchedUploadFile = null;
        state.selectedTextures = [];
        clearObjectUrls();
        $('modelFileInput').value = '';
        $('modelFolderInput').value = '';
        $('selectedModelName').textContent = 'No model selected';
        $('uploadName').value = '';
        renderTextureList();
        setStatus('Selection cleared.');
      };

      $('applyTexturesBtn').onclick = () => viewer.applySelectedTextures();

      $('saveKeys').onclick = () => {
        state.sketchfabToken = $('sketchfabToken').value.trim();
        localStorage.setItem('sketchfab_token', state.sketchfabToken);
        setStatus('Sketchfab token saved locally.');
      };

      $('clearKeys').onclick = () => {
        state.sketchfabToken = '';
        $('sketchfabToken').value = '';
        localStorage.removeItem('sketchfab_token');
        setStatus('Sketchfab token cleared.');
      };

      $('searchBtn').onclick = searchSketchfab;
      $('queryInput').onkeydown = e => { if (e.key === 'Enter') searchSketchfab(); };
      $('uploadSketchfabBtn').onclick = uploadToSketchfab;
      $('frameBtn').onclick = () => viewer.frame();
      $('wireBtn').onclick = () => viewer.toggleWireframe();
      $('gridBtn').onclick = () => viewer.toggleGrid();

      // Dynamic warning box text based on AI checkbox state.
      const aiWarningBox = $('aiWarningBox');
      const aiReminderUsed = $('aiReminderUsed');
      function updateAiWarning() {
        if (aiReminderUsed.checked) {
          aiWarningBox.innerHTML = '<strong>AI-created model reminder</strong><br>' +
            'Sketchfab\'s "Created with generative AI tools" setting is not exposed as a public upload API field.' +
            '<br>If this model used AI, enable that setting manually in Sketchfab after upload.';
        } else {
          const btnHtml = '<button id="openAiPropertiesBtn" type="button" style="margin-left:.25rem;padding:.2rem .45rem;font-size:.78rem;">Open Properties</button>';
          aiWarningBox.innerHTML = 'Note: If you used AI in your process, enable <em>Created with generative AI tools</em> ' + btnHtml + ' after upload.';
          const btn = aiWarningBox.querySelector('#openAiPropertiesBtn');
          if (btn) {
            btn.onclick = () => {
              window.open('https://sketchfab.com/settings/properties', '_blank', 'noopener');
            };
          }
        }
      }
      aiReminderUsed.addEventListener('change', updateAiWarning);
      updateAiWarning();
    }


    function getEmbeddedTextureExtensionHint() {
      const el = $('embeddedTextureExt');
      return (el?.value || 'png').toLowerCase();
    }

    function extensionToFourChars(ext) {
      // FBX binary string properties include fixed lengths, so replacement must stay 4 chars.
      // .png, .jpg, .tga, .bmp are 4 chars. .webp is 5, so use .png as a parser-safe fallback.
      if (ext === 'jpg' || ext === 'jpeg') return '.jpg';
      if (ext === 'tga') return '.tga';
      if (ext === 'bmp') return '.bmp';
      return '.png';
    }

    function patchFbxFbmTextureReferences(arrayBuffer, extHint = 'png') {
      const replacement = extensionToFourChars(extHint);
      const input = new Uint8Array(arrayBuffer);
      const output = new Uint8Array(input);
      const repl = replacement.split('').map(ch => ch.charCodeAt(0));
      const patterns = [
        [46, 102, 98, 109], // .fbm
        [46, 70, 66, 77],   // .FBM
        [46, 70, 98, 109],  // .Fbm
      ];
      let replacements = 0;

      for (let i = 0; i <= output.length - 4; i++) {
        for (const p of patterns) {
          if (output[i] === p[0] && output[i + 1] === p[1] && output[i + 2] === p[2] && output[i + 3] === p[3]) {
            output[i] = repl[0];
            output[i + 1] = repl[1];
            output[i + 2] = repl[2];
            output[i + 3] = repl[3];
            replacements++;
            break;
          }
        }
      }

      return { buffer: output.buffer, replacements, replacement };
    }

    async function makePatchedFbxFileIfNeeded(file) {
      if (!file || !file.name.toLowerCase().endsWith('.fbx')) return file;

      if (state.patchedUploadFile && state.patchedUploadFile.name.toLowerCase().endsWith('.fbx')) {
        return state.patchedUploadFile;
      }

      const originalBuffer = await file.arrayBuffer();
      const patch = patchFbxFbmTextureReferences(originalBuffer, getEmbeddedTextureExtensionHint());

      if (!patch.replacements) return file;

      const patchedName = file.name.replace(/\.fbx$/i, `_patched_${patch.replacement.slice(1)}.fbx`);
      const patched = new File([patch.buffer], patchedName, {
        type: file.type || 'application/octet-stream',
        lastModified: file.lastModified
      });

      state.patchedUploadFile = patched;
      return patched;
    }

    let pendingPropertiesUrl = '';

    function closeAiNoticeModal() {
      $('aiNoticeModal')?.classList.remove('show');
      $('aiNoticeModal')?.setAttribute('aria-hidden', 'true');
    }

    function openAiNoticeModal(propertiesUrl) {
      pendingPropertiesUrl = propertiesUrl;
      $('aiNoticeModal')?.classList.add('show');
      $('aiNoticeModal')?.setAttribute('aria-hidden', 'false');
      const countdownEl = $('aiCountdownInline');
      let countdown = 3;
      if (countdownEl) {
        countdownEl.textContent = `(${countdown})`;
      }
      const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          if (countdownEl) {
            countdownEl.textContent = `(${countdown})`;
          }
        } else {
          clearInterval(interval);
          if (countdownEl) {
            countdownEl.textContent = '';
          }
          window.open(propertiesUrl, '_blank', 'noopener');
        }
      }, 1000);
    }

    function createViewer() {
      const canvas = $('sketchfab-viewer');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070b12);

      const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 5000);
      camera.position.set(3.2, 2.2, 4.4);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.HemisphereLight(0xffffff, 0x172033, 2.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(4, 7, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8fb6ff, 1.2);
      rim.position.set(-4, 3, -5);
      scene.add(rim);

      const grid = new THREE.GridHelper(12, 24, 0x4c5bff, 0x1c2638);
      grid.position.y = -0.01;
      scene.add(grid);

      let currentModel = null;
      let wireframe = false;
      let modelUrls = [];
      let materialIndex = 0;

      function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
      }

      function disposeModel() {
        if (!currentModel) return;
        scene.remove(currentModel);
        currentModel.traverse(obj => {
          obj.geometry?.dispose?.();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material].filter(Boolean);
          mats.forEach(mat => {
            if (mat.map) mat.map.dispose?.();
            mat?.dispose?.();
          });
        });
        currentModel = null;
        modelUrls.forEach(URL.revokeObjectURL);
        modelUrls = [];
        materialIndex = 0;
      }

      function frame() {
        if (!currentModel) return;
        const box = new THREE.Box3().setFromObject(currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const distance = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5))) * 1.6;
        camera.position.copy(center).addScaledVector(new THREE.Vector3(1.1, .72, 1).normalize(), distance);
        camera.near = Math.max(distance / 1000, .001);
        camera.far = distance * 1000;
        camera.updateProjectionMatrix();
        controls.target.copy(center);
        controls.update();
      }

      function setWire(root, enabled) {
        root?.traverse(obj => {
          if (!obj.isMesh) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => { if (m) m.wireframe = enabled; });
        });
      }

      function inspect(name) {
        let meshes = 0, tris = 0, mats = new Set();
        currentModel?.traverse(obj => {
          if (!obj.isMesh) return;
          meshes++;
          if (obj.geometry?.index) tris += obj.geometry.index.count / 3;
          else if (obj.geometry?.attributes?.position) tris += obj.geometry.attributes.position.count / 3;
          const matList = Array.isArray(obj.material) ? obj.material : [obj.material];
          matList.filter(Boolean).forEach(m => mats.add(m.uuid));
        });
        $('meshCount').textContent = meshes;
        $('triCount').textContent = Math.round(tris).toLocaleString();
        $('matCount').textContent = mats.size;
        $('sourceName').textContent = name.slice(0, 18);
      }

      function makeLocalManager() {
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(resolveLocalAssetURL);
        manager.addHandler(/\.tga$/i, new TGALoader(manager));
        return manager;
      }

      function scoreTextureForTarget(textureInfo, targetName) {
        const target = String(targetName || '').toLowerCase();
        if (!target) return 0;

        let score = 0;
        if (textureInfo.stem === target) score += 100;
        if (textureInfo.stem.includes(target)) score += 40;
        if (target.includes(textureInfo.stem)) score += 40;
        if (textureInfo.stem.includes('diffuse') || textureInfo.stem.includes('albedo') || textureInfo.stem.includes('basecolor') || textureInfo.stem.includes('base_color')) score += 15;
        return score;
      }

      function chooseTextureForMaterial(mat, meshName, index) {
        if (!state.textureUrls.length) return null;

        const mode = $('textureMode').value;
        if (mode === 'none') return null;

        if (mode === 'force') {
          return state.textureUrls[getPrimaryTextureIndex()] || state.textureUrls[0];
        }

        if (mode === 'cycle') {
          return state.textureUrls[index % state.textureUrls.length];
        }

        let best = null;
        let bestScore = -1;
        for (const tex of state.textureUrls) {
          const score =
            scoreTextureForTarget(tex, mat?.name) +
            scoreTextureForTarget(tex, meshName);

          if (score > bestScore) {
            best = tex;
            bestScore = score;
          }
        }

        return best || state.textureUrls[getPrimaryTextureIndex()] || state.textureUrls[0];
      }

      function loadTextureFromInfo(info, manager) {
        const ext = info.file.name.toLowerCase().split('.').pop();
        const loader = ext === 'tga' ? new TGALoader(manager) : new THREE.TextureLoader(manager);
        const texture = loader.load(info.url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        return texture;
      }

      function applySelectedTextures() {
        if (!currentModel) {
          setStatus('No model loaded.');
          return;
        }

        if (!state.textureUrls.length) {
          setStatus('No texture files selected. Choose/drop the FBX folder or select the FBX plus image files.');
          return;
        }

        const manager = makeLocalManager();
        let applied = 0;
        let index = 0;

        currentModel.traverse(obj => {
          if (!obj.isMesh || !obj.material) return;

          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

          for (const mat of materials) {
            const chosen = chooseTextureForMaterial(mat, obj.name, index++);
            if (!chosen) continue;

            try {
              if (mat.map) mat.map.dispose?.();

              const tex = loadTextureFromInfo(chosen, manager);
              mat.map = tex;

              if (mat.color) mat.color.set(0xffffff);
              if ('roughness' in mat) mat.roughness = 0.75;
              if ('metalness' in mat) mat.metalness = 0.0;

              mat.needsUpdate = true;
              applied++;
            } catch (err) {
              console.warn('Could not apply texture', chosen.file.name, err);
            }
          }
        });

        setStatus(`Applied ${applied} texture map(s) from selected files.`);
      }

      async function loadGltfUrl(url, name = 'Model', manager = undefined) {
        const loader = new GLTFLoader(manager);
        await new Promise((resolve, reject) => {
          loader.load(url, gltf => {
            disposeModel();
            currentModel = gltf.scene || gltf.scenes[0];
            scene.add(currentModel);
            setWire(currentModel, wireframe);
            frame();
            inspect(name);
            resolve();
          }, undefined, reject);
        });
      }

      async function loadFbxFile(file, name = 'FBX Model', manager = undefined) {
        const loader = new FBXLoader(manager);
        const originalBuffer = await file.arrayBuffer();

        // Some packed FBX files expose embedded texture names as "something.fbm".
        // FBXLoader treats the extension as the image type and refuses to decode it.
        // Patch the binary before parsing so embedded images are attempted as PNG/JPG/etc.
        const patch = patchFbxFbmTextureReferences(originalBuffer, getEmbeddedTextureExtensionHint());
        const bufferToParse = patch.replacements ? patch.buffer : originalBuffer;

        if (patch.replacements) {
          state.patchedUploadFile = new File(
            [patch.buffer],
            file.name.replace(/\.fbx$/i, `_patched_${patch.replacement.slice(1)}.fbx`),
            { type: file.type || 'application/octet-stream', lastModified: file.lastModified }
          );
        }

        await new Promise((resolve, reject) => {
          try {
            disposeModel();
            currentModel = loader.parse(bufferToParse, '');
            scene.add(currentModel);
            setWire(currentModel, wireframe);
            frame();
            inspect(name);

            if (typeof applySelectedTextures === 'function' && state.selectedTextures?.length) {
              applySelectedTextures();
            }

            setStatus(
              patch.replacements
                ? `Preview loaded: ${name}. Patched ${patch.replacements} embedded .fbm texture reference(s) to ${patch.replacement}.`
                : `Preview loaded: ${name}. No embedded .fbm references found to patch.`
            );

            resolve();
          } catch (err) {
            reject(err);
          }
        });
      }

      async function loadZipFromBlob(blob, name) {
        const zip = await JSZip.loadAsync(blob);
        const files = Object.values(zip.files).filter(f => !f.dir);
        const glb = files.find(f => f.name.toLowerCase().endsWith('.glb'));
        const gltf = files.find(f => f.name.toLowerCase().endsWith('.gltf'));

        if (glb) {
          const url = URL.createObjectURL(await glb.async('blob'));
          modelUrls.push(url);
          return loadGltfUrl(url, name);
        }
        if (!gltf) throw new Error('Zip did not contain .glb or .gltf');

        const map = new Map();
        for (const entry of files) {
          const url = URL.createObjectURL(await entry.async('blob'));
          modelUrls.push(url);
          map.set(entry.name, url);
          map.set(entry.name.split('/').pop(), url);
        }

        const base = gltf.name.slice(0, gltf.name.lastIndexOf('/') + 1);
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(raw => {
          const clean = normalizeAssetPath(raw);
          return map.get(clean) || map.get(base + clean) || map.get(clean.split('/').pop()) || raw;
        });

        const loader = new GLTFLoader(manager);
        const text = await gltf.async('text');
        await new Promise((resolve, reject) => {
          loader.parse(text, '', parsed => {
            disposeModel();
            currentModel = parsed.scene || parsed.scenes[0];
            scene.add(currentModel);
            frame();
            inspect(name);
            resolve();
          }, reject);
        });
      }

      async function loadLocalFile(file) {
        const n = file.name.toLowerCase();
        const manager = makeLocalManager();

        if (n.endsWith('.zip')) return loadZipFromBlob(file, file.name);
        if (n.endsWith('.fbx')) return loadFbxFile(file, file.name, manager);

        const url = URL.createObjectURL(file);
        modelUrls.push(url);
        return loadGltfUrl(url, file.name, manager);
      }

      async function loadFromSketchfabDownload(url, zipped, name) {
        if (!zipped) return loadGltfUrl(url, name);
        const res = await fetch(url);
        if (!res.ok) throw new Error(await res.text());
        return loadZipFromBlob(await res.blob(), name);
      }

      const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
      resizeObserver?.observe(canvas.parentElement);
      addEventListener('resize', resize);
      resize();

      function animate() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }
      animate();

      return {
        loadLocalFile,
        loadUrl: loadGltfUrl,
        loadFromSketchfabDownload,
        frame,
        applySelectedTextures,
        toggleGrid: () => { grid.visible = !grid.visible; },
        toggleWireframe: () => { wireframe = !wireframe; setWire(currentModel, wireframe); },
      };
    }

    const viewer = createViewer();
    setupUI();