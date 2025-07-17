import { Router } from 'express';
const router = Router();
import authController from '../controllers/authController.js';
import validationUtils from '../utils/validation.js';
const { register, login } = authController;
const { validateRegister, validateLogin, handleValidationErrors } = validationUtils;

// POST /api/auth/register
router.post('/register', validateRegister, handleValidationErrors, register);

// POST /api/auth/login
router.post('/login', validateLogin, handleValidationErrors, login);

export default router;