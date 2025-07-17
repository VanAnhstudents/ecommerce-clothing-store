import { Router } from 'express';
const router = Router();
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';

router.get('/', getAllProducts);

router.get('/:id', getProductById);

// POST new product (admin only)
router.post('/', createProduct);

// PUT update product
router.put('/:id', updateProduct);

// DELETE product
router.delete('/:id', deleteProduct);

export default router;