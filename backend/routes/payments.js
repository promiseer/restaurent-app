const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const PaymentMethod = require('../models/PaymentMethod');
const { 
  authenticateToken, 
  requirePaymentAccess,
  requireAdmin 
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
      // Manager can see:
      // 1. Payments from their country (regular orders)
      // 2. Collaborative cart orders they have access to
      const CollaborativeCart = require('../models/CollaborativeCart');
      
      // Get all collaborative carts where this manager has access
      const accessibleCarts = await CollaborativeCart.find({
        $or: [
          { creator: req.user._id },
          { manager: req.user._id },
          { 'members.user': req.user._id }
        ]
      }).select('_id name');
      
      const cartNames = accessibleCarts.map(cart => cart.name);
      
      query = {
        $or: [
          // Regular orders from their country
          { 'deliveryAddress.country': req.user.country },
          // Collaborative cart orders they have access to
          { 
            notes: { 
              $regex: new RegExp(`^Collaborative cart order - Cart: (${cartNames.join('|')})`, 'i') 
            } 
          }
        ]
      };
    } else {
      // Members can only see their own payments
      query.user = req.user._id;
    }

    const payments = await Order.find({
      ...query,
      paymentStatus: { $in: ['paid', 'failed', 'refunded'] }
    })
    .select('finalAmount paymentStatus paymentMethod createdAt restaurant user notes')
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

// ==================== ADMIN GLOBAL PAYMENT METHODS ====================

// Get global payment methods by country (for checkout)
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const { country } = req.query;
    const userCountry = country || req.user.country;
    
    // Only managers and admins can access global payment methods
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only managers and admins can access global payment methods.' });
    }
    
    const paymentMethods = await PaymentMethod.find({
      $or: [
        { country: userCountry },
        { country: 'Global' }
      ],
      isActive: true
    }).populate('createdBy', 'name email').sort({ isDefault: -1, createdAt: -1 });

    res.json({ paymentMethods });
  } catch (error) {
    console.error('Get global payment methods error:', error);
    res.status(500).json({ message: 'Failed to fetch global payment methods', error: error.message });
  }
});

// Admin: Create global payment method
router.post('/global', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const paymentMethod = new PaymentMethod({
      ...req.body,
      createdBy: req.user._id
    });

    await paymentMethod.save();
    await paymentMethod.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Global payment method created successfully',
      paymentMethod
    });
  } catch (error) {
    console.error('Create global payment method error:', error);
    res.status(500).json({ message: 'Failed to create global payment method', error: error.message });
  }
});

// Admin: Delete global payment method
router.delete('/global/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findByIdAndDelete(req.params.id);
    
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    res.json({
      success: true,
      message: 'Global payment method deleted successfully'
    });
  } catch (error) {
    console.error('Delete global payment method error:', error);
    res.status(500).json({ message: 'Failed to delete global payment method', error: error.message });
  }
});

// Get global payment methods (for managers based on country)
router.get('/global-methods', authenticateToken, async (req, res) => {
  try {
    const userCountry = req.user.country;
    
    const paymentMethods = await PaymentMethod.find({
      $or: [
        { country: userCountry },
        { country: 'Global' }
      ],
      isActive: true
    }).populate('createdBy', 'name email').sort({ isDefault: -1, createdAt: -1 });

    res.json({ paymentMethods });
  } catch (error) {
    console.error('Get global payment methods error:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods', error: error.message });
  }
});

// Get all global payment methods (Admin only)
router.get('/admin/global-methods', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { country } = req.query;
    let query = {};
    
    if (country && country !== 'all') {
      query.country = country;
    }

    const paymentMethods = await PaymentMethod.find(query)
      .populate('createdBy', 'name email')
      .sort({ country: 1, isDefault: -1, createdAt: -1 });

    res.json({ paymentMethods });
  } catch (error) {
    console.error('Get admin payment methods error:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods', error: error.message });
  }
});

// Add global payment method (Admin only)
router.post('/admin/global-methods', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, country, details, isDefault, isActive = true } = req.body;

    const paymentMethod = new PaymentMethod({
      name,
      type,
      country,
      details,
      isDefault,
      isActive,
      createdBy: req.user._id
    });

    await paymentMethod.save();
    await paymentMethod.populate('createdBy', 'name email');

    res.json({
      message: 'Global payment method added successfully',
      paymentMethod
    });
  } catch (error) {
    console.error('Add global payment method error:', error);
    res.status(500).json({ message: 'Failed to add payment method', error: error.message });
  }
});

// Update global payment method (Admin only)
router.put('/admin/global-methods/:methodId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, country, details, isDefault, isActive } = req.body;
    
    const paymentMethod = await PaymentMethod.findById(req.params.methodId);
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // Update fields
    if (name !== undefined) paymentMethod.name = name;
    if (type !== undefined) paymentMethod.type = type;
    if (country !== undefined) paymentMethod.country = country;
    if (details !== undefined) paymentMethod.details = details;
    if (isDefault !== undefined) paymentMethod.isDefault = isDefault;
    if (isActive !== undefined) paymentMethod.isActive = isActive;

    await paymentMethod.save();
    await paymentMethod.populate('createdBy', 'name email');

    res.json({
      message: 'Global payment method updated successfully',
      paymentMethod
    });
  } catch (error) {
    console.error('Update global payment method error:', error);
    res.status(500).json({ message: 'Failed to update payment method', error: error.message });
  }
});

// Delete global payment method (Admin only)
router.delete('/admin/global-methods/:methodId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const paymentMethod = await PaymentMethod.findById(req.params.methodId);
    if (!paymentMethod) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    await PaymentMethod.findByIdAndDelete(req.params.methodId);

    res.json({
      message: 'Global payment method deleted successfully'
    });
  } catch (error) {
    console.error('Delete global payment method error:', error);
    res.status(500).json({ message: 'Failed to delete payment method', error: error.message });
  }
});

module.exports = router;
