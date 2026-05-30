const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/auth');

router.post('/deposit', verifyToken, transactionController.deposit);
router.post('/withdraw', verifyToken, transactionController.withdraw);

module.exports = router;
