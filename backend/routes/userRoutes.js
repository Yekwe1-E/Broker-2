const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

router.get('/dashboard', verifyToken, userController.getDashboardData);
router.post('/kyc', verifyToken, userController.submitKyc);

module.exports = router;
