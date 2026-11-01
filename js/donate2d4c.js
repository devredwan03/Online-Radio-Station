(function() {
    // Donation configuration
    const MONTHLY_AMOUNTS = [6, 10, 15, 20, 30, 42, 84, 100, 210];
    const ONETIME_AMOUNTS = [25, 50, 75, 100, 250, 500, 1000];

    // Gift thresholds
    const GIFT_THRESHOLDS = {
        'tote-bag': { monthly: 10, onetime: 120 },
        't-shirt': { monthly: 10, onetime: 120 },
        'tumbler': { monthly: 20, onetime: 240 }
    };
    
    const VIP_THRESHOLD = { monthly: 42, onetime: 500 };

    // App state
    let donationType = 'monthly'; // 'monthly', 'onetime', 'increase'
    let donationAmount = 15; // default monthly
    let selectedGiftId = 'no-gift';
    let selectedVipGiftId = 'no-vip';
    let customAmountVal = '';

    // Cache DOM Elements variables (assigned during init)
    let typeButtons, amountGrid, giftsGrid, vipStep, vipGiftsGrid, vipWarning, proceedBtn;
    let paymentModal, modalClose, paymentForm, paymentSuccess, paymentFormContainer, successClose;
    let summaryType, summaryAmount, summaryGift, summaryVip, summaryTotal;

    window.initDonatePage = function() {
        // Cache DOM Elements from the current DOM state
        typeButtons = document.querySelectorAll('.type-btn');
        amountGrid = document.getElementById('amount-grid');
        giftsGrid = document.getElementById('gifts-grid');
        vipStep = document.getElementById('vip-step');
        vipGiftsGrid = document.getElementById('vip-gifts-grid');
        vipWarning = document.getElementById('vip-warning');
        proceedBtn = document.getElementById('proceed-btn');
        
        paymentModal = document.getElementById('payment-modal');
        modalClose = document.getElementById('modal-close');
        paymentForm = document.getElementById('payment-form');
        paymentSuccess = document.getElementById('payment-success');
        paymentFormContainer = document.getElementById('payment-form-container');
        successClose = document.getElementById('success-close');

        summaryType = document.getElementById('summary-type');
        summaryAmount = document.getElementById('summary-amount');
        summaryGift = document.getElementById('summary-gift');
        summaryVip = document.getElementById('summary-vip');
        summaryTotal = document.getElementById('summary-total');

        if (!amountGrid) return; // Exit if not on the donation page

        // Reset state
        donationType = 'monthly';
        donationAmount = 15;
        selectedGiftId = 'no-gift';
        selectedVipGiftId = 'no-vip';
        customAmountVal = '';

        // 1. Set up type toggle listeners using onclick to prevent duplicate listeners
        typeButtons.forEach(btn => {
            btn.onclick = function() {
                typeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const type = this.getAttribute('data-type');
                setDonationType(type);
            };
        });

        // 2. Set up modal close
        if (modalClose) modalClose.onclick = closeModal;
        if (successClose) successClose.onclick = closeModal;
        if (paymentModal) {
            paymentModal.onclick = function(e) {
                if (e.target === paymentModal) closeModal();
            };
        }

        // 3. Set up payment submission
        if (paymentForm) {
            paymentForm.onsubmit = handlePaymentSubmit;
        }

        // 4. Set up proceed button
        if (proceedBtn) {
            proceedBtn.onclick = function() {
                if (donationAmount < (donationType === 'onetime' ? 10 : 6)) return;
                openModal();
            };
        }

        // 5. Render initial state
        renderAmountGrid();
        updateGiftsAvailability();
        updateVipAvailability();
    };

    function setDonationType(type) {
        donationType = type;
        
        // Reset selections
        selectedGiftId = 'no-gift';
        selectedVipGiftId = 'no-vip';
        customAmountVal = '';
        
        if (type === 'monthly') {
            donationAmount = 15; // default monthly
        } else if (type === 'onetime') {
            donationAmount = 100; // default one-time
        } else if (type === 'increase') {
            donationAmount = 10; // default monthly increase
        }

        renderAmountGrid();
        updateGiftsAvailability();
        updateVipAvailability();
    }

    function getGiftButtonText(giftId, isSelected) {
        if (giftId === 'no-gift') {
            return isSelected ? 'Selected' : 'Choose No Gift';
        }
        const thresholds = GIFT_THRESHOLDS[giftId];
        if (!thresholds) return isSelected ? 'Selected' : 'Select Gift';
        
        const priceStr = donationType === 'onetime' ? `$${thresholds.onetime}` : `$${thresholds.monthly}/mo`;
        return isSelected ? `Selected (${priceStr})` : `Select Gift (${priceStr})`;
    }

    // Helper for VIP button text
    function getVipButtonText(giftId, isSelected) {
        if (giftId === 'no-vip') {
            return isSelected ? 'Selected' : 'No VIP Gift';
        }
        const priceStr = donationType === 'onetime' ? `$${VIP_THRESHOLD.onetime}` : `$${VIP_THRESHOLD.monthly}/mo`;
        return isSelected ? `Selected (${priceStr})` : `Select Gift (${priceStr})`;
    }

    function renderAmountGrid() {
        if (!amountGrid) return;
        amountGrid.innerHTML = '';

        const amounts = donationType === 'onetime' ? ONETIME_AMOUNTS : MONTHLY_AMOUNTS;
        const displayLabel = donationType === 'onetime' ? 'One-Time' : 'Monthly';

        // 1. Render predefined amounts
        amounts.forEach(amount => {
            const card = document.createElement('div');
            card.className = `amount-card ${donationAmount === amount ? 'active' : ''}`;
            card.setAttribute('data-amount', amount);
            card.innerHTML = `
                <span class="amount-val">$${amount}</span>
                <span class="amount-lbl">${displayLabel}</span>
            `;
            
            card.addEventListener('click', function() {
                document.querySelectorAll('.amount-card').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                donationAmount = amount;
                customAmountVal = '';
                
                // Reset any custom inputs on active cards
                const customInput = document.querySelector('.custom-amount-input');
                if (customInput) customInput.value = '';
                
                onAmountChanged();
            });

            amountGrid.appendChild(card);
        });

        // 2. Render Custom Amount Card
        const customCard = document.createElement('div');
        const isCustomActive = customAmountVal !== '';
        customCard.className = `amount-card custom-card ${isCustomActive ? 'active' : ''}`;
        customCard.innerHTML = `
            <span class="surprise-lbl">Surprise Us!</span>
            <div class="custom-input-container">
                <span>$</span>
                <input type="text" class="custom-amount-input" placeholder="Custom" value="${customAmountVal}" aria-label="Custom Amount">
            </div>
            <span class="amount-lbl">$6 Minimum</span>
        `;

        const input = customCard.querySelector('.custom-amount-input');
        
        // Prevent click events on input from double firing the card select
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        input.addEventListener('input', function() {
            let val = this.value.replace(/[^0-9]/g, '');
            this.value = val;
            customAmountVal = val;

            document.querySelectorAll('.amount-card').forEach(c => c.classList.remove('active'));
            customCard.classList.add('active');

            const num = parseInt(val, 10);
            if (!isNaN(num)) {
                donationAmount = num;
            } else {
                donationAmount = 0; // Invalid number
            }

            onAmountChanged();
        });

        customCard.addEventListener('click', function() {
            document.querySelectorAll('.amount-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            input.focus();
            
            const num = parseInt(input.value, 10);
            donationAmount = !isNaN(num) ? num : 0;
            onAmountChanged();
        });

        amountGrid.appendChild(customCard);
    }

    function onAmountChanged() {
        validateProceedButton();
        updateGiftsAvailability();
        updateVipAvailability();
    }

    function validateProceedButton() {
        if (!proceedBtn) return;
        const minimum = donationType === 'onetime' ? 10 : 6;
        if (donationAmount >= minimum) {
            proceedBtn.disabled = false;
        } else {
            proceedBtn.disabled = true;
        }
    }

    function updateGiftsAvailability() {
        if (!giftsGrid) return;
        const giftCards = giftsGrid.querySelectorAll('.gift-card');

        giftCards.forEach(card => {
            const giftId = card.getAttribute('data-gift-id');
            if (giftId === 'no-gift') {
                // "No Gift" is always unlocked
                card.classList.remove('locked');
                card.classList.add('unlocked');
                const badge = card.querySelector('.gift-status-badge');
                if (badge) badge.style.display = 'none';
                
                // Hook up select listener
                setupGiftSelection(card, giftId);
                return;
            }

            const thresholds = GIFT_THRESHOLDS[giftId];
            if (!thresholds) return;

            const threshold = donationType === 'onetime' ? thresholds.onetime : thresholds.monthly;
            const isUnlocked = donationAmount >= threshold;
            const selectBtn = card.querySelector('.gift-select-btn');
            const badge = card.querySelector('.gift-status-badge');

            if (isUnlocked) {
                card.classList.remove('locked');
                card.classList.add('unlocked');
                if (badge) {
                    badge.innerHTML = '<i class="fa-solid fa-lock-open"></i> Eligible';
                    badge.style.display = 'flex';
                }
                if (selectBtn) {
                    selectBtn.disabled = false;
                }
                
                setupGiftSelection(card, giftId);
            } else {
                card.classList.add('locked');
                card.classList.remove('unlocked', 'selected');
                if (badge) {
                    badge.innerHTML = '<i class="fa-solid fa-lock"></i> Locked';
                    badge.style.display = 'flex';
                }
                if (selectBtn) {
                    selectBtn.disabled = true;
                    const displayThreshold = donationType === 'onetime' ? `$${thresholds.onetime}` : `$${thresholds.monthly}/mo`;
                    selectBtn.textContent = `At ${displayThreshold}`;
                }

                // If this gift was selected but is now locked, deselect it
                if (selectedGiftId === giftId) {
                    selectedGiftId = 'no-gift';
                    const noGiftCard = giftsGrid.querySelector('[data-gift-id="no-gift"]');
                    if (noGiftCard) noGiftCard.classList.add('selected');
                }
            }
        });
    }

    function setupGiftSelection(card, giftId) {
        // Remove existing listener to prevent stacking
        const selectBtn = card.querySelector('.gift-select-btn');
        if (!selectBtn) return;

        // Toggle selected styling
        const isSelected = selectedGiftId === giftId;
        if (isSelected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        selectBtn.textContent = getGiftButtonText(giftId, isSelected);

        // We use onclick to prevent duplicate listener stacking
        selectBtn.onclick = function(e) {
            e.stopPropagation();
            if (card.classList.contains('locked')) return;

            // Deselect others in this step
            giftsGrid.querySelectorAll('.gift-card').forEach(c => {
                c.classList.remove('selected');
                const btn = c.querySelector('.gift-select-btn');
                if (btn && !c.classList.contains('locked')) {
                    const cId = c.getAttribute('data-gift-id');
                    btn.textContent = getGiftButtonText(cId, false);
                }
            });

            // Select this one
            selectedGiftId = giftId;
            card.classList.add('selected');
            this.textContent = getGiftButtonText(giftId, true);
        };
    }

    function updateVipAvailability() {
        if (!vipStep || !vipGiftsGrid || !vipWarning) return;

        const threshold = donationType === 'onetime' ? VIP_THRESHOLD.onetime : VIP_THRESHOLD.monthly;
        const isEligible = donationAmount >= threshold;
        const vipCards = vipGiftsGrid.querySelectorAll('.gift-card');

        // Always display the VIP gifts grid to show the options
        vipGiftsGrid.style.display = 'grid';

        if (isEligible) {
            // Unlock VIP choice step
            vipWarning.style.display = 'none';

            vipCards.forEach(card => {
                const giftId = card.getAttribute('data-gift-id');
                const selectBtn = card.querySelector('.gift-select-btn');

                card.classList.remove('locked');
                if (selectBtn) {
                    selectBtn.disabled = false;
                }
                
                setupVipSelection(card, giftId);
            });
        } else {
            // Lock VIP choice step but keep grid visible
            vipWarning.style.display = 'block';
            
            // Format descriptive requirements text
            const textSpan = vipWarning.querySelector('span');
            if (textSpan) {
                textSpan.textContent = donationType === 'onetime' 
                    ? `VIP Club features unlock at a one-time donation of $${VIP_THRESHOLD.onetime} or more.` 
                    : `VIP Club features unlock at a sustaining monthly donation of $${VIP_THRESHOLD.monthly} or more.`;
            }

            vipCards.forEach(card => {
                const giftId = card.getAttribute('data-gift-id');
                const selectBtn = card.querySelector('.gift-select-btn');

                if (giftId === 'vip-passes') {
                    card.classList.add('locked');
                    card.classList.remove('selected');
                    if (selectBtn) {
                        selectBtn.disabled = true;
                        const displayThreshold = donationType === 'onetime' ? `$${VIP_THRESHOLD.onetime}` : `$${VIP_THRESHOLD.monthly}/mo`;
                        selectBtn.textContent = `At ${displayThreshold}`;
                    }
                } else if (giftId === 'no-vip') {
                    // "No VIP Gift" is always available
                    card.classList.remove('locked');
                    card.classList.add('selected');
                    if (selectBtn) {
                        selectBtn.disabled = false;
                    }
                    setupVipSelection(card, giftId);
                }
            });

            // Reset selection
            selectedVipGiftId = 'no-vip';
        }
    }

    function setupVipSelection(card, giftId) {
        const selectBtn = card.querySelector('.gift-select-btn');
        if (!selectBtn) return;

        const isSelected = selectedVipGiftId === giftId;
        if (isSelected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
        selectBtn.textContent = getVipButtonText(giftId, isSelected);

        selectBtn.onclick = function(e) {
            e.stopPropagation();
            vipGiftsGrid.querySelectorAll('.gift-card').forEach(c => {
                c.classList.remove('selected');
                const btn = c.querySelector('.gift-select-btn');
                if (btn) {
                    const cId = c.getAttribute('data-gift-id');
                    btn.textContent = getVipButtonText(cId, false);
                }
            });

            selectedVipGiftId = giftId;
            card.classList.add('selected');
            this.textContent = getVipButtonText(giftId, true);
        };
    }

    // 4. Payment Flow & Modal Control
    function openModal() {
        // Populate transaction summary
        const giftTitles = {
            'no-gift': 'No Thank You Gift Selected (100% donation support)',
            'tote-bag': 'AVAVA Canvas Tote Bag',
            't-shirt': 'AVAVA Retro Boombox T-Shirt',
            'tumbler': 'AVAVA Cork-Bottom Travel Tumbler'
        };

        const vipTitles = {
            'no-vip': 'No VIP Invitations Selected',
            'vip-passes': '6 VIP Insider Series Invites'
        };

        const displayType = donationType === 'onetime' ? 'One-time gift' : (donationType === 'increase' ? 'Monthly Increase' : 'Monthly Sustaining');
        
        if (summaryType) summaryType.textContent = displayType;
        if (summaryAmount) summaryAmount.textContent = `$${donationAmount.toFixed(2)}`;
        
        // Add selected size if t-shirt is chosen
        if (summaryGift) {
            if (selectedGiftId === 't-shirt') {
                const sizeSelector = document.getElementById('t-shirt-size');
                const size = sizeSelector ? sizeSelector.value : 'M';
                summaryGift.textContent = `${giftTitles[selectedGiftId]} (Size: ${size})`;
            } else {
                summaryGift.textContent = giftTitles[selectedGiftId] || 'None';
            }
        }

        if (summaryVip) summaryVip.textContent = vipTitles[selectedVipGiftId] || 'None';
        if (summaryTotal) summaryTotal.textContent = `$${donationAmount.toFixed(2)}`;

        // Open modal
        if (paymentModal) paymentModal.classList.add('active');
        if (paymentFormContainer) paymentFormContainer.style.display = 'block';
        if (paymentSuccess) paymentSuccess.style.display = 'none';
    }

    function closeModal() {
        if (paymentModal) paymentModal.classList.remove('active');
    }

    function handlePaymentSubmit(e) {
        e.preventDefault();
        if (paymentFormContainer) paymentFormContainer.style.display = 'none';
        if (paymentSuccess) paymentSuccess.style.display = 'flex';
    }

    // Initialize/register window function
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initDonatePage);
    } else {
        window.initDonatePage();
    }
})();
