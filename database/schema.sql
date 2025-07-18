CREATE DATABASE ecommerce_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecommerce_db;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('customer', 'seller', 'admin') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    category_id INT,
    seller_id INT NOT NULL,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- Cart table
CREATE TABLE cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Orders table
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'cash_on_delivery',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items table
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert default user
-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password, full_name, role) VALUES
('admin', 'admin@gmail.com', 'admin123', 'Administrator', 'admin');

-- Insert sample customer users (password: user123)
INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES
('vanh', 'vanh@gmail.com', 'user123', 'Nguyễn Văn Anh', '0912345678', 'Thanh Xuân, Hà Nội', 'customer'),
('hhoang', 'hhoang@gmail.com', 'user123', 'Nguyễn Huy Hoàng', '0987654321', 'Cầu Giấy, Hà Nội', 'customer'),
('ttruc', 'ttruc@gmail.com', 'user123', 'Đinh Thanh Trúc', '0901122334', 'Hoàng Mai, Hà Nội', 'customer'),
('dmanh', 'dmanh@gmail.com', 'user123', 'Vũ Duy Mạnh', '0933221144', 'Gia Lâm, Hà Nội', 'customer');

-- Insert sample seller users (password: seller123)
INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES
('fashion_hub', 'fashion_hub@ecommerce.com', 'seller123', 'Fashion Hub Store', '0378899001', 'TP. Thanh Hóa', 'seller'),
('trend_boutique', 'seller2@ecommerce.com', 'seller123', 'Trend Boutique', '0312345678', 'TP. Hồ Chí Minh', 'seller');

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Áo Nam', 'Các loại áo dành cho nam'),
('Áo Nữ', 'Các loại áo dành cho nữ'),
('Quần Nam', 'Các loại quần dành cho nam'),
('Quần Nữ', 'Các loại quần dành cho nữ'),
('Phụ Kiện', 'Các phụ kiện thời trang');

-- Insert default products
-- Products from Fashion Hub (seller_id: 1)
INSERT INTO products (name, description, price, stock_quantity, category_id, seller_id, image_url) VALUES
('Áo Thun Nam Classic', 'POLO Lacoste Nam Monogram Classic Fit DH1417', 3050000, 1000, 1, 1, 'https://down-vn.img.susercontent.com/file/vn-11134207-7ra0g-m9leivm3riwe1e.webp'),
('Áo Sơ Mi Nữ Công Sở', 'Paper Pleated Shirt In White/Ivory With MIRIN', 1600000, 1000, 2, 1, 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-llk7mollwsso90.webp'),
('Quần Jean Nam Slim Fit', 'Quần Jean nam Slim Fit Jeans - Blue', 1750000, 1000, 3, 1, 'https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-m3ey2fr4oybgb9.webp'),
('Áo Khoác Nam Bomber', 'Áo Khoác Áo Da Nam Cao Cấp BUTUNI Brando L.Bomber, Áo Da Cừu Lót Vải Lụa Chính Hãng Bảo Hành 5 Năm', 15000000, 100, 1, 1, 'https://down-vn.img.susercontent.com/file/vn-11134201-7ra0g-ma2k1ppiupny99.webp');

-- Products from Trend Boutique (seller_id: 2)
INSERT INTO products (name, description, price, stock_quantity, category_id, seller_id, image_url) VALUES
('Đầm Maxi Nữ Đi Biển', 'Đầm ren dệt Louise Lace Dress HUONG BOUTIQUE HBV1295', 2000000, 60, 2, 2,'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lxw32dkt0wkb49.webp'),
('Quần Short Nữ Lưng Cao', 'Quần short nữ RUZA lưng cao form đẹp kiểu dáng công sở QHF073 QHF074', 500000, 90, 4, 2, 'https://down-vn.img.susercontent.com/file/vn-11134207-7ra0g-maknw2k8nxdt28.webp'),
('Mũ Lưỡi Trai Phong Cách', 'Mũ kết lưỡi trai nam nữ NÓN SƠN chính hãng MC024F-KM2', 1200000, 120, 5, 2, 'https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-mb66z15czqgx8e.webp'),
('Quần Tây Nữ Ống Rộng', 'Alisa.Sonya Quần Ống Rộng Nữ Hè Viền Ren Xinh Phối Màu Độc Đáo Chất Vải Mềm Mát 24AS1271', 1000000, 65, 4, 2, 'https://down-vn.img.susercontent.com/file/cn-11134207-7ras8-m958aq9qukgt1c.webp');

-- Items in vanh cart (user_id: 1)
INSERT INTO cart (user_id, product_id, quantity) VALUES
(1, 9, 2),
(1, 11, 3);

-- Items in hhoang cart (user_id: 2)
INSERT INTO cart (user_id, product_id, quantity) VALUES
(2, 9, 2),
(2, 12, 1),
(2, 15, 1);

-- Items in ttruc cart (user_id: 3)
INSERT INTO cart (user_id, product_id, quantity) VALUES
(3, 10, 1),
(3, 13, 1);

-- Items in dmanh cart (user_id: 4)
INSERT INTO cart (user_id, product_id, quantity) VALUES
(4, 15, 2);

-- Order 1 for vanh (user_id: 1)
INSERT INTO orders (order_number, user_id, total_amount, shipping_address, phone, status, payment_status) VALUES
('ORDER-001', 1, 430000, 'Thanh Xuân, Hà Nội', '0912345678', 'delivered', 'paid');

-- Order 2 for hhoang (user_id: 2)
INSERT INTO orders (order_number, user_id, total_amount, shipping_address, phone, status, payment_status) VALUES
('ORDER-002', 2, 855000, 'Cầu Giấy, Hà Nội', '0987654321', 'processing', 'pending');

-- Order 3 for ttruc (user_id: 3)
INSERT INTO orders (order_number, user_id, total_amount, shipping_address, phone, status, payment_status, payment_method) VALUES
('ORDER-003', 3, 550000, 'Hoàng Mai, Hà Nội', '0901122334', 'shipped', 'paid', 'credit_card');

-- Items for Order 1 (order_id: 1)
INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES
(1, 9, 1, 3050000, 3050000),
(1, 15, 1, 15000000, 15000000);

-- Items for Order 2 (order_id: 2)
INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES
(2, 9, 2, 2000000, 4000000),
(2, 15, 1, 1600000, 1600000),
(2, 12, 1, 1750000, 1750000);

-- Items for Order 3 (order_id: 3)
INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES
(3, 16, 1, 500000, 500000);



