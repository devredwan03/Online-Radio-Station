"use strict";

document.addEventListener('DOMContentLoaded', () => {
    // 1. CLEAR STATIONS MODAL LOGIC
    window.hideStationCard = function (cardId) {
        const card = document.getElementById(cardId);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        }
    };

    window.showClearModal = function () {
        const modal = document.getElementById('clearAllModal');
        if (modal) {
            modal.classList.add('active');
        }
    };

    window.closeClearModal = function () {
        const modal = document.getElementById('clearAllModal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    window.confirmClearAll = function () {
        const cards = document.querySelectorAll('.stations-page-card');
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        });
        window.closeClearModal();
    };

    // Close modal if overlay is clicked (wrapped in global rebind for PJAX support)
    window.rebindStationCards = function () {
        const modalOverlay = document.getElementById('clearAllModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    window.closeClearModal();
                }
            });
        }
    };

    // Initialize overlay binding
    window.rebindStationCards();

    // 2. RADIO SEARCH API INTEGRATION (Radio-Browser API)
    window.initSearchRadio = function () {
        const searchForm = document.getElementById('stationsSearchForm');
        const searchInput = document.getElementById('stationsSearchInput');
        const searchBtn = document.getElementById('stationsSearchBtn');
        const clearBtn = document.getElementById('stationsSearchClearBtn');
        const dropdownMenu = document.getElementById('searchDropdownMenu');

        if (!searchForm || !searchInput || !searchBtn || !dropdownMenu) return;

        // Current playing search stream URL (if any)
        let searchStreamUrl = "";

        // Remove old listeners from button to avoid duplicates
        const newSearchBtn = searchBtn.cloneNode(true);
        searchBtn.parentNode.replaceChild(newSearchBtn, searchBtn);

        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        let newClearBtn = null;
        if (clearBtn) {
            newClearBtn = clearBtn.cloneNode(true);
            clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        }

        const toggleClearBtn = () => {
            if (newClearBtn) {
                if (newSearchInput.value.trim().length > 0) {
                    newClearBtn.classList.add('active');
                } else {
                    newClearBtn.classList.remove('active');
                }
            }
        };

        // Initialize clear button visibility state
        toggleClearBtn();

        newSearchBtn.addEventListener('click', function (e) {
            e.preventDefault();

            if (!window.cardAudioPlayer) {
                window.cardAudioPlayer = new Audio();
            }

            if (newSearchBtn.dataset.state === 'stop') {
                if (window.cardAudioPlayer) window.cardAudioPlayer.pause();
                setBtnState('play');
            } else if (newSearchBtn.dataset.state === 'play') {
                if (window.cardAudioPlayer && window.cardAudioPlayer.src === searchStreamUrl) {
                    if (window.audioPlayer && !window.audioPlayer.paused) {
                        window.audioPlayer.pause();
                        if (typeof window.setPlayState === 'function') window.setPlayState(false);
                    }
                    window.cardAudioPlayer.play().catch(err => console.error("Play failed:", err));
                    setBtnState('stop');
                }
            } else {
                performSearch(newSearchInput.value);
            }
        });

        // Trigger search on form submit
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            performSearch(newSearchInput.value);
        });

        newSearchInput.addEventListener('input', function () {
            toggleClearBtn();
            if (newSearchBtn.dataset.state === 'stop' || newSearchBtn.dataset.state === 'play') {
                // If it was playing/paused search station, typing resets button to search mode
                setBtnState('search');
                dropdownMenu.classList.remove('active');
            }
        });

        // Click handler for the clear button
        if (newClearBtn) {
            newClearBtn.addEventListener('click', () => {
                newSearchInput.value = '';
                toggleClearBtn();
                dropdownMenu.classList.remove('active');

                // Stop playing if it's the search stream or an external search station
                if (window.cardAudioPlayer) {
                    if (window.cardAudioPlayer.src === searchStreamUrl || (window.externalStationName && !window.cardAudioPlayer.paused)) {
                        window.cardAudioPlayer.pause();
                    }
                }

                // Reset search button state to magnifying glass
                setBtnState('search');

                // Clear external station info
                window.externalStationName = "";
                window.externalStationDesc = "";
                if (typeof window.rebindRadioUI === 'function') {
                    window.rebindRadioUI();
                }

                // Focus input for next search
                newSearchInput.focus();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.stations-search-wrapper')) {
                dropdownMenu.classList.remove('active');
            }
        });

        function setBtnState(state) {
            newSearchBtn.dataset.state = state;
            if (state === 'search') {
                newSearchBtn.innerHTML = '<i class="fa-light fa-magnifying-glass"></i>';
                newSearchBtn.classList.remove('playing');
            } else if (state === 'stop') {
                newSearchBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                newSearchBtn.classList.add('playing');
            } else if (state === 'play') {
                newSearchBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                newSearchBtn.classList.add('playing');
            }
        }

        setBtnState('search');

        // Sync button state with global card audio player events
        if (!window.cardAudioPlayer) {
            window.cardAudioPlayer = new Audio();
        }
        window.cardAudioPlayer.addEventListener('playing', () => {
            if (window.cardAudioPlayer.src === searchStreamUrl) {
                setBtnState('stop');
            }
        });

        window.cardAudioPlayer.addEventListener('pause', () => {
            if (window.cardAudioPlayer.src === searchStreamUrl) {
                setBtnState('play');
            }
        });

        async function fetchFromRadioBrowser(query) {
            try {
                let baseUrl = 'https://de1.api.radio-browser.info/';
                try {
                    const serversRes = await fetch('https://all.api.radio-browser.info/json/servers');
                    const servers = await serversRes.json();
                    if (servers && servers.length > 0) {
                        baseUrl = 'https://' + servers[0].name;
                    }
                } catch (e) {
                    console.warn('Failed to fetch servers, using fallback', e);
                }

                const res = await fetch(`${baseUrl}/json/stations/search?name=${encodeURIComponent(query)}&limit=15&hidebroken=true`);
                const data = await res.json();
                return data;
            } catch (e) {
                console.error('Radio Browser API search failed', e);
                return [];
            }
        }

        async function performSearch(query) {
            query = query.trim();

            if (!query) {
                dropdownMenu.classList.remove('active');
                return;
            }

            dropdownMenu.innerHTML = '<div class="search-dropdown-no-results">Searching global database... <i class="fa-solid fa-spinner fa-spin"></i></div>';
            dropdownMenu.classList.add('active');

            const results = await fetchFromRadioBrowser(query);

            dropdownMenu.innerHTML = '';

            if (results.length === 0) {
                dropdownMenu.innerHTML = '<div class="search-dropdown-no-results">No stations found for "' + query + '"</div>';
            } else {
                results.forEach(station => {
                    const item = document.createElement('div');
                    item.className = 'search-dropdown-item';

                    const imgSrc = station.favicon || 'images/tuner-image.jpg';
                    const tags = station.tags ? station.tags.split(',')[0].trim() : 'Radio';
                    const country = station.country || 'Unknown';
                    const resolvedUrl = station.url_resolved || station.url;

                    item.innerHTML = `
                        <img src="${imgSrc}" class="search-dropdown-item-img" alt="${station.name}" onerror="this.onerror=null; this.src='images/tuner-image.jpg'">
                        <div class="search-dropdown-item-text">
                            <div class="search-dropdown-item-title">${station.name}</div>
                            <div class="search-dropdown-item-genre">${country} | ${tags}</div>
                        </div>
                    `;

                    item.addEventListener('click', () => {
                        dropdownMenu.classList.remove('active');
                        searchStreamUrl = resolvedUrl;

                        if (typeof window.playCardStream === 'function') {
                            window.playCardStream(resolvedUrl);
                        } else {
                            if (!window.cardAudioPlayer) {
                                window.cardAudioPlayer = new Audio();
                            }
                            if (window.audioPlayer && !window.audioPlayer.paused) {
                                window.audioPlayer.pause();
                                if (typeof window.setPlayState === 'function') window.setPlayState(false);
                            }
                            window.cardAudioPlayer.src = resolvedUrl;
                            window.cardAudioPlayer.play().catch(err => console.error("Playback failed:", err));
                        }
                    });

                    dropdownMenu.appendChild(item);
                });
            }
        }
    };

    // Initialize search
    window.initSearchRadio();
});
