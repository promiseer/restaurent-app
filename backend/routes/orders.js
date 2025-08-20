const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { 
  authenticateToken, 
  requireOrderAccess, 
  requireCancelAccess 
} = require('../middleware/auth');

const router = express.Router();

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'admin') {
      // Admin can see all orders
      if (req.query.country) {
        query['deliveryAddress.country'] = req.query.country;
      }
    } else if (req.user.role === 'manager') {
      // Manager can see orders from their country
      query['deliveryAddress.country'] = req.user.country;
    } else {
      // Members can only see their own orders
      query.user = req.user._id;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('restaurant', 'name address')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('restaurant', 'name address phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access permissions
    if (req.user.role === 'member' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only view your own orders.' });
    }

    if (req.user.role === 'manager' && order.deliveryAddress.country !== req.user.country) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view orders from your assigned country.' 
      });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

// Create order (Admin and Manager only)
router.post('/', authenticateToken, requireOrderAccess, async (req, res) => {
  try {
    const { restaurantId, items, deliveryAddress, customerPhone, paymentMethod } = req.body;

    // Verify restaurant exists and get pricing
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    // Check country access for non-admin users
    // Allow collaborative cart orders to bypass country restrictions
    const isCollaborativeCartOrder = req.body.cartType === 'collaborative';
    
    console.log("restaurant",restaurant.address.country, req.user.country)
    console.log("isCollaborativeCartOrder", isCollaborativeCartOrder)
    
    if (req.user.role !== 'admin' && !isCollaborativeCartOrder && restaurant.address.country !== req.user.country) {
      return res.status(403).json({ 
        message: 'Access denied. You can only order from restaurants in your assigned country.' 
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = restaurant.menu.id(item.menuItemId);
      console.log("menuItem", menuItem);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ 
          message: `Menu item ${item.name || 'unknown'} is not available` 
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Calculate fees and tax
    const deliveryFee = restaurant.deliveryFee || 0;
    const tax = totalAmount * 0.18; // 18% GST

    // Check minimum order requirement
    if (totalAmount < restaurant.minimumOrder) {
      return res.status(400).json({ 
        message: `Minimum order amount is ${restaurant.minimumOrder}` 
      });
    }

    // Create order
    const order = new Order({
      user: req.user._id,
      restaurant: restaurantId,
      items: orderItems,
      totalAmount,
      deliveryFee,
      tax,
      deliveryAddress,
      customerPhone,
      paymentMethod,
      cartType: req.body.cartType || 'regular',
      collaborativeCartId: req.body.collaborativeCartId || undefined,
      notes: req.body.notes || '',
      estimatedDeliveryTime: new Date(Date.now() + (restaurant.preparationTime || 30) * 60000)
    });

    await order.save();

    // Populate order for response
    await order.populate('restaurant', 'name address phone');

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

// Update order status (Admin and Manager only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name address')
      .populate('user', 'name email');
      
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access permissions
    if (req.user.role === 'member') {
      return res.status(403).json({ message: 'Access denied. Members cannot update order status.' });
    }

    // For managers, check country access (allow collaborative cart orders)
    if (req.user.role === 'manager') {
      if (order.deliveryAddress.country !== req.user.country && order.cartType !== 'collaborative') {
        return res.status(403).json({ 
          message: 'Access denied. You can only update orders from your assigned country.' 
        });
      }
    }

    // Validate status transition
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    // Define valid status transitions
    const statusFlow = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['delivered', 'cancelled'],
      'delivered': [], // Final status
      'cancelled': [] // Final status
    };

    if (statusFlow[order.status] && !statusFlow[order.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${order.status} to ${status}` 
      });
    }

    // Update order
    order.status = status;
    
    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
      order.paymentStatus = 'paid';
    }

    // Add status change note
    if (notes) {
      const timestamp = new Date().toISOString();
      const statusNote = `[${timestamp}] Status changed to ${status} by ${req.user.name}: ${notes}`;
      order.notes = order.notes ? `${order.notes}\n${statusNote}` : statusNote;
    } else {
      const timestamp = new Date().toISOString();
      const statusNote = `[${timestamp}] Status changed to ${status} by ${req.user.name}`;
      order.notes = order.notes ? `${order.notes}\n${statusNote}` : statusNote;
    }

    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
});

// Cancel order (Admin and Manager only)
router.put('/:id/cancel', authenticateToken, requireCancelAccess, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access permissions
    if (req.user.role === 'manager' && order.deliveryAddress.country !== req.user.country) {
      return res.status(403).json({ 
        message: 'Access denied. You can only cancel orders from your assigned country.' 
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled in current status' });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();
    
    // Update payment status
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }

    await order.save();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Failed to cancel order', error: error.message });
  }
});

// Update payment status (Admin only)
router.put('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can update payment status.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({
      message: 'Payment status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Failed to update payment status', error: error.message });
  }
});

// Get order statistics (Admin and Manager only)
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'member') {
      return res.status(403).json({ message: 'Access denied. Members cannot view order statistics.' });
    }

    let matchQuery = {};
    
    if (req.user.role === 'manager') {
      matchQuery['deliveryAddress.country'] = req.user.country;
    } else if (req.query.country) {
      matchQuery['deliveryAddress.country'] = req.query.country;
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$finalAmount' },
          averageOrderValue: { $avg: '$finalAmount' },
          pendingOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } 
          },
          completedOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } 
          },
          cancelledOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } 
          }
        }
      }
    ]);

    res.json({ 
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ message: 'Failed to fetch order statistics', error: error.message });
  }
});

// Get orders for management (Admin and Manager only)
router.get('/manage', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'member') {
      return res.status(403).json({ message: 'Access denied. Members cannot manage orders.' });
    }

    const { status, restaurant, date, page = 1, limit = 20 } = req.query;
    
    // Build filter query
    let filterQuery = {};
    
    // For managers, filter by country (allow collaborative carts)
    if (req.user.role === 'manager') {
      filterQuery.$or = [
        { 'deliveryAddress.country': req.user.country },
        { cartType: 'collaborative' }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      filterQuery.status = status;
    }

    // Add restaurant filter
    if (restaurant && restaurant !== 'all') {
      filterQuery.restaurant = restaurant;
    }

    // Add date filter
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filterQuery.createdAt = { $gte: startDate, $lt: endDate };
    }

    // Get orders with pagination
    const orders = await Order.find(filterQuery)
      .populate('restaurant', 'name address')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching orders for management:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

module.exports = router;
