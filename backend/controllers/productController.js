import { execute } from '../config/database.js';

// GET all products
export async function getAllProducts(req, res) {
  try {
    const [rows] = await execute('SELECT * FROM products');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
}

// GET product by ID
export async function getProductById(req, res) {
  try {
    const [rows] = await execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
}

// CREATE new product
export async function createProduct(req, res) {
  try {
    const { name, description, price, category, stock, image_url } = req.body;
    
    const [result] = await execute(
      'INSERT INTO products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, price, category, stock, image_url]
    );
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
}

// UPDATE product
export async function updateProduct(req, res) {
  try {
    const { name, description, price, category, stock, image_url } = req.body;
    const productId = req.params.id;
    
    const [result] = await execute(
      'UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?',
      [name, description, price, category, stock, image_url, productId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
}

// DELETE product
export async function deleteProduct(req, res) {
  try {
    const [result] = await execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
}