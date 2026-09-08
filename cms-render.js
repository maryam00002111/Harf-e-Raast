/**
 * HARF-E-RAAST — CMS RENDERER v2
 *
 * Changes from v1:
 *  - Product cards / collection cards / journal cards all link to real pages
 *  - Slugs derived from filename (passed via manifest) or name-based fallback
 *  - "VIEW" cursor removed — cursor ID no longer touched here
 *  - WhatsApp link built from settings.whatsapp_number (CMS field)
 *  - Footer social links wired correctly
 *  - All href="#" dead links replaced with real destinations
 */

(async function HER_CMS_Render() {

  /* ── Helpers ─────────────────────────────────────────────────── */
  async function fetchJSON(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function fetchManifest(name) {
    const data = await fetchJSON('/her-manifest.json');
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

  // Derive a URL slug from a filename like "01-noor-i.json" → "noor-i"
  // or from a product name "Gold Spiral" → "gold-spiral"
  function slugFromFilename(filename) {
    return filename
      .replace(/\.json$/, '')        // remove extension
      .replace(/^\d+-/, '')          // remove leading "01-" numbering
      .toLowerCase();
  }
  function slugFromName(name) {
    return (name || 'artwork')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* ── Load all data in parallel ───────────────────────────────── */
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

  const [rawProducts, rawCollections, rawArticles] = await Promise.all([
    Promise.all(productFiles.map(f => fetchJSON('/_products/' + f).then(d => d ? { ...d, _slug: slugFromFilename(f) } : null))),
    Promise.all(collectionFiles.map(f => fetchJSON('/_collections/' + f).then(d => d ? { ...d, _slug: slugFromFilename(f) } : null))),
    Promise.all(journalFiles.map(f => fetchJSON('/_journal/' + f).then(d => d ? { ...d, _slug: slugFromFilename(f) } : null))),
  ]);

  const enabledProducts    = rawProducts.filter(Boolean).filter(p => p.enabled !== false).sort((a,b) => (a.order||0)-(b.order||0));
  const enabledCollections = rawCollections.filter(Boolean).filter(c => c.enabled !== false).sort((a,b) => (a.order||0)-(b.order||0));
  const enabledArticles    = rawArticles.filter(Boolean).filter(a => a.published === true);

  // Store globally so product/collection/journal pages can access
  window.__HER = { products: enabledProducts, collections: enabledCollections, articles: enabledArticles, settings, shipping, payment, features };

  const f = features || {};

  /* ── 1. SEO ──────────────────────────────────────────────────── */
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

  /* ── 2. Site Settings ────────────────────────────────────────── */
  if (settings) {
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo && settings.brand_name) {
      const span = navLogo.querySelector('span');
      navLogo.childNodes[0].textContent = settings.brand_name + ' ';
      if (span && settings.brand_arabic) span.textContent = settings.brand_arabic.charAt(0);
    }
    const fbn = document.querySelector('.footer-brand-name');
    if (fbn && settings.brand_name) fbn.textContent = settings.brand_name;
    const fba = document.querySelector('.footer-brand-arabic');
    if (fba && settings.brand_arabic) fba.textContent = settings.brand_arabic;
    const fbt = document.querySelector('.footer-brand-text');
    if (fbt && settings.tagline) fbt.textContent = settings.tagline;
    const fcopy = document.querySelector('.footer-copy');
    if (fcopy && settings.copyright) fcopy.textContent = settings.copyright;

    // Social links — wire correctly from CMS
    const socLinks = document.querySelectorAll('.footer-social a');
    const socialMap = [
      { href: settings.instagram, label: 'Instagram' },
      { href: settings.pinterest, label: 'Pinterest' },
      { href: settings.linkedin,  label: 'LinkedIn' },
    ];
    socLinks.forEach((a, i) => {
      const m = socialMap[i];
      if (m && m.href) {
        a.href = m.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      } else {
        a.style.display = 'none';
      }
    });

    // Email link in footer
    if (settings.email) {
      document.querySelectorAll('a[href^="mailto"], .footer-email').forEach(a => {
        a.href = 'mailto:' + settings.email;
        a.textContent = settings.email;
      });
    }

    // WhatsApp
    const waNum = (settings.whatsapp_number || settings.whatsapp || '').replace(/\D/g,'');
    if (waNum) {
      const waMsg = encodeURIComponent('Hello Harf-e-Raast, I would like to discuss a custom artwork commission.');
      const waUrl = 'https://wa.me/' + waNum + '?text=' + waMsg;
      document.querySelectorAll('.her-whatsapp-btn, a[href*="wa.me"]').forEach(a => {
        a.href = waUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      });
    }

    // Favicon
    if (settings.favicon) {
      let fav = document.querySelector("link[rel='icon']");
      if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
      fav.href = settings.favicon;
    }
  }

  /* ── 3. Feature gates ────────────────────────────────────────── */
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

  /* ── 4. Announcement Bar ─────────────────────────────────────── */
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
          return '<a href="' + i.link + '" style="color:inherit;text-decoration:underline;text-underline-offset:2px;">' + label + '</a>';
        }
        return '<span>' + i.text + '</span>';
      }).join('<span style="margin:0 12px;opacity:.4">·</span>');
      annBar.style.display = 'block';
    } else {
      annBar.style.display = 'none';
    }
  }

  /* ── 5. Hero ─────────────────────────────────────────────────── */
  const heroSection = document.getElementById('hero');
  if (heroSection && hero) {
    show(heroSection, hero.enabled !== false);
    const eyebrow = heroSection.querySelector('.hero-descriptor');
    if (eyebrow && hero.eyebrow !== undefined) setText(eyebrow, hero.eyebrow);

    const allLines = heroSection.querySelectorAll('.hl-line, .hl-line-italic');
    const lineData = [hero.headline_line_1, hero.headline_line_2, hero.headline_line_3];
    allLines.forEach((el, i) => {
      if (lineData[i] !== undefined) {
        el.textContent = lineData[i] || '';
        el.style.display = lineData[i] ? '' : 'none';
      }
    });

    const sub = heroSection.querySelector('.hero-sub');
    if (sub && hero.subheading !== undefined) {
      sub.textContent = hero.subheading || '';
      sub.style.display = hero.subheading ? '' : 'none';
    }

    const ctaWrap = heroSection.querySelector('.hero-ctas');
    if (ctaWrap) {
      const primary = ctaWrap.querySelector('.btn-primary');
      if (primary) {
        if (hero.cta_primary_text) {
          const span = primary.querySelector('span');
          if (span) span.textContent = hero.cta_primary_text;
          if (hero.cta_primary_link) primary.href = hero.cta_primary_link;
          primary.style.display = '';
        } else { primary.style.display = 'none'; }
      }
      const ghost = ctaWrap.querySelector('.btn-ghost');
      if (ghost) {
        if (hero.cta_secondary_text) {
          const tn = Array.from(ghost.childNodes).find(n => n.nodeType === 3);
          if (tn) tn.textContent = hero.cta_secondary_text + ' ';
          if (hero.cta_secondary_link) ghost.href = hero.cta_secondary_link;
          ghost.style.display = '';
        } else { ghost.style.display = 'none'; }
      }
    }

    const focalInner = heroSection.querySelector('.hero-calligraphy-inner');
    if (focalInner) focalInner.textContent = hero.focal_arabic || '';
    const focalLabel = heroSection.querySelector('.hero-calligraphy-label');
    if (focalLabel) focalLabel.textContent = hero.focal_label || '';
    const edTag = heroSection.querySelector('.hero-edition');
    if (edTag) setText(edTag, hero.edition_tag);

    const imgSrc = hero.image_desktop || hero.image_mobile || '';
    if (imgSrc) {
      const canvas = document.getElementById('heroCanvas');
      if (canvas) {
        let heroImg = canvas.querySelector('.her-hero-img');
        if (!heroImg) {
          heroImg = document.createElement('img');
          heroImg.className = 'her-hero-img';
          heroImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:.6;';
          canvas.appendChild(heroImg);
        }
        heroImg.src = imgSrc;
        heroImg.alt = hero.focal_label || 'Hero artwork';
      }
    }
  }

  /* ── 6. Collections ──────────────────────────────────────────── */
  if (secCollections && f.collections_section !== false && enabledCollections.length) {
    const grid = secCollections.querySelector('.collections-grid');
    if (grid) {
      grid.innerHTML = enabledCollections.map((c, i) => {
        const delay = i > 0 ? ' sr-delay-' + Math.min(i, 3) : '';
        const slug = c._slug || slugFromName(c.name);
        const href = '/collection/' + slug + '/';
        const bgContent = c.image
          ? '<img src="' + c.image + '" alt="' + (c.name||'') + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">'
          : '<div class="collection-art-bg ' + (c.bg_class||'') + '"></div>';
        return '<div class="collection-card sr' + delay + '" style="cursor:pointer" onclick="location.href=\'' + href + '\'">' +
          '<div class="collection-art">' +
            bgContent +
            (c.arabic ? '<div class="collection-arabic">' + c.arabic + '</div>' : '') +
          '</div>' +
          '<div class="collection-info">' +
            (c.tag  ? '<div class="collection-tag">'  + c.tag  + '</div>' : '') +
            (c.name ? '<div class="collection-name">' + c.name + '</div>' : '') +
            (c.description ? '<div class="collection-desc">' + c.description + '</div>' : '') +
            '<a href="' + href + '" class="collection-cta">' +
              (c.name ? 'Explore ' + c.name : 'Explore') +
              '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M3 8h10M9 4l4 4-4 4"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>';
      }).join('');

      if (window.__herIO) grid.querySelectorAll('.sr').forEach(el => window.__herIO.observe(el));
    }
  }

  /* ── 7. Featured Artwork ─────────────────────────────────────── */
  if (secFeatured && featuredArtwork) {
    if (featuredArtwork.enabled === false || f.featured_artwork === false) {
      show(secFeatured, false);
    } else {
      show(secFeatured, true);
      setText(secFeatured.querySelector('.featured-eyebrow'), featuredArtwork.eyebrow);
      const ftitle = secFeatured.querySelector('.featured-title');
      if (ftitle && featuredArtwork.title) ftitle.innerHTML = featuredArtwork.title;
      setText(secFeatured.querySelector('.featured-body'), featuredArtwork.body);
      setText(secFeatured.querySelector('.featured-arabic-large'), featuredArtwork.arabic);
      setText(secFeatured.querySelector('.featured-num'), featuredArtwork.ref_num);

      const metaEl = secFeatured.querySelector('.featured-meta');
      if (metaEl && Array.isArray(featuredArtwork.meta)) {
        metaEl.innerHTML = featuredArtwork.meta.filter(m => m.label || m.value).map(m =>
          '<div><div class="meta-label">' + (m.label||'') + '</div><div class="meta-value">' + (m.value||'') + '</div></div>'
        ).join('');
      }

      const fcta = secFeatured.querySelector('.btn-primary');
      if (fcta) {
        if (featuredArtwork.cta_text) {
          const sp = fcta.querySelector('span');
          if (sp) sp.textContent = featuredArtwork.cta_text;
          // Link to first featured product if cta_link is empty/#
          const ctaHref = featuredArtwork.cta_link && featuredArtwork.cta_link !== '#'
            ? featuredArtwork.cta_link
            : (enabledProducts[0] ? '/product/' + (enabledProducts[0]._slug || slugFromName(enabledProducts[0].name)) + '/' : '#shop');
          fcta.href = ctaHref;
          fcta.style.display = '';
        } else { fcta.style.display = 'none'; }
      }

      if (featuredArtwork.image) {
        const artBg = secFeatured.querySelector('.featured-artwork-bg');
        if (artBg) {
          artBg.style.backgroundImage = "url('" + featuredArtwork.image + "')";
          artBg.style.backgroundSize = 'cover';
          artBg.style.backgroundPosition = 'center';
        }
      }
    }
  }

  /* ── 8. Products / Shop ──────────────────────────────────────── */
  if (secShop && f.shop_section !== false) {
    const grid = secShop.querySelector('.products-grid');
    if (grid) {
      if (enabledProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--warm-gray);font-family:var(--serif);font-style:italic;font-size:1.1rem;">No artworks available at this time.</div>';
      } else {
        const offsets = ['', 'margin-top:40px', '', 'margin-top:20px'];
        const salesOn = f.sales !== false;

        grid.innerHTML = enabledProducts.map((p, i) => {
          const delay = i > 0 ? ' sr-delay-' + Math.min(i, 3) : '';
          const hasSale = salesOn && p.sale_enabled && p.sale_label;
          const slug = p._slug || slugFromName(p.name);
          const href = '/product/' + slug + '/';

          const colMatch = enabledCollections.find(c => c.name === p.collection);
          const colLabel = colMatch ? colMatch.name : (p.collection || '');

          const bgContent = p.image
            ? '<img src="' + p.image + '" alt="' + (p.name||'') + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">'
            : '<div class="product-img-bg ' + (p.bg_class||'p-col-1') + '"></div>' + (p.arabic ? '<div class="product-arabic">' + p.arabic + '</div>' : '');

          return '<div class="product-card sr' + delay + '" style="' + (offsets[i % 4]||'') + ';cursor:pointer" onclick="location.href=\'' + href + '\'">' +
            '<div class="product-img">' +
              bgContent +
              '<div class="product-wishlist"><svg viewBox="0 0 16 16" fill="none" stroke="#11110F" stroke-width="1.5" width="14" height="14"><path d="M8 13.5S2 9.5 2 5.5a3 3 0 0 1 6 0 3 3 0 0 1 6 0c0 4-6 8-6 8z"/></svg></div>' +
              (hasSale ? '<div style="position:absolute;top:14px;left:14px;background:var(--champagne);color:var(--obsidian);font-family:var(--sans);font-size:.6rem;letter-spacing:.12em;padding:3px 8px;font-weight:500;z-index:5">' + p.sale_label + '</div>' : '') +
              (p.badge  ? '<div style="position:absolute;top:14px;' + (hasSale?'left:100px':'left:14px') + ';background:var(--obsidian);color:var(--warm-ivory);font-family:var(--sans);font-size:.6rem;letter-spacing:.12em;padding:3px 8px;z-index:5">' + p.badge + '</div>' : '') +
              '<a href="' + href + '" class="product-quick" onclick="event.stopPropagation()">View Artwork</a>' +
            '</div>' +
            (colLabel ? '<div class="product-collection">' + colLabel + ' Collection</div>' : '') +
            (p.name   ? '<a href="' + href + '" class="product-name" style="display:block;color:inherit;text-decoration:none">' + p.name + '</a>' : '') +
            '<div class="product-price"' + (!p.price && !p.original_price ? ' style="display:none"' : '') + '>' +
              (p.original_price && hasSale ? '<span style="text-decoration:line-through;color:var(--warm-gray);font-size:.72rem;margin-right:6px;">' + p.original_price + '</span>' : '') +
              (p.price ? '<span>' + p.price + '</span>' : '') +
            '</div>' +
          '</div>';
        }).join('');

        if (window.__herIO) grid.querySelectorAll('.sr').forEach(el => window.__herIO.observe(el));
      }
    }
  }

  /* ── 9. Journal ──────────────────────────────────────────────── */
  if (secJournal) {
    if (f.journal === false || enabledArticles.length === 0) {
      show(secJournal, false);
    } else {
      show(secJournal, true);
      const jgrid = secJournal.querySelector('.journal-grid');
      if (jgrid) {
        const bgClasses = ['j-bg-1','j-bg-2','j-bg-3'];
        jgrid.innerHTML = enabledArticles.map((a, i) => {
          const delay = i > 0 ? ' sr-delay-' + Math.min(i,3) : '';
          const bg = bgClasses[i % 3];
          const slug = a._slug || slugFromName(a.title);
          const href = '/journal/' + slug + '/';
          return '<div class="journal-card sr' + delay + '" style="cursor:pointer" onclick="location.href=\'' + href + '\'">' +
            '<div class="journal-img ' + bg + '"' + (a.image ? ' style="background-image:url(\'' + a.image + '\');background-size:cover;background-position:center;"' : '') + '>' +
              (!a.image && a.arabic ? '<div class="journal-img-arabic">' + a.arabic + '</div>' : '') +
            '</div>' +
            (a.category ? '<div class="journal-cat">'     + a.category + '</div>' : '') +
            (a.title    ? '<h3 class="journal-title">'    + a.title    + '</h3>'  : '') +
            (a.excerpt  ? '<p class="journal-excerpt">'   + a.excerpt  + '</p>'   : '') +
            '<a href="' + href + '" class="journal-read" onclick="event.stopPropagation()">' +
              'Read <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M3 8h10M9 4l4 4-4 4"/></svg>' +
            '</a>' +
          '</div>';
        }).join('');
        if (window.__herIO) jgrid.querySelectorAll('.sr').forEach(el => window.__herIO.observe(el));
      }
    }
  }

  /* ── 10. Fix remaining dead href="#" links in footer etc. ────── */
  // Footer nav — wire to page sections or real pages
  const footerNavMap = {
    'Collections':    '#collections',
    'Shop All Works': '#shop',
    'The Art':        '#process',
    'Gallery':        '#shop',
    'Journal':        '#journal',
    'About':          '#commission',
    'Custom Commission': '/customize-artwork/',
    'Corporate Gifting': '/customize-artwork/',
    'Art Consultation':  '/customize-artwork/',
    'Installation Works':'#commission',
    'Exhibitions':       '#commission',
    'Privacy':           '#',
    'Terms':             '#',
    'Shipping':          '#',
  };
  document.querySelectorAll('.footer-links a, .footer-legal a').forEach(a => {
    const txt = a.textContent.trim();
    if (footerNavMap[txt]) a.href = footerNavMap[txt];
  });

})();
