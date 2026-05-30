const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.use(verifyToken, isAdmin);

router.get('/users', adminController.getUsers);
router.get('/analytics', adminController.getAnalytics);

// Transactions
router.get('/transactions/pending', adminController.getPendingTransactions);
router.get('/transactions/all', adminController.getAllTransactions);
router.post('/approve', adminController.approveTransaction);

// KYC
router.get('/kyc/pending', adminController.getPendingKyc);
router.post('/kyc/approve', adminController.approveKyc);

// User management
router.post('/users/balance', adminController.updateUserBalance);

module.exports = router;
