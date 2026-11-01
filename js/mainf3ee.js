"use strict";

/**
 * VIBES RADIO - Studio Theme Page Controller
 * Handles page interactions, mobile menu overlays, navigation highlights, filter pills,
 * and implements PJAX (seamless navigation) to allow continuous radio playback.
 */

// 1. REUSABLE MAIN SCRIPTS INITIALIZATION
function initMainScripts() {
    // Mobile navigation overlay toggling
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mobileClose = document.querySelector('.mobile-menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-item a');

    const openMobileMenu = () => {
        if (mobileMenu) {
            mobileMenu.classList.add('open');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    };

    const closeMobileMenu = () => {
        if (mobileMenu) {
            mobileMenu.classList.remove('open');
            document.body.style.overflow = ''; // Restore scroll
        }
    };

    if (mobileToggle) mobileToggle.addEventListener('click', openMobileMenu);
    if (mobileClose) mobileClose.addEventListener('click', closeMobileMenu);
    
    // Close mobile overlay on links click
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
            // Highlight clicked navigation target
            mobileNavLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
        });
    });

    // Desktop navigation menu active links highlights
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Genre / Station categories filter pills active selection
    const filterPills = document.querySelectorAll('.filter-pill, .search-cat-link');
    filterPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            if (pill.tagName === 'A') {
                e.preventDefault();
            }
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            // Log category for console confirmation
            console.log('Selected genre filter:', (pill.getAttribute('data-category') || pill.innerText).trim());
        });
    });

    // Player card visualizer button manifest
    const vizBtn = document.querySelector('.visualizer-toggle-btn');
    if (vizBtn) {
        vizBtn.addEventListener('click', () => {
            vizBtn.classList.toggle('active');
            console.log('Visualizer manual toggle state:', vizBtn.classList.contains('active'));
        });
    }

    // Language selector dropdown
    const langBtn = document.querySelector('.lang-selector-btn');
    const langDropdown = document.querySelector('.lang-dropdown');
    const langOptions = document.querySelectorAll('.lang-option');
    const currentFlagImg = document.querySelector('.current-flag');

    if (langBtn && langDropdown) {
        // Toggle dropdown open/close
        const toggleLangDropdown = (e) => {
            e.stopPropagation();
            const isOpen = langDropdown.classList.contains('show');
            langDropdown.classList.toggle('show', !isOpen);
            langBtn.setAttribute('aria-expanded', !isOpen);
        };
        
        langBtn.replaceWith(langBtn.cloneNode(true));
        const newLangBtn = document.querySelector('.lang-selector-btn');
        newLangBtn.addEventListener('click', toggleLangDropdown);

        // Handle language option click
        langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                
                langOptions.forEach(opt => {
                    opt.classList.remove('active');
                    opt.setAttribute('aria-selected', 'false');
                });
                option.classList.add('active');
                option.setAttribute('aria-selected', 'true');

                const lang = option.getAttribute('data-lang');
                const flagImg = option.querySelector('img');
                
                if (flagImg && currentFlagImg) {
                    currentFlagImg.src = flagImg.getAttribute('src');
                    currentFlagImg.alt = flagImg.getAttribute('alt');
                }

                langDropdown.classList.remove('show');
                newLangBtn.setAttribute('aria-expanded', 'false');
                
                console.log('Language changed to:', lang);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (langDropdown.classList.contains('show')) {
                langDropdown.classList.remove('show');
                newLangBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Scroll to top button binding
    const scrollTopBtn = document.querySelector('.scroll-top-btn');
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// 2. REBIND ALL PAGE SCRIPTS AFTER TRANSITIONS
function rebindAllPageScripts() {
    // Dynamic radio tuner injection (PJAX compatible)
    if (typeof window.loadRadioTuner === 'function') {
        window.loadRadioTuner();
    }

    initMainScripts();
    
    // Rebind radio events and scale if available
    if (typeof window.initScaleLabels === 'function') {
        window.initScaleLabels();
    }
    if (typeof window.initRadioEvents === 'function') {
        window.initRadioEvents();
    }
    if (typeof window.rebindRadioUI === 'function') {
        window.rebindRadioUI();
    }
    // Rebind setPlayState using global audioPlayer state
    if (typeof window.setPlayState === 'function') {
        const isPlaying = window.audioPlayer && !window.audioPlayer.paused;
        window.setPlayState(isPlaying);
    }
    if (typeof window.syncCardPlayStates === 'function') {
        window.syncCardPlayStates();
    }
    // Rebind station search API if on stations.html
    if (typeof window.initSearchRadio === 'function') {
        window.initSearchRadio();
    }
    // Rebind modal handlers if on stations.html
    if (typeof window.rebindStationCards === 'function') {
        window.rebindStationCards();
    }
    // Rebind contact form submission handler
    initContactForm();

    // Rebind and update playlist UI if on playlist.html
    if (typeof window.updatePlaylistUI === 'function') {
        window.updatePlaylistUI();
    }

    // Rebind streaming archive if on streaming-achieve.html
    initStreamingArchive();

    // Rebind podcasts page if on podcast.html
    initPodcastsPage();

    // Rebind shows page if on shows.html
    initShowsPage();

    // Rebind DJs list page if on djs.html
    initDJsPage();

    // Rebind DJ info page if on info-page.html
    initDJInfoPage();

    // Rebind broadcast schedule page if on schedule.html
    initSchedulePage();

    // Rebind category filters
    if (typeof window.initCategoryFilters === 'function') {
        window.initCategoryFilters();
    }

    // Dynamic donation page script loader
    if (document.querySelector('.donate-container')) {
        if (typeof window.initDonatePage === 'function') {
            window.initDonatePage();
        } else {
            const script = document.createElement('script');
            script.src = 'js/donate2d4c.js?v=2.3';
            script.onload = function() {
                if (typeof window.initDonatePage === 'function') {
                    window.initDonatePage();
                }
            };
            document.body.appendChild(script);
        }
    }
}

// 3. PJAX INTERCEPTOR FOR SEAMLESS TRANSITIONS
document.addEventListener('click', function (e) {
    const link = e.target.closest('a');
    if (link && link.host === window.location.host && !link.hasAttribute('download') && link.target !== '_blank') {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.startsWith('javascript:')) {
            return;
        }
        
        // If it's a hash link on the SAME page (e.g. index.html#playlist while on index.html)
        const currentPath = window.location.pathname.replace(/\/$/, "");
        const targetPath = link.pathname.replace(/\/$/, "");
        
        if (currentPath === targetPath && href.includes('#')) {
            const hashIndex = href.indexOf('#');
            const hash = href.substring(hashIndex);
            const targetEl = document.querySelector(hash);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        // We intercept if it's an internal HTML link or root/folder path
        if (link.pathname.endsWith('.html') || link.pathname.endsWith('/') || !link.pathname.includes('.')) {
            e.preventDefault();
            const url = link.href;
            
            // Extract hash if any
            let hash = "";
            if (href.includes('#')) {
                hash = href.substring(href.indexOf('#'));
            }

            loadPageViaPjax(url, hash);
        }
    }
});

// Load page via PJAX Fetch
function loadPageViaPjax(url, hash) {
    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return res.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(html, 'text/html');

            // Replace title
            document.title = newDoc.title;

            // Replace page wrapper
            const currentWrapper = document.querySelector('.page-wrapper');
            const newWrapper = newDoc.querySelector('.page-wrapper');
            if (currentWrapper && newWrapper) {
                currentWrapper.innerHTML = newWrapper.innerHTML;
            }

            // Replace mobile menu
            const currentMobileMenu = document.getElementById('mobile-menu');
            const newMobileMenu = newDoc.getElementById('mobile-menu');
            if (currentMobileMenu && newMobileMenu) {
                currentMobileMenu.innerHTML = newMobileMenu.innerHTML;
            }

            // Update browser history
            history.pushState(null, '', url);

            // Close mobile menu if it was open
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('open')) {
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            }

            // Handle scrolling / anchors
            if (hash) {
                const targetEl = document.querySelector(hash);
                if (targetEl) {
                    // Slight delay to ensure content layout is complete
                    setTimeout(() => {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                } else {
                    window.scrollTo(0, 0);
                }
            } else {
                window.scrollTo(0, 0);
            }

            // Rebind all scripts for the new elements
            rebindAllPageScripts();
        })
        .catch(err => {
            console.error('PJAX navigation failed, falling back to standard page load:', err);
            window.location.href = url;
        });
}

// Handle browser Back/Forward navigation
window.addEventListener('popstate', function () {
    fetch(window.location.href)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return res.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(html, 'text/html');

            document.title = newDoc.title;

            const currentWrapper = document.querySelector('.page-wrapper');
            const newWrapper = newDoc.querySelector('.page-wrapper');
            if (currentWrapper && newWrapper) {
                currentWrapper.innerHTML = newWrapper.innerHTML;
            }

            const currentMobileMenu = document.getElementById('mobile-menu');
            const newMobileMenu = newDoc.getElementById('mobile-menu');
            if (currentMobileMenu && newMobileMenu) {
                currentMobileMenu.innerHTML = newMobileMenu.innerHTML;
            }

            // Close mobile menu
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && mobileMenu.classList.contains('open')) {
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            }

            // Rebind all scripts for the new elements
            rebindAllPageScripts();
        })
        .catch(err => {
            console.error('PJAX popstate navigation failed, falling back to reload:', err);
            window.location.reload();
        });
});

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you shortly.');
            contactForm.reset();
        });
    }
}

// Initial load binding
document.addEventListener('DOMContentLoaded', () => {
    initMainScripts();
    initContactForm();
    initStreamingArchive();
    initPodcastsPage();
    initShowsPage();
    initDJsPage();
    initDJInfoPage();
    initSchedulePage();
});

// 4. STREAMING ARCHIVE CONTROLLER
function initStreamingArchive() {
    const dateGrid = document.getElementById('archiveDateGrid');
    const showsGrid = document.getElementById('archiveShowsGrid');
    if (!dateGrid || !showsGrid) return; // Not on the streaming archive page

    if (window.archiveShows) {
        setupArchivePage(window.archiveShows);
    } else {
        showsGrid.innerHTML = '<div class="no-stations">Loading archive database...</div>';
        fetch('assets/data/archive_showsa18a.json?t=' + Date.now())
            .then(res => {
                if (!res.ok) throw new Error("HTTP error " + res.status);
                return res.json();
            })
            .then(data => {
                window.archiveShows = data;
                setupArchivePage(data);
            })
            .catch(err => {
                console.error("Failed to load archive shows:", err);
                showsGrid.innerHTML = '<div class="no-stations">Failed to load archive records.</div>';
            });
    }

    function setupArchivePage(archiveData) {
        const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

        // Generate 15 days archive dates (rolling backwards from current local date)
        const dates = [];
        const today = new Date();
        
        for (let i = 0; i < 15; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push({
                dateObject: d,
                dayNum: d.getDate(),
                dayName: weekdays[d.getDay()],
                month: monthNames[d.getMonth()],
                formattedFull: `${weekdays[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
            });
        }

        // Helper to get shows for a given date index from JSON data
        function getShowsForDate(idx) {
            const dateInfo = dates[idx];
            const dayNum = String(dateInfo.dateObject.getDate());
            return archiveData[dayNum] || [];
        }

        // Helper to render show cards for a selected date index
        function renderShowsForDate(idx) {
            const dateInfo = dates[idx];
            const dateDisplay = document.getElementById('selectedDateDisplay');
            if (dateDisplay) {
                dateDisplay.innerText = dateInfo.formattedFull;
            }

            showsGrid.innerHTML = '';

            const showsToRender = getShowsForDate(idx);
            if (showsToRender.length === 0) {
                showsGrid.innerHTML = '<div class="no-stations">No archive recordings found for this day.</div>';
                return;
            }

            showsToRender.forEach(show => {
                const archiveStreamUrl = `${show.streamUrl}?archive=${idx}-${show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const isThisPlaying = window.cardAudioPlayer && !window.cardAudioPlayer.paused && 
                                      window.cardAudioPlayer.src === new URL(archiveStreamUrl, window.location.href).href;

                // Format dateString for the time badge
                const showDate = dateInfo.dateObject;
                const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const dayNum = showDate.getDate();
                const dayName = weekdaysShort[showDate.getDay()];
                const monthName = monthsShort[showDate.getMonth()];
                const dateString = `${dayNum} ${monthName}, ${dayName} • ${show.time}`;

                const card = document.createElement('div');
                card.className = `show-card show-archive-card${isThisPlaying ? ' playing' : ''}`;
                card.setAttribute('data-stream-url', archiveStreamUrl);

                card.innerHTML = `
                    <div class="show-card-header">
                        <div class="show-dj-avatar-wrapper">
                            <img src="${show.avatar}" alt="${show.host}" class="show-dj-avatar">
                        </div>
                        <span class="show-time-badge">${dateString}</span>
                    </div>
                    <div class="show-card-body">
                        <span class="show-card-genre">${show.genre}</span>
                        <h4 class="show-card-title">${show.title}</h4>
                        <span class="show-card-host">Host: ${show.host}</span>
                        <p class="show-card-tags">${show.tags}</p>
                    </div>
                    <div class="show-card-footer">
                        <span class="show-listen-label">${isThisPlaying ? 'NOW PLAYING' : 'LISTEN ARCHIVE'}</span>
                        <button class="show-card-play-btn" aria-label="Play/Pause">
                            <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                    </div>
                `;

                const playBtn = card.querySelector('.show-card-play-btn');
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleArchivePlay(show, dateInfo, idx);
                });

                showsGrid.appendChild(card);
            });
        }

        // Handles playing archive streams
        function handleArchivePlay(show, dateInfo, idx) {
            const archiveStreamUrl = `${show.streamUrl}?archive=${idx}-${show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const isPlayingThis = window.cardAudioPlayer && !window.cardAudioPlayer.paused && 
                                  window.cardAudioPlayer.src === new URL(archiveStreamUrl, window.location.href).href;

            if (isPlayingThis) {
                if (window.cardAudioPlayer) {
                    window.cardAudioPlayer.pause();
                }
            } else {
                if (typeof window.playCardStream === 'function') {
                    window.playCardStream(archiveStreamUrl);
                } else if (window.cardAudioPlayer) {
                    if (window.audioPlayer && !window.audioPlayer.paused) {
                        window.audioPlayer.pause();
                        if (typeof window.setPlayState === 'function') {
                            window.setPlayState(false);
                        }
                    }
                    window.cardAudioPlayer.src = archiveStreamUrl;
                    window.cardAudioPlayer.play()
                        .then(() => {
                            if (typeof window.syncCardPlayStates === 'function') {
                                window.syncCardPlayStates();
                            }
                        })
                        .catch(err => console.error(err));
                }
            }

            renderShowsForDate(idx);
        }

        // Populate date grid
        dateGrid.innerHTML = '';
        dates.forEach((dateInfo, idx) => {
            const card = document.createElement('div');
            card.className = `archive-date-card${idx === 0 ? ' active' : ''}`;
            card.setAttribute('data-index', idx);
            card.innerHTML = `
                <span class="date-card-month">${dateInfo.month}</span>
                <span class="date-card-day-num">${dateInfo.dayNum}</span>
                <span class="date-card-day-name">${dateInfo.dayName}</span>
            `;
            card.addEventListener('click', () => {
                document.querySelectorAll('.archive-date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                renderShowsForDate(idx);
            });
            dateGrid.appendChild(card);
        });

        // Render initial shows (for the first day)
        renderShowsForDate(0);

        // Bind event listeners to cardAudioPlayer to ensure button states sync dynamically
        if (window.cardAudioPlayer && !window.cardAudioPlayer.archiveBound) {
            window.cardAudioPlayer.archiveBound = true;
            const syncStates = () => {
                const activeCard = document.querySelector('.archive-date-card.active');
                if (activeCard) {
                    const activeIdx = parseInt(activeCard.getAttribute('data-index'), 10);
                    renderShowsForDate(activeIdx);
                }
            };
            window.cardAudioPlayer.addEventListener('play', syncStates);
            window.cardAudioPlayer.addEventListener('pause', syncStates);
        }

        // Global hook for top-bar toggle click to play the first show of the active day
        window.playActiveArchiveShow = () => {
            const activeCard = document.querySelector('.archive-date-card.active') || document.querySelector('.archive-date-card');
            const idx = activeCard ? parseInt(activeCard.getAttribute('data-index'), 10) : 0;
            const dateInfo = dates[idx];
            
            // Find first show on that date
            const showsToRender = getShowsForDate(idx);
            if (showsToRender.length > 0) {
                handleArchivePlay(showsToRender[0], dateInfo, idx);
            }
        };
    }
}

// Make initStreamingArchive globally accessible
window.initStreamingArchive = initStreamingArchive;


// 5. PODCASTS CONTROLLER
function initPodcastsPage() {
    const categoryList = document.getElementById('podcastCategoryList');
    const activeHeader = document.getElementById('podcastActiveHeader');
    const episodesGrid = document.getElementById('podcastEpisodesGrid');
    const btnMore = document.getElementById('btnMoreEpisodes');
    const searchForm = document.getElementById('podcastSearchForm');
    const searchInput = document.getElementById('podcastSearchInput');
    const episodesTitle = document.getElementById('podcastEpisodesTitle');

    if (!categoryList || !activeHeader || !episodesGrid || !btnMore) return; // Not on the podcasts page

    if (window.podcastCategoriesData) {
        setupPodcastsPage(window.podcastCategoriesData);
    } else {
        episodesGrid.innerHTML = '<div class="no-stations">Loading podcasts database...</div>';
        fetch('assets/data/podcastsa18a.json?t=' + Date.now())
            .then(res => {
                if (!res.ok) throw new Error("HTTP error " + res.status);
                return res.json();
            })
            .then(data => {
                window.podcastCategoriesData = data;
                setupPodcastsPage(data);
            })
            .catch(err => {
                console.error("Failed to load podcasts:", err);
                episodesGrid.innerHTML = '<div class="no-stations">Failed to load podcasts database.</div>';
            });
    }

    function setupPodcastsPage(podcastCategoriesData) {
        let activeCategoryIndex = 0;
        let visibleEpisodesCount = 5;
        let searchQuery = "";

        function renderCategories() {
            categoryList.innerHTML = '';
            podcastCategoriesData.forEach((cat, idx) => {
                const li = document.createElement('li');
                li.className = idx === activeCategoryIndex ? 'active' : '';
                li.innerText = cat.title;
                li.addEventListener('click', () => {
                    activeCategoryIndex = idx;
                    visibleEpisodesCount = 5;
                    searchQuery = "";
                    if (searchInput) searchInput.value = "";
                    renderCategories();
                    renderActiveCategory();
                });
                categoryList.appendChild(li);
            });
        }

        function renderActiveCategory() {
            const cat = podcastCategoriesData[activeCategoryIndex];
            
            // Update section title
            if (episodesTitle) {
                episodesTitle.textContent = `${cat.title} Episodes`;
            }
            
            // Render Header Block
            activeHeader.innerHTML = `
                <h2>${cat.title}</h2>
                <span class="podcast-active-host">Hosted by ${cat.host}</span>
                <img src="${cat.cover}" alt="${cat.title}" class="podcast-active-cover-img">
                <div class="podcast-active-desc-text">${cat.description}</div>
                
                <div class="podcast-active-meta-row">
                    <div class="podcast-subscribe-section">
                        <span class="podcast-subscribe-label">SUBSCRIBE:</span>
                        <div class="podcast-subscribe-icons">
                            <a href="#" class="podcast-sub-icon" aria-label="Apple Podcasts"><i class="fa-solid fa-podcast"></i></a>
                            <a href="#" class="podcast-sub-icon" aria-label="Spotify"><svg viewBox="0 0 496 512" width="16" height="16" fill="currentColor" style="vertical-align: middle;"><path d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm117 356c-4 6-13 8-19 4-32-20-73-24-121-14-7 2-15-3-17-10-2-7 3-15 10-17 53-12 99-7 135 15 6 4 8 13 4 19zm28-47c-6 8-16 11-24 5-37-23-93-30-137-17-9 3-19-2-22-12-3-9 2-19 12-22 51-16 113-8 156 19 8 5 11 15 5 24zm2-51c-45-27-119-29-161-17-7 2-14-2-16-9-2-7 2-14 9-16 49-15 131-12 183 19 6 4 8 13 4 19-3 6-12 8-19 4z"/></svg></a>
                            <a href="#" class="podcast-sub-icon" aria-label="Pocket Casts"><i class="fa-solid fa-circle-play"></i></a>
                            <a href="#" class="podcast-sub-icon" aria-label="RSS Feed"><i class="fa-solid fa-rss"></i></a>
                        </div>
                    </div>
                    <div class="podcast-share-section">
                        <span class="podcast-share-label">SHARE:</span>
                        <div class="podcast-share-links">
                            <span class="podcast-share-btn" id="podcastShareFb">Facebook</span>
                            <span class="podcast-share-btn" id="podcastShareLink">Copy Link</span>
                        </div>
                    </div>
                </div>
            `;

            // Bind Share Buttons
            const btnFb = document.getElementById('podcastShareFb');
            const btnCopy = document.getElementById('podcastShareLink');
            if (btnFb) {
                btnFb.addEventListener('click', () => {
                    alert(`Sharing ${cat.title} on Facebook!`);
                });
            }
            if (btnCopy) {
                btnCopy.addEventListener('click', () => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copied to clipboard!");
                });
            }

            // Render Episodes
            episodesGrid.innerHTML = '';
            
            let filteredEpisodes = cat.episodes;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filteredEpisodes = cat.episodes.filter(ep => 
                    ep.title.toLowerCase().includes(query) || 
                    ep.excerpt.toLowerCase().includes(query)
                );
            }

            const visibleEpisodes = filteredEpisodes.slice(0, visibleEpisodesCount);

            if (visibleEpisodes.length === 0) {
                episodesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); font-family: var(--font-main);">No episodes found matching "${searchQuery}".</div>`;
                btnMore.style.display = 'none';
                return;
            }

            visibleEpisodes.forEach(ep => {
                const epStreamUrl = `${ep.streamUrl}?podcast=${activeCategoryIndex}-${ep.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const isThisPlaying = window.cardAudioPlayer && !window.cardAudioPlayer.paused && 
                                      window.cardAudioPlayer.src === new URL(epStreamUrl, window.location.href).href;

                const card = document.createElement('div');
                card.className = `episode-card${isThisPlaying ? ' playing' : ''}`;
                card.setAttribute('data-stream-url', epStreamUrl);
                
                card.innerHTML = `
                    <div class="episode-card-image-wrapper">
                        <img src="${ep.image}" alt="${ep.title}" class="episode-card-img">
                        <div class="episode-card-overlay">
                            <span class="episode-card-date">${ep.date}</span>
                            <h4 class="episode-card-title">${ep.title}</h4>
                            <div class="episode-listen-row">
                                <span class="episode-play-icon">
                                    <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i>
                                </span>
                                <span class="episode-listen-text">${isThisPlaying ? 'Playing' : 'Listen Now'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="episode-card-body">
                        <p class="episode-card-excerpt">${ep.excerpt}</p>
                    </div>
                `;

                // Playback bind
                const playTrigger = card.querySelector('.episode-listen-row');
                playTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlePodcastPlay(ep, cat.title, cat.cover, epStreamUrl);
                });

                episodesGrid.appendChild(card);
            });

            // Toggle "More" button
            if (filteredEpisodes.length > visibleEpisodesCount) {
                btnMore.style.display = 'block';
            } else {
                btnMore.style.display = 'none';
            }
        }

        function handlePodcastPlay(episode, categoryName, categoryCover, epStreamUrl) {
            const isPlayingThis = window.cardAudioPlayer && !window.cardAudioPlayer.paused && 
                                  window.cardAudioPlayer.src === new URL(epStreamUrl, window.location.href).href;

            if (isPlayingThis) {
                if (window.cardAudioPlayer) {
                    window.cardAudioPlayer.pause();
                }
            } else {
                if (typeof window.playCardStream === 'function') {
                    window.playCardStream(epStreamUrl);
                } else if (window.cardAudioPlayer) {
                    if (window.audioPlayer && !window.audioPlayer.paused) {
                        window.audioPlayer.pause();
                        if (typeof window.setPlayState === 'function') {
                            window.setPlayState(false);
                        }
                    }
                    window.cardAudioPlayer.src = epStreamUrl;
                    window.cardAudioPlayer.play()
                        .then(() => {
                            if (typeof window.syncCardPlayStates === 'function') {
                                window.syncCardPlayStates();
                            }
                        })
                        .catch(err => console.error(err));
                }
            }

            renderActiveCategory();
        }

    // Bind More Episodes button
    btnMore.addEventListener('click', () => {
        visibleEpisodesCount += 5;
        renderActiveCategory();
    });

    // Bind Search
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            searchQuery = searchInput.value.trim();
            visibleEpisodesCount = 5;
            renderActiveCategory();
        });

        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value.trim();
            // Automatically reset and filter
            visibleEpisodesCount = 5;
            renderActiveCategory();
        });
    }

    // Render Initial State
    renderCategories();
    renderActiveCategory();

    // Bind event listeners to cardAudioPlayer to ensure button states sync dynamically
    if (window.cardAudioPlayer && !window.cardAudioPlayer.podcastBound) {
        window.cardAudioPlayer.podcastBound = true;
        const syncStates = () => {
            const activeLi = categoryList.querySelector('li.active');
            if (activeLi) {
                renderActiveCategory();
            }
        };
        window.cardAudioPlayer.addEventListener('play', syncStates);
        window.cardAudioPlayer.addEventListener('pause', syncStates);
        }
    }
}

// Make initPodcastsPage globally accessible
window.initPodcastsPage = initPodcastsPage;

// 6. SHOWS PAGE CONTROLLER
function initShowsPage() {
    const showsGrid = document.getElementById('showsGridContainer');
    if (!showsGrid) return; // Not on the shows page

    if (window.radioShowsData) {
        setupShowsPage(window.radioShowsData);
    } else {
        showsGrid.innerHTML = '<div class="no-stations">Loading shows...</div>';
        fetch('assets/data/showsa18a.json?t=' + Date.now())
            .then(res => {
                if (!res.ok) throw new Error("HTTP error " + res.status);
                return res.json();
            })
            .then(data => {
                window.radioShowsData = data;
                setupShowsPage(data);
            })
            .catch(err => {
                console.error("Failed to load shows:", err);
                showsGrid.innerHTML = '<div class="no-stations">Failed to load shows.</div>';
            });
    }

    function setupShowsPage(shows) {
        renderShows(shows);

        // Bind event listeners to cardAudioPlayer to sync play/pause states on cards dynamically
        if (window.cardAudioPlayer && !window.cardAudioPlayer.showsBound) {
            window.cardAudioPlayer.showsBound = true;
            const syncStates = () => {
                if (document.getElementById('showsGridContainer')) {
                    renderShows(window.radioShowsData);
                }
            };
            window.cardAudioPlayer.addEventListener('play', syncStates);
            window.cardAudioPlayer.addEventListener('pause', syncStates);
        }
    }

    function renderShows(shows) {
        showsGrid.innerHTML = '';
        shows.forEach(show => {
            const absoluteStreamUrl = new URL(show.streamUrl, window.location.href).href;
            const isThisPlaying = window.cardAudioPlayer && 
                                  !window.cardAudioPlayer.paused && 
                                  window.cardAudioPlayer.src === absoluteStreamUrl;

            const article = document.createElement('article');
            article.className = `show-card${isThisPlaying ? ' playing' : ''}`;
            article.innerHTML = `
                <div class="show-card-image-wrapper">
                    <img src="${show.image}" alt="${show.title}" class="show-card-img">
                </div>
                <div class="show-card-content">
                    <span class="show-card-genre">${show.genre}</span>
                    <h3 class="show-card-title">${show.title}</h3>
                    <span class="show-card-host">Hosted by ${show.host}</span>
                    <div class="show-card-schedule">
                        <i class="fa-regular fa-clock"></i> ${show.schedule}
                    </div>
                    <p class="show-card-excerpt">${show.excerpt}</p>
                    <a href="#" class="show-card-listen-btn" data-stream-url="${show.streamUrl}" data-show-title="${show.title}">
                        <i class="fa-solid ${isThisPlaying ? 'fa-circle-pause' : 'fa-circle-play'}"></i> ${isThisPlaying ? 'Pause' : 'Listen Now'}
                    </a>
                </div>
            `;

            const playBtn = article.querySelector('.show-card-listen-btn');
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleShowPlay(show);
            });

            showsGrid.appendChild(article);
        });
    }

    function handleShowPlay(show) {
        const absoluteStreamUrl = new URL(show.streamUrl, window.location.href).href;
        const isPlayingThis = window.cardAudioPlayer && 
                              !window.cardAudioPlayer.paused && 
                              window.cardAudioPlayer.src === absoluteStreamUrl;

        if (isPlayingThis) {
            if (window.cardAudioPlayer) {
                window.cardAudioPlayer.pause();
            }
        } else {
            // Stop general player if running
            if (window.audioPlayer && !window.audioPlayer.paused) {
                window.audioPlayer.pause();
                if (typeof window.setPlayState === 'function') window.setPlayState(false);
            }

            if (typeof window.playCardStream === 'function') {
                window.playCardStream(show.streamUrl);
            } else if (window.cardAudioPlayer) {
                window.cardAudioPlayer.src = show.streamUrl;
                window.cardAudioPlayer.play()
                    .then(() => {
                        if (typeof window.syncCardPlayStates === 'function') window.syncCardPlayStates();
                    })
                    .catch(err => console.error(err));
            }
        }
        renderShows(window.radioShowsData);
    }
}

// Make initShowsPage globally accessible
window.initShowsPage = initShowsPage;
// 6.5 DJs DIRECTORY CONTROLLER
function initDJsPage() {
    const djsGrid = document.getElementById('djsGridContainer');
    if (!djsGrid) return; // Not on the DJs list page

    if (window.djsData) {
        renderDJs(window.djsData);
    } else {
        djsGrid.innerHTML = '<div class="no-stations">Loading selectors...</div>';
        fetch('assets/data/djsa18a.json?t=' + Date.now())
            .then(res => {
                if (!res.ok) throw new Error("HTTP error " + res.status);
                return res.json();
            })
            .then(data => {
                window.djsData = data;
                renderDJs(data);
            })
            .catch(err => {
                console.error("Failed to load DJs:", err);
                djsGrid.innerHTML = '<div class="no-stations">Failed to load selectors.</div>';
            });
    }

    function renderDJs(djs) {
        djsGrid.innerHTML = '';
        djs.forEach(dj => {
            const card = document.createElement('a');
            card.href = `info-page.html?dj=${dj.id}`;
            card.className = 'dj-card';
            card.innerHTML = `
                <div class="dj-avatar-wrapper">
                    <img src="${dj.avatar}" alt="${dj.name}" class="dj-avatar-img">
                </div>
                <div class="dj-info">
                    <h3 class="dj-name">${dj.name}</h3>
                    <span class="dj-show">${dj.show}</span>
                </div>
            `;
            djsGrid.appendChild(card);
        });
    }
}
window.initDJsPage = initDJsPage;


// 7. DJ INFO PAGE CONTROLLER
function initDJInfoPage() {
    const nameEl = document.getElementById('djInfoName');
    const hostEl = document.getElementById('djInfoHost');
    const imgEl = document.getElementById('djInfoImage');
    const bioEl = document.getElementById('djInfoBio');
    const titleEl = document.getElementById('djShowsTitle');
    const showsGrid = document.getElementById('djShowsGrid');

    if (!nameEl || !showsGrid) return; // Not on the DJ Info page

    if (window.djsData) {
        setupDJInfo(window.djsData);
    } else {
        fetch('assets/data/djsa18a.json?t=' + Date.now())
            .then(res => {
                if (!res.ok) throw new Error("HTTP error " + res.status);
                return res.json();
            })
            .then(data => {
                window.djsData = data;
                setupDJInfo(data);
            })
            .catch(err => {
                console.error("Failed to load DJs info:", err);
                nameEl.textContent = "Failed to load profile";
            });
    }

    function setupDJInfo(djsData) {
        const params = new URLSearchParams(window.location.search);
        const djParam = params.get('dj') || '1';
        const djId = parseInt(djParam);
        const dj = djsData.find(d => d.id === djId) || djsData[0];
        const djIdx = djsData.indexOf(dj);

        // Populate active profile
        if (nameEl) nameEl.textContent = dj.name;
        if (hostEl) hostEl.textContent = `Hosted by ${dj.host}`;
        if (imgEl) {
            imgEl.src = dj.avatar;
            imgEl.alt = dj.name;
        }
        if (bioEl) bioEl.innerHTML = dj.bio;
        if (titleEl) titleEl.textContent = `${dj.name} - Recorded Broadcasts`;

        // Render dynamic shows/episodes grid
        renderDJShows(dj, djIdx);

        // Bind event listeners to cardAudioPlayer to sync play/pause states on cards dynamically
        if (window.cardAudioPlayer && !window.cardAudioPlayer.djInfoBound) {
            window.cardAudioPlayer.djInfoBound = true;
            const syncDJStates = () => {
                if (document.getElementById('djShowsGrid') && window.djsData) {
                    const currentParams = new URLSearchParams(window.location.search);
                    const currentDjId = parseInt(currentParams.get('dj') || '1');
                    const currentDj = window.djsData.find(d => d.id === currentDjId) || window.djsData[0];
                    const currentDjIdx = window.djsData.indexOf(currentDj);
                    renderDJShows(currentDj, currentDjIdx);
                }
            };
            window.cardAudioPlayer.addEventListener('play', syncDJStates);
            window.cardAudioPlayer.addEventListener('pause', syncDJStates);
        }
    }

    function renderDJShows(dj, djIdx) {
        showsGrid.innerHTML = '';
        if (!dj.episodes || dj.episodes.length === 0) {
            showsGrid.innerHTML = '<div class="no-stations">No recorded broadcasts found.</div>';
            return;
        }

        dj.episodes.forEach((episode, index) => {
            const absoluteStreamUrl = new URL(episode.streamUrl, window.location.href).href;
            const isThisPlaying = window.cardAudioPlayer && !window.cardAudioPlayer.paused && 
                                  window.cardAudioPlayer.src === absoluteStreamUrl;

            // Calculate unique dates and times for each episode
            const showDate = new Date();
            showDate.setDate(showDate.getDate() - (index * 7));
            
            const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            const dayNum = showDate.getDate();
            const dayName = weekdaysShort[showDate.getDay()];
            const monthName = monthsShort[showDate.getMonth()];
            
            const times = ["10:00 PM", "8:00 PM", "6:00 PM", "4:00 PM"];
            const epTime = times[index % times.length];
            const dateString = `${dayNum} ${monthName}, ${dayName} • ${epTime}`;

            const card = document.createElement('div');
            card.className = `show-card show-archive-card${isThisPlaying ? ' playing' : ''}`;
            card.setAttribute('data-stream-url', episode.streamUrl);
            card.innerHTML = `
                <div class="show-card-header">
                    <div class="show-dj-avatar-wrapper">
                        <img src="${dj.avatar}" alt="${dj.name}" class="show-dj-avatar">
                    </div>
                    <span class="show-time-badge">${dateString}</span>
                </div>
                <div class="show-card-body">
                    <span class="show-card-genre">${dj.genre}</span>
                    <h4 class="show-card-title">${episode.title}</h4>
                    <span class="show-card-host">Host: ${dj.name}</span>
                    <p class="show-card-tags">${episode.tags}</p>
                </div>
                <div class="show-card-footer">
                    <span class="show-listen-label">${isThisPlaying ? 'NOW PLAYING' : 'LISTEN ARCHIVE'}</span>
                    <button class="show-card-play-btn" aria-label="Play/Pause">
                        <i class="fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                </div>
            `;

            const playBtn = card.querySelector('.show-card-play-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleEpisodePlay(episode, dj, djIdx);
            });

            showsGrid.appendChild(card);
        });
    }

    function handleEpisodePlay(episode, dj, djIdx) {
        const absoluteStreamUrl = new URL(episode.streamUrl, window.location.href).href;
        const isPlayingNow = window.cardAudioPlayer && !window.cardAudioPlayer.paused && 
                             window.cardAudioPlayer.src === absoluteStreamUrl;

        if (isPlayingNow) {
            if (window.cardAudioPlayer) window.cardAudioPlayer.pause();
        } else {
            // Stop main player if playing
            if (window.audioPlayer && !window.audioPlayer.paused) {
                window.audioPlayer.pause();
                if (typeof window.setPlayState === 'function') window.setPlayState(false);
            }

            if (typeof window.playCardStream === 'function') {
                window.playCardStream(episode.streamUrl);
            } else if (window.cardAudioPlayer) {
                window.cardAudioPlayer.src = episode.streamUrl;
                window.cardAudioPlayer.play()
                    .then(() => {
                        if (typeof window.syncCardPlayStates === 'function') window.syncCardPlayStates();
                    })
                    .catch(err => console.error(err));
            }
        }
        renderDJShows(dj, djIdx);
    }
}
window.initDJInfoPage = initDJInfoPage;


// 8. BROADCAST SCHEDULE PAGE CONTROLLER
function initSchedulePage() {
    const container = document.querySelector('.schedule-page-section');
    if (!container) return; // Not on the schedule page

    // Fetch both djs.json and schedule.json
    Promise.all([
        window.djsData ? Promise.resolve(window.djsData) : fetch('assets/data/djsa18a.json?t=' + Date.now()).then(res => res.json()),
        window.scheduleData ? Promise.resolve(window.scheduleData) : fetch('assets/data/schedulea18a.json?t=' + Date.now()).then(res => res.json())
    ])
    .then(([djs, schedule]) => {
        window.djsData = djs;
        window.scheduleData = schedule;
        setupSchedulePage(djs, schedule);
    })
    .catch(err => console.error("Failed to load data for schedule page:", err));

    function setupSchedulePage(djsData, scheduleData) {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let activeDay = new Date().getDay();

        const renderSchedule = (dayIndex) => {
            const titleEl = document.getElementById('schedule-active-day-title');
            const daytimeList = document.getElementById('slots-daytime');
            const nighttimeList = document.getElementById('slots-nighttime');

            if (titleEl) titleEl.textContent = daysOfWeek[dayIndex];
            if (daytimeList) daytimeList.innerHTML = '';
            if (nighttimeList) nighttimeList.innerHTML = '';

            const today = new Date();
            const currentDay = today.getDay();
            const currentHour = today.getHours();

            const daySlots = scheduleData[dayIndex];
            if (!daySlots) return;

            daySlots.forEach(slot => {
                const dj = djsData.find(d => d.id === slot.djId);
                if (!dj) return;

                // Check if this show is "now playing"
                let isNowPlaying = false;
                if (dayIndex === currentDay) {
                    if (slot.startHour <= slot.endHour) {
                        isNowPlaying = (currentHour >= slot.startHour && currentHour < slot.endHour);
                    } else {
                        isNowPlaying = (currentHour >= slot.startHour || currentHour < slot.endHour);
                    }
                }

                // Helper to map 24h to broadcast hour offset from 5:00 AM
                const getBroadcastHour = (h) => (h >= 5) ? (h - 5) : (h + 19);

                // Playable if it is today AND (is currently now playing OR slot start time is in the past)
                const isPlayable = (dayIndex === currentDay) && 
                                   (isNowPlaying || getBroadcastHour(slot.startHour) <= getBroadcastHour(currentHour));

                const absoluteStreamUrl = new URL(dj.streamUrl, window.location.href).href;
                const isThisPlaying = window.cardAudioPlayer && !window.cardAudioPlayer.paused && window.cardAudioPlayer.src === absoluteStreamUrl;

                const cardHtml = `
                    <div class="schedule-slot-item ${isNowPlaying ? 'now-playing' : ''} ${!isPlayable ? 'inactive' : ''}">
                        <div class="slot-time-col">
                            <span class="slot-time-range">${slot.timeLabel}</span>
                            ${isNowPlaying ? '<span class="slot-live-badge"><span class="pulse-dot"></span> NOW ON AIR</span>' : ''}
                        </div>
                        <div class="slot-card-content">
                            <div class="slot-card-header">
                                <h4 class="slot-show-name">${dj.show}</h4>
                                <div class="slot-dj-row">
                                    <a href="info-page.html?dj=${dj.id}" class="slot-dj-link">
                                        <img src="${dj.avatar}" alt="${dj.name}" class="slot-avatar">
                                        <span class="slot-dj-name">${dj.name}</span>
                                    </a>
                                </div>
                            </div>
                            <div class="slot-card-footer">
                                <span class="slot-genres">${dj.genre}</span>
                                <button class="slot-play-btn ${isThisPlaying ? 'playing' : ''} ${!isPlayable ? 'disabled' : ''}" ${!isPlayable ? 'disabled' : ''} data-stream-url="${dj.streamUrl}" aria-label="${isThisPlaying ? 'Stop Playing' : 'Listen Now'}">
                                    <i class="fa-solid ${isThisPlaying ? 'fa-circle-stop' : 'fa-circle-play'}"></i>
                                    <span>${isThisPlaying ? 'Stop' : 'Listen'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                const wrapper = document.createElement('div');
                wrapper.innerHTML = cardHtml.trim();
                const cardElement = wrapper.firstChild;

                const playBtn = cardElement.querySelector('.slot-play-btn');
                playBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (!isPlayable) return;
                    const streamUrl = this.getAttribute('data-stream-url');
                    if (!streamUrl) return;

                    const absStreamUrl = new URL(streamUrl, window.location.href).href;
                    const isPlayingThis = window.cardAudioPlayer && 
                                          !window.cardAudioPlayer.paused && 
                                          window.cardAudioPlayer.src === absStreamUrl;

                    if (isPlayingThis) {
                        if (window.cardAudioPlayer) window.cardAudioPlayer.pause();
                    } else {
                        if (typeof window.playCardStream === 'function') {
                            window.playCardStream(streamUrl);
                        } else if (window.cardAudioPlayer) {
                            if (window.audioPlayer && !window.audioPlayer.paused) {
                                window.audioPlayer.pause();
                                if (typeof window.setPlayState === 'function') window.setPlayState(false);
                            }
                            window.cardAudioPlayer.src = streamUrl;
                            window.cardAudioPlayer.play()
                                .then(() => {
                                    if (typeof window.syncCardPlayStates === 'function') window.syncCardPlayStates();
                                })
                                .catch(err => console.error(err));
                        }
                    }
                    
                    renderSchedule(dayIndex);
                });

                if (slot.isDaytime) {
                    if (daytimeList) daytimeList.appendChild(cardElement);
                } else {
                    if (nighttimeList) nighttimeList.appendChild(cardElement);
                }
            });
        };

        const tabs = container.querySelectorAll('.day-tab-vertical');
        tabs.forEach(tab => {
            const dayVal = parseInt(tab.getAttribute('data-day'));
            
            if (dayVal === activeDay) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }

            tab.addEventListener('click', function(e) {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                activeDay = dayVal;
                renderSchedule(dayVal);
                if (searchInput) searchInput.value = ''; // Reset search on day switch
            });
        });

        renderSchedule(activeDay);

        // Search filter implementation
        const searchInput = document.getElementById('schedule-search-input');
        const searchBtn = document.getElementById('schedule-search-btn');

        const filterSchedule = () => {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const slots = container.querySelectorAll('.schedule-slot-item');
            slots.forEach(slot => {
                const showName = slot.querySelector('.slot-show-name')?.textContent.toLowerCase() || '';
                const djName = slot.querySelector('.slot-dj-name')?.textContent.toLowerCase() || '';
                const genre = slot.querySelector('.slot-genres')?.textContent.toLowerCase() || '';
                
                if (showName.includes(query) || djName.includes(query) || genre.includes(query)) {
                    slot.style.display = '';
                } else {
                    slot.style.display = 'none';
                }
            });
        };

        if (searchInput) {
            searchInput.addEventListener('input', filterSchedule);
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                filterSchedule();
            });
        }

        // Event listener to sync scheduler buttons with global card player
        if (window.cardAudioPlayer && !window.cardAudioPlayer.scheduleBound) {
            window.cardAudioPlayer.scheduleBound = true;
            const syncScheduleStates = () => {
                if (document.getElementById('slots-daytime') && window.djsData && window.scheduleData) {
                    renderSchedule(activeDay);
                }
            };
            window.cardAudioPlayer.addEventListener('play', syncScheduleStates);
            window.cardAudioPlayer.addEventListener('pause', syncScheduleStates);
        }
    }
}
window.initSchedulePage = initSchedulePage;

// CATEGORY FILTER & DYNAMIC STATION CARDS LISTINGS
(function () {
    // Helper: Normalize category search
    function matchGenre(stationGenre, categoryName) {
        if (!stationGenre || !categoryName) return false;
        const sGenre = stationGenre.trim().toLowerCase();
        const cat = categoryName.trim().toLowerCase();
        if (sGenre === cat) return true;
        
        // Match Classic/Classical
        if (cat === "classic" && sGenre === "classical") return true;
        if (cat === "classical" && sGenre === "classic") return true;
        
        return false;
    }

    // Render stations on the Homepage (index.html)
    window.renderHomepageStations = function (categoryName = "ALL STATIONS") {
        const grid = document.querySelector('.stations-grid:not(.two-cards)'); // Avoid matching live-section two-cards grid
        if (!grid) return;

        if (!window.stations || window.stations.length === 0) {
            grid.innerHTML = '<div class="no-stations">Loading stations...</div>';
            return;
        }

        // Filter stations
        let filtered = window.stations;
        if (categoryName.toUpperCase() !== "ALL STATIONS") {
            filtered = window.stations.filter(s => matchGenre(s.genre, categoryName));
        }

        // Shuffle filtered stations randomly (Fisher-Yates) to select a random set of 4 out of the available 8
        const shuffled = [...filtered];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Cap at 4 on the homepage
        const limited = shuffled.slice(0, 4);

        if (limited.length === 0) {
            grid.innerHTML = '<div class="no-stations">No stations found for this category.</div>';
            return;
        }

        // Generate HTML
        let html = "";
        limited.forEach(station => {
            const stationId = station.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const formattedPlays = station.plays >= 1000 ? `${(station.plays / 1000).toFixed(0)}K` : station.plays;

            html += `
                <div class="station-card" data-station-id="${stationId}">
                    <div class="album-wrapper">
                        <!-- Sleek Glassmorphic Listening Badge -->
                        <div class="listening-badge">
                            <svg class="waveform-icon" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="3" y="10" width="3" height="4" rx="1.5" />
                                <rect x="9" y="6" width="3" height="12" rx="1.5" />
                                <rect x="15" y="3" width="3" height="18" rx="1.5" />
                                <rect x="21" y="8" width="3" height="8" rx="1.5" />
                            </svg>
                            <div class="css-waveform" style="display: none;">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <span class="listening-count">${formattedPlays}</span>
                        </div>

                        <!-- Vinyl Record (Label source dynamically matches cover image) -->
                        <div class="vinyl-record">
                            <div class="vinyl-center">
                                <img class="vinyl-label-img" src="${station.image}" alt="">
                            </div>
                        </div>

                        <!-- Album Cover Image -->
                        <div class="album-cover">
                            <img class="station-img" src="${station.image}" alt="${station.name}" />
                        </div>

                        <!-- Play Button -->
                        <button class="card-play-btn" data-stream-url="${station.url}">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    </div>

                    <!-- Details -->
                    <div class="card-details">
                        <h3 class="station-title">${station.name.toUpperCase()}</h3>
                        <p class="station-subtitle">${station.subtitle || ''}</p>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

        // Sync playback states immediately
        if (typeof window.syncCardPlayStates === 'function') {
            window.syncCardPlayStates();
        }
    };

    // Render stations on the Stations Page (stations.html)
    window.renderStationsPage = function (categoryName = "ALL STATIONS") {
        const grid = document.querySelector('.stations-page-grid');
        if (!grid) return;

        if (!window.stations || window.stations.length === 0) {
            grid.innerHTML = '<div class="no-stations">Loading stations...</div>';
            return;
        }

        // Filter stations
        let filtered = window.stations;
        if (categoryName.toUpperCase() !== "ALL STATIONS") {
            filtered = window.stations.filter(s => matchGenre(s.genre, categoryName));
        }

        // Renders all matching (no 4-card cap on stations page)
        if (filtered.length === 0) {
            grid.innerHTML = '<div class="no-stations">No stations found for this category.</div>';
            return;
        }

        // Generate HTML (identical to homepage with 3D vinyl sleeves + close button overlay)
        let html = "";
        filtered.forEach((station, index) => {
            const cardId = `station-card-${index + 1}`;
            const stationId = station.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const formattedPlays = station.plays >= 1000 ? `${(station.plays / 1000).toFixed(0)}K` : station.plays;

            html += `
                <div class="station-card" data-station-id="${stationId}" id="${cardId}">
                    <!-- Close button for stations page -->
                    <a href="#" class="close-sp-card" onclick="hideStationCard('${cardId}'); return false;" style="z-index: 10;">
                        <i class="fa-thin fa-circle-xmark"></i>
                    </a>
                    
                    <div class="album-wrapper">
                        <!-- Sleek Glassmorphic Listening Badge -->
                        <div class="listening-badge">
                            <svg class="waveform-icon" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="3" y="10" width="3" height="4" rx="1.5" />
                                <rect x="9" y="6" width="3" height="12" rx="1.5" />
                                <rect x="15" y="3" width="3" height="18" rx="1.5" />
                                <rect x="21" y="8" width="3" height="8" rx="1.5" />
                            </svg>
                            <div class="css-waveform" style="display: none;">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <span class="listening-count">${formattedPlays}</span>
                        </div>

                        <!-- Vinyl Record (Label source dynamically matches cover image) -->
                        <div class="vinyl-record">
                            <div class="vinyl-center">
                                <img class="vinyl-label-img" src="${station.image}" alt="">
                            </div>
                        </div>

                        <!-- Album Cover Image -->
                        <div class="album-cover">
                            <img class="station-img" src="${station.image}" alt="${station.name}" />
                        </div>

                        <!-- Play Button -->
                        <button class="card-play-btn" data-stream-url="${station.url}">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    </div>

                    <!-- Details -->
                    <div class="card-details">
                        <h3 class="station-title">${station.name.toUpperCase()}</h3>
                        <p class="station-subtitle">${station.subtitle || ''}</p>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

        // Sync playback states immediately
        if (typeof window.syncCardPlayStates === 'function') {
            window.syncCardPlayStates();
        }
    };

    // Initialize Category Filters on click
    window.initCategoryFilters = function () {
        console.log("initCategoryFilters called! Stations count:", window.stations ? window.stations.length : 0);
        const filterPills = document.querySelectorAll('.filter-pill, .search-cat-link');
        console.log("filterPills/Links found in DOM:", filterPills.length);
        if (filterPills.length === 0) return;

        // Deduplicate listeners by replacing with cloned elements
        filterPills.forEach(pill => {
            const newPill = pill.cloneNode(true);
            pill.parentNode.replaceChild(newPill, pill);
        });

        const updatedPills = document.querySelectorAll('.filter-pill, .search-cat-link');
        updatedPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                updatedPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const category = (pill.getAttribute('data-category') || pill.innerText).trim();
                console.log('Category filter selected:', category);

                if (document.querySelector('.stations-grid:not(.two-cards)')) {
                    window.renderHomepageStations(category);
                }
                if (document.querySelector('.stations-page-grid')) {
                    window.renderStationsPage(category);
                }
            });
        });

        // Determine active filter element on load, default to "ALL STATIONS"
        let activeCategory = "ALL STATIONS";

        // If on Stations page, pick a random category to activate by default
        if (document.querySelector('.stations-page-grid')) {
            const catLinks = document.querySelectorAll('.search-cat-link');
            if (catLinks.length > 0) {
                const randomIndex = Math.floor(Math.random() * catLinks.length);
                const randomLink = catLinks[randomIndex];
                
                catLinks.forEach(lnk => lnk.classList.remove('active'));
                randomLink.classList.add('active');
                
                activeCategory = (randomLink.getAttribute('data-category') || randomLink.innerText).trim();
                console.log("Random default category chosen for Stations page:", activeCategory);
            }
        } else {
            const activePill = document.querySelector('.filter-pill.active, .search-cat-link.active');
            if (activePill) {
                activeCategory = (activePill.getAttribute('data-category') || activePill.innerText).trim();
            }
        }
        console.log("activeCategory determined:", activeCategory);

        // Render initial view
        if (document.querySelector('.stations-grid:not(.two-cards)')) {
            console.log("Rendering homepage stations grid...");
            window.renderHomepageStations(activeCategory);
        }
        if (document.querySelector('.stations-page-grid')) {
            console.log("Rendering stations-page grid...");
            window.renderStationsPage(activeCategory);
        }
    };

    // Global event delegation for play buttons in dynamic cards
    document.addEventListener('click', (e) => {
        const playBtn = e.target.closest('.card-play-btn, .sp-card-play-btn');
        if (playBtn) {
            e.preventDefault();
            e.stopPropagation();

            if (window.isSearching) return;

            const streamUrl = playBtn.getAttribute('data-stream-url');
            if (streamUrl && typeof window.playCardStream === 'function') {
                window.playCardStream(streamUrl);
            }
        }
    });

    // Auto initialize if stations are already loaded
    if (window.stations && window.stations.length > 0) {
        window.initCategoryFilters();
    }
})();

