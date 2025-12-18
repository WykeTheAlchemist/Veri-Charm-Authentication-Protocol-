/**
 * VeriCharm - Anti-Counterfeiting Platform
 * Main application JavaScript file
 * Handles all interactive functionality
 */

// App State Management
const appState = {
    balance: 200,
    currentProduct: null,
    transactionCounter: 0,
    productInfo: {
        fragrance: {
            name: "Éclat de Lune",
            price: 50,
            retailer: "Scent & Soul Boutique",
            retailerAddress: "0xU...rah5r",
            supplier: "L'Éclat des Cieux",
            supplierAddress: "addr1...RvT5",
            tokenIdPrefix: "#LUX-",
            category: "Luxury Fragrance",
            icon: "fas fa-gem"
        },
        medication: {
            name: "Amoxiclav-Duo",
            price: 10,
            retailer: "TrustCare Pharmacy",
            retailerAddress: "0xU...ph4rm",
            supplier: "VitaSure Pharmaceuticals",
            supplierAddress: "addr1...Ph8K",
            tokenIdPrefix: "#PH-",
            category: "Sensitive Medication",
            icon: "fas fa-prescription-bottle"
        },
        produce: {
            name: "Royal Purple Eggplants",
            price: 5,
            retailer: "Farmers' Fresh Market",
            retailerAddress: "0xU...m4rkT",
            supplier: "GreenRoots Organic Farm",
            supplierAddress: "addr1...Gr3F",
            tokenIdPrefix: "#ORG-",
            category: "Organic Produce",
            icon: "fas fa-seedling"
        },
        energy: {
            name: "EcoGrid Power Inverter",
            price: 150,
            retailer: "GreenTech Solutions",
            retailerAddress: "0xU...Gr3nT",
            supplier: "EcoVolt Technologies",
            supplierAddress: "addr1...Ec0V",
            tokenIdPrefix: "#ECO-",
            category: "Renewable Energy Component",
            icon: "fas fa-solar-panel",
            carbonFootprint: "Low (35g CO₂/kWh)",
            certification: "Carbon Neutral Certified"
        }
    },
    ownedTokens: [],
    transactions: [],
    privacyEnabled: false,
    purchaseInProgress: false
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    updateWalletDisplay();
    updateBuyButtons();
    loadInitialTransactions();
});

// Navigation Setup Function
function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Refresh explorer if needed
            if (tabId === 'explorer') {
                updateExplorer();
            }
        });
    });
}

// Update wallet display with current balance
function updateWalletDisplay() {
    const balanceDisplay = document.getElementById('balance-display');
    const currentBalanceInput = document.getElementById('current-balance');
    
    if (balanceDisplay) {
        balanceDisplay.textContent = `${appState.balance} DLLR`;
    }
    
    if (currentBalanceInput) {
        currentBalanceInput.value = `${appState.balance} DLLR`;
    }
}

// Update buy buttons based on user balance
function updateBuyButtons() {
    for (const productType in appState.productInfo) {
        const price = appState.productInfo[productType].price;
        const button = document.getElementById(`buy-${productType}`);
        
        if (button) {
            button.disabled = appState.balance < price;
        }
    }
}

// Load initial transactions for demonstration
function loadInitialTransactions() {
    // Initial mint transactions for each product
    const initialMints = [
        {
            type: 'mint',
            product: "Éclat de Lune",
            from: "addr1...RvT5",
            to: "Factory Mint",
            tokenId: "#LUX-001",
            timestamp: "2 days ago"
        },
        {
            type: 'mint',
            product: "Amoxiclav-Duo",
            from: "addr1...Ph8K",
            to: "Factory Mint",
            tokenId: "#PH-001",
            timestamp: "1 day ago"
        },
        {
            type: 'mint',
            product: "Royal Purple Eggplants",
            from: "addr1...Gr3F",
            to: "Factory Mint",
            tokenId: "#ORG-001",
            timestamp: "3 days ago"
        },
        {
            type: 'mint',
            product: "EcoGrid Power Inverter",
            from: "addr1...Ec0V",
            to: "Factory Mint",
            tokenId: "#ECO-001",
            timestamp: "4 days ago",
            carbonFootprint: "Low (35g CO₂/kWh)"
        }
    ];
    
    initialMints.forEach(tx => addTransaction(tx));
    
    // Initial transfers to retailers
    const initialTransfers = [
        {
            type: 'transfer',
            product: "Éclat de Lune",
            from: "addr1...RvT5",
            to: "0xU...rah5r",
            tokenId: "#LUX-001",
            timestamp: "1 day ago"
        },
        {
            type: 'transfer',
            product: "Amoxiclav-Duo",
            from: "addr1...Ph8K",
            to: "0xU...ph4rm",
            tokenId: "#PH-001",
            timestamp: "Yesterday"
        },
        {
            type: 'transfer',
            product: "Royal Purple Eggplants",
            from: "addr1...Gr3F",
            to: "0xU...m4rkT",
            tokenId: "#ORG-001",
            timestamp: "2 days ago"
        },
        {
            type: 'transfer',
            product: "EcoGrid Power Inverter",
            from: "addr1...Ec0V",
            to: "0xU...Gr3nT",
            tokenId: "#ECO-001",
            timestamp: "2 days ago",
            certification: "Carbon Neutral Certified"
        }
    ];
    
    initialTransfers.forEach(tx => addTransaction(tx));
}

// Add transaction to the ledger
function addTransaction(tx) {
    tx.id = appState.transactionCounter++;
    tx.timestamp = tx.timestamp || getCurrentTimestamp();
    appState.transactions.unshift(tx); // Add to beginning for newest first
    updateExplorer();
}

// Get current timestamp for transactions
function getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Update the explorer view with all transactions
function updateExplorer() {
    const historyContainer = document.getElementById('transaction-history');
    
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    
    appState.transactions.forEach(tx => {
        const transactionItem = createTransactionElement(tx);
        historyContainer.appendChild(transactionItem);
    });
}

// Create transaction element for explorer
function createTransactionElement(tx) {
    const transactionItem = document.createElement('div');
    transactionItem.className = 'transaction-item';
    
    // Determine icon and color based on transaction type
    const { iconClass, icon } = getTransactionIcon(tx);
    
    // Apply privacy if enabled
    let fromAddress = tx.from;
    let toAddress = tx.to;
    
    if (appState.privacyEnabled) {
        if (tx.from && tx.from.includes('bc1q')) {
            fromAddress = 'zk:...verif1ed';
        }
        if (tx.to && tx.to.includes('bc1q')) {
            toAddress = 'zk:...verif1ed';
        }
    }
    
    // Build transaction HTML
    transactionItem.innerHTML = `
        <div class="transaction-icon ${iconClass}">
            ${icon}
        </div>
        <div class="transaction-details">
            <h4>${getTransactionTitle(tx)}</h4>
            <p>${tx.product || 'Token Transaction'}</p>
            ${tx.carbonFootprint ? 
                `<div class="carbon-info">
                    <i class="fas fa-leaf"></i> ${tx.carbonFootprint}
                </div>` : ''}
            ${tx.certification ? 
                `<div class="certification-info">
                    <i class="fas fa-certificate"></i> ${tx.certification}
                </div>` : ''}
            <div class="transaction-address">From: ${fromAddress}</div>
            <div class="transaction-address" style="margin-top: 4px;">To: ${toAddress}</div>
            ${tx.tokenId ? 
                `<div class="transaction-address" style="margin-top: 4px;">Token: ${tx.tokenId}</div>` : ''}
        </div>
        <div class="transaction-time">${tx.timestamp}</div>
    `;
    
    return transactionItem;
}

// Get appropriate icon for transaction type
function getTransactionIcon(tx) {
    let iconClass = 'icon-transfer';
    let icon = '<i class="fas fa-exchange-alt"></i>';
    
    switch(tx.type) {
        case 'mint':
            iconClass = 'icon-mint';
            icon = '<i class="fas fa-plus"></i>';
            break;
        case 'payment':
            iconClass = 'icon-payment';
            icon = '<i class="fas fa-money-bill-wave"></i>';
            break;
        case 'burn':
            iconClass = 'icon-burn';
            icon = '<i class="fas fa-fire"></i>';
            break;
    }
    
    // Special icon for energy products
    if (tx.product && tx.product.includes("EcoGrid")) {
        iconClass = 'icon-energy';
        icon = '<i class="fas fa-bolt"></i>';
    }
    
    return { iconClass, icon };
}

// Get transaction title based on type
function getTransactionTitle(tx) {
    const titles = {
        'mint': 'Token Minted',
        'payment': 'Payment Sent',
        'transfer': 'Token Transferred',
        'burn': 'Token Burned'
    };
    
    return titles[tx.type] || 'Transaction';
}

// Open purchase modal for specific product
function openPurchaseModal(productType) {
    appState.currentProduct = productType;
    const product = appState.productInfo[productType];
    
    // Check if user has enough balance
    if (appState.balance < product.price) {
        alert(`Insufficient balance. You need ${product.price} DLLR but only have ${appState.balance} DLLR.`);
        return;
    }
    
    // Update modal content
    document.getElementById('modal-title').textContent = `Purchase ${product.name}`;
    document.getElementById('payment-amount').value = `${product.price} DLLR`;
    document.getElementById('retailer-address').value = product.retailerAddress;
    
    // Reset modal state
    resetModalState();
    
    // Open the modal
    openModal('purchase-modal');
}

// Reset modal to initial state
function resetModalState() {
    const elements = [
        'address-alert',
        'verification-process',
        'seller-prompt',
        'buyer-prompt'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    const sendBtn = document.getElementById('send-payment-btn');
    if (sendBtn) {
        sendBtn.style.display = 'inline-flex';
        sendBtn.disabled = false;
    }
    
    const confirmBtn = document.getElementById('confirm-receipt-btn');
    if (confirmBtn) {
        confirmBtn.style.display = 'none';
    }
}

// Open modal by ID
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Close purchase modal
function closeModal() {
    const modal = document.getElementById('purchase-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    appState.purchaseInProgress = false;
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Switch to tokens tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    const tokensTab = document.querySelector('[data-tab="tokens"]');
    if (tokensTab) tokensTab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const tokensContent = document.getElementById('tokens-tab');
    if (tokensContent) tokensContent.classList.add('active');
}

// Send payment for purchase
function sendPayment() {
    const retailerAddress = document.getElementById('retailer-address').value.trim();
    const product = appState.productInfo[appState.currentProduct];
    
    if (!product) return;
    
    // Show verification process
    const verificationEl = document.getElementById('verification-process');
    const sendBtn = document.getElementById('send-payment-btn');
    
    if (verificationEl) verificationEl.style.display = 'block';
    if (sendBtn) sendBtn.disabled = true;
    
    // Simulate address verification
    setTimeout(() => {
        if (verificationEl) verificationEl.style.display = 'none';
        
        verifyRetailerAddress(retailerAddress, product);
        
    }, 1000);
}

// Verify retailer address against trusted directory
function verifyRetailerAddress(address, product) {
    const trustedAddresses = ['0xU...rah5r', '0xU...ph4rm', '0xU...m4rkT', '0xU...Gr3nT'];
    const alertEl = document.getElementById('address-alert');
    
    if (!trustedAddresses.includes(address)) {
        // Show error - untrusted address
        showAlert(alertEl, 'error', 
            `<strong>Security Warning!</strong> This address is not in our trusted retailer directory. 
            Proceed with extreme caution.`);
        enableSendButton();
        return;
    }
    
    if (address !== product.retailerAddress) {
        // Show warning - address mismatch
        showAlert(alertEl, 'warning',
            `<strong>Address mismatch.</strong> This address belongs to a different retailer. 
            Verify you're purchasing from ${product.retailer}.`);
    } else {
        // Show success - trusted address
        showAlert(alertEl, 'success',
            `<strong>Address verified!</strong> This retailer is trusted.`);
    }
    
    // Record payment transaction
    addTransaction({
        type: 'payment',
        product: product.name,
        from: 'bc1q...demo',
        to: address,
        amount: `${product.price} DLLR`,
        timestamp: getCurrentTimestamp()
    });
    
    // Continue with purchase flow
    continuePurchaseFlow();
}

// Show alert message
function showAlert(element, type, message) {
    if (!element) return;
    
    element.className = `alert alert-${type}`;
    const messageEl = document.getElementById('alert-message');
    if (messageEl) {
        messageEl.innerHTML = message;
    }
    element.style.display = 'flex';
}

// Enable the send payment button
function enableSendButton() {
    const sendBtn = document.getElementById('send-payment-btn');
    if (sendBtn) {
        sendBtn.disabled = false;
    }
}

// Continue purchase flow after verification
function continuePurchaseFlow() {
    const alertEl = document.getElementById('address-alert');
    const sellerPrompt = document.getElementById('seller-prompt');
    const sendBtn = document.getElementById('send-payment-btn');
    const buyerPrompt = document.getElementById('buyer-prompt');
    const confirmBtn = document.getElementById('confirm-receipt-btn');
    
    // Simulate payment processing
    setTimeout(() => {
        if (alertEl) alertEl.style.display = 'none';
        if (sellerPrompt) sellerPrompt.style.display = 'block';
        if (sendBtn) sendBtn.style.display = 'none';
        
        // Simulate seller confirmation
        setTimeout(() => {
            if (sellerPrompt) sellerPrompt.style.display = 'none';
            if (buyerPrompt) buyerPrompt.style.display = 'block';
            if (confirmBtn) confirmBtn.style.display = 'inline-flex';
        }, 2000);
    }, 1500);
}

// Confirm receipt of physical product
function confirmReceipt() {
    const product = appState.productInfo[appState.currentProduct];
    
    if (!product) return;
    
    // Generate unique token ID
    const tokenNumber = Math.floor(Math.random() * 100) + 1;
    const tokenId = `${product.tokenIdPrefix}${tokenNumber.toString().padStart(3, '0')}`;
    
    // Update balance
    appState.balance -= product.price;
    updateWalletDisplay();
    updateBuyButtons();
    
    // Create token object
    const token = {
        id: tokenId,
        product: product.name,
        retailer: product.retailer,
        category: product.category,
        purchaseDate: new Date().toLocaleDateString(),
        purchaseTime: getCurrentTimestamp(),
        burnLockDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        price: product.price,
        icon: product.icon || 'fas fa-tag'
    };
    
    // Add certification info for energy products
    if (product.certification) {
        token.certification = product.certification;
    }
    if (product.carbonFootprint) {
        token.carbonFootprint = product.carbonFootprint;
    }
    
    // Add token to collection
    appState.ownedTokens.push(token);
    
    // Record token transfer transaction
    addTransaction({
        type: 'transfer',
        product: product.name,
        from: product.retailerAddress,
        to: 'bc1q...demo',
        tokenId: tokenId,
        timestamp: getCurrentTimestamp(),
        certification: product.certification,
        carbonFootprint: product.carbonFootprint
    });
    
    // Show success and update UI
    closeModal();
    openModal('success-modal');
    updateTokenDisplay();
}

// Update token display in "My Tokens" tab
function updateTokenDisplay() {
    const tokenList = document.getElementById('token-list');
    const noTokensMessage = document.getElementById('no-tokens-message');
    const tokenActions = document.getElementById('token-actions');
    
    if (!tokenList || !noTokensMessage || !tokenActions) return;
    
    if (appState.ownedTokens.length === 0) {
        noTokensMessage.style.display = 'flex';
        tokenList.innerHTML = '';
        tokenActions.style.display = 'none';
    } else {
        noTokensMessage.style.display = 'none';
        tokenList.innerHTML = '';
        tokenActions.style.display = 'flex';
        
        // Sort tokens by purchase date (newest first)
        const sortedTokens = [...appState.ownedTokens].reverse();
        
        sortedTokens.forEach(token => {
            const tokenItem = createTokenElement(token);
            tokenList.appendChild(tokenItem);
        });
    }
}

// Create token element for display
function createTokenElement(token) {
    const tokenItem = document.createElement('div');
    tokenItem.className = 'token-item';
    
    // Calculate days remaining for burn lock
    const now = new Date();
    const lockDate = new Date(token.burnLockDate);
    const daysRemaining = Math.ceil((lockDate - now) / (1000 * 60 * 60 * 24));
    const canBurn = daysRemaining <= 0;
    
    tokenItem.innerHTML = `
        <div class="token-info">
            <h4><i class="${token.icon}" style="margin-right: 8px; color: var(--energy-accent);"></i> ${token.product}</h4>
            <p>Token: ${token.id} | Category: ${token.category}</p>
            <p>Purchased: ${token.purchaseDate} at ${token.purchaseTime} | Price: ${token.price} DLLR</p>
            ${token.certification ? 
                `<p class="certification-display">
                    <i class="fas fa-certificate"></i> ${token.certification}
                </p>` : ''}
            ${token.carbonFootprint ? 
                `<p class="carbon-display">
                    <i class="fas fa-leaf"></i> ${token.carbonFootprint}
                </p>` : ''}
            <p class="burn-status ${canBurn ? 'available' : 'locked'}">
                <i class="fas ${canBurn ? 'fa-unlock' : 'fa-lock'}"></i> 
                Burn ${canBurn ? 'Available' : `Locked (${daysRemaining} days remaining)`}
            </p>
        </div>
        <div class="token-actions">
            <button class="btn btn-secondary btn-small" onclick="showTokenDetails('${token.id}')">
                <i class="fas fa-info-circle"></i> Details
            </button>
            <button class="btn btn-primary btn-small ${canBurn ? '' : 'btn-disabled'}" 
                    onclick="${canBurn ? `burnToken('${token.id}')` : ''}" 
                    ${canBurn ? '' : 'disabled'}>
                <i class="fas fa-fire"></i> Burn for Raffle
            </button>
        </div>
    `;
    
    return tokenItem;
}

// Show detailed token information
function showTokenDetails(tokenId) {
    const token = appState.ownedTokens.find(t => t.id === tokenId);
    
    if (!token) {
        alert('Token not found.');
        return;
    }
    
    let details = `Token Details:\n\n` +
          `ID: ${token.id}\n` +
          `Product: ${token.product}\n` +
          `Category: ${token.category}\n` +
          `Retailer: ${token.retailer}\n` +
          `Purchase Date: ${token.purchaseDate}\n` +
          `Purchase Time: ${token.purchaseTime}\n` +
          `Price: ${token.price} DLLR\n`;
    
    if (token.certification) {
        details += `\nCertification: ${token.certification}\n`;
    }
    if (token.carbonFootprint) {
        details += `Carbon Footprint: ${token.carbonFootprint}\n`;
    }
    
    details += `\nThis token proves the authenticity of your product.\n` +
           `Keep it for at least 14 days for warranty/return purposes.`;
    
    alert(details);
}

// Toggle privacy mode in explorer
function togglePrivacy() {
    appState.privacyEnabled = !appState.privacyEnabled;
    updateExplorer();
}

// Show refund information
function showRefundInfo() {
    alert('To initiate a return:\n\n' +
          '1. Contact the retailer with your Charm Token ID\n' +
          '2. Send the Charm token back to the supplier address\n' +
          '3. The smart contract will automatically process your refund\n\n' +
          'Note: Returns are only possible within the 14-day warranty period.');
}

// Show raffle information
function showRaffleInfo() {
    alert('Raffle Draw Information:\n\n' +
          '• Burn any Charm token to enter our monthly raffle\n' +
          '• Prizes include gift cards, exclusive products, and crypto rewards\n' +
          '• Each burned token equals one raffle entry\n' +
          '• Winners are announced on the 1st of each month\n' +
          '• Check your email for winner notifications');
}

// Burn token to enter raffle
function burnToken(tokenId) {
    const tokenIndex = appState.ownedTokens.findIndex(t => t.id === tokenId);
    
    if (tokenIndex === -1) {
        alert('Token not found.');
        return;
    }
    
    const token = appState.ownedTokens[tokenIndex];
    const now = new Date();
    const lockDate = new Date(token.burnLockDate);
    
    // Check if token can be burned
    if (now < lockDate) {
        const daysRemaining = Math.ceil((lockDate - now) / (1000 * 60 * 60 * 24));
        alert(`Token is locked for warranty/refund period. Cannot burn yet. ${daysRemaining} days remaining.`);
        return;
    }
    
    // Confirm burn action
    const confirmMessage = `Burn Charm token ${tokenId} to enter raffle?\n\n` +
                         `Product: ${token.product}\n` +
                         `${token.certification ? `Certification: ${token.certification}\n` : ''}` +
                         `This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Record burn transaction
    addTransaction({
        type: 'burn',
        product: token.product,
        from: 'bc1q...demo',
        to: 'addr1...daf4w (Burn Address)',
        tokenId: tokenId,
        timestamp: getCurrentTimestamp()
    });
    
    // Remove token from collection
    appState.ownedTokens.splice(tokenIndex, 1);
    updateTokenDisplay();
    
    // Show success message
    alert(`Token ${tokenId} burned!\n\n` +
          `✅ You have been entered into the monthly raffle draw.\n` +
          `✅ Check your email for raffle details and tracking number.\n` +
          `✅ Winners announced on the 1st of next month.`);
}

// Demo functions for retailer simulation (for development only)
window.simulateRetailerResponse = function(response) {
    if (response === 'approve') {
        console.log('Retailer approved token transfer');
    } else if (response === 'deny') {
        console.log('Retailer denied token transfer - refund initiated');
    }
};

window.autoApproveDemo = function() {
    setTimeout(() => {
        simulateRetailerResponse('approve');
    }, 2000);
};