// Facebook Marketplace Automation Dashboard
// Main JavaScript file for frontend functionality

class AutomationDashboard {
    constructor() {
        this.socket = null;
        this.currentSpreadsheetId = null;
        this.isAutomationRunning = false;
        this.settings = {
            autoRefresh: true,
            soundNotifications: false,
            refreshInterval: 30,
            logLevel: 'info'
        };
        this.stats = {
            totalProcessed: 0,
            successfulListings: 0,
            failedListings: 0,
            pendingListings: 0
        };
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.bindEventListeners();
        this.loadSettings();
        this.updateConnectionStatus('connecting');
        this.startUptimeCounter();
        
        // Initial data load
        this.refreshStats();
        this.logMessage('system', 'Dashboard initialized successfully');
    }

    // Socket.IO Connection
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus('connected');
            this.logMessage('system', 'Connected to server');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus('disconnected');
            this.logMessage('error', 'Disconnected from server');
        });

        this.socket.on('automation_status', (data) => {
            this.handleAutomationStatus(data);
        });

        this.socket.on('processing_update', (data) => {
            this.handleProcessingUpdate(data);
        });

        this.socket.on('stats_update', (data) => {
            this.updateStats(data);
        });

        this.socket.on('log_message', (data) => {
            this.logMessage(data.type, data.message, data.timestamp);
        });
    }

    // Event Listeners
    bindEventListeners() {
        // Google Sheets validation
        document.getElementById('validateSheet').addEventListener('click', () => {
            this.validateGoogleSheet();
        });

        // Automation controls
        document.getElementById('startAutomation').addEventListener('click', () => {
            this.startAutomation();
        });

        document.getElementById('pauseAutomation').addEventListener('click', () => {
            this.pauseAutomation();
        });

        document.getElementById('stopAutomation').addEventListener('click', () => {
            this.stopAutomation();
        });

        document.getElementById('processSheet').addEventListener('click', () => {
            this.processSheet();
        });

        // Testing buttons
        document.getElementById('testConnection').addEventListener('click', () => {
            this.testConnection();
        });

        document.getElementById('validateImages').addEventListener('click', () => {
            this.validateImages();
        });

        document.getElementById('dryRun').addEventListener('click', () => {
            this.performDryRun();
        });

        // Refresh buttons
        document.getElementById('refreshPending').addEventListener('click', () => {
            this.refreshPendingItems();
        });

        // Log controls
        document.getElementById('clearLog').addEventListener('click', () => {
            this.clearLog();
        });

        document.getElementById('exportLog').addEventListener('click', () => {
            this.exportLog();
        });

        // Image upload
        const uploadArea = document.getElementById('uploadArea');
        const imageInput = document.getElementById('imageInput');

        uploadArea.addEventListener('click', () => {
            imageInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleImageUpload(e.dataTransfer.files);
        });

        imageInput.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });

        // Modal controls
        document.getElementById('showHelp').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('helpModal');
        });

        document.getElementById('showSettings').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('settingsModal');
        });

        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Settings
        document.getElementById('autoRefresh').addEventListener('change', (e) => {
            this.settings.autoRefresh = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('soundNotifications').addEventListener('change', (e) => {
            this.settings.soundNotifications = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('refreshInterval').addEventListener('change', (e) => {
            this.settings.refreshInterval = parseInt(e.target.value);
            this.saveSettings();
        });

        document.getElementById('logLevel').addEventListener('change', (e) => {
            this.settings.logLevel = e.target.value;
            this.saveSettings();
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Auto-refresh pending items
        setInterval(() => {
            if (this.settings.autoRefresh && this.currentSpreadsheetId) {
                this.refreshPendingItems();
            }
        }, this.settings.refreshInterval * 1000);
    }

    // Google Sheets Operations
    async validateGoogleSheet() {
        const urlInput = document.getElementById('spreadsheetUrl');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showValidationResult('error', 'Please enter a Google Sheets URL');
            return;
        }

        const spreadsheetId = this.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            this.showValidationResult('error', 'Invalid Google Sheets URL format');
            return;
        }

        this.showLoading('Validating Google Sheet...');
        
        try {
            const response = await fetch('/api/validate-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spreadsheetId })
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.currentSpreadsheetId = spreadsheetId;
                this.showValidationResult('success', 'Sheet validation successful! Found ' + result.data.rowCount + ' rows.');
                this.enableAutomationControls();
                this.refreshPendingItems();
                this.logMessage('success', 'Google Sheet validated successfully');
            } else {
                this.showValidationResult('error', result.message);
                this.logMessage('error', 'Sheet validation failed: ' + result.message);
            }
        } catch (error) {
            this.hideLoading();
            this.showValidationResult('error', 'Failed to validate sheet: ' + error.message);
            this.logMessage('error', 'Sheet validation error: ' + error.message);
        }
    }

    extractSpreadsheetId(url) {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    async refreshPendingItems() {
        if (!this.currentSpreadsheetId) return;

        try {
            const response = await fetch('/api/pending-listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spreadsheetId: this.currentSpreadsheetId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayPendingItems(result.data.listings);
                this.stats.pendingListings = result.data.pendingCount;
                this.updateStatsDisplay();
            }
        } catch (error) {
            this.logMessage('error', 'Failed to refresh pending items: ' + error.message);
        }
    }

    // Automation Controls
    async startAutomation() {
        if (!this.currentSpreadsheetId) {
            this.logMessage('error', 'Please validate a Google Sheet first');
            return;
        }

        this.showLoading('Starting automation...');
        
        try {
            const response = await fetch('/api/automation/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spreadsheetId: this.currentSpreadsheetId })
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.isAutomationRunning = true;
                this.updateAutomationControls();
                this.logMessage('success', 'Automation started successfully');
            } else {
                this.logMessage('error', 'Failed to start automation: ' + result.message);
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Automation start error: ' + error.message);
        }
    }

    async pauseAutomation() {
        this.showLoading('Pausing automation...');
        
        try {
            const response = await fetch('/api/automation/pause', {
                method: 'POST'
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.logMessage('warning', 'Automation paused');
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Failed to pause automation: ' + error.message);
        }
    }

    async stopAutomation() {
        this.showLoading('Stopping automation...');
        
        try {
            const response = await fetch('/api/automation/stop', {
                method: 'POST'
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.isAutomationRunning = false;
                this.updateAutomationControls();
                this.updateProgress(0, 'Automation stopped');
                this.logMessage('warning', 'Automation stopped');
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Failed to stop automation: ' + error.message);
        }
    }

    async processSheet() {
        if (!this.currentSpreadsheetId) {
            this.logMessage('error', 'Please validate a Google Sheet first');
            return;
        }

        this.showLoading('Processing sheet...');
        
        try {
            const response = await fetch('/api/process-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spreadsheetId: this.currentSpreadsheetId })
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.logMessage('success', 'Sheet processing initiated');
                this.refreshPendingItems();
            } else {
                this.logMessage('error', 'Failed to process sheet: ' + result.message);
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Sheet processing error: ' + error.message);
        }
    }

    // Testing Functions
    async testConnection() {
        this.showLoading('Testing connection...');
        
        try {
            const response = await fetch('/api/status');
            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.logMessage('success', 'Connection test successful - All services operational');
            } else {
                this.logMessage('error', 'Connection test failed');
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Connection test error: ' + error.message);
        }
    }

    async validateImages() {
        const imageInput = document.getElementById('imageInput');
        if (!imageInput.files.length) {
            this.logMessage('warning', 'Please select images to validate');
            return;
        }

        this.showLoading('Validating images...');
        
        const formData = new FormData();
        for (let file of imageInput.files) {
            formData.append('images', file);
        }

        try {
            const response = await fetch('/api/upload-images', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.logMessage('success', `Image validation complete: ${result.data.totalUploaded} valid, ${result.data.totalErrors} errors`);
                this.displayUploadedImages(result.data.uploaded);
            } else {
                this.logMessage('error', 'Image validation failed: ' + result.message);
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Image validation error: ' + error.message);
        }
    }

    async performDryRun() {
        if (!this.currentSpreadsheetId) {
            this.logMessage('error', 'Please validate a Google Sheet first');
            return;
        }

        this.showLoading('Performing dry run...');
        
        try {
            // Get first pending item for dry run
            const response = await fetch('/api/pending-listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ spreadsheetId: this.currentSpreadsheetId })
            });

            const result = await response.json();
            
            if (result.success && result.data.listings.length > 0) {
                const testItem = result.data.listings[0];
                
                const testResponse = await fetch('/api/test-automation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ listingData: testItem })
                });

                const testResult = await testResponse.json();
                this.hideLoading();

                if (testResult.success) {
                    this.logMessage('success', 'Dry run completed successfully');
                    this.logMessage('info', `Estimated processing time: ${testResult.data.estimatedProcessingTime}`);
                } else {
                    this.logMessage('error', 'Dry run failed: ' + testResult.message);
                }
            } else {
                this.hideLoading();
                this.logMessage('warning', 'No pending items found for dry run');
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Dry run error: ' + error.message);
        }
    }

    // Image Upload Handling
    async handleImageUpload(files) {
        if (!files.length) return;

        const formData = new FormData();
        for (let file of files) {
            formData.append('images', file);
        }

        this.showLoading('Uploading images...');

        try {
            const response = await fetch('/api/upload-images', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.displayUploadedImages(result.data.uploaded);
                this.logMessage('success', `Uploaded ${result.data.totalUploaded} images successfully`);
                
                if (result.data.totalErrors > 0) {
                    this.logMessage('warning', `${result.data.totalErrors} images had errors`);
                }
            } else {
                this.logMessage('error', 'Image upload failed: ' + result.message);
            }
        } catch (error) {
            this.hideLoading();
            this.logMessage('error', 'Image upload error: ' + error.message);
        }
    }

    displayUploadedImages(images) {
        const container = document.getElementById('uploadedImages');
        container.innerHTML = '';

        images.forEach(image => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'image-preview';
            imageDiv.innerHTML = `
                <img src="${image.path}" alt="${image.originalName}">
                <button class="remove-btn" onclick="dashboard.removeImage('${image.filename}')">
                    <i class="fas fa-times"></i>
                </button>
                <div class="image-info">
                    <small>${image.originalName}</small>
                    <small>${(image.size / 1024).toFixed(1)} KB</small>
                </div>
            `;
            container.appendChild(imageDiv);
        });

        // Show upload section if images are present
        if (images.length > 0) {
            document.querySelector('.image-upload').style.display = 'block';
        }
    }

    removeImage(filename) {
        // Remove image from display
        const imageElements = document.querySelectorAll('.image-preview');
        imageElements.forEach(element => {
            if (element.querySelector('img').src.includes(filename)) {
                element.remove();
            }
        });

        // Hide section if no images left
        if (document.querySelectorAll('.image-preview').length === 0) {
            document.querySelector('.image-upload').style.display = 'none';
        }
    }

    // UI Updates
    updateConnectionStatus(status) {
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionText');
        
        statusDot.className = `status-dot ${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = 'Connected';
                break;
            case 'disconnected':
                statusText.textContent = 'Disconnected';
                break;
            case 'connecting':
                statusText.textContent = 'Connecting...';
                break;
        }
    }

    showValidationResult(type, message) {
        const resultDiv = document.getElementById('sheetValidationResult');
        resultDiv.className = `validation-result ${type}`;
        resultDiv.textContent = message;
        resultDiv.style.display = 'block';
        
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);
    }

    enableAutomationControls() {
        document.getElementById('startAutomation').disabled = false;
        document.getElementById('processSheet').disabled = false;
    }

    updateAutomationControls() {
        const startBtn = document.getElementById('startAutomation');
        const pauseBtn = document.getElementById('pauseAutomation');
        const stopBtn = document.getElementById('stopAutomation');

        if (this.isAutomationRunning) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
        } else {
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
        }
    }

    displayPendingItems(items) {
        const container = document.getElementById('pendingItemsList');
        
        if (!items.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No pending items found</p>
                    <small>Configure your Google Sheet and add items to get started</small>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="item-row">
                <div class="item-info">
                    <h4>${item.itemName}</h4>
                    <p>$${item.price} • ${item.category || 'No category'} • Row ${item.rowNumber}</p>
                </div>
                <div class="item-status ${item.status.toLowerCase()}">${item.status}</div>
            </div>
        `).join('');
    }

    updateProgress(percentage, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        progressFill.style.width = percentage + '%';
        progressText.textContent = text;
    }

    updateStats(newStats) {
        if (newStats) {
            Object.assign(this.stats, newStats);
        }
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        document.getElementById('totalProcessed').textContent = this.stats.totalProcessed;
        document.getElementById('successfulListings').textContent = this.stats.successfulListings;
        document.getElementById('failedListings').textContent = this.stats.failedListings;
        document.getElementById('pendingListings').textContent = this.stats.pendingListings;
    }

    async refreshStats() {
        try {
            const response = await fetch('/api/stats');
            const result = await response.json();
            
            if (result.success) {
                this.updateStats(result.data);
            }
        } catch (error) {
            console.error('Failed to refresh stats:', error);
        }
    }

    // Socket Event Handlers
    handleAutomationStatus(data) {
        this.isAutomationRunning = data.isRunning;
        this.updateAutomationControls();
        this.logMessage('info', `Automation status: ${data.status}`);
    }

    handleProcessingUpdate(data) {
        const currentItem = document.getElementById('currentItem');
        
        if (data.currentItem) {
            currentItem.innerHTML = `
                <div class="processing-item">
                    <h4>${data.currentItem.itemName}</h4>
                    <p>$${data.currentItem.price} • Row ${data.currentItem.rowNumber}</p>
                    <div class="processing-step">${data.step || 'Processing...'}</div>
                </div>
            `;
        } else {
            currentItem.innerHTML = `
                <div class="item-placeholder">
                    <i class="fas fa-inbox"></i>
                    <p>No items currently being processed</p>
                </div>
            `;
        }

        if (data.progress !== undefined) {
            this.updateProgress(data.progress, data.progressText || 'Processing...');
        }
    }

    // Logging
    logMessage(type, message, timestamp) {
        const logContainer = document.getElementById('activityLog');
        const time = timestamp || new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="timestamp">[${time}]</span>
            <span class="message">${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        // Play sound notification if enabled
        if (this.settings.soundNotifications && (type === 'error' || type === 'success')) {
            this.playNotificationSound(type);
        }

        // Limit log entries to prevent memory issues
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 1000) {
            entries[0].remove();
        }
    }

    clearLog() {
        const logContainer = document.getElementById('activityLog');
        logContainer.innerHTML = `
            <div class="log-entry system">
                <span class="timestamp">[System]</span>
                <span class="message">Log cleared</span>
            </div>
        `;
    }

    exportLog() {
        const logContainer = document.getElementById('activityLog');
        const entries = logContainer.querySelectorAll('.log-entry');
        
        let logText = 'Facebook Marketplace Automation - Activity Log\n';
        logText += '='.repeat(50) + '\n\n';
        
        entries.forEach(entry => {
            const timestamp = entry.querySelector('.timestamp').textContent;
            const message = entry.querySelector('.message').textContent;
            logText += `${timestamp} ${message}\n`;
        });
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `automation-log-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Loading Overlay
    showLoading(text) {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // Settings Management
    loadSettings() {
        const saved = localStorage.getItem('automationSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.applySettings();
        }
    }

    saveSettings() {
        localStorage.setItem('automationSettings', JSON.stringify(this.settings));
        this.applySettings();
    }

    applySettings() {
        document.getElementById('autoRefresh').checked = this.settings.autoRefresh;
        document.getElementById('soundNotifications').checked = this.settings.soundNotifications;
        document.getElementById('refreshInterval').value = this.settings.refreshInterval;
        document.getElementById('logLevel').value = this.settings.logLevel;
    }

    // Utility Functions
    playNotificationSound(type) {
        // Create audio context for notification sounds
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const audioContext = new (AudioContext || webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = type === 'error' ? 400 : 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }
    }

    startUptimeCounter() {
        const startTime = Date.now();
        
        setInterval(() => {
            const uptime = Date.now() - startTime;
            const hours = Math.floor(uptime / 3600000);
            const minutes = Math.floor((uptime % 3600000) / 60000);
            const seconds = Math.floor((uptime % 60000) / 1000);
            
            document.getElementById('uptime').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AutomationDashboard();
});

// Global error handler
window.addEventListener('error', (event) => {
    if (window.dashboard) {
        window.dashboard.logMessage('error', `JavaScript Error: ${event.message}`);
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    if (window.dashboard) {
        window.dashboard.logMessage('error', `Unhandled Promise Rejection: ${event.reason}`);
    }
});