const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const { verifyToken } = require('../middleware/auth');

router.post('/invest', verifyToken, investmentController.createInvestment);
router.get('/', verifyToken, investmentController.getInvestments);

module.exports = router;
