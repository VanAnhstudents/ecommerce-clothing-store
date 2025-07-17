// backend/controllers/ordersController.js
import { execute } from '../config/database.js';

// Hàm helper để tạo số đơn hàng duy nhất
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000; // Số ngẫu nhiên 4 chữ số
  return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Chỉ người dùng đã đăng nhập mới tạo được đơn hàng)
export const addOrderItems = async (req, res) => {
  const {
    orderItems,          // Mảng các sản phẩm trong đơn hàng
    shippingAddress,     // Là một object { address, city, postalCode, country }
    shippingPhone,       // Số điện thoại vận chuyển
    paymentMethod,       // Phương thức thanh toán (e.g., 'cash_on_delivery', 'paypal')
    itemsPrice,          // Tổng giá trị sản phẩm
    shippingPrice,       // Phí vận chuyển
    totalAmount,         // Tổng số tiền đơn hàng (bao gồm itemsPrice + shippingPrice)
    notes                // Ghi chú cho đơn hàng
  } = req.body;

  // Lấy ID người dùng từ req.user (do middleware xác thực thêm vào)
  // Đảm bảo bạn có middleware xác thực để gán req.user
  const userId = req.user.id; 

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items provided');
  }
  
  if (!shippingAddress || !shippingAddress.address || !shippingPhone || !totalAmount) {
      res.status(400);
      throw new Error('Missing required shipping or total amount information');
  }

  let connection; // Biến để giữ kết nối cho transaction
  try {
    // MySQL 8.0 trở lên hỗ trợ START TRANSACTION/COMMIT/ROLLBACK trực tiếp
    // Với mysql2/promise, chúng ta cần quản lý transaction thông qua một kết nối cụ thể.
    connection = await execute('GET_CONNECTION_FOR_TRANSACTION'); // Đây là giả định
    // Thực tế, bạn cần một cách để lấy một connection từ pool và giữ nó:
    const conn = await pool.getConnection(); // Giả sử pool được export từ database.js
    await conn.beginTransaction(); // Bắt đầu transaction

    // Tạo số đơn hàng duy nhất
    const orderNumber = generateOrderNumber();

    // 1. Tạo đơn hàng chính (orders table)
    const orderQuery = `
      INSERT INTO orders 
      (order_number, user_id, total_amount, shipping_address, phone, status, payment_method, payment_status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const orderParams = [
      orderNumber,
      userId,
      totalAmount,
      JSON.stringify(shippingAddress), // Lưu địa chỉ dưới dạng JSON string
      shippingPhone,
      'pending', // Trạng thái mặc định khi tạo
      paymentMethod,
      'pending', // Trạng thái thanh toán mặc định
      notes || null,
    ];
    
    // Sử dụng connection.execute cho transaction
    const [orderResult] = await conn.execute(orderQuery, orderParams); 
    const orderId = orderResult.insertId; // Lấy ID của đơn hàng vừa tạo

    // 2. Thêm các sản phẩm vào order_items table
    const orderItemPromises = orderItems.map(async (item) => {
      const itemQuery = `
        INSERT INTO order_items 
        (order_id, product_id, quantity, price, total) 
        VALUES (?, ?, ?, ?, ?)
      `;
      // Đảm bảo item.price là giá của sản phẩm tại thời điểm đặt hàng
      // item.total = item.qty * item.price
      const itemTotal = item.qty * item.price;
      const itemParams = [orderId, item.productId, item.qty, item.price, itemTotal];
      await conn.execute(itemQuery, itemParams);
    });

    await Promise.all(orderItemPromises); // Chờ tất cả các item được thêm

    // Hoàn thành transaction
    await conn.commit();

    // Lấy thông tin đơn hàng đầy đủ để trả về sau khi commit
    const { rows: createdOrderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    const { rows: createdOrderItemsRows } = await execute('SELECT oi.*, p.name as product_name, p.image_url as product_image ' + 
                                                          'FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [orderId]);

    res.status(201).json({ ...createdOrderRows[0], orderItems: createdOrderItemsRows });

  } catch (error) {
    if (connection) { // Nếu transaction đã bắt đầu
      await connection.rollback(); // Rollback nếu có lỗi
    }
    console.error('Error adding order items:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  } finally {
      if (connection) {
          connection.release(); // Luôn giải phóng kết nối
      }
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (Chỉ người dùng sở hữu đơn hàng hoặc admin)
export const getOrderById = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id; // Giả sử từ middleware xác thực
  const userRole = req.user.role; // Lấy role của người dùng

  try {
    // Lấy thông tin đơn hàng chính
    const { rows: orderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderRows.length === 0) {
      res.status(404);
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    // Kiểm tra quyền truy cập: chỉ người dùng sở hữu đơn hàng hoặc admin mới được xem
    if (order.user_id !== userId && userRole !== 'admin') { 
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    // Lấy các sản phẩm trong đơn hàng và thông tin chi tiết từ bảng `products`
    const { rows: orderItemsWithDetails } = await execute(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image, p.description as product_description
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Parse shipping_address nếu nó được lưu dưới dạng JSON string
    if (order.shipping_address) {
        try {
            order.shipping_address = JSON.parse(order.shipping_address);
        } catch (e) {
            console.warn('Could not parse shipping_address as JSON:', order.shipping_address);
            // Có thể giữ nguyên dạng string nếu parse lỗi
        }
    }

    res.json({ ...order, orderItems: orderItemsWithDetails });

  } catch (error) {
    console.error('Error getting order by ID:', error);
    // Xử lý lỗi chung hoặc cụ thể
    if (res.statusCode === 200) { 
      res.status(500).json({ message: 'Error retrieving order', error: error.message });
    } else {
      res.json({ message: error.message }); 
    }
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private (Chỉ người dùng sở hữu đơn hàng)
export const updateOrderToPaid = async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id; 
  // Thông tin thanh toán từ gateway (ví dụ PayPal, Stripe). 
  // Lưu ý: trong thực tế, bạn sẽ nhận được một đối tượng phức tạp hơn.
  // Ở đây tôi dùng một ví dụ đơn giản.
  const { paymentId, payerEmail } = req.body; 

  try {
    const { rows: orderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderRows.length === 0) {
      res.status(404);
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    // Kiểm tra quyền truy cập và trạng thái
    if (order.user_id !== userId) {
      res.status(403);
      throw new Error('Not authorized to update this order');
    }
    if (order.payment_status === 'paid') {
        res.status(400);
        throw new Error('Order already paid');
    }

    // Cập nhật trạng thái đơn hàng và thông tin thanh toán
    const updateQuery = `
      UPDATE orders
      SET payment_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP, payment_details = ?
      WHERE id = ?
    `;
    const updateParams = [
      'paid', 
      'processing', // Cập nhật trạng thái đơn hàng sang 'processing' sau khi thanh toán
      JSON.stringify({ paymentId, payerEmail, paidAt: new Date().toISOString() }), // Lưu chi tiết thanh toán
      orderId,
    ];

    await execute(updateQuery, updateParams);

    const { rows: updatedOrderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.json(updatedOrderRows[0]);

  } catch (error) {
    console.error('Error updating order to paid:', error);
    if (res.statusCode === 200) {
      res.status(500).json({ message: 'Error updating order to paid', error: error.message });
    } else {
      res.json({ message: error.message });
    }
  }
};

// @desc    Update order to delivered (Admin only)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req, res) => {
  const orderId = req.params.id;

  // Kiểm tra quyền admin
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  try {
    const { rows: orderRows } = await execute('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (orderRows.length === 0) {
      res.status(404);
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    if (order.status === 'delivered') {
      res.status(400);
      throw new Error('Order already delivered');
    }
    // Đảm bảo đơn hàng đã được thanh toán hoặc là COD trước khi giao
    if (order.payment_status !== 'paid' && order.payment_method !== 'cash_on_delivery') {
        res.status(400);
        throw new Error('Order must be paid or cash on delivery before setting to delivered');
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
    if (res.statusCode === 200) {
      res.status(500).json({ message: 'Error updating order to delivered', error: error.message });
    } else {
      res.json({ message: error.message });
    }
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  // Kiểm tra quyền admin
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }

  try {
    // Lấy tất cả đơn hàng, kèm theo thông tin người dùng
    const { rows } = await execute(`
      SELECT o.*, u.username as user_username, u.email as user_email, u.full_name as user_full_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    
    // Parse shipping_address cho mỗi đơn hàng
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
    res.status(500).json({ message: 'Error retrieving all orders', error: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res) => {
    const userId = req.user.id;

    try {
        const { rows: orders } = await execute(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [userId]);

        // Parse shipping_address cho mỗi đơn hàng
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
        res.status(500).json({ message: 'Error retrieving your orders', error: error.message });
    }
};