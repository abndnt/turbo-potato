const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');

// Automation control routes
router.post('/start', automationController.startAutomation);
router.post('/pause', automationController.pauseAutomation);
router.post('/resume', automationController.resumeAutomation);
router.post('/stop', automationController.stopAutomation);
router.get('/status', automationController.getAutomationStatus);
router.post('/process-sheet', automationController.processSheet);

module.exports = router;