const express = require('express');
const router = express.Router();
const { register, login, test, resetPassword } = require('../controllers/authController');

router.get('/test', test);
router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);


module.exports = router;
