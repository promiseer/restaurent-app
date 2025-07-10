const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const { 
  authenticateToken, 
  requirePaymentAccess 
} = require('../middleware/auth');

const router = express.Router();

// Get user's payment methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('paymentMethods');
    res.json({ paymentMethods: user.paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods', error: error.message });
  }
});

// Add payment method to current user (Admin only)
router.post('/methods', authenticateToken, requirePaymentAccess, async (req, res) => {
  try {
    const { type, details, isDefault } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // If this is set as default, remove default from others
    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    user.paymentMethods.push({
      type,
      details,
      isDefault
    });

    await user.save();

    res.json({
      message: 'Payment method added successfully',
      paymentMethods: user.paymentMethods
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ message: 'Failed to add payment method', error: error.message });
  }
});

// Update payment method (Admin only)
router.put('/methods/:methodId', authenticateToken, requirePaymentAccess, async (req, res) => {
  try {
    const { type, details, isDefault } = req.body;
    
    const user = await User.findById(req.user._id);
    const paymentMethod = user.paymentMethods.id(req.params.methodId);
    
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // If this is set as default, remove default from others
    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    paymentMethod.type = type;
    paymentMethod.details = details;
    paymentMethod.isDefault = isDefault;

    await user.save();

    res.json({
      message: 'Payment method updated successfully',
      paymentMethods: user.paymentMethods
    });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ message: 'Failed to update payment method', error: error.message });
  }
});

// Delete payment method (Admin only)
router.delete('/methods/:methodId', authenticateToken, requirePaymentAccess, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const paymentMethod = user.paymentMethods.id(req.params.methodId);
    
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    paymentMethod.remove();
    await user.save();

    res.json({
      message: 'Payment method deleted successfully',
      paymentMethods: user.paymentMethods
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Failed to delete payment method', error: error.message });
  }
});

// Process payment (simulation)
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { orderId, paymentMethodId, amount } = req.body;
    
    // Verify order exists and belongs to user or user has access
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check access permissions
    if (req.user.role === 'member' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You can only pay for your own orders.' });
    }

    if (req.user.role === 'manager' && order.deliveryAddress.country !== req.user.country) {
      return res.status(403).json({ 
        message: 'Access denied. You can only process payments for orders from your assigned country.' 
      });
    }

    // Verify payment method belongs to user (if not admin)
    if (req.user.role !== 'admin') {
      const user = await User.findById(req.user._id);
      const paymentMethod = user.paymentMethods.id(paymentMethodId);
      
      if (!paymentMethod) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
    }

    // Simulate payment processing
    const isPaymentSuccessful = Math.random() > 0.1; // 90% success rate

    if (isPaymentSuccessful) {
      order.paymentStatus = 'paid';
      order.status = order.status === 'pending' ? 'confirmed' : order.status;
      await order.save();

      res.json({
        success: true,
        message: 'Payment processed successfully',
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order
      });
    } else {
      order.paymentStatus = 'failed';
      await order.save();

      res.status(400).json({
        success: false,
        message: 'Payment processing failed. Please try again.',
        order
      });
    }
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ message: 'Payment processing failed', error: error.message });
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'admin') {
      // Admin can see all payments
      if (req.query.country) {
        query['deliveryAddress.country'] = req.query.country;
      }
    } else if (req.user.role === 'manager') {
      // Manager can see payments from their country
      query['deliveryAddress.country'] = req.user.country;
    } else {
      // Members can only see their own payments
      query.user = req.user._id;
    }

    const payments = await Order.find({
      ...query,
      paymentStatus: { $in: ['paid', 'failed', 'refunded'] }
    })
    .select('finalAmount paymentStatus paymentMethod createdAt restaurant user')
    .populate('restaurant', 'name')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

    res.json({ payments });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Failed to fetch payment history', error: error.message });
  }
});

// Refund payment (Admin only)
router.post('/:orderId/refund', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can process refunds.' });
    }

    const { reason } = req.body;
    
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order payment is not in paid status' });
    }

    // Process refund (simulation)
    order.paymentStatus = 'refunded';
    order.status = 'cancelled';
    order.cancellationReason = reason || 'Refund processed by admin';
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();

    await order.save();

    res.json({
      message: 'Refund processed successfully',
      refundId: `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Refund processing failed', error: error.message });
  }
});

module.exports = router;
