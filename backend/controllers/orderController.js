import { execute, withTransaction } from '../config/database.js';

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    shippingPhone,
    paymentMethod,
    totalAmount,
    notes
  } = req.body;

  // Kiểm tra authentication
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const userId = req.user.id;

  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ message: 'No order items provided' });
  }
  
  if (!shippingAddress || !shippingAddress.address || !shippingPhone || !totalAmount) {
    return res.status(400).json({ message: 'Missing required shipping or total amount information' });
  }

  try {
    // Sử dụng withTransaction từ database.js
    const orderId = await withTransaction(async (connection) => {
      // Tạo số đơn hàng duy nhất
      const orderNumber = generateOrderNumber();

      // 1. Tạo đơn hàng chính
      const orderQuery = `
        INSERT INTO orders 
        (order_number, user_id, total_amount, shipping_address, phone, status, payment_method, payment_status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const orderParams = [
        orderNumber,
        userId,
        totalAmount,
        JSON.stringify(shippingAddress),
        shippingPhone,
        'pending',
        paymentMethod,
        'pending',
        notes || null,
      ];
      
      const orderResult = await execute(orderQuery, orderParams, connection);
      const newOrderId = orderResult.rows.insertId;

      // 2. Thêm các sản phẩm vào order_items
      for (const item of orderItems) {
        const itemQuery = `
          INSERT INTO order_items 
          (order_id, product_id, quantity, price, total) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const itemTotal = item.qty * item.price;
        const itemParams = [newOrderId, item.productId, item.qty, item.price, itemTotal];
        await execute(itemQuery, itemParams, connection);
      }

      return newOrderId;
    });

    // Lấy thông tin đơn hàng đầy đủ sau khi tạo thành công
    const { rows: createdOrderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    const { rows: createdOrderItemsRows } = await execute(
      'SELECT oi.*, p.name as product_name, p.image_url as product_image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', 
      [orderId]
    );

    res.status(201).json({ ...createdOrderRows[0], orderItems: createdOrderItemsRows });

  } catch (error) {
    console.error('Error adding order items:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error creating order', error: error.message });
    }
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  const orderId = req.params.id;

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const { rows: orderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];

    // Kiểm tra quyền truy cập
    if (order.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    // Lấy các sản phẩm trong đơn hàng
    const { rows: orderItemsWithDetails } = await execute(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image, p.description as product_description
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Parse shipping_address
    if (order.shipping_address) {
      try {
        order.shipping_address = JSON.parse(order.shipping_address);
      } catch (e) {
        console.warn('Could not parse shipping_address as JSON:', order.shipping_address);
      }
    }

    res.json({ ...order, orderItems: orderItemsWithDetails });

  } catch (error) {
    console.error('Error getting order by ID:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error retrieving order', error: error.message });
    }
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (req, res) => {
  const orderId = req.params.id;

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const userId = req.user.id;
  const { paymentId, payerEmail } = req.body;

  try {
    const { rows: orderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];

    if (order.user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ message: 'Order already paid' });
    }

    const updateQuery = `
      UPDATE orders
      SET payment_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP, payment_details = ?
      WHERE id = ?
    `;
    const updateParams = [
      'paid',
      'processing',
      JSON.stringify({ paymentId, payerEmail, paidAt: new Date().toISOString() }),
      orderId,
    ];

    await execute(updateQuery, updateParams);

    const { rows: updatedOrderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json(updatedOrderRows[0]);

  } catch (error) {
    console.error('Error updating order to paid:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error updating order to paid', error: error.message });
    }
  }
};

// @desc    Update order to delivered (Admin only)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req, res) => {
  const orderId = req.params.id;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }

  try {
    const { rows: orderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Order already delivered' });
    }

    if (order.payment_status !== 'paid' && order.payment_method !== 'cash_on_delivery') {
      return res.status(400).json({ message: 'Order must be paid or cash on delivery before setting to delivered' });
    }

    const updateQuery = `
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const updateParams = ['delivered', orderId];

    await execute(updateQuery, updateParams);

    const { rows: updatedOrderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json(updatedOrderRows[0]);

  } catch (error) {
    console.error('Error updating order to delivered:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error updating order to delivered', error: error.message });
    }
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }

  try {
    const { rows } = await execute(`
      SELECT o.*, u.username as user_username, u.email as user_email, u.full_name as user_full_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    
    const ordersWithParsedAddress = rows.map(order => {
      if (order.shipping_address) {
        try {
          order.shipping_address = JSON.parse(order.shipping_address);
        } catch (e) {
          console.warn('Could not parse shipping_address for order:', order.id);
        }
      }
      return order;
    });

    res.json(ordersWithParsedAddress);
  } catch (error) {
    console.error('Error getting all orders:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error retrieving all orders', error: error.message });
    }
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const userId = req.user.id;

  try {
    const { rows: orders } = await execute(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);

    const ordersWithParsedAddress = orders.map(order => {
      if (order.shipping_address) {
        try {
          order.shipping_address = JSON.parse(order.shipping_address);
        } catch (e) {
          console.warn('Could not parse shipping_address for order:', order.id);
        }
      }
      return order;
    });

    res.json(ordersWithParsedAddress);
  } catch (error) {
    console.error('Error getting my orders:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error retrieving your orders', error: error.message });
    }
  }
};