/* ===== URAL SOFTWARE MAP — Interactive JS ===== */
(function () {
  'use strict';

  const data = window.DATA || [];

  // ---- State ----
  let activeCategory = 'all';
  let searchQuery = '';

  // ---- DOM refs ----
  const grid         = document.getElementById('map-grid');
  const tabs         = document.getElementById('category-tabs');
  const searchInput  = document.getElementById('search-input');
  const searchClear  = document.getElementById('search-clear');
  const resultsCount = document.getElementById('results-count');
  const totalCount   = document.getElementById('total-count');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose   = document.getElementById('modal-close');
  const modalCat     = document.getElementById('modal-cat');
  const modalSubcat  = document.getElementById('modal-subcat');
  const modalTitle   = document.getElementById('modal-title');
  const modalOwner   = document.getElementById('modal-owner');
  const modalInn     = document.getElementById('modal-inn');
  const modalLink    = document.getElementById('modal-link');

  // ---- Category color accents (cycling) ----
  const CAT_COLORS = [
    { bg: '#166534', light: '#dcfce7' },
    { bg: '#15803d', light: '#d1fae5' },
    { bg: '#1a7a3c', light: '#bbf7d0' },
    { bg: '#14532d', light: '#a7f3d0' },
  ];

  // ---- Build tab buttons ----
  function buildTabs() {
    data.forEach((cat, i) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.cat = String(i);
      btn.textContent = cat.name;
      tabs.appendChild(btn);
    });
  }

  // ---- Shorten long subcategory names ----
  function shortenSubcat(name) {
    // Remove repetitive prefix
    name = name.replace(/^Программное обеспечение для решения отраслевых задач в области\s*/i, '');
    name = name.replace(/^Средства\s+/i, '');
    if (name.length > 80) name = name.substring(0, 78) + '…';
    return name;
  }

  // ---- Highlight text match ----
  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const re = new RegExp('(' + escapeRe(query) + ')', 'gi');
    return escaped.replace(re, '<mark style="background:#bbf7d0;border-radius:2px;padding:0 1px">$1</mark>');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ---- Render map ----
  function render() {
    grid.innerHTML = '';
    const q = searchQuery.toLowerCase().trim();
    let totalVisible = 0;
    let totalAll = 0;

    data.forEach((cat, catIdx) => {
      // Filter by active category tab
      if (activeCategory !== 'all' && String(catIdx) !== activeCategory) return;

      const color = CAT_COLORS[catIdx % CAT_COLORS.length];
      const col = document.createElement('div');
      col.className = 'category-column';
      col.dataset.cat = String(catIdx);

      // Category header
      const catTotal = cat.subcategories.reduce((s, sc) => s + sc.items.length, 0);
      totalAll += catTotal;
      const header = document.createElement('div');
      header.className = 'category-header';
      header.style.background = `linear-gradient(135deg, ${color.bg} 0%, ${color.bg}cc 100%)`;
      header.innerHTML = `${escapeHtml(cat.name)}<span class="cat-count">${catTotal} продуктов</span>`;
      col.appendChild(header);

      let catVisible = 0;

      cat.subcategories.forEach(subcat => {
        // Filter items by search
        const visibleItems = subcat.items.filter(item => {
          if (!q) return true;
          return (
            item.name.toLowerCase().includes(q) ||
            (item.owner && item.owner.toLowerCase().includes(q))
          );
        });

        if (visibleItems.length === 0) return;
        catVisible += visibleItems.length;
        totalVisible += visibleItems.length;

        const block = document.createElement('div');
        block.className = 'subcat-block';

        const subcatHeader = document.createElement('div');
        subcatHeader.className = 'subcat-header';
        subcatHeader.innerHTML = `${escapeHtml(shortenSubcat(subcat.name))}<span class="subcat-count">(${visibleItems.length})</span>`;
        block.appendChild(subcatHeader);

        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'items-grid';

        visibleItems.forEach(item => {
          const chip = document.createElement('button');
          chip.className = 'item-chip' + (item.link ? ' has-link' : '');
          chip.innerHTML = highlight(item.name, q);
          chip.title = item.owner || item.name;

          chip.addEventListener('click', () => openModal(item, cat.name, subcat.name));
          itemsWrap.appendChild(chip);
        });

        block.appendChild(itemsWrap);
        col.appendChild(block);
      });

      if (catVisible === 0) {
        col.classList.add('hidden');
      }

      grid.appendChild(col);
    });

    // Empty state
    if (grid.children.length === 0 || [...grid.children].every(c => c.classList.contains('hidden'))) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="28" cy="28" r="18" stroke="#16a34a" stroke-width="2.5"/>
          <path d="M40 40L52 52" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M21 28h14M28 21v14" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <h3>Ничего не найдено</h3>
        <p>Попробуйте изменить запрос или выбрать другую категорию</p>`;
      grid.appendChild(empty);
      resultsCount.textContent = '';
    } else {
      const total = q ? `Найдено: ${totalVisible} из ${totalAll}` : `Найдено: ${totalAll} продуктов`;
      resultsCount.textContent = total;
    }
  }

  // ---- Modal ----
  function openModal(item, catName, subcatName) {
    modalCat.textContent = catName;
    modalSubcat.textContent = shortenSubcat(subcatName);
    modalTitle.textContent = item.name;
    modalOwner.textContent = item.owner || 'Правообладатель не указан';

    if (item.inn) {
      modalInn.innerHTML = `ИНН: <span>${escapeHtml(String(item.inn))}</span>`;
      modalInn.style.display = '';
    } else {
      modalInn.style.display = 'none';
    }

    if (item.link && item.link !== 'None' && item.link.startsWith('http')) {
      modalLink.href = item.link;
      modalLink.className = 'modal-link';
      modalLink.innerHTML = `Открыть в реестре Минцифры <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-left:6px"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else {
      modalLink.href = '#';
      modalLink.className = 'modal-link no-link';
      modalLink.innerHTML = `Ссылка недоступна`;
    }

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ---- Event listeners ----
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    [...tabs.querySelectorAll('.tab-btn')].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat;
    render();
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    searchClear.style.display = searchQuery ? 'block' : 'none';
    render();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClear.style.display = 'none';
    searchInput.focus();
    render();
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // ---- Init ----
  buildTabs();
  render();

  // Update total badge
  const total = data.reduce((s, c) =>
    s + c.subcategories.reduce((ss, sc) => ss + sc.items.length, 0), 0
  );
  if (totalCount) totalCount.textContent = `В базе: ${total} продуктов`;

})();
