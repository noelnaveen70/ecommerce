const express = require('express');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();
const disputeController = require('../controllers/disputeController');

// Disputes Routes
router.post('/create', verifyToken, disputeController.createDispute);
router.get('/all', verifyToken, disputeController.getAllDisputes);
router.get('/my-disputes', verifyToken, disputeController.getUserDisputes);
router.get('/:id', verifyToken, disputeController.getDispute);
router.post('/:id/message', verifyToken, disputeController.addMessage);
router.put('/:id/status', verifyToken, disputeController.updateDisputeStatus);
router.put('/:id/resolve', verifyToken, disputeController.resolveDispute);

// Reports Routes
router.get('/reports/all', verifyToken, disputeController.getAllReports);
router.get('/reports/my-reports', verifyToken, disputeController.getUserReports);
router.get('/reports/:id', verifyToken, disputeController.getReport);
router.post('/reports/:id/feedback', verifyToken, disputeController.addReportFeedback);

module.exports = router; 