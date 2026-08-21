/**
 * HARF-E-RAAST — CMS RENDERER
 * Fetches all Decap CMS–managed JSON files from the _data/, _products/,
 * _collections/, and _journal/ folders and renders them into the live
 * index.html DOM.
 *
 * How it works:
 *   1. On page load, fetch() calls retrieve the JSON content files that
 *      Decap CMS writes to the repo via Git.
 *   2. The DOM is updated to reflect the CMS data — no hardcoded content
 *      remains authoritative once this script runs.
 *   3. Every field is optional. Missing values are hidden gracefully.
 *
 * Decap CMS writes content to:
 *   _data/hero.json, _data/announcement.json, _data/settings.json,
 *   _data/seo.json, _data/shipping.json, _data/payment.json,
 *   _data/features.json, _data/featured_artwork.json
 *   _products/*.json
 *   _collections/*.json
 *   _journal/*.json
 */

(async function HER_CMS_Render() {

  /* ── Helpers ─────────────────────────────────────────────── */
  async function fetchJSON(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  // Fetch a folder manifest. Because static hosting has no directory listing,
  // we use a pre-built manifest file (her-manifest.json) generated at build time.
  // For Netlify, a build plugin or simple script writes this file.
  // Falls back gracefully to empty array if absent.
  async function fetchManifest(name) {
    const data = await fetchJSON(`/her-manifest.json`);
    if (!data) return [];
    return data[name] || [];
  }

  function setText(el, val) {
    if (!el) return;
    if (val) { el.textContent = val; el.style.display = ''; }
    else { el.style.display = 'none'; }
  }
  function show(el, visible) {
    if (el) el.style.display = visible ? '' : 'none';
  }

  /* ── Load all data in parallel ───────────────────────────── */
  const [
    hero, announcement, settings, seo,
    shipping, payment, features, featuredArtwork,
    productFiles, collectionFiles, journalFiles,
  ] = await Promise.all([
    fetchJSON('/_data/hero.json'),
    fetchJSON('/_data/announcement.json'),
    fetchJSON('/_data/settings.json'),
    fetchJSON('/_data/seo.json'),
    fetchJSON('/_data/shipping.json'),
    fetchJSON('/_data/payment.json'),
    fetchJSON('/_data/features.json'),
    fetchJSON('/_data/featured_artwork.json'),
    fetchManifest('products'),
    fetchManifest('collections'),
    fetchManifest('journal'),
  ]);

  // Fetch individual product / collection / journal files
  const [products, collections, articles] = await Promise.all([
    Promise.all(productFiles.map(f => fetchJSON(`/_products/${f}`))),
    Promise.all(collectionFiles.map(f => fetchJSON(`/_collections/${f}`))),
    Promise.all(journalFiles.map(f => fetchJSON(`/_journal/${f}`))),
  ]);

  const enabledProducts    = products.filter(Boolean).filter(p => p.enabled !== false).sort((a,b) => (a.order||0)-(b.order||0));
  const enabledCollections = collections.filter(Boolean).filter(c => c.enabled !== false).sort((a,b) => (a.order||0)-(b.order||0));
  const enabledArticles    = articles.filter(Boolean).filter(a => a.published === true);

  /* ── 1. SEO ──────────────────────────────────────────────── */
  if (seo) {
    if (seo.meta_title) document.title = seo.meta_title;
    const md = document.querySelector('meta[name="description"]');
    if (md && seo.meta_description) md.content = seo.meta_description;
    const ogT = document.querySelector('meta[property="og:title"]');
    if (ogT && seo.meta_title) ogT.content = seo.meta_title;
    const ogD = document.querySelector('meta[property="og:description"]');
    if (ogD && seo.meta_description) ogD.content = seo.meta_description;
    if (seo.og_image) {
      let ogI = document.querySelector('meta[property="og:image"]');
      if (!ogI) { ogI = document.createElement('meta'); ogI.setAttribute('property','og:image'); document.head.appendChild(ogI); }
      ogI.content = seo.og_image;
    }
  }

  /* ── 2. Site Settings ────────────────────────────────────── */
  if (settings) {
    // Nav logo
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo && settings.brand_name) {
      const span = navLogo.querySelector('span');
      navLogo.childNodes[0].textContent = settings.brand_name + ' ';
      if (span && settings.brand_arabic) span.textContent = settings.brand_arabic.charAt(0);
    }
    // Footer
    const fbn = document.querySelector('.footer-brand-name');
    if (fbn && settings.brand_name) fbn.textContent = settings.brand_name;
    const fba = document.querySelector('.footer-brand-arabic');
    if (fba && settings.brand_arabic) fba.textContent = settings.brand_arabic;
    const fbt = document.querySelector('.footer-brand-text');
    if (fbt && settings.tagline) fbt.textContent = settings.tagline;
    const fcopy = document.querySelector('.footer-copy');
    if (fcopy && settings.copyright) fcopy.textContent = settings.copyright;
    // Social links
    const socLinks = document.querySelectorAll('.footer-social a');
    const socialVals = [settings.instagram, settings.pinterest, settings.linkedin].filter(Boolean);
    socLinks.forEach((a, i) => { if (socialVals[i]) a.href = socialVals[i]; });
    // Favicon
    if (settings.favicon) {
      let fav = document.querySelector("link[rel='icon']");
      if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
      fav.href = settings.favicon;
    }
  }

  /* ── 3. Feature gates ────────────────────────────────────── */
  const f = features || {};
  const secCollections = document.getElementById('collections');
  const secShop        = document.getElementById('shop');
  const secProcess     = document.getElementById('process');
  const secCraft       = document.getElementById('craft');
  const secCommission  = document.getElementById('commission');
  const secJournal     = document.getElementById('journal');
  const secFeatured    = document.getElementById('featured');

  show(secCollections, f.collections_section !== false);
  show(secShop,        f.shop_section !== false);
  show(secProcess,     f.process_section !== false);
  show(secCraft,       f.craft_section !== false);
  show(secCommission,  f.commission_section !== false);
  show(secJournal,     f.journal !== false);
  show(secFeatured,    f.featured_artwork !== false);

  /* ── 4. Announcement Bar ─────────────────────────────────── */
  const annBar = document.getElementById('her-announcement-bar');
  if (annBar && announcement) {
    const annEnabled = announcement.enabled === true && f.announcement_bar !== false;
    const activeItems = (announcement.items || [])
      .filter(i => i.enabled !== false && i.text)
      .sort((a, b) => (a.order||0) - (b.order||0));
    if (annEnabled && activeItems.length) {
      annBar.innerHTML = activeItems.map(i => {
        if (i.link) {
          const label = i.link_text || i.text;
          return `<a href="${i.link}" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">${label}</a>`;
        }
        return `<span>${i.text}</span>`;
      }).join('<span style="margin:0 12px;opacity:.4">·</span>');
      annBar.style.display = 'block';
    } else {
      annBar.style.display = 'none';
    }
  }

  /* ── 5. Hero ─────────────────────────────────────────────── */
  const heroSection = document.getElementById('hero');
  if (heroSection && hero) {
    show(heroSection, hero.enabled !== false);

    // Eyebrow
    const eyebrow = heroSection.querySelector('.hero-descriptor');
    if (eyebrow && hero.eyebrow !== undefined) {
      setText(eyebrow, hero.eyebrow);
    }

    // Headline lines
    const hl1 = heroSection.querySelector('.hl-line:nth-of-type(1)');
    const hl2 = heroSection.querySelector('.hl-line:nth-of-type(2)');
    const hl3 = heroSection.querySelector('.hl-line-italic');
    // Use querySelectorAll for robustness
    const allLines = heroSection.querySelectorAll('.hl-line, .hl-line-italic');
    const lineData = [hero.headline_line_1, hero.headline_line_2, hero.headline_line_3];
    allLines.forEach((el, i) => {
      if (lineData[i] !== undefined) {
        el.textContent = lineData[i] || '';
        el.style.display = lineData[i] ? '' : 'none';
      }
    });

    // Subheading
    const sub = heroSection.querySelector('.hero-sub');
    if (sub && hero.subheading !== undefined) {
      sub.textContent = hero.subheading || '';
      sub.style.display = hero.subheading ? '' : 'none';
    }

    // CTAs
    const ctaWrap = heroSection.querySelector('.hero-ctas');
    if (ctaWrap) {
      const primary = ctaWrap.querySelector('.btn-primary');
      if (primary) {
        if (hero.cta_primary_text) {
          const span = primary.querySelector('span');
          if (span) span.textContent = hero.cta_primary_text;
          if (hero.cta_primary_link) primary.href = hero.cta_primary_link;
          primary.style.display = '';
        } else {
          primary.style.display = 'none';
        }
      }
      const ghost = ctaWrap.querySelector('.btn-ghost');
      if (ghost) {
        if (hero.cta_secondary_text) {
          // First text node
          const tn = Array.from(ghost.childNodes).find(n => n.nodeType === 3);
          if (tn) tn.textContent = hero.cta_secondary_text + ' ';
          if (hero.cta_secondary_link) ghost.href = hero.cta_secondary_link;
          ghost.style.display = '';
        } else {
          ghost.style.display = 'none';
        }
      }
    }

    // Focal calligraphy
    const focalInner = heroSection.querySelector('.hero-calligraphy-inner');
    if (focalInner && hero.focal_arabic) focalInner.textContent = hero.focal_arabic;
    const focalLabel = heroSection.querySelector('.hero-calligraphy-label');
    if (focalLabel && hero.focal_label) focalLabel.textContent = hero.focal_label;

    // Edition tag
    const edTag = heroSection.querySelector('.hero-edition');
    if (edTag) setText(edTag, hero.edition_tag);

    // Custom hero image — overlaid on the CSS canvas
    const imgSrc = hero.image_desktop || hero.image_mobile || '';
    if (imgSrc) {
      const canvas = document.getElementById('heroCanvas');
      if (canvas) {
        // Inject an <img> absolutely filling the canvas
        let heroImg = canvas.querySelector('.her-hero-img');
        if (!heroImg) {
          heroImg = document.createElement('img');
          heroImg.className = 'her-hero-img';
          heroImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:.55;';
          canvas.appendChild(heroImg);
        }
        heroImg.src = imgSrc;
        heroImg.alt = hero.focal_label || 'Hero artwork';
      }
    }
  }

  /* ── 6. Collections ──────────────────────────────────────── */
  const colSection = document.getElementById('collections');
  if (colSection && f.collections_section !== false && enabledCollections.length) {
    const grid = colSection.querySelector('.collections-grid');
    if (grid) {
      grid.innerHTML = enabledCollections.map((c, i) => {
        const delay = i > 0 ? ` sr-delay-${Math.min(i, 3)}` : '';
        const bgContent = c.image
          ? `<img src="${c.image}" alt="${c.name||''}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
          : `<div class="collection-art-bg ${c.bg_class||''}"></div>`;
        return `
        <div class="collection-card sr${delay}">
          <div class="collection-art">
            ${bgContent}
            ${c.arabic ? `<div class="collection-arabic">${c.arabic}</div>` : ''}
          </div>
          <div class="collection-info">
            ${c.tag     ? `<div class="collection-tag">${c.tag}</div>` : ''}
            ${c.name    ? `<div class="collection-name">${c.name}</div>` : ''}
            ${c.description ? `<div class="collection-desc">${c.description}</div>` : ''}
            <a href="#" class="collection-cta">
              ${c.name ? `Explore ${c.name}` : 'Explore'}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </a>
          </div>
        </div>`;
      }).join('');

      // Re-observe for scroll-reveal
      if (window.__herIO) {
        grid.querySelectorAll('.sr').forEach(el => window.__herIO.observe(el));
      }
      // Re-attach cursor hover
      grid.querySelectorAll('.collection-card').forEach(el => {
        el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('hover'));
        el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('hover'));
      });
    }
  }

  /* ── 7. Featured Artwork ─────────────────────────────────── */
  if (secFeatured && featuredArtwork) {
    if (featuredArtwork.enabled === false || f.featured_artwork === false) {
      show(secFeatured, false);
    } else {
      show(secFeatured, true);
      setText(secFeatured.querySelector('.featured-eyebrow'), featuredArtwork.eyebrow);
      const ftitle = secFeatured.querySelector('.featured-title');
      if (ftitle && featuredArtwork.title) ftitle.innerHTML = featuredArtwork.title;
      setText(secFeatured.querySelector('.featured-body'),          featuredArtwork.body);
      setText(secFeatured.querySelector('.featured-arabic-large'),  featuredArtwork.arabic);
      setText(secFeatured.querySelector('.featured-num'),           featuredArtwork.ref_num);

      // Meta fields
      const metaEl = secFeatured.querySelector('.featured-meta');
      if (metaEl && Array.isArray(featuredArtwork.meta)) {
        metaEl.innerHTML = featuredArtwork.meta
          .filter(m => m.label || m.value)
          .map(m => `
            <div>
              <div class="meta-label">${m.label||''}</div>
              <div class="meta-value">${m.value||''}</div>
            </div>`).join('');
      }

      // CTA
      const fcta = secFeatured.querySelector('.btn-primary');
      if (fcta) {
        if (featuredArtwork.cta_text) {
          const sp = fcta.querySelector('span');
          if (sp) sp.textContent = featuredArtwork.cta_text;
          if (featuredArtwork.cta_link) fcta.href = featuredArtwork.cta_link;
          fcta.style.display = '';
        } else { fcta.style.display = 'none'; }
      }

      // Custom image
      if (featuredArtwork.image) {
        const artBg = secFeatured.querySelector('.featured-artwork-bg');
        if (artBg) {
          artBg.style.backgroundImage  = `url('${featuredArtwork.image}')`;
          artBg.style.backgroundSize   = 'cover';
          artBg.style.backgroundPosition = 'center';
        }
      }
    }
  }

  /* ── 8. Products / Shop ──────────────────────────────────── */
  const shopSection = document.getElementById('shop');
  if (shopSection && f.shop_section !== false) {
    const grid = shopSection.querySelector('.products-grid');
    if (grid) {
      if (enabledProducts.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--warm-gray);font-family:var(--serif);font-style:italic;font-size:1.1rem;">No artworks available at this time.</div>`;
      } else {
        const offsets = ['', 'margin-top:40px', '', 'margin-top:20px'];
        const salesOn = f.sales !== false;

        grid.innerHTML = enabledProducts.map((p, i) => {
          const delay = i > 0 ? ` sr-delay-${Math.min(i, 3)}` : '';
          const hasSale = salesOn && p.sale_enabled && p.sale_label;

          // Resolve collection name for display
          const colMatch = enabledCollections.find(c => c.name === p.collection);
          const colLabel = colMatch ? colMatch.name : (p.collection || '');

          // Background — image takes priority over CSS gradient
          const bgContent = p.image
            ? `<img src="${p.image}" alt="${p.name||''}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
            : `<div class="product-img-bg ${p.bg_class||'p-col-1'}"></div>${p.arabic ? `<div class="product-arabic">${p.arabic}</div>` : ''}`;

          return `
          <div class="product-card sr${delay}" style="${offsets[i % 4]||''}">
            <div class="product-img">
              ${bgContent}
              <div class="product-wishlist">
                <svg viewBox="0 0 16 16" fill="none" stroke="#11110F" stroke-width="1.5" width="14" height="14"><path d="M8 13.5S2 9.5 2 5.5a3 3 0 0 1 6 0 3 3 0 0 1 6 0c0 4-6 8-6 8z"/></svg>
              </div>
              ${hasSale ? `<div style="position:absolute;top:14px;left:14px;background:var(--champagne);color:var(--obsidian);font-family:var(--sans);font-size:.6rem;letter-spacing:.12em;padding:3px 8px;font-weight:500;z-index:5">${p.sale_label}</div>` : ''}
              ${p.badge ? `<div style="position:absolute;top:14px;${hasSale?'left:100px':'left:14px'};background:var(--obsidian);color:var(--warm-ivory);font-family:var(--sans);font-size:.6rem;letter-spacing:.12em;padding:3px 8px;z-index:5">${p.badge}</div>` : ''}
              <div class="product-quick">Quick View</div>
            </div>
            ${colLabel ? `<div class="product-collection">${colLabel} Collection</div>` : ''}
            ${p.name ? `<div class="product-name">${p.name}</div>` : ''}
            <div class="product-price" style="${!p.price && !p.original_price ? 'display:none' : ''}">
              ${p.original_price && hasSale ? `<span style="text-decoration:line-through;color:var(--warm-gray);font-size:.72rem;margin-right:6px;">${p.original_price}</span>` : ''}
              ${p.price ? `<span>${p.price}</span>` : ''}
            </div>
          </div>`;
        }).join('');

        if (window.__herIO) {
          grid.querySelectorAll('.sr').forEach(el => window.__herIO.observe(el));
        }
        grid.querySelectorAll('.product-img').forEach(el => {
          el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('hover'));
          el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('hover'));
        });
      }
    }
  }

  /* ── 9. Journal ──────────────────────────────────────────── */
  if (secJournal) {
    if (f.journal === false || enabledArticles.length === 0) {
      show(secJournal, false);
    } else {
      show(secJournal, true);
      const jgrid = secJournal.querySelector('.journal-grid');
      if (jgrid) {
        const bgClasses = ['j-bg-1','j-bg-2','j-bg-3'];
        jgrid.innerHTML = enabledArticles.map((a, i) => {
          const delay = i > 0 ? ` sr-delay-${Math.min(i,3)}` : '';
          const bg = bgClasses[i % 3];
          return `
          <div class="journal-card sr${delay}">
            <div class="journal-img ${bg}" ${a.image ? `style="background-image:url('${a.image}');background-size:cover;background-position:center;"` : ''}>
              ${!a.image && a.arabic ? `<div class="journal-img-arabic">${a.arabic}</div>` : ''}
            </div>
            ${a.category ? `<div class="journal-cat">${a.category}</div>` : ''}
            ${a.title    ? `<h3 class="journal-title">${a.title}</h3>` : ''}
            ${a.excerpt  ? `<p class="journal-excerpt">${a.excerpt}</p>` : ''}
            <a href="#" class="journal-read">
              Read
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </a>
          </div>`;
        }).join('');

        if (window.__herIO) {
          jgrid.querySelectorAll('.sr').forEach(el => window.__herIO.observe(el));
        }
      }
    }
  }

  /* ── 10. Re-attach cursor link events after DOM updates ──── */
  setTimeout(() => {
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('link'));
      el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('link'));
    });
  }, 80);

})();
