// BricsCoin Wallet - JavaScript Logic
const API_URL = 'http://5.161.254.163:8001/api';

// State
let wallets = [];
let currentWalletIndex = 0;
let transactions = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadWallets();
    await checkNetwork();
    setInterval(checkNetwork, 30000);
    setInterval(refreshBalance, 15000);
});

// Network check
async function checkNetwork() {
    try {
        const response = await fetch(`${API_URL}/network/stats`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('networkStatus').textContent = `Block #${data.total_blocks}`;
        }
    } catch (error) {
        document.getElementById('networkStatus').textContent = 'Offline';
    }
}

// Load wallets
async function loadWallets() {
    try {
        if (window.electronAPI) {
            wallets = await window.electronAPI.getWallets();
        } else {
            wallets = JSON.parse(localStorage.getItem('bricscoin_wallets') || '[]');
        }
        
        if (wallets.length > 0) {
            showWalletView();
            renderWalletSelector();
            selectWallet(0);
        } else {
            document.getElementById('noWalletState').style.display = 'block';
            document.getElementById('walletView').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading wallets:', error);
    }
}

// Save wallets
async function saveWallets() {
    try {
        if (window.electronAPI) {
            await window.electronAPI.saveWallets(wallets);
        } else {
            localStorage.setItem('bricscoin_wallets', JSON.stringify(wallets));
        }
    } catch (error) {
        console.error('Error saving wallets:', error);
    }
}

// Show wallet view
function showWalletView() {
    document.getElementById('noWalletState').style.display = 'none';
    document.getElementById('walletView').style.display = 'block';
}

// Render wallet selector
function renderWalletSelector() {
    const container = document.getElementById('walletSelector');
    container.innerHTML = wallets.map((w, i) => `
        <div class="wallet-chip ${i === currentWalletIndex ? 'active' : ''}" onclick="selectWallet(${i})">
            ${w.name || 'Wallet ' + (i + 1)}
        </div>
    `).join('');
}

// Select wallet
async function selectWallet(index) {
    currentWalletIndex = index;
    renderWalletSelector();
    
    const wallet = wallets[index];
    document.getElementById('currentAddress').textContent = wallet.address;
    document.getElementById('receiveAddress').textContent = wallet.address;
    
    await refreshBalance();
    await loadTransactions();
}

// Refresh balance
async function refreshBalance() {
    if (wallets.length === 0) return;
    
    const wallet = wallets[currentWalletIndex];
    try {
        const response = await fetch(`${API_URL}/wallet/${wallet.address}/balance`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('balanceAmount').textContent = `${data.balance.toFixed(8)} BRICS`;
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

// Load transactions
async function loadTransactions() {
    if (wallets.length === 0) return;
    
    const wallet = wallets[currentWalletIndex];
    try {
        const response = await fetch(`${API_URL}/transactions/address/${wallet.address}`);
        if (response.ok) {
            const data = await response.json();
            transactions = data.transactions;
            renderTransactions();
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

// Render transactions
function renderTransactions() {
    const container = document.getElementById('txList');
    const wallet = wallets[currentWalletIndex];
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <p>No transactions yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(tx => {
        const isSent = tx.sender === wallet.address;
        const address = isSent ? tx.recipient : tx.sender;
        return `
            <div class="tx-item">
                <div class="tx-info">
                    <div class="tx-icon ${isSent ? 'send' : 'receive'}">
                        ${isSent ? '↑' : '↓'}
                    </div>
                    <div class="tx-details">
                        <h4>${isSent ? 'Sent' : 'Received'}</h4>
                        <p>${address.slice(0, 12)}...${address.slice(-8)}</p>
                    </div>
                </div>
                <div class="tx-amount">
                    <div class="amount ${isSent ? 'negative' : 'positive'}">
                        ${isSent ? '-' : '+'}${tx.amount} BRICS
                    </div>
                    <div class="status">${tx.confirmed ? 'Confirmed' : 'Pending'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Create wallet
async function createWallet() {
    const name = document.getElementById('walletName').value || `Wallet ${wallets.length + 1}`;
    
    try {
        const response = await fetch(`${API_URL}/wallet/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            const newWallet = await response.json();
            wallets.push(newWallet);
            await saveWallets();
            
            closeModal('createModal');
            document.getElementById('walletName').value = '';
            
            showWalletView();
            renderWalletSelector();
            selectWallet(wallets.length - 1);
            
            // Show backup modal
            document.getElementById('backupPrivateKey').value = newWallet.private_key;
            document.getElementById('backupModal').classList.add('active');
        }
    } catch (error) {
        alert('Error creating wallet: ' + error.message);
    }
}

// Send transaction
async function sendTransaction() {
    const recipient = document.getElementById('sendRecipient').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const wallet = wallets[currentWalletIndex];
    
    if (!recipient || !amount) {
        alert('Please fill all fields');
        return;
    }
    
    if (!recipient.startsWith('BRICS')) {
        alert('Invalid recipient address');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_private_key: wallet.private_key,
                sender_address: wallet.address,
                recipient_address: recipient,
                amount: amount
            })
        });
        
        if (response.ok) {
            alert('Transaction sent successfully!');
            closeModal('sendModal');
            document.getElementById('sendRecipient').value = '';
            document.getElementById('sendAmount').value = '';
            await refreshBalance();
            await loadTransactions();
        } else {
            const error = await response.json();
            alert('Error: ' + (error.detail || 'Transaction failed'));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Copy address
function copyAddress() {
    const wallet = wallets[currentWalletIndex];
    if (wallet) {
        navigator.clipboard.writeText(wallet.address);
        alert('Address copied!');
    }
}

// Copy private key
function copyPrivateKey() {
    const key = document.getElementById('backupPrivateKey').value;
    navigator.clipboard.writeText(key);
    alert('Private key copied! Keep it safe!');
}

// Show modals
function showSend() {
    document.getElementById('sendModal').classList.add('active');
}

function showReceive() {
    const wallet = wallets[currentWalletIndex];
    if (wallet) {
        generateQR(wallet.address);
        document.getElementById('receiveModal').classList.add('active');
    }
}

function showCreateWallet() {
    document.getElementById('createModal').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Generate QR code
function generateQR(text) {
    const canvas = document.getElementById('qrCanvas');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    
    // Simple QR placeholder - in production use qrcode library
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    // Generate QR using qrcode-generator logic (simplified)
    const qr = generateQRMatrix(text);
    const cellSize = size / qr.length;
    
    ctx.fillStyle = 'black';
    for (let y = 0; y < qr.length; y++) {
        for (let x = 0; x < qr[y].length; x++) {
            if (qr[y][x]) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}

// Simple QR matrix generator (simplified version)
function generateQRMatrix(text) {
    // This is a simplified version - in production use a proper QR library
    const size = 25;
    const matrix = [];
    
    // Create matrix with pseudo-random pattern based on text
    for (let y = 0; y < size; y++) {
        matrix[y] = [];
        for (let x = 0; x < size; x++) {
            // Position patterns (corners)
            if ((x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)) {
                // Draw finder patterns
                const inOuter = x === 0 || x === 6 || y === 0 || y === 6 ||
                               x === size - 7 || x === size - 1 || 
                               (y === 0 && x >= size - 7) || (y === 6 && x >= size - 7) ||
                               (x === 0 && y >= size - 7) || (x === 6 && y >= size - 7) ||
                               (y === size - 7 && x < 7) || (y === size - 1 && x < 7);
                const inInner = (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                               (x >= size - 5 && x <= size - 3 && y >= 2 && y <= 4) ||
                               (x >= 2 && x <= 4 && y >= size - 5 && y <= size - 3);
                matrix[y][x] = inOuter || inInner;
            } else {
                // Data area - use text hash for pattern
                const hash = (text.charCodeAt((x + y) % text.length) * (x + 1) * (y + 1)) % 100;
                matrix[y][x] = hash > 50;
            }
        }
    }
    
    return matrix;
}

// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});
