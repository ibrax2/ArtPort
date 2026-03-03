import express from 'express';
import { getUsers, registerUser, getUserProfile } from '../controllers/userController.js';

const router = express.Router();

router.route('/')
    .get(getUsers);

router.post('/register', registerUser);

router.route('/:id')
    .get(getUserProfile);

export default router;
