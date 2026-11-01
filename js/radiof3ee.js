"use strict";

/**
 * VIBES RADIO - Studio Theme Audio Controller
 * Manages audio playback, interactive frequency tuner scale, volume slider, and visualizers.
 */

// Global Audio States
let audioPlayer = new Audio();
window.audioPlayer = audioPlayer;

let cardAudioPlayer = new Audio();
window.cardAudioPlayer = cardAudioPlayer;

// Initialize cardAudioPlayer listeners
cardAudioPlayer.addEventListener('play', () => {
    if (window.audioPlayer && !window.audioPlayer.paused) {
        window.audioPlayer.pause();
        setPlayState(false);
    }
    if (typeof window.syncCardPlayStates === 'function') {
        window.syncCardPlayStates();
    }
});
cardAudioPlayer.addEventListener('pause', () => {
    if (typeof window.syncCardPlayStates === 'function') {
        window.syncCardPlayStates();
    }
});

let isPlaying = false;
let stations = [];
let tunerStations = [];
let equalizerTimers = [];
let customHeights = [50, 50, 50, 50, 50, 50, 50, 50];

// Web Audio Equalizer States
let audioCtx = null;
let audioSource = null;
let eqFilters = [];
const eqFrequencies = [60, 150, 400, 1000, 2000, 2400, 6000, 15000];
const playlistFrequencies = [20, 32, 50, 80, 125, 200, 300, 450, 650, 900, 1200, 1800, 2500, 3500, 5000, 7000, 10000, 13000, 16000, 20000];
let playlistFilters = [];
let playlistHeights = [];
try {
    const storedPlaylistHeights = localStorage.getItem('studio_playlist_eq_heights');
    if (storedPlaylistHeights) {
        playlistHeights = JSON.parse(storedPlaylistHeights);
    }
} catch (e) {
    console.error('Error loading stored playlist heights:', e);
}
if (!playlistHeights || playlistHeights.length !== 20) {
    playlistHeights = Array(20).fill(50);
}
let isCorsBypassed = false;

// VU Meter and Analyser States
let splitterNode = null;
let analyserLeft = null;
let analyserRight = null;
let vuAnimationId = null;
let currentAngleLeft = -50;
let currentAngleRight = -50;
let velocityLeft = 0;
let velocityRight = 0;


// Tuning Sound Effect
const tuningAudio = new Audio('assets/sound/140157__copyc4t__fm-radio-tuning-sweeps.flac');
tuningAudio.loop = true;
window.tuningAudio = tuningAudio;

// Tuning & Scale Configuration
const minFreq = 88.0;
const maxFreq = 108.0;
let currentFreq = 96.7; // default to Smooth Jazz Vibes
let isSearching = false;
let searchDirection = 1;
let searchInterval = null;
const searchSpeed = 0.1;

// Position tuner scale labels dynamically to comply with ThemeForest Standard (no inline styles in HTML)
function initScaleLabels() {
    const tunerLabels = document.querySelectorAll('.tuner-labels span');
    tunerLabels.forEach((label, index) => {
        label.style.left = `${index * 10}%`;
    });
}

// Load Stations (fetch from JSON and merge with localStorage plays/likes statistics)
function loadStationsData(callback) {
    const fetchMain = fetch('assets/data/stationsa18a.json?t=' + Date.now())
        .then(response => response.json())
        .catch(error => {
            console.error('Error loading main stations:', error);
            return null;
        });

    const fetchTuner = fetch('assets/data/tuner_stationsa18a.json?t=' + Date.now())
        .then(response => response.json())
        .catch(error => {
            console.error('Error loading tuner stations:', error);
            return null;
        });

    Promise.all([fetchMain, fetchTuner])
        .then(([mainJson, tunerJson]) => {
            // Process main stations
            let finalMain = [];
            if (mainJson) {
                if (Array.isArray(mainJson)) {
                    finalMain = mainJson;
                } else if (typeof mainJson === 'object') {
                    for (const genre in mainJson) {
                        if (Array.isArray(mainJson[genre])) {
                            mainJson[genre].forEach(station => {
                                if (!station.genre) {
                                    station.genre = genre;
                                }
                                finalMain.push(station);
                            });
                        }
                    }
                }
            }
            const localMainData = localStorage.getItem('studio_stations_data');
            if (localMainData) {
                try {
                    const localMain = JSON.parse(localMainData);
                    if (Array.isArray(localMain)) {
                        finalMain = finalMain.map(jsonStation => {
                            const localMatch = localMain.find(l => l.url === jsonStation.url);
                            if (localMatch) {
                                return {
                                    ...jsonStation,
                                    plays: localMatch.plays !== undefined ? localMatch.plays : (jsonStation.plays || 0),
                                    likes: localMatch.likes !== undefined ? localMatch.likes : (jsonStation.likes || 0)
                                };
                            }
                            return jsonStation;
                        });
                    }
                } catch (e) {}
            }
            stations = finalMain;
            window.stations = stations;
            localStorage.setItem('studio_stations_data', JSON.stringify(stations));

            // Process tuner stations
            let finalTuner = Array.isArray(tunerJson) ? tunerJson : [];
            const localTunerData = localStorage.getItem('studio_tuner_stations_data');
            if (localTunerData) {
                try {
                    const localTuner = JSON.parse(localTunerData);
                    if (Array.isArray(localTuner)) {
                        finalTuner = finalTuner.map(jsonStation => {
                            const localMatch = localTuner.find(l => l.url === jsonStation.url);
                            if (localMatch) {
                                return {
                                    ...jsonStation,
                                    plays: localMatch.plays !== undefined ? localMatch.plays : (jsonStation.plays || 0),
                                    likes: localMatch.likes !== undefined ? localMatch.likes : (jsonStation.likes || 0)
                                };
                            }
                            return jsonStation;
                        });
                    }
                } catch (e) {}
            }
            tunerStations = finalTuner;
            window.tunerStations = tunerStations;
            localStorage.setItem('studio_tuner_stations_data', JSON.stringify(tunerStations));

            console.log('Main stations loaded:', stations);
            console.log('Tuner stations loaded:', tunerStations);
            callback();
        })
        .catch(err => {
            console.error('Fatal error loading stations:', err);
            // Fallback to localStorage if offline/fetch fails
            const localData = localStorage.getItem('studio_stations_data');
            if (localData) {
                try {
                    stations = JSON.parse(localData);
                    window.stations = stations;
                } catch (e) {}
            }
            if (stations.length === 0) {
                stations = [
                    { "frequency": 96.7, "url": "https://playerservices.streamtheworld.com/api/livestream-redirect/ACIR22_s01AAC.aac", "image": "images/jazz.png", "name": "Smooth Jazz Vibes", "genre": "Jazz", "plays": 1235, "likes": 84 }
                ];
                window.stations = stations;
            }

            const localTunerData = localStorage.getItem('studio_tuner_stations_data');
            if (localTunerData) {
                try {
                    tunerStations = JSON.parse(localTunerData);
                    window.tunerStations = tunerStations;
                } catch (e) {}
            }
            if (tunerStations.length === 0) {
                tunerStations = [...stations];
                window.tunerStations = tunerStations;
            }
            callback();
        });
}

// Dynamically connect correct equalizer filters (8-band or 20-band) based on current page
function connectEqualizerFilters() {
    if (!audioCtx || !audioSource) return;

    try {
        audioSource.disconnect();
        eqFilters.forEach(f => {
            try { f.disconnect(); } catch (e) {}
        });
        playlistFilters.forEach(f => {
            try { f.disconnect(); } catch (e) {}
        });
    } catch (e) {
        console.warn("Error disconnecting nodes:", e);
    }

    let lastNode = audioSource;

    if (isCorsBypassed) {
        audioSource.connect(audioCtx.destination);
        console.log("Equalizer bypassed, audio connected directly to destination.");
    } else {
        const onPlaylistPage = !!document.getElementById('playlistEqSliders');

        if (onPlaylistPage) {
            if (playlistFilters.length === 0) {
                playlistFrequencies.forEach((freq) => {
                    const filter = audioCtx.createBiquadFilter();
                    filter.type = "peaking";
                    filter.frequency.value = freq;
                    filter.Q.value = 1.2;
                    playlistFilters.push(filter);
                });
            }

            // Sync gains
            playlistFilters.forEach((filter, index) => {
                const height = playlistHeights[index] !== undefined ? playlistHeights[index] : 50;
                filter.gain.setValueAtTime((height - 50) * (12 / 40), audioCtx.currentTime);
            });

            playlistFilters.forEach(filter => {
                lastNode.connect(filter);
                lastNode = filter;
            });
            lastNode.connect(audioCtx.destination);
            console.log("20-band Equalizer chain connected.");
        } else {
            if (eqFilters.length === 0) {
                eqFrequencies.forEach((freq) => {
                    const filter = audioCtx.createBiquadFilter();
                    filter.type = "peaking";
                    filter.frequency.value = freq;
                    filter.Q.value = 1.0;
                    eqFilters.push(filter);
                });
            }

            // Sync gains
            eqFilters.forEach((filter, index) => {
                const height = customHeights[index] !== undefined ? customHeights[index] : 50;
                filter.gain.setValueAtTime((height - 50) * (12 / 40), audioCtx.currentTime);
            });

            eqFilters.forEach(filter => {
                lastNode.connect(filter);
                lastNode = filter;
            });
            lastNode.connect(audioCtx.destination);
            console.log("8-band Equalizer chain connected.");
        }

        // Connect Analysers for VU theme
        try {
            if (!splitterNode) {
                splitterNode = audioCtx.createChannelSplitter(2);
                analyserLeft = audioCtx.createAnalyser();
                analyserRight = audioCtx.createAnalyser();
                analyserLeft.fftSize = 256;
                analyserRight.fftSize = 256;
            }
            try { splitterNode.disconnect(); } catch (e) {}
            lastNode.connect(splitterNode);
            splitterNode.connect(analyserLeft, 0); // left channel
            splitterNode.connect(analyserRight, 1); // right channel
        } catch (e) {
            console.warn("Failed to connect VU Meter analysers:", e);
        }
    }
}

// Initialize Web Audio context and Peak filters
function initAudioContext() {
    if (audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    if (!audioSource) {
        audioSource = audioCtx.createMediaElementSource(audioPlayer);
    }

    connectEqualizerFilters();
}

// Bind standard events to player
function bindAudioEvents(player) {
    player.addEventListener('playing', () => {
        if (player.isDiscarded) return;
        if (window.cardAudioPlayer && !window.cardAudioPlayer.paused) {
            window.cardAudioPlayer.pause();
        }
        setPlayState(true);
        if (typeof window.syncCardPlayStates === 'function') {
            window.syncCardPlayStates();
        }
    });

    player.addEventListener('pause', () => {
        if (player.isDiscarded) return;
        setPlayState(false);
        if (typeof window.syncCardPlayStates === 'function') {
            window.syncCardPlayStates();
        }
    });

    player.addEventListener('error', () => {
        if (player.isDiscarded) return;
        console.error('Audio stream error, code:', player.error ? player.error.code : 'unknown');
        
        // CORS Fallback: If player fails with CORS enabled, recreate without CORS
        if (player.crossOrigin === "anonymous" && !isCorsBypassed) {
            console.warn('CORS restricted stream. Re-routing audio directly to destination (bypassing equalizer)...');
            isCorsBypassed = true;
            
            const currentUrl = player.src;
            const wasPlaying = isPlaying;

            recreateAudioPlayer(true);

            audioPlayer.src = currentUrl;
            audioPlayer.load();

            if (wasPlaying || true) {
                audioPlayer.play()
                    .then(() => {
                        console.log('Stream successfully playing directly.');
                        setPlayState(true);
                        if (currentPlayingSong) {
                            updatePlayerCardForSong(currentPlayingSong);
                        }
                    })
                    .catch(err => {
                        console.error('Direct fallback playback failed:', err);
                        setPlayState(false);
                    });
            }
            return;
        }

        setPlayState(false);
    });

    player.addEventListener('volumechange', () => {
        if (player.isDiscarded) return;
        if (typeof setDialRotation === 'function') {
            setDialRotation(player.volume);
        }
        if (typeof setPlaylistVolumeSlider === 'function') {
            setPlaylistVolumeSlider(player.volume);
        }
    });
}

// Helper to recreate audio element to clear AudioContext connection on CORS errors
function recreateAudioPlayer(bypassCors) {
    if (audioPlayer) {
        audioPlayer.isDiscarded = true;
        audioPlayer.pause();
        audioPlayer.src = '';
    }

    audioPlayer = new Audio();
    window.audioPlayer = audioPlayer;

    const volumeSlider = document.querySelector('.volume-slider');
    if (volumeSlider) {
        audioPlayer.volume = volumeSlider.value / 100;
        tuningAudio.volume = volumeSlider.value / 100;
    }

    if (!bypassCors) {
        audioPlayer.crossOrigin = "anonymous";
    }

    bindAudioEvents(audioPlayer);

    // If equalizer is initialized, connect the new player element to context
    if (!bypassCors && audioCtx && audioCtx.state !== 'closed') {
        try {
            audioSource = audioCtx.createMediaElementSource(audioPlayer);
            connectEqualizerFilters();
        } catch (e) {
            console.error('Error connecting source node:', e);
        }
    }
}

// Global stream trigger helper
function playStationStream(url) {
    if (window.cardAudioPlayer && !window.cardAudioPlayer.paused) {
        window.cardAudioPlayer.pause();
    }
    window.isArchivePlaying = false;
    if (!audioCtx) {
        initAudioContext();
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isCorsBypassed = false;
    recreateAudioPlayer(false);

    audioPlayer.src = url;
    audioPlayer.play()
        .then(() => {
            setPlayState(true);
            
            const stationInTuner = tunerStations.find(s => s.url === url);
            const stationInMain = stations.find(s => s.url === url);
            if (stationInTuner) {
                stationInTuner.plays = (stationInTuner.plays || 0) + 1;
                localStorage.setItem('studio_tuner_stations_data', JSON.stringify(tunerStations));
            }
            if (stationInMain) {
                stationInMain.plays = (stationInMain.plays || 0) + 1;
                localStorage.setItem('studio_stations_data', JSON.stringify(stations));
            }
            if (stationInTuner || stationInMain) {
                if (typeof window.updatePlaylistUI === 'function') {
                    window.updatePlaylistUI();
                }
            }
        })
        .catch(err => {
            console.error('playStationStream failed:', err);
        });
}

// Initialize event listeners on default player
bindAudioEvents(audioPlayer);

// Update Play/Pause UI across components
function setPlayState(playing) {
    isPlaying = playing;
    
    // Call playlist update
    if (typeof window.updatePlaylistUI === 'function') {
        window.updatePlaylistUI();
    }

    // 1. Play Button on Player
    const playerPlayBtn = document.querySelector('#player-play-btn');
    if (playerPlayBtn) {
        if (playing) {
            playerPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            playerPlayBtn.classList.add('playing');
        } else {
            playerPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            playerPlayBtn.classList.remove('playing');
        }
    }

    // 2. Play Buttons on Header / Hero
    const listenToggles = document.querySelectorAll('.listen-live-toggle');
    listenToggles.forEach(btn => {
        const spanText = btn.querySelector('span');
        const icon = btn.querySelector('i');
        
        if (btn.id === 'hero-listen-btn') {
            if (playing) {
                btn.classList.add('active');
                if (spanText) spanText.innerText = 'STOP LIVE';
                if (icon) icon.className = 'fa-solid fa-pause';
            } else {
                btn.classList.remove('active');
                if (spanText) spanText.innerText = 'LISTEN LIVE';
                if (icon) icon.className = 'fa-solid fa-play';
            }
        } else {
            // Navbar button or others
            if (playing) {
                btn.classList.add('active');
                if (spanText) spanText.innerText = 'STOP LIVE';
                if (icon) icon.className = 'fa-solid fa-circle-pause';
            } else {
                btn.classList.remove('active');
                if (spanText) spanText.innerText = 'LISTEN LIVE';
                if (icon) icon.className = 'fa-solid fa-tower-broadcast';
            }
        }
    });

    // 3. Top Info Bar Visualizer
    const topVisualizer = document.querySelector('#top-visualizer');
    if (topVisualizer) {
        const eitherPlaying = playing || (window.cardAudioPlayer && !window.cardAudioPlayer.paused);
        if (eitherPlaying) {
            topVisualizer.classList.remove('paused');
        } else {
            topVisualizer.classList.add('paused');
        }
    }

    // 4. Player Widget Visualizer Button
    const widgetVizBtn = document.querySelector('.visualizer-toggle-btn');
    if (widgetVizBtn) {
        if (playing) {
            widgetVizBtn.classList.add('active');
        } else {
            widgetVizBtn.classList.remove('active');
        }
    }

    // 5. Toggle .playing class on the floating player card for equalizer animations
    const playerCard = document.querySelector('.floating-player-card');
    if (playerCard) {
        if (playing) {
            playerCard.classList.add('playing');
        } else {
            playerCard.classList.remove('playing');
        }
    }

    if (playing) {
        startEqualizerJSEffect();
    } else {
        stopEqualizerJSEffect();
    }

    // 7. Sync Equalizer Status Indicator (Active / Bypassed / Off)
    if (playing) {
        if (isCorsBypassed) {
            updateEqStatus('bypassed');
        } else {
            updateEqStatus('active');
        }
    } else {
        updateEqStatus('suspended');
    }
}

// Decoupled Station Cards and Podcast Play states sync function
window.syncCardPlayStates = function() {
    const isCardPlaying = window.cardAudioPlayer && !window.cardAudioPlayer.paused;
    const currentCardSrc = window.cardAudioPlayer ? window.cardAudioPlayer.src : "";

    // 1. Update station cards on index.html / stations.html
    const cardPlayBtns = document.querySelectorAll('.card-play-btn, .sp-card-play-btn');
    cardPlayBtns.forEach(btn => {
        const streamUrl = btn.getAttribute('data-stream-url');
        const card = btn.closest('.station-card, .stations-page-card');
        const absoluteStreamUrl = streamUrl ? new URL(streamUrl, window.location.href).href : "";
        
        if (isCardPlaying && streamUrl && currentCardSrc === absoluteStreamUrl) {
            if (btn.querySelector('.fa-light') || btn.classList.contains('fa-light')) {
                btn.innerHTML = '<i class="fa-light fa-pause"></i>';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            }
            btn.classList.add('playing');
            if (card) card.classList.add('is-playing');
        } else {
            if (btn.querySelector('.fa-light') || btn.classList.contains('fa-light')) {
                btn.innerHTML = '<i class="fa-light fa-play"></i>';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
            btn.classList.remove('playing');
            if (card) card.classList.remove('is-playing');
        }
    });

    // 2. Sync waveforms inside station cards
    const cards = document.querySelectorAll('.station-card, .stations-page-card');
    cards.forEach(card => {
        const liveWaveforms = card.querySelectorAll('.live-waveform, .sp-waveform-icon');
        const cssWaveform = card.querySelector('.css-waveform');
        if (card.classList.contains('is-playing')) {
            liveWaveforms.forEach(w => w.style.display = 'none');
            if (cssWaveform) cssWaveform.style.display = 'flex';
        } else {
            liveWaveforms.forEach(w => w.style.display = '');
            if (cssWaveform) cssWaveform.style.display = 'none';
        }
    });

    // 3. Update show/archive cards in DJs / streaming-achieve / info-page
    const showBtns = document.querySelectorAll('.show-card-play-btn');
    showBtns.forEach(btn => {
        const card = btn.closest('.show-card');
        const streamUrl = card ? card.getAttribute('data-stream-url') : null;
        const absoluteStreamUrl = streamUrl ? new URL(streamUrl, window.location.href).href : "";
        const isThisPlaying = isCardPlaying && streamUrl && currentCardSrc === absoluteStreamUrl;

        const listenLabel = btn.closest('.show-card-footer')?.querySelector('.show-listen-label');
        if (listenLabel) {
            listenLabel.innerText = isThisPlaying ? 'NOW PLAYING' : 'LISTEN ARCHIVE';
        }

        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = `fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}`;
        }
    });

    // 4. Update podcast cards
    const episodeCards = document.querySelectorAll('.episode-card');
    episodeCards.forEach(card => {
        const streamUrl = card.getAttribute('data-stream-url');
        const absoluteStreamUrl = streamUrl ? new URL(streamUrl, window.location.href).href : "";
        const isThisPlaying = isCardPlaying && streamUrl && currentCardSrc === absoluteStreamUrl;
        
        if (isThisPlaying) {
            card.classList.add('playing');
        } else {
            card.classList.remove('playing');
        }

        const icon = card.querySelector('.episode-play-icon i');
        if (icon) {
            icon.className = `fa-solid ${isThisPlaying ? 'fa-pause' : 'fa-play'}`;
        }
        const text = card.querySelector('.episode-listen-text');
        if (text) {
            text.innerText = isThisPlaying ? 'Playing' : 'Listen Now';
        }
    });

    // 5. Update shows listen button text (shows.html)
    const listenButtons = document.querySelectorAll('.show-listen-btn');
    listenButtons.forEach(btn => {
        const streamUrl = btn.getAttribute('data-stream-url');
        const absoluteStreamUrl = streamUrl ? new URL(streamUrl, window.location.href).href : "";
        const isThisPlaying = isCardPlaying && streamUrl && currentCardSrc === absoluteStreamUrl;
        
        if (isThisPlaying) {
            btn.innerHTML = '<i class="fa-solid fa-circle-stop"></i> Stop Playing';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-circle-play"></i> Listen Now';
        }
    });

    // 6. Update schedule slot play buttons (schedule.html)
    const scheduleBtns = document.querySelectorAll('.slot-play-btn');
    scheduleBtns.forEach(btn => {
        const streamUrl = btn.getAttribute('data-stream-url');
        const absoluteStreamUrl = streamUrl ? new URL(streamUrl, window.location.href).href : "";
        const isThisPlaying = isCardPlaying && streamUrl && currentCardSrc === absoluteStreamUrl;

        const icon = btn.querySelector('i');
        const text = btn.querySelector('span');

        if (icon) {
            icon.className = `fa-solid ${isThisPlaying ? 'fa-circle-stop' : 'fa-circle-play'}`;
        }
        if (text) {
            text.textContent = isThisPlaying ? 'Stop' : 'Listen';
        }
        btn.setAttribute('aria-label', isThisPlaying ? 'Stop Playing' : 'Listen Now');
        if (isThisPlaying) {
            btn.classList.add('playing');
        } else {
            btn.classList.remove('playing');
        }
    });

    // 7. Update top visualizer (animates if either player is playing)
    const topVisualizer = document.querySelector('#top-visualizer');
    if (topVisualizer) {
        const eitherPlaying = (window.audioPlayer && !window.audioPlayer.paused) || isCardPlaying;
        if (eitherPlaying) {
            topVisualizer.classList.remove('paused');
        } else {
            topVisualizer.classList.add('paused');
        }
    }
};

// Play a card stream independently of the tuner
window.playCardStream = function(url) {
    if (!window.cardAudioPlayer) {
        window.cardAudioPlayer = new Audio();
    }

    // Set volume to match current slider volume
    const volumeSlider = document.querySelector('.volume-slider');
    if (volumeSlider) {
        window.cardAudioPlayer.volume = volumeSlider.value / 100;
    }

    // Pause tuner if it is playing
    if (window.audioPlayer && !window.audioPlayer.paused) {
        window.audioPlayer.pause();
        setPlayState(false);
    }

    const absoluteUrl = url ? new URL(url, window.location.href).href : "";

    if (window.cardAudioPlayer.src === absoluteUrl && !window.cardAudioPlayer.paused) {
        window.cardAudioPlayer.pause();
    } else {
        window.cardAudioPlayer.src = absoluteUrl;
        window.cardAudioPlayer.play()
            .then(() => {
                window.syncCardPlayStates();
            })
            .catch(err => console.error("Card play failed:", err));
    }
};

// Update visual equalizer status indicator (Green/Red/Gray dots)
function updateEqStatus(status) {
    const indicators = document.querySelectorAll('.eq-status-indicator');
    if (indicators.length === 0) return;

    indicators.forEach(indicator => {
        const textSpan = indicator.querySelector('.status-text');
        
        // Clear classes
        indicator.classList.remove('active', 'bypassed');
        
        if (status === 'active') {
            indicator.classList.add('active');
            if (textSpan) textSpan.innerText = 'Equalizer Active';
        } else if (status === 'bypassed') {
            indicator.classList.add('bypassed');
            if (textSpan) textSpan.innerText = 'Equalizer Bypassed (CORS)';
        } else {
            if (textSpan) {
                if (indicator.id === 'playlist-eq-status-indicator') {
                    textSpan.innerText = '20-Band Graphic Equalizer';
                } else {
                    textSpan.innerText = 'Equalizer Off';
                }
            }
        }
    });
}

// Dynamic randomized JavaScript Equalizer Effect (disabled to keep real equalizer slider values static)
function startEqualizerJSEffect() {
    const handles = document.querySelectorAll('.equalizer-handle');
    handles.forEach((handle, index) => {
        handle.style.bottom = `${customHeights[index]}%`;
    });
}

function stopEqualizerJSEffect() {
    const handles = document.querySelectorAll('.equalizer-handle');
    handles.forEach((handle, index) => {
        handle.style.bottom = `${customHeights[index]}%`;
    });
}

// Start auto-search tuning
function startSearch(direction) {
    if (isSearching) return;

    if (direction === -1 && currentFreq <= minFreq) return;
    if (direction === 1 && currentFreq >= maxFreq) return;

    isSearching = true;
    searchDirection = direction;

    // Pause audio during scan
    audioPlayer.pause();
    audioPlayer.removeAttribute('src');
    audioPlayer.load();
    setPlayState(false);

    // Play tuning static sound effect
    tuningAudio.volume = audioPlayer.volume;
    tuningAudio.play().catch(e => console.log('Tuning audio sound blocked:', e));

    searchInterval = setInterval(() => {
        currentFreq += searchSpeed * searchDirection;
        localStorage.setItem('radioFrequencyStudio', currentFreq);

        // Check range limits
        if (currentFreq >= maxFreq && searchDirection === 1) {
            currentFreq = maxFreq;
            rebindRadioUI();
            stopSearch(null);
            return;
        }
        if (currentFreq <= minFreq && searchDirection === -1) {
            currentFreq = minFreq;
            rebindRadioUI();
            stopSearch(null);
            return;
        }

        rebindRadioUI();

        // Check if tuner aligns with a station
        const epsilon = searchSpeed / 1.5;
        const foundStation = tunerStations.find(station => Math.abs(station.frequency - currentFreq) <= epsilon);

        if (foundStation) {
            stopSearch(foundStation);
        }
    }, 45);
}

// Stop search tuning
function stopSearch(station) {
    clearInterval(searchInterval);
    isSearching = false;
    tuningAudio.pause();

    if (station) {
        currentFreq = station.frequency;
        localStorage.setItem('radioFrequencyStudio', currentFreq);
        rebindRadioUI();

        // Play the station's audio stream
        playStationStream(station.url);
    }
}

// Update tuner scale positions and metadata text
function rebindRadioUI() {
    // Dynamically connect correct equalizer filters (8-band or 20-band) based on current page
    connectEqualizerFilters();

    const needle = document.getElementById('radio-needle');
    const freqDisplay = document.querySelector('.active-station-freq');
    const trackTitle = document.querySelector('.track-title-name');
    const trackDesc = document.querySelector('.track-artist-desc');
    const topAirText = document.querySelector('.top-air-station');
    const playerCoverImg = document.querySelector('.player-cover-img');
    const liveStatus = document.querySelector('.floating-player-card .live-status');

    // Restore standard LIVE ON AIR badge
    if (liveStatus) {
        liveStatus.innerHTML = '<span class="live-dot"></span> LIVE ON AIR';
    }

    // Find the station matches the frequency
    const currentStation = tunerStations.find(s => Math.abs(s.frequency - currentFreq) < 0.05);
    
    // Check if the current audio player is playing a stream that matches a station in our list
    const playingStation = tunerStations.find(s => audioPlayer.src && !audioPlayer.paused && (audioPlayer.src === s.url || audioPlayer.src.includes(s.url)));

    if (playingStation) {
        // If playing a known local station, automatically update frequency and storage to snap the tuner dial
        if (playingStation.frequency && currentFreq !== playingStation.frequency && !isSearching) {
            currentFreq = playingStation.frequency;
            localStorage.setItem('radioFrequencyStudio', currentFreq);
        }
        if (freqDisplay) freqDisplay.innerText = currentFreq.toFixed(1);
        if (needle) {
            const percentage = ((currentFreq - minFreq) / (maxFreq - minFreq)) * 100;
            needle.style.left = `${percentage}%`;
        }
        if (trackTitle) trackTitle.innerText = playingStation.name;
        if (trackDesc) {
            if (playingStation.frequency) {
                trackDesc.innerText = `${playingStation.frequency.toFixed(1)} FM • Live Broadcast`;
            } else {
                trackDesc.innerText = `${playingStation.genre || 'Live'} • Live Broadcast`;
            }
        }
        if (topAirText) topAirText.innerText = playingStation.name;
        if (playerCoverImg) playerCoverImg.src = playingStation.image;
    } else {
        // Update digital frequency display (Format: 96.7)
        if (freqDisplay) freqDisplay.innerText = currentFreq.toFixed(1);
        if (needle) {
            const percentage = ((currentFreq - minFreq) / (maxFreq - minFreq)) * 100;
            needle.style.left = `${percentage}%`;
        }
        
        if (currentStation) {
            if (trackTitle) trackTitle.innerText = currentStation.name;
            if (trackDesc) trackDesc.innerText = `${currentStation.frequency.toFixed(1)} FM • Live Broadcast`;
            if (topAirText) topAirText.innerText = currentStation.name;
            if (playerCoverImg) playerCoverImg.src = currentStation.image;
        } else {
            if (trackTitle) trackTitle.innerText = "Noise / Tuning...";
            if (trackDesc) trackDesc.innerText = `${currentFreq.toFixed(1)} FM • Searching...`;
            if (topAirText) topAirText.innerText = "AVAVA ONLINE";
            if (playerCoverImg) playerCoverImg.src = "images/tuner-image.jpg";
        }
    }

    if (typeof updatePlaylistUI === 'function') {
        updatePlaylistUI();
    }
}

// Cycle through loaded stations sequentially on button press
function cycleStation(direction) {
    if (isSearching || tunerStations.length === 0) return;

    let currentIndex = tunerStations.findIndex(s => Math.abs(s.frequency - currentFreq) < 0.15);
    if (currentIndex === -1) currentIndex = 0;

    const nextIndex = (currentIndex + direction + tunerStations.length) % tunerStations.length;
    const nextStation = tunerStations[nextIndex];

    currentFreq = nextStation.frequency;
    localStorage.setItem('radioFrequencyStudio', currentFreq);

    rebindRadioUI();

    playStationStream(nextStation.url);
}

// Initialize Event Handlers for Player
function initRadioEvents() {
    const playBtn = document.getElementById('player-play-btn');
    const btnScaleLeft = document.getElementById('btn-scale-left');
    const btnScaleRight = document.getElementById('btn-scale-right');
    const listenToggles = document.querySelectorAll('.listen-live-toggle');
    const scaleContainer = document.getElementById('scale-container');
    const needle = document.getElementById('radio-needle');
    
    // Play / Pause Clicks for Tuner
    const handlePlayPause = (e) => {
        if (e) e.preventDefault();
        if (isSearching) return;

        if (!audioCtx) {
            initAudioContext();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (isPlaying) {
            audioPlayer.pause();
            setPlayState(false);
        } else {
            if (window.cardAudioPlayer && !window.cardAudioPlayer.paused) {
                window.cardAudioPlayer.pause();
            }

            if (audioPlayer.src) {
                audioPlayer.play()
                    .then(() => setPlayState(true))
                    .catch(err => console.error('Audio play failed:', err));
            } else {
                // Find matching station or first in JSON
                const currentStation = tunerStations.find(s => Math.abs(s.frequency - currentFreq) < 0.1) || tunerStations[0];
                if (currentStation) {
                    currentFreq = currentStation.frequency;
                    rebindRadioUI();
                    playStationStream(currentStation.url);
                }
            }
        }
    };

    // Play / Pause Clicks for Archive (Listen Live buttons)
    const handleArchiveToggle = (e) => {
        if (e) e.preventDefault();
        
        if (!audioCtx) {
            initAudioContext();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // On the archive page, listen live toggle is bound to archive playback.
        if (document.getElementById('archiveDateGrid')) {
            if (window.cardAudioPlayer && !window.cardAudioPlayer.paused) {
                window.cardAudioPlayer.pause();
                return;
            }

            if (window.cardAudioPlayer && window.cardAudioPlayer.src) {
                if (window.audioPlayer && !window.audioPlayer.paused) {
                    window.audioPlayer.pause();
                    setPlayState(false);
                }
                window.cardAudioPlayer.play()
                    .then(() => {
                        if (typeof window.syncCardPlayStates === 'function') window.syncCardPlayStates();
                    })
                    .catch(err => console.error('Audio play failed:', err));
                return;
            }

            if (typeof window.playActiveArchiveShow === 'function') {
                window.playActiveArchiveShow();
            }
        } else {
            // On other pages, Listen Live button toggles live tuner playback.
            if (window.cardAudioPlayer && !window.cardAudioPlayer.paused) {
                window.cardAudioPlayer.pause();
            }
            if (isPlaying) {
                audioPlayer.pause();
                setPlayState(false);
            } else {
                const liveStationSrc = tunerStations.some(s => audioPlayer.src && (audioPlayer.src === s.url || audioPlayer.src.includes(s.url)));
                if (audioPlayer.src && liveStationSrc) {
                    audioPlayer.play()
                        .then(() => setPlayState(true))
                        .catch(err => console.error('Audio play failed:', err));
                } else {
                    const currentStation = tunerStations.find(s => Math.abs(s.frequency - currentFreq) < 0.1) || tunerStations[0];
                    if (currentStation) {
                        currentFreq = currentStation.frequency;
                        rebindRadioUI();
                        playStationStream(currentStation.url);
                    }
                }
            }
        }
    };

    if (playBtn) playBtn.addEventListener('click', handlePlayPause);
    listenToggles.forEach(btn => btn.addEventListener('click', handleArchiveToggle));

    // Seek arrows
    if (btnScaleLeft) btnScaleLeft.addEventListener('click', () => startSearch(-1));
    if (btnScaleRight) btnScaleRight.addEventListener('click', () => startSearch(1));

    // Volume Slider Controls
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeFill = document.querySelector('.volume-slider-fill');
    const muteBtn = document.getElementById('volume-mute-btn');

    if (volumeSlider) {
        // Init volume: sync with player if player already has a src/initialized state, otherwise use slider's value
        let initialVal = volumeSlider.value;
        if (audioPlayer.src) {
            initialVal = Math.round(audioPlayer.volume * 100);
            volumeSlider.value = initialVal;
        } else {
            audioPlayer.volume = initialVal / 100;
        }
        tuningAudio.volume = audioPlayer.volume;
        if (volumeFill) volumeFill.style.width = `${initialVal}%`;

        volumeSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            audioPlayer.volume = val / 100;
            if (window.cardAudioPlayer) {
                window.cardAudioPlayer.volume = val / 100;
            }
            tuningAudio.volume = val / 100;
            if (volumeFill) volumeFill.style.width = `${val}%`;
            
            // Toggle Mute Icon based on slider value
            if (muteBtn) {
                const icon = muteBtn.querySelector('i');
                if (icon) {
                    if (val == 0) {
                        icon.className = 'fa-solid fa-volume-xmark';
                    } else if (val < 40) {
                        icon.className = 'fa-solid fa-volume-low';
                    } else {
                        icon.className = 'fa-solid fa-volume-high';
                    }
                }
            }
        });

        // Click mute button logic
        let preMuteVolume = initialVal;
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const icon = muteBtn.querySelector('i');
                if (volumeSlider.value > 0) {
                    preMuteVolume = volumeSlider.value;
                    volumeSlider.value = 0;
                } else {
                    volumeSlider.value = preMuteVolume || 80;
                }
                volumeSlider.dispatchEvent(new Event('input'));
            });
        }
    }

    // Tuning Scale Needle Dragging Logic
    if (scaleContainer && needle) {
        let isDragging = false;

        const updateFreqFromCoordinate = (clientX) => {
            const rect = scaleContainer.getBoundingClientRect();
            let relativeX = (clientX - rect.left) / rect.width;
            relativeX = Math.max(0, Math.min(1, relativeX)); // clamp 0-1

            currentFreq = minFreq + relativeX * (maxFreq - minFreq);
            localStorage.setItem('radioFrequencyStudio', currentFreq);

            rebindRadioUI();

            // Play static static sound effect while sliding
            if (tuningAudio.paused) {
                audioPlayer.pause();
                audioPlayer.removeAttribute('src');
                audioPlayer.load();
                setPlayState(false);
                tuningAudio.volume = audioPlayer.volume;
                tuningAudio.play().catch(err => console.log('Tuning noise blocked:', err));
            }
        };

        const onStartDrag = (e) => {
            isDragging = true;
            needle.classList.add('dragging');
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            updateFreqFromCoordinate(clientX);
            
            if (!e.touches) e.preventDefault();

            // Bind mouse tracking events to window when dragging starts
            window.addEventListener('mousemove', onDrag);
            window.addEventListener('mouseup', onStopDrag);
            window.addEventListener('touchmove', onDrag, { passive: true });
            window.addEventListener('touchend', onStopDrag);
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            updateFreqFromCoordinate(clientX);
            
            if (!e.touches) e.preventDefault();
        };

        const onStopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            needle.classList.remove('dragging');
            tuningAudio.pause();

            // Remove mouse tracking events from window when dragging stops
            window.removeEventListener('mousemove', onDrag);
            window.removeEventListener('mouseup', onStopDrag);
            window.removeEventListener('touchmove', onDrag);
            window.removeEventListener('touchend', onStopDrag);

            // Snap to nearest station frequency
            if (tunerStations.length > 0) {
                let closest = tunerStations[0];
                let minDiff = Math.abs(tunerStations[0].frequency - currentFreq);

                for (let i = 1; i < tunerStations.length; i++) {
                    const diff = Math.abs(tunerStations[i].frequency - currentFreq);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = tunerStations[i];
                    }
                }

                currentFreq = closest.frequency;
                localStorage.setItem('radioFrequencyStudio', currentFreq);
                rebindRadioUI();

                // Stream audio from snapped station
                playStationStream(closest.url);
            }
        };

        // Listeners for mouse start
        scaleContainer.addEventListener('mousedown', onStartDrag);

        // Listeners for touches start (Mobile support)
        scaleContainer.addEventListener('touchstart', onStartDrag, { passive: true });
    }

    // 4. Equalizer Draggable Handles (when not playing)
    const initDraggableEqualizer = () => {
        const tracks = document.querySelectorAll('.equalizer-track');
        tracks.forEach((track, index) => {
            const handle = track.querySelector('.equalizer-handle');
            if (!handle) return;

            let isDragging = false;

            const onStartDrag = (e) => {
                isDragging = true;
                handle.style.transition = 'none'; // Instant dragging style
                handle.style.cursor = 'grabbing';
                
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                updatePosition(clientY);

                if (e.cancelable) e.preventDefault();

                // Bind tracking events on document level for smooth window tracking
                document.addEventListener('mousemove', onDrag);
                document.addEventListener('mouseup', onStopDrag);
                document.addEventListener('touchmove', onDrag, { passive: false });
                document.addEventListener('touchend', onStopDrag);
            };

            const updatePosition = (clientY) => {
                const trackRect = track.getBoundingClientRect();
                let relativeY = trackRect.bottom - clientY;
                let percentage = (relativeY / trackRect.height) * 100;
                
                // Clamp position inside track visual range
                percentage = Math.max(10, Math.min(90, percentage));
                handle.style.bottom = `${percentage}%`;
                customHeights[index] = percentage;

                // Update corresponding filter gain in real-time if context exists
                if (audioCtx && eqFilters[index]) {
                    eqFilters[index].gain.value = (percentage - 50) * (12 / 40);
                }
            };

            const onDrag = (e) => {
                if (!isDragging) return;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                updatePosition(clientY);
                if (e.cancelable) e.preventDefault();
            };

            const onStopDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                handle.style.transition = ''; // Restore transition properties
                handle.style.cursor = '';
                
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', onStopDrag);
                document.removeEventListener('touchmove', onDrag);
                document.removeEventListener('touchend', onStopDrag);
            };

            handle.addEventListener('mousedown', onStartDrag);
            handle.addEventListener('touchstart', onStartDrag, { passive: false });
        });
    };

    initDraggableEqualizer();

    // 5. Station Explore Card Play Buttons Click Logic
    const cardPlayBtns = document.querySelectorAll('.card-play-btn, .sp-card-play-btn');
    cardPlayBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isSearching) return;

            const streamUrl = btn.getAttribute('data-stream-url');
            window.playCardStream(streamUrl);
        });
    });

    // Playlist Page Event Listeners
    const playlistPlayAll = document.getElementById('playlistPlayAllBtn');
    const playlistHeaderLike = document.getElementById('playlistHeaderLikeBtn');

    if (playlistPlayAll) {
        playlistPlayAll.addEventListener('click', (e) => {
            e.preventDefault();
            const activeStation = getActivePlaylistStation();
            if (activeStation) {
                const isPlayingActive = audioPlayer.src && (audioPlayer.src === activeStation.url || audioPlayer.src.includes(activeStation.url)) && !audioPlayer.paused;
                if (isPlayingActive) {
                    audioPlayer.pause();
                    setPlayState(false);
                } else {
                    if (activeStation.frequency) {
                        currentFreq = activeStation.frequency;
                        localStorage.setItem('radioFrequencyStudio', currentFreq);
                    }
                    rebindRadioUI();
                    playStationStream(activeStation.url);
                }
            }
        });
    }

    if (playlistHeaderLike) {
        playlistHeaderLike.addEventListener('click', (e) => {
            e.preventDefault();
            const activeStation = getActivePlaylistStation();
            if (activeStation) {
                toggleLikeStation(activeStation.url);
            }
        });
    }

    const tableBody = document.getElementById('playlistTableBody');
    if (tableBody) {
        // Event delegation for play and like clicks in table rows
        tableBody.addEventListener('click', (e) => {
            const playBtn = e.target.closest('.btn-row-play');
            const likeBtn = e.target.closest('.btn-row-like');

            if (playBtn) {
                e.preventDefault();
                const url = playBtn.getAttribute('data-url');
                const station = stations.find(s => s.url === url);
                if (station) {
                    const isPlayingThis = audioPlayer.src && (audioPlayer.src === station.url || audioPlayer.src.includes(station.url)) && !audioPlayer.paused;
                    if (isPlayingThis) {
                        audioPlayer.pause();
                        setPlayState(false);
                    } else {
                        if (station.frequency) {
                            currentFreq = station.frequency;
                            localStorage.setItem('radioFrequencyStudio', currentFreq);
                        }
                        rebindRadioUI();
                        playStationStream(station.url);
                    }
                }
            }

            if (likeBtn) {
                e.preventDefault();
                const url = likeBtn.getAttribute('data-url');
                toggleLikeStation(url);
            }
        });
    }

}

// Playlist Page Helper & Rendering Functions
function getActivePlaylistStation() {
    const playingStation = tunerStations.find(s => audioPlayer.src && (audioPlayer.src === s.url || audioPlayer.src.includes(s.url))) || stations.find(s => audioPlayer.src && (audioPlayer.src === s.url || audioPlayer.src.includes(s.url)));
    if (playingStation) return playingStation;

    const currentStation = tunerStations.find(s => Math.abs(s.frequency - currentFreq) < 0.1) || stations.find(s => Math.abs(s.frequency - currentFreq) < 0.1);
    if (currentStation) return currentStation;

    return tunerStations[0] || stations[0];
}

function toggleLikeStation(url) {
    const stationInTuner = tunerStations.find(s => s.url === url);
    const stationInMain = stations.find(s => s.url === url);
    const station = stationInTuner || stationInMain;
    if (!station) return;

    let likedList = [];
    try {
        likedList = JSON.parse(localStorage.getItem('studio_liked_stations') || '[]');
    } catch(e) {
        likedList = [];
    }

    if (likedList.includes(url)) {
        likedList = likedList.filter(u => u !== url);
        station.likes = Math.max(0, (station.likes || 0) - 1);
    } else {
        likedList.push(url);
        station.likes = (station.likes || 0) + 1;
    }

    localStorage.setItem('studio_liked_stations', JSON.stringify(likedList));
    if (stationInTuner) {
        localStorage.setItem('studio_tuner_stations_data', JSON.stringify(tunerStations));
    }
    if (stationInMain) {
        localStorage.setItem('studio_stations_data', JSON.stringify(stations));
    }
    updatePlaylistUI();
}

let playlistCurrentPage = 1;
const PLAYLIST_ITEMS_PER_PAGE = 5;

function updatePlaylistUI() {
    const tableBody = document.getElementById('playlistTableBody');
    const paginationContainer = document.getElementById('playlistPagination');
    const activeCover = document.getElementById('playlistActiveCover');
    const activeTitle = document.getElementById('playlistActiveTitle');
    const activeDesc = document.getElementById('playlistActiveDesc');
    const playAllBtn = document.getElementById('playlistPlayAllBtn');
    const headerLikeBtn = document.getElementById('playlistHeaderLikeBtn');

    if (!tableBody) return; // Not on playlist page

    const activeStation = getActivePlaylistStation();
    let likedList = [];
    try {
        likedList = JSON.parse(localStorage.getItem('studio_liked_stations') || '[]');
    } catch(e) {
        likedList = [];
    }

    // 1. Update Featured Header Box
    if (activeStation) {
        if (activeCover) activeCover.src = activeStation.image;
        if (activeTitle) activeTitle.innerText = activeStation.name;
        if (activeDesc) {
            if (activeStation.frequency) {
                activeDesc.innerText = `${activeStation.genre} Live Broadcast • ${activeStation.frequency.toFixed(1)} FM • ${activeStation.likes || 0} Likes`;
            } else {
                activeDesc.innerText = `${activeStation.genre} Live Broadcast • ${activeStation.likes || 0} Likes`;
            }
        }

        if (headerLikeBtn) {
            const isLiked = likedList.includes(activeStation.url);
            if (isLiked) {
                headerLikeBtn.classList.add('liked');
                headerLikeBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
            } else {
                headerLikeBtn.classList.remove('liked');
                headerLikeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
            }
        }

        if (playAllBtn) {
            const isPlayingActive = audioPlayer.src && (audioPlayer.src === activeStation.url || audioPlayer.src.includes(activeStation.url)) && !audioPlayer.paused;
            if (isPlayingActive) {
                playAllBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>PAUSE</span>';
            } else {
                playAllBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>PLAY ALL</span>';
            }
        }
    }

    // 2. Paginate Stations
    const totalItems = stations.length;
    const totalPages = Math.ceil(totalItems / PLAYLIST_ITEMS_PER_PAGE);

    // Safeguard current page bounds
    if (playlistCurrentPage > totalPages) playlistCurrentPage = totalPages;
    if (playlistCurrentPage < 1) playlistCurrentPage = 1;

    const startIndex = (playlistCurrentPage - 1) * PLAYLIST_ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + PLAYLIST_ITEMS_PER_PAGE, totalItems);
    const paginatedStations = stations.slice(startIndex, endIndex);

    // 3. Update Playlist Table rows
    tableBody.innerHTML = '';
    paginatedStations.forEach((station, sliceIndex) => {
        const globalIndex = startIndex + sliceIndex;
        const isPlayingThis = audioPlayer.src && (audioPlayer.src === station.url || audioPlayer.src.includes(station.url)) && !audioPlayer.paused;
        const isLiked = likedList.includes(station.url);
        
        const row = document.createElement('tr');
        if (isPlayingThis) {
            row.classList.add('row-playing');
        }

        row.innerHTML = `
            <td class="col-num">${globalIndex + 1}</td>
            <td class="col-title">
                <div class="playlist-station-title-cell">
                    <img src="${station.image}" class="playlist-table-img" alt="${station.name}" onerror="this.onerror=null; this.src='images/tuner-image.jpg'">
                    <span class="playlist-table-name">${station.name}</span>
                </div>
            </td>
            <td class="col-genre">
                <span class="genre-badge">${station.genre || 'Radio'}</span>
            </td>
            <td class="col-plays">${(station.plays || 0).toLocaleString()}</td>
            <td class="col-likes">
                <button class="btn-icon-circle btn-row-like ${isLiked ? 'liked' : ''}" data-url="${station.url}" style="width: 34px; height: 34px; font-size: 13px; display: inline-flex; margin-right: 8px;">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
                <span>${(station.likes || 0).toLocaleString()}</span>
            </td>
            <td class="col-action">
                <button class="btn-row-play ${isPlayingThis ? 'playing' : ''}" data-url="${station.url}">
                    <i class="${isPlayingThis ? 'fa-solid fa-stop' : 'fa-solid fa-play'}"></i>
                    <span>${isPlayingThis ? 'Stop' : 'Play'}</span>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // 4. Render Pagination Controls
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
        if (totalPages > 1) {
            // Previous arrow
            const prevLink = document.createElement('a');
            prevLink.href = '#';
            prevLink.className = `page-arrow prev-arrow ${playlistCurrentPage === 1 ? 'disabled' : ''}`;
            prevLink.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
            if (playlistCurrentPage > 1) {
                prevLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    playlistCurrentPage--;
                    updatePlaylistUI();
                });
            } else {
                prevLink.addEventListener('click', (e) => e.preventDefault());
            }
            paginationContainer.appendChild(prevLink);

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                const pageLink = document.createElement('a');
                pageLink.href = '#';
                pageLink.className = `page-num ${playlistCurrentPage === i ? 'active' : ''}`;
                pageLink.innerText = i;
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    playlistCurrentPage = i;
                    updatePlaylistUI();
                });
                paginationContainer.appendChild(pageLink);
            }

            // Next arrow
            const nextLink = document.createElement('a');
            nextLink.href = '#';
            nextLink.className = `page-arrow next-arrow ${playlistCurrentPage === totalPages ? 'disabled' : ''}`;
            nextLink.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
            if (playlistCurrentPage < totalPages) {
                nextLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    playlistCurrentPage++;
                    updatePlaylistUI();
                });
            } else {
                nextLink.addEventListener('click', (e) => e.preventDefault());
            }
            paginationContainer.appendChild(nextLink);
        }
    }

    // Initialize 20-band Equalizer and Vertical Volume Slider
    renderPlaylistEqualizer();
    initPlaylistVolumeSlider();
    
    // Sync equalizer status indicator initial state
    updateEqStatus(isPlaying ? (isCorsBypassed ? 'bypassed' : 'active') : 'suspended');
}

function formatFreqLabel(freq) {
    if (freq >= 1000) {
        const val = freq / 1000;
        return val % 1 === 0 ? val + 'k' : val.toFixed(1) + 'k';
    }
    return freq.toString();
}

function renderPlaylistEqualizer() {
    const container = document.getElementById('playlistEqSliders');
    if (!container) return;

    container.innerHTML = '';

    playlistFrequencies.forEach((freq, index) => {
        const channel = document.createElement('div');
        channel.className = 'eq-channel';

        const track = document.createElement('div');
        track.className = 'eq-track';

        const handle = document.createElement('div');
        handle.className = 'eq-handle';
        handle.setAttribute('data-index', index);
        handle.style.bottom = `${playlistHeights[index]}%`;

        const handleDot = document.createElement('span');
        handleDot.className = 'handle-dot';
        handle.appendChild(handleDot);

        const label = document.createElement('div');
        label.className = 'eq-label';
        label.innerText = formatFreqLabel(freq);

        track.appendChild(handle);
        channel.appendChild(track);
        channel.appendChild(label);
        container.appendChild(channel);

        // Bind drag & touch events
        let isDragging = false;

        const updatePosition = (clientY) => {
            const trackRect = track.getBoundingClientRect();
            let relativeY = trackRect.bottom - clientY;
            let percentage = (relativeY / trackRect.height) * 100;
            
            // Clamp position inside track visual range
            percentage = Math.max(10, Math.min(90, percentage));
            handle.style.bottom = `${percentage}%`;
            playlistHeights[index] = percentage;
            localStorage.setItem('studio_playlist_eq_heights', JSON.stringify(playlistHeights));

            // Update filter gain in real-time if audio context and filter exist
            if (audioCtx && playlistFilters[index]) {
                playlistFilters[index].gain.setValueAtTime((percentage - 50) * (12 / 40), audioCtx.currentTime);
            }
        };

        const onStartDrag = (e) => {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            isDragging = true;
            handle.classList.add('dragging');
            handle.style.transition = 'none';

            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            updatePosition(clientY);

            if (e.cancelable) e.preventDefault();

            const onDrag = (ev) => {
                if (!isDragging) return;
                const dragY = ev.touches ? ev.touches[0].clientY : ev.clientY;
                updatePosition(dragY);
                if (ev.cancelable) ev.preventDefault();
            };

            const onStopDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                handle.classList.remove('dragging');
                handle.style.transition = '';

                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', onStopDrag);
                document.removeEventListener('touchmove', onDrag);
                document.removeEventListener('touchend', onStopDrag);
            };

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onStopDrag);
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend', onStopDrag);
        };

        handle.addEventListener('mousedown', onStartDrag);
        handle.addEventListener('touchstart', onStartDrag, { passive: false });

        // Click on track directly
        track.addEventListener('mousedown', (e) => {
            if (e.target === handle) return;
            updatePosition(e.clientY);
            onStartDrag(e);
        });
        track.addEventListener('touchstart', (e) => {
            if (e.target === handle) return;
            updatePosition(e.touches[0].clientY);
            onStartDrag(e);
        }, { passive: false });
    });

    // Reset button functionality
    const resetBtn = document.getElementById('playlistEqResetBtn');
    if (resetBtn) {
        resetBtn.onclick = (e) => {
            e.preventDefault();
            playlistHeights = Array(20).fill(50);
            localStorage.setItem('studio_playlist_eq_heights', JSON.stringify(playlistHeights));
            
            // Reset handles and filters
            const handles = container.querySelectorAll('.eq-handle');
            handles.forEach((h, idx) => {
                h.style.transition = 'bottom 0.3s ease';
                h.style.bottom = '50%';
                setTimeout(() => {
                    h.style.transition = '';
                }, 300);

                if (audioCtx && playlistFilters[idx]) {
                    playlistFilters[idx].gain.setValueAtTime(0, audioCtx.currentTime);
                }
            });
        };
    }
}

function setPlaylistVolumeSlider(volume) {
    const fill = document.getElementById('playlistVolumeFill');
    const handle = document.getElementById('playlistVolumeHandle');
    if (!fill || !handle) return;

    const percentage = volume * 100;
    fill.style.height = `${percentage}%`;
    
    // Map handle position to [5%, 95%] to keep it exactly inside the track boundaries without overflowing
    const handlePercentage = 5 + volume * 90;
    handle.style.bottom = `${handlePercentage}%`;
}

function initPlaylistVolumeSlider() {
    const slider = document.getElementById('playlistVolumeSlider');
    if (!slider) return;

    // Set initial position
    setPlaylistVolumeSlider(audioPlayer.volume);

    let isDragging = false;

    const updateVolumeFromCoordinate = (clientY) => {
        const rect = slider.getBoundingClientRect();
        let relativeY = rect.bottom - clientY;
        let percentage = relativeY / rect.height;
        percentage = Math.max(0, Math.min(1, percentage)); // clamp 0-1

        audioPlayer.volume = percentage;
        tuningAudio.volume = percentage;

        // Synchronize main slider
        const mainVolumeSlider = document.querySelector('.volume-slider');
        if (mainVolumeSlider) {
            mainVolumeSlider.value = Math.round(percentage * 100);
            const mainVolumeFill = document.querySelector('.volume-slider-fill');
            if (mainVolumeFill) mainVolumeFill.style.width = `${percentage * 100}%`;
        }
    };

    const onStartDrag = (e) => {
        isDragging = true;
        const handle = document.getElementById('playlistVolumeHandle');
        if (handle) handle.classList.add('dragging');

        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        updateVolumeFromCoordinate(clientY);

        if (e.cancelable) e.preventDefault();

        const onDrag = (ev) => {
            if (!isDragging) return;
            const dragY = ev.touches ? ev.touches[0].clientY : ev.clientY;
            updateVolumeFromCoordinate(dragY);
            if (ev.cancelable) ev.preventDefault();
        };

        const onStopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            if (handle) handle.classList.remove('dragging');

            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onStopDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', onStopDrag);
        };

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onStopDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', onStopDrag);
    };

    slider.addEventListener('mousedown', onStartDrag);
    slider.addEventListener('touchstart', onStartDrag, { passive: false });

    // Scroll wheel support
    slider.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        let volume = audioPlayer.volume + delta;
        volume = Math.max(0, Math.min(1, volume));
        audioPlayer.volume = volume;
        tuningAudio.volume = volume;

        // Synchronize main slider
        const mainVolumeSlider = document.querySelector('.volume-slider');
        if (mainVolumeSlider) {
            mainVolumeSlider.value = Math.round(volume * 100);
            const mainVolumeFill = document.querySelector('.volume-slider-fill');
            if (mainVolumeFill) mainVolumeFill.style.width = `${volume * 100}%`;
        }
    }, { passive: false });
}

// Expose functions globally for PJAX re-initialization
window.initScaleLabels = initScaleLabels;
window.rebindRadioUI = rebindRadioUI;
window.initRadioEvents = initRadioEvents;
window.setPlayState = setPlayState;
window.playStationStream = playStationStream;
window.updatePlaylistUI = updatePlaylistUI;
window.setPlaylistVolumeSlider = setPlaylistVolumeSlider;
window.initPlaylistVolumeSlider = initPlaylistVolumeSlider;
window.renderPlaylistEqualizer = renderPlaylistEqualizer;

// Expose variables for debugging / external scripting
Object.defineProperty(window, 'audioCtx', {
    get: function() { return audioCtx; },
    set: function(val) { audioCtx = val; }
});
Object.defineProperty(window, 'playlistFilters', {
    get: function() { return playlistFilters; },
    set: function(val) { playlistFilters = val; }
});
Object.defineProperty(window, 'eqFilters', {
    get: function() { return eqFilters; },
    set: function(val) { eqFilters = val; }
});
Object.defineProperty(window, 'isSearching', {
    get: function() { return isSearching; },
    set: function(val) { isSearching = val; }
});

// Kick off loading at the very end of the script when all functions are defined

// Dynamic Radio Tuner Injection
function loadRadioTuner() {
    const container = document.getElementById('radio-tuner-container');
    if (!container) return;

    if (document.getElementById('rt-player-card')) return;

    const extraClasses = container.className || 'about-tuner';

    container.outerHTML = `
        <!-- FLOATING PLAYER WIDGET -->
        <div class="floating-player-card ${extraClasses} rtp-floating-player rtp-layout-fullwidth rtp-design-vu-light" id="rt-player-card">

                <!-- Minimized View Bar -->
                <div class="rtp-minimized-bar">
                    <div class="rtp-minimized-info" onclick="const card = document.getElementById('rt-player-card'); if (card) { card.classList.remove('rtp-minimized'); localStorage.setItem('rt_player_minimized', '0'); }">
                        <div class="rtp-minimized-cover">
                            <img src="images/tuner-image.jpg" alt="" class="rtp-minimized-cover-img">
                        </div>
                        <div class="rtp-minimized-meta">
                            <span class="rtp-minimized-title">Smooth Jazz Vibes</span>
                            <span class="rtp-minimized-desc">FM Dial Scanner</span>
                        </div>
                    </div>
                    <div class="rtp-minimized-actions">
                        <button class="rtp-minimized-play-btn" aria-label="Play/Pause">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button class="rtp-minimized-expand-btn" onclick="const card = document.getElementById('rt-player-card'); if (card) { card.classList.remove('rtp-minimized'); localStorage.setItem('rt_player_minimized', '0'); }" aria-label="Expand Player">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="16" height="16" fill="currentColor">
                                <path d="M240 96C248.8 96 256 103.2 256 112C256 120.8 248.8 128 240 128L128 128L128 240C128 248.8 120.8 256 112 256C103.2 256 96 248.8 96 240L96 112C96 103.2 103.2 96 112 96L240 96zM96 400C96 391.2 103.2 384 112 384C120.8 384 128 391.2 128 400L128 512L240 512C248.8 512 256 519.2 256 528C256 536.8 248.8 544 240 544L112 544C103.2 544 96 536.8 96 528L96 400zM528 96C536.8 96 544 103.2 544 112L544 240C544 248.8 536.8 256 528 256C519.2 256 512 248.8 512 240L512 128L400 128C391.2 128 384 120.8 384 112C384 103.2 391.2 96 400 96L528 96zM512 400C512 391.2 519.2 384 528 384C536.8 384 544 391.2 544 400L544 528C544 536.8 536.8 544 528 544L400 544C391.2 544 384 536.8 384 528C384 519.2 391.2 512 400 512L512 512L512 400z"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Player Left: Station info & playback control -->
                <div class="player-station-info">
                    <div class="player-cover">
                        <img src="images/tuner-image.jpg" alt="Station Cover" class="player-cover-img">
                    </div>
                    <div class="player-meta">
                        <div class="live-status">
                            <span class="live-dot"></span> LIVE ON AIR
                        </div>
                        <h3 class="track-title-name">Smooth Jazz Vibes</h3>
                        <p class="track-artist-desc">The Best in Smooth Jazz</p>
                        <div class="player-action-icons">
                            <button class="icon-btn" aria-label="Add to Favorites"><i class="fa-regular fa-heart"></i></button>
                            <button class="icon-btn" aria-label="Share"><i class="fa-solid fa-share-nodes"></i></button>
                            <button class="icon-btn" aria-label="More Actions"><i class="fa-solid fa-ellipsis"></i></button>
                        </div>
                    </div>
                </div>

                <!-- Player Center: Ruler / Tuning Scale -->
                <div class="player-tuner-section">
                    <div class="tuner-header">
                        <button class="tuner-arrow" id="btn-scale-left" aria-label="Tune Down">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <div class="tuner-title">
                            <span class="tuner-prefix">FM</span>
                            <span class="active-station-freq">96.7</span>
                            <span class="tuner-suffix">MHz</span>
                        </div>
                        <button class="tuner-arrow" id="btn-scale-right" aria-label="Tune Up">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>

                    <div class="tuner-scale-wrapper">
                        <div class="tuner-scale-container" id="scale-container">
                            <!-- SVG lines background -->
                            <div class="tuner-lines"></div>
                            
                            <!-- Scale Labels -->
                            <div class="tuner-labels">
                                <span>88</span>
                                <span>90</span>
                                <span>92</span>
                                <span>94</span>
                                <span>96</span>
                                <span>98</span>
                                <span>100</span>
                                <span>102</span>
                                <span>104</span>
                                <span>106</span>
                                <span>108</span>
                            </div>

                            <!-- Needle Pointer -->
                            <div class="tuner-needle" id="radio-needle">
                                <span class="needle-line"></span>
                                <span class="needle-knob"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Player Right: Controls & VU/Equalizer Section -->
                <div class="player-controls-section rtp-vu-meter-layout rtp-vu-active">
                    <div class="rtp-vu-top-row">
                        <div class="eq-status-indicator" id="eq-status-indicator">
                            <span class="status-dot"></span>
                            <span class="status-text">EQ Off</span>
                        </div>
                        <a href="#" class="rtp-vu-eq-toggle-link" onclick="event.preventDefault(); const card = this.closest('.floating-player-card'); const vu = card.querySelector('.vu-meters-container'); const eq = card.querySelector('.rtp-vu-equalizer-section'); const ctrl = card.querySelector('.player-controls-section'); if (vu.style.display !== 'none') { vu.style.display = 'none'; eq.style.display = 'flex'; this.innerText = 'VU INDICATORS'; ctrl.classList.remove('rtp-vu-active'); } else { vu.style.display = 'flex'; eq.style.display = 'none'; this.innerText = 'EQUALIZER'; ctrl.classList.add('rtp-vu-active'); }">EQUALIZER</a>
                    </div>

                    <div class="rtp-vu-middle-area">
                        <!-- VU Meters -->
                        <div class="vu-meters-container" style="display: flex;">
                            <div class="vu-meter-box">
                                <div class="vu-dial-wrapper">
                                    <svg class="vu-dial-svg" viewBox="0 0 300 150">
                                        <defs>
                                            <linearGradient id="vu-backlight-L" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stop-color="#fffbeb" />
                                                <stop offset="70%" stop-color="#fef3c7" />
                                                <stop offset="100%" stop-color="#fde68a" />
                                            </linearGradient>
                                            <radialGradient id="vu-bulb-L" cx="50%" cy="100%" r="60%">
                                                <stop offset="0%" stop-color="#ffedd5" stop-opacity="1" />
                                                <stop offset="50%" stop-color="#fed7aa" stop-opacity="0.8" />
                                                <stop offset="100%" stop-color="#ffedd5" stop-opacity="0" />
                                            </radialGradient>
                                        </defs>
                                        <rect x="5" y="5" width="290" height="140" rx="8" fill="url(#vu-backlight-L)" stroke="#dddddd" stroke-width="1" />
                                        <rect x="5" y="5" width="290" height="140" rx="8" fill="url(#vu-bulb-L)" pointer-events="none" />
                                        
                                        <g transform="translate(0, 23)">
                                            <text x="35" y="25" class="vu-scale-sign" font-size="16" font-family="Outfit, sans-serif" font-weight="bold" fill="#333333" text-anchor="middle">-</text>
                                            <text x="265" y="25" class="vu-scale-sign" font-size="16" font-family="Outfit, sans-serif" font-weight="bold" fill="#333333" text-anchor="middle">+</text>
                                            <path d="M 58.1 72.8 A 120 120 0 0 1 158.4 30.2" fill="none" stroke="#111111" stroke-width="2.5" />
                                            <path d="M 62.7 76.7 A 114 114 0 0 1 153.1 36.2" fill="none" stroke="#111111" stroke-width="0.8" />
                                            <path d="M 158.4 30.2 A 120 120 0 0 1 206.3 44.0" fill="none" stroke="#dc2626" stroke-width="3.5" />
                                            <path d="M 153.1 36.2 A 114 114 0 0 1 198.8 49.3" fill="none" stroke="#dc2626" stroke-width="1.2" />
                                            <line x1="58.1" y1="72.8" x2="52.0" y2="67.7" stroke="#111111" stroke-width="1.8" />
                                            <text x="44.0" y="58.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">20</text>
                                            <line x1="77.3" y1="58.0" x2="72.4" y2="52.2" stroke="#111111" stroke-width="1.5" />
                                            <text x="64.0" y="44.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">10</text>
                                            <line x1="93.0" y1="49.9" x2="88.7" y2="43.7" stroke="#111111" stroke-width="1.5" />
                                            <text x="83.0" y="36.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">7</text>
                                            <line x1="106.6" y1="44.9" x2="102.9" y2="38.5" stroke="#111111" stroke-width="1.5" />
                                            <text x="99.0" y="30.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">5</text>
                                            <line x1="126.9" y1="39.6" x2="124.6" y2="32.9" stroke="#111111" stroke-width="1.5" />
                                            <text x="122.0" y="24.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">3</text>
                                            <line x1="143.2" y1="36.9" x2="141.8" y2="30.1" stroke="#111111" stroke-width="1.5" />
                                            <text x="140.0" y="21.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">2</text>
                                            <line x1="160.0" y1="35.3" x2="159.4" y2="28.5" stroke="#111111" stroke-width="1.5" />
                                            <text x="159.0" y="20.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">1</text>
                                            <line x1="176.8" y1="34.9" x2="177.0" y2="28.1" stroke="#dc2626" stroke-width="1.8" />
                                            <text x="178.0" y="19.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">0</text>
                                            <line x1="193.6" y1="35.8" x2="194.6" y2="29.0" stroke="#dc2626" stroke-width="1.5" />
                                            <text x="198.0" y="21.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">1</text>
                                            <line x1="210.3" y1="37.8" x2="212.1" y2="31.2" stroke="#dc2626" stroke-width="1.5" />
                                            <text x="218.0" y="26.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">2</text>
                                            <line x1="226.7" y1="41.1" x2="229.4" y2="34.6" stroke="#dc2626" stroke-width="1.8" />
                                            <text x="237.0" y="32.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">3</text>
                                            
                                            <line x1="67.3" y1="64.9" x2="62.4" y2="60.5" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="84.9" y1="53.6" x2="81.2" y2="48.2" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="99.7" y1="47.2" x2="96.1" y2="41.4" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="117.8" y1="41.7" x2="114.9" y2="35.3" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="133.5" y1="38.4" x2="131.5" y2="31.8" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="149.9" y1="36.2" x2="148.8" y2="29.5" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="183.5" y1="35.0" x2="184.2" y2="28.2" stroke="#dc2626" stroke-width="0.8" />
                                            <line x1="200.3" y1="36.5" x2="201.7" y2="29.8" stroke="#dc2626" stroke-width="0.8" />
                                            <line x1="216.9" y1="39.1" x2="219.1" y2="32.5" stroke="#dc2626" stroke-width="0.8" />
                                            
                                            <path d="M 73.4 85.7 A 100 100 0 0 1 157.0 50.2" fill="none" stroke="#111111" stroke-width="1.2" />
                                            <line x1="73.4" y1="85.7" x2="77.2" y2="88.9" stroke="#111111" stroke-width="1" />
                                            <text x="85.0" y="100.0" font-size="8.5" fill="#333333" text-anchor="middle">0</text>
                                            <line x1="89.4" y1="73.3" x2="93.1" y2="76.2" stroke="#111111" stroke-width="1" />
                                            <text x="98.0" y="87.0" font-size="8.5" fill="#333333" text-anchor="middle">20</text>
                                            <line x1="107.5" y1="62.3" x2="111.0" y2="64.8" stroke="#111111" stroke-width="1" />
                                            <text x="114.0" y="74.0" font-size="8.5" fill="#333333" text-anchor="middle">40</text>
                                            <line x1="127.1" y1="53.9" x2="129.9" y2="56.0" stroke="#111111" stroke-width="1" />
                                            <text x="133.0" y="65.0" font-size="8.5" fill="#333333" text-anchor="middle">60</text>
                                            <line x1="147.2" y1="50.0" x2="148.6" y2="51.8" stroke="#111111" stroke-width="1" />
                                            <text x="151.0" y="61.0" font-size="8.5" fill="#333333" text-anchor="middle">80</text>
                                            <line x1="157.0" y1="50.2" x2="156.8" y2="52.2" stroke="#111111" stroke-width="1.2" />
                                            <text x="175.0" y="62.0" font-size="8.5" fill="#333333" text-anchor="middle">100 %</text>
                                            <text x="202.0" y="67.0" font-size="8" font-weight="bold" fill="#dc2626" text-anchor="middle">PEAK</text>
                                            
                                            <text x="150" y="90" font-size="20" font-family="Outfit, sans-serif" font-weight="800" fill="#222222" letter-spacing="1" text-anchor="middle">VU</text>
                                            <g class="vu-needle-left" id="vu-needle-L" style="transform-origin: 150px 145px; transform: rotate(-50deg); transition: transform 0.1s ease-out;">
                                                <line x1="150" y1="145" x2="150" y2="32" stroke="#dc2626" stroke-width="1.3" />
                                                <circle cx="150" cy="145" r="5" fill="#111111" />
                                                <line x1="150" y1="145" x2="150" y2="258" stroke="transparent" stroke-width="1" />
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                            <div class="vu-meter-box">
                                <div class="vu-dial-wrapper">
                                    <svg class="vu-dial-svg" viewBox="0 0 300 150">
                                        <defs>
                                            <linearGradient id="vu-backlight-R" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stop-color="#fffbeb" />
                                                <stop offset="70%" stop-color="#fef3c7" />
                                                <stop offset="100%" stop-color="#fde68a" />
                                            </linearGradient>
                                            <radialGradient id="vu-bulb-R" cx="50%" cy="100%" r="60%">
                                                <stop offset="0%" stop-color="#ffedd5" stop-opacity="1" />
                                                <stop offset="50%" stop-color="#fed7aa" stop-opacity="0.8" />
                                                <stop offset="100%" stop-color="#ffedd5" stop-opacity="0" />
                                            </radialGradient>
                                        </defs>
                                        <rect x="5" y="5" width="290" height="140" rx="8" fill="url(#vu-backlight-R)" stroke="#dddddd" stroke-width="1" />
                                        <rect x="5" y="5" width="290" height="140" rx="8" fill="url(#vu-bulb-R)" pointer-events="none" />
                                        
                                        <g transform="translate(0, 23)">
                                            <text x="35" y="25" class="vu-scale-sign" font-size="16" font-family="Outfit, sans-serif" font-weight="bold" fill="#333333" text-anchor="middle">-</text>
                                            <text x="265" y="25" class="vu-scale-sign" font-size="16" font-family="Outfit, sans-serif" font-weight="bold" fill="#333333" text-anchor="middle">+</text>
                                            <path d="M 58.1 72.8 A 120 120 0 0 1 158.4 30.2" fill="none" stroke="#111111" stroke-width="2.5" />
                                            <path d="M 62.7 76.7 A 114 114 0 0 1 153.1 36.2" fill="none" stroke="#111111" stroke-width="0.8" />
                                            <path d="M 158.4 30.2 A 120 120 0 0 1 206.3 44.0" fill="none" stroke="#dc2626" stroke-width="3.5" />
                                            <path d="M 153.1 36.2 A 114 114 0 0 1 198.8 49.3" fill="none" stroke="#dc2626" stroke-width="1.2" />
                                            <line x1="58.1" y1="72.8" x2="52.0" y2="67.7" stroke="#111111" stroke-width="1.8" />
                                            <text x="44.0" y="58.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">20</text>
                                            <line x1="77.3" y1="58.0" x2="72.4" y2="52.2" stroke="#111111" stroke-width="1.5" />
                                            <text x="64.0" y="44.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">10</text>
                                            <line x1="93.0" y1="49.9" x2="88.7" y2="43.7" stroke="#111111" stroke-width="1.5" />
                                            <text x="83.0" y="36.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">7</text>
                                            <line x1="106.6" y1="44.9" x2="102.9" y2="38.5" stroke="#111111" stroke-width="1.5" />
                                            <text x="99.0" y="30.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">5</text>
                                            <line x1="126.9" y1="39.6" x2="124.6" y2="32.9" stroke="#111111" stroke-width="1.5" />
                                            <text x="122.0" y="24.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">3</text>
                                            <line x1="143.2" y1="36.9" x2="141.8" y2="30.1" stroke="#111111" stroke-width="1.5" />
                                            <text x="140.0" y="21.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">2</text>
                                            <line x1="160.0" y1="35.3" x2="159.4" y2="28.5" stroke="#111111" stroke-width="1.5" />
                                            <text x="159.0" y="20.0" font-size="11" font-weight="600" fill="#111111" text-anchor="middle">1</text>
                                            <line x1="176.8" y1="34.9" x2="177.0" y2="28.1" stroke="#dc2626" stroke-width="1.8" />
                                            <text x="178.0" y="19.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">0</text>
                                            <line x1="193.6" y1="35.8" x2="194.6" y2="29.0" stroke="#dc2626" stroke-width="1.5" />
                                            <text x="198.0" y="21.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">1</text>
                                            <line x1="210.3" y1="37.8" x2="212.1" y2="31.2" stroke="#dc2626" stroke-width="1.5" />
                                            <text x="218.0" y="26.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">2</text>
                                            <line x1="226.7" y1="41.1" x2="229.4" y2="34.6" stroke="#dc2626" stroke-width="1.8" />
                                            <text x="237.0" y="32.0" font-size="11" font-weight="600" fill="#dc2626" text-anchor="middle">3</text>
                                            
                                            <line x1="67.3" y1="64.9" x2="62.4" y2="60.5" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="84.9" y1="53.6" x2="81.2" y2="48.2" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="99.7" y1="47.2" x2="96.1" y2="41.4" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="117.8" y1="41.7" x2="114.9" y2="35.3" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="133.5" y1="38.4" x2="131.5" y2="31.8" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="149.9" y1="36.2" x2="148.8" y2="29.5" stroke="#a1a1aa" stroke-width="0.8" />
                                            <line x1="183.5" y1="35.0" x2="184.2" y2="28.2" stroke="#dc2626" stroke-width="0.8" />
                                            <line x1="200.3" y1="36.5" x2="201.7" y2="29.8" stroke="#dc2626" stroke-width="0.8" />
                                            <line x1="216.9" y1="39.1" x2="219.1" y2="32.5" stroke="#dc2626" stroke-width="0.8" />
                                            
                                            <path d="M 73.4 85.7 A 100 100 0 0 1 157.0 50.2" fill="none" stroke="#111111" stroke-width="1.2" />
                                            <line x1="73.4" y1="85.7" x2="77.2" y2="88.9" stroke="#111111" stroke-width="1" />
                                            <text x="85.0" y="100.0" font-size="8.5" fill="#333333" text-anchor="middle">0</text>
                                            <line x1="89.4" y1="73.3" x2="93.1" y2="76.2" stroke="#111111" stroke-width="1" />
                                            <text x="98.0" y="87.0" font-size="8.5" fill="#333333" text-anchor="middle">20</text>
                                            <line x1="107.5" y1="62.3" x2="111.0" y2="64.8" stroke="#111111" stroke-width="1" />
                                            <text x="114.0" y="74.0" font-size="8.5" fill="#333333" text-anchor="middle">40</text>
                                            <line x1="127.1" y1="53.9" x2="129.9" y2="56.0" stroke="#111111" stroke-width="1" />
                                            <text x="133.0" y="65.0" font-size="8.5" fill="#333333" text-anchor="middle">60</text>
                                            <line x1="147.2" y1="50.0" x2="148.6" y2="51.8" stroke="#111111" stroke-width="1" />
                                            <text x="151.0" y="61.0" font-size="8.5" fill="#333333" text-anchor="middle">80</text>
                                            <line x1="157.0" y1="50.2" x2="156.8" y2="52.2" stroke="#111111" stroke-width="1.2" />
                                            <text x="175.0" y="62.0" font-size="8.5" fill="#333333" text-anchor="middle">100 %</text>
                                            <text x="202.0" y="67.0" font-size="8" font-weight="bold" fill="#dc2626" text-anchor="middle">PEAK</text>
                                            
                                            <text x="150" y="90" font-size="20" font-family="Outfit, sans-serif" font-weight="800" fill="#222222" letter-spacing="1" text-anchor="middle">VU</text>
                                            <g class="vu-needle-right" id="vu-needle-R" style="transform-origin: 150px 145px; transform: rotate(-50deg); transition: transform 0.1s ease-out;">
                                                <line x1="150" y1="145" x2="150" y2="32" stroke="#dc2626" stroke-width="1.3" />
                                                <circle cx="150" cy="145" r="5" fill="#111111" />
                                                <line x1="150" y1="145" x2="150" y2="258" stroke="transparent" stroke-width="1" />
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <!-- Visual Equalizer (initially hidden) -->
                        <div class="rtp-vu-equalizer-section" style="display: none;">
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-0"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">60</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-1"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">150</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-2"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">400</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-3"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">1K</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-4"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">2K</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-5"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">2.4K</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-6"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">6K</div>
                            </div>
                            <div class="rtp-vu-equalizer-bar">
                                <div class="equalizer-track rtp-vu-equalizer-track">
                                    <div class="equalizer-handle rtp-vu-equalizer-handle" id="eq-handle-7"><span class="handle-dot"></span></div>
                                </div>
                                <div class="rtp-vu-equalizer-label">15K</div>
                            </div>
                        </div>
                    </div>

                    <!-- Volume slider and play/pause controls -->
                    <div class="player-volume-play-row">
                        <button class="volume-icon-btn" id="volume-mute-btn" aria-label="Mute/Unmute">
                            <svg class="icon-volume" viewBox="0 0 640 640" fill="currentColor">
                                <path d="M176 384L112 384C103.2 384 96 376.8 96 368L96 272C96 263.2 103.2 256 112 256L176 256C184.5 256 192.6 252.6 198.6 246.6L316.7 128.6C317.1 128.2 317.6 128 318.1 128C319.2 128 320 128.9 320 129.9L320 510C320 511.1 319.1 511.9 318.1 511.9C317.6 511.9 317.1 511.7 316.7 511.3L198.6 393.4C192.6 387.4 184.5 384 176 384zM176 224L112 224C85.5 224 64 245.5 64 272L64 368C64 394.5 85.5 416 112 416L176 416L294.1 534.1C300.5 540.5 309.1 544 318.1 544C336.8 544 352 528.8 352 510.1L352 130C352 111.3 336.8 96.1 318.1 96.1C309.1 96.1 300.5 99.7 294.1 106L176 224zM419.2 246.4C413.9 253.5 415.3 263.5 422.4 268.8C438 280.5 448 299.1 448 320C448 340.9 438 359.5 422.4 371.2C415.3 376.5 413.9 386.5 419.2 393.6C424.5 400.7 434.5 402.1 441.6 396.8C464.9 379.3 480 351.4 480 320C480 288.6 464.9 260.7 441.6 243.2C434.5 237.9 424.5 239.3 419.2 246.4zM506.2 171.9C499.4 166.3 489.3 167.2 483.7 174C478.1 180.8 479 190.9 485.8 196.5C521.4 225.9 544 270.3 544 320C544 369.7 521.4 414.1 485.8 443.4C479 449 478 459.1 483.7 465.9C489.4 472.7 499.4 473.7 506.2 468.1C548.8 432.9 576 379.6 576 320C576 260.4 548.8 207.1 506.2 171.9z"/>
                            </svg>
                        </button>
                        <div class="volume-slider-wrapper">
                            <input type="range" class="volume-slider" min="0" max="100" value="80" aria-label="Volume">
                            <div class="volume-slider-fill"></div>
                        </div>
                        <button class="player-play-btn" id="player-play-btn" aria-label="Play/Pause">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    </div>

                    
                </div>

            </div>
        </div>
    `;
}
window.loadRadioTuner = loadRadioTuner;

loadStationsData(() => {
    // Inject tuner if container is present on the page
    loadRadioTuner();

    // Restore stored frequency or default to the first station
    const storedFreq = localStorage.getItem('radioFrequencyStudio');
    if (storedFreq) {
        currentFreq = parseFloat(storedFreq);
    } else {
        const jazzStation = tunerStations.find(s => Math.abs(s.frequency - 96.7) < 0.1);
        currentFreq = jazzStation ? jazzStation.frequency : 96.7;
    }

    // Initialize UI
    initScaleLabels();
    rebindRadioUI();
    initRadioEvents();
    startVUNeedleAnimation();
    if (typeof window.initCategoryFilters === 'function') {
        window.initCategoryFilters();
    }
});

// VU needles animation loop using real analyser or organic procedural fallback
function startVUNeedleAnimation() {
    if (vuAnimationId) {
        cancelAnimationFrame(vuAnimationId);
        vuAnimationId = null;
    }

    function draw() {
        const card = document.getElementById('rt-player-card');
        if (!card) {
            vuAnimationId = requestAnimationFrame(draw);
            return;
        }

        const needleL = card.querySelector('.vu-needle-left');
        const needleR = card.querySelector('.vu-needle-right');
        if (!needleL && !needleR) {
            vuAnimationId = requestAnimationFrame(draw);
            return;
        }

        let targetAngleL = -50;
        let targetAngleR = -50;

        if (isPlaying) {
            if (analyserLeft && analyserRight && !isCorsBypassed) {
                // 1. Get time domain data for RMS
                const timeDataL = new Uint8Array(analyserLeft.fftSize);
                const timeDataR = new Uint8Array(analyserRight.fftSize);
                analyserLeft.getByteTimeDomainData(timeDataL);
                analyserRight.getByteTimeDomainData(timeDataR);

                let rmsSumL = 0, rmsSumR = 0;
                for (let i = 0; i < timeDataL.length; i++) {
                    const valL = (timeDataL[i] - 128) / 128;
                    const valR = (timeDataR[i] - 128) / 128;
                    rmsSumL += valL * valL;
                    rmsSumR += valR * valR;
                }
                let rmsValL = Math.sqrt(rmsSumL / timeDataL.length);
                let rmsValR = Math.sqrt(rmsSumR / timeDataR.length);
                
                // Scale RMS to a good dynamic range [0, 1]
                rmsValL = Math.min(1.0, rmsValL * 1.8);
                rmsValR = Math.min(1.0, rmsValR * 1.8);

                // 2. Get frequency data for bass energy
                const dataArrayL = new Uint8Array(analyserLeft.frequencyBinCount);
                const dataArrayR = new Uint8Array(analyserRight.frequencyBinCount);
                analyserLeft.getByteFrequencyData(dataArrayL);
                analyserRight.getByteFrequencyData(dataArrayR);

                // Bass energy (indexes 0 to 4, approx 0 to 800Hz)
                let bassL = 0, bassR = 0;
                for (let i = 0; i < 5; i++) {
                    bassL += dataArrayL[i];
                    bassR += dataArrayR[i];
                }
                bassL /= (5 * 255);
                bassR /= (5 * 255);

                // Combine RMS and Bass energy (50% RMS, 50% Bass)
                let energyL = (rmsValL * 0.5) + (bassL * 0.5);
                let energyR = (rmsValR * 0.5) + (bassR * 0.5);

                // Adaptive peak AGC (Auto Gain Control) to keep needles bouncing fully for all volume levels
                if (!window.rt_peakL) window.rt_peakL = 0.15;
                if (!window.rt_peakR) window.rt_peakR = 0.15;
                window.rt_peakL = Math.max(0.08, window.rt_peakL * 0.998);
                window.rt_peakR = Math.max(0.08, window.rt_peakR * 0.998);

                if (energyL > window.rt_peakL) window.rt_peakL = energyL;
                if (energyR > window.rt_peakR) window.rt_peakR = energyR;

                energyL = Math.min(1.0, energyL / window.rt_peakL);
                energyR = Math.min(1.0, energyR / window.rt_peakR);

                // Multiply by audio player volume/mute state so needles respect it
                const currentVol = (audioPlayer && !audioPlayer.muted) ? audioPlayer.volume : 0.0;
                energyL *= currentVol;
                energyR *= currentVol;

                targetAngleL = -50 + energyL * 78;
                targetAngleR = -50 + energyR * 78;
            } else {
                // High-fidelity organic procedural music simulation (multi-band pseudo-music generator)
                const now = Date.now() * 0.001;

                // 1. Slow macro-structure (simulate song sections: verse vs chorus)
                const cycle = now % 60;
                let sectionIntensity = 1.0;
                if (cycle > 35 && cycle <= 50) {
                    sectionIntensity = 0.35 + 0.15 * Math.sin(now * 0.5);
                } else if (cycle > 50) {
                    sectionIntensity = 0.5 + 0.5 * ((cycle - 50) / 10);
                } else {
                    sectionIntensity = 0.8 + 0.2 * Math.sin(now * 0.1);
                }

                // 2. Drum machine simulation (115 BPM)
                const bpm = 115;
                const beatLen = 60 / bpm;
                const timeInBeat = now % beatLen;

                const barTime = now % (beatLen * 4);
                const beatIndex = Math.floor(barTime / beatLen); // 0, 1, 2, 3

                let kick = 0;
                if (beatIndex === 0 || beatIndex === 2) {
                    kick = Math.exp(-timeInBeat * 10.0) * 0.85;
                } else if (beatIndex === 1 && timeInBeat < beatLen * 0.25) {
                    kick = Math.exp(-timeInBeat * 12.0) * 0.4;
                }

                // Snare on beats 2 and 4
                let snare = 0;
                if (beatIndex === 1 || beatIndex === 3) {
                    snare = Math.exp(-timeInBeat * 8.0) * 0.75;
                }

                // Hi-hats (fast 16th notes sizzle)
                const hatLen = beatLen / 4;
                const timeInHat = now % hatLen;
                const hatIndex = Math.floor(now / hatLen);
                let hat = Math.exp(-timeInHat * 25.0) * 0.15;
                const hatSeed = Math.sin(hatIndex * 43758.5453);
                const hatRand = hatSeed - Math.floor(hatSeed);
                hat *= (0.4 + 0.6 * hatRand);

                // 3. Vocals/Melody simulation (multiple non-harmonic sines)
                const voxL = Math.sin(now * 3.7) * Math.sin(now * 11.3) * 0.2 +
                             Math.sin(now * 23.5) * 0.08 +
                             Math.sin(now * 61.2) * 0.04;
                const voxR = Math.sin(now * 4.1) * Math.sin(now * 9.7) * 0.2 +
                             Math.sin(now * 29.1) * 0.08 +
                             Math.sin(now * 53.7) * 0.04;

                // 4. Combine elements
                let simL = (kick * 0.55 + snare * 0.35 + hat * 0.1) * sectionIntensity + Math.abs(voxL) * 0.3 + 0.05;
                let simR = (kick * 0.45 + snare * 0.45 + hat * 0.1) * sectionIntensity + Math.abs(voxR) * 0.3 + 0.05;

                // Add random transients
                if (!window.rt_burstL) window.rt_burstL = 0;
                if (!window.rt_burstR) window.rt_burstR = 0;
                window.rt_burstL *= 0.94;
                window.rt_burstR *= 0.94;
                if (Math.random() < 0.012 && cycle < 50) {
                    const burst = 0.25 + Math.random() * 0.3;
                    window.rt_burstL += burst;
                    window.rt_burstR += burst * (0.8 + Math.random() * 0.4);
                }
                simL += window.rt_burstL;
                simR += window.rt_burstR;

                // Scale by current audio player volume and mute state
                const currentVol = (audioPlayer && !audioPlayer.muted) ? audioPlayer.volume : 0.0;
                simL *= currentVol;
                simR *= currentVol;

                simL = Math.max(0, Math.min(1.0, simL));
                simR = Math.max(0, Math.min(1.0, simR));

                targetAngleL = -50 + simL * 78;
                targetAngleR = -50 + simR * 78;
            }
        } else {
            // Micro-jitter in resting position
            const noiseL = Math.random() * 1.5;
            const noiseR = Math.random() * 1.5;
            targetAngleL = -50 + noiseL;
            targetAngleR = -50 + noiseR;
        }

        // Spring-mass-damper physics model
        const springTension = 0.45;
        const damping = 0.22;

        const accelL = (targetAngleL - currentAngleLeft) * springTension - velocityLeft * damping;
        velocityLeft += accelL;
        currentAngleLeft += velocityLeft;

        const accelR = (targetAngleR - currentAngleRight) * springTension - velocityRight * damping;
        velocityRight += accelR;
        currentAngleRight += velocityRight;

        // Physical bounds with soft-peg bounce
        const minAngle = -50;
        const maxAngle = 28;

        if (currentAngleLeft < minAngle) {
            currentAngleLeft = minAngle;
            velocityLeft = -velocityLeft * 0.2;
        } else if (currentAngleLeft > maxAngle) {
            currentAngleLeft = maxAngle;
            velocityLeft = -velocityLeft * 0.2;
        }

        if (currentAngleRight < minAngle) {
            currentAngleRight = minAngle;
            velocityRight = -velocityRight * 0.2;
        } else if (currentAngleRight > maxAngle) {
            currentAngleRight = maxAngle;
            velocityRight = -velocityRight * 0.2;
        }

        if (needleL) needleL.style.transform = `rotate(${currentAngleLeft}deg)`;
        if (needleR) needleR.style.transform = `rotate(${currentAngleRight}deg)`;

        vuAnimationId = requestAnimationFrame(draw);
    }

    vuAnimationId = requestAnimationFrame(draw);
}

