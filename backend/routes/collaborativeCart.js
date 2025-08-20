const express = require('express');
const router = express.Router();
const CollaborativeCart = require('../models/CollaborativeCart');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const { 
  MESSAGES, 
  STATUS_CODES, 
  DEFAULTS, 
  ACTIVITY_TYPES,
  createSuccessResponse,
  createErrorResponse 
} = require('../constants');

// Create a new collaborative cart
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, country } = req.body;
    
    const cart = new CollaborativeCart({
      name,
      description,
      creator: req.user.id,
      manager: req.user.id,
      country,
      members: [{
        user: req.user.id,
        role: 'manager'
      }]
    });

    cart.addActivity('cart_created', req.user.id, `Cart "${name}" created`);
    await cart.save();
    
    await cart.populate('creator manager members.user', 'name email role');
    
    res.status(201).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Create collaborative cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create collaborative cart'
    });
  }
});

// Get user's collaborative carts
router.get('/my-carts', authenticateToken, async (req, res) => {
  try {
    const carts = await CollaborativeCart.findUserCarts(req.user.id)
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      data: carts
    });
  } catch (error) {
    console.error('Get user carts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carts'
    });
  }
});

// Get all carts including completed ones (for admin or history view)
router.get('/my-carts/all', authenticateToken, async (req, res) => {
  try {
    const carts = await CollaborativeCart.find({
      $or: [
        { creator: req.user.id },
        { manager: req.user.id },
        { 'members.user': req.user.id }
      ]
    }).populate('creator manager members.user', 'name email role')
      .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      data: carts
    });
  } catch (error) {
    console.error('Get all user carts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all carts'
    });
  }
});

// Get specific cart details
router.get('/:cartId', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId)
      .populate('creator manager members.user', 'name email role')
      .populate('items.addedBy', 'name email')
      .populate('items.notes.user', 'name email')
      .populate('items.votes.user', 'name email')
      .populate('activity.user', 'name email');
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    console.log('Debug - User ID from token:', req.user.id);
    console.log('Debug - Cart creator ID:', cart.creator.toString());
    console.log('Debug - Cart manager ID:', cart.manager.toString());
    console.log('Debug - Cart members:', cart.members.map(m => ({ user: m.user.toString(), role: m.role })));
    
    if (!cart.hasAccess(req.user.id)) {
      console.log('Debug - Access denied for user:', req.user.id);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get cart details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart details'
    });
  }
});

// Add item to collaborative cart
router.post('/:cartId/items', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, name, price, quantity, image, restaurantId, restaurantName, specialInstructions } = req.body;
    
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.hasAccess(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (cart.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cart is locked and cannot be modified'
      });
    }

    const newItem = {
      menuItemId,
      name,
      price,
      quantity,
      image,
      restaurantId,
      restaurantName,
      specialInstructions,
      addedBy: req.user.id,
      status: cart.settings.requireApproval && !cart.isManager(req.user.id) ? 'suggested' : 'approved'
    };

    cart.items.push(newItem);
    
    const itemStatusText = newItem.status === 'suggested' ? 'suggested' : 'added';
    cart.addActivity('item_added', req.user.id, `${itemStatusText.charAt(0).toUpperCase() + itemStatusText.slice(1)} "${name}" to cart`);
    
    await cart.save();
    await cart.populate('items.addedBy', 'name email');

    res.json({
      success: true,
      data: cart.items[cart.items.length - 1]
    });
  } catch (error) {
    console.error('Add item to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// Update item status (approve/reject)
router.patch('/:cartId/items/:itemId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can approve/reject items'
      });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    item.status = status;
    
    cart.addActivity(
      status === 'approved' ? 'item_approved' : 'item_rejected', 
      req.user.id, 
      `${status.charAt(0).toUpperCase() + status.slice(1)} "${item.name}"`
    );
    
    await cart.save();

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item status'
    });
  }
});

// Add note to item
router.post('/:cartId/items/:itemId/notes', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.hasAccess(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    item.notes.push({
      user: req.user.id,
      text
    });

    cart.addActivity('note_added', req.user.id, `Added note to "${item.name}"`);
    
    await cart.save();
    await cart.populate('items.notes.user', 'name email');

    res.json({
      success: true,
      data: item.notes[item.notes.length - 1]
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note'
    });
  }
});

// Vote on item
router.post('/:cartId/items/:itemId/vote', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body; // 'approve' or 'reject'
    
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.hasAccess(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Remove existing vote from this user
    item.votes = item.votes.filter(vote => vote.user.toString() !== req.user.id);

    // Add new vote
    item.votes.push({
      user: req.user.id,
      type
    });

    cart.addActivity('vote_cast', req.user.id, `Voted to ${type} "${item.name}"`);
    
    await cart.save();

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Vote on item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to vote on item'
    });
  }
});

// Remove item from cart
router.delete('/:cartId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check permissions
    const canRemove = cart.isManager(req.user.id) || 
                     (item.addedBy.toString() === req.user.id && cart.settings.allowMemberRemoval);

    if (!canRemove) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove items you added or be a manager'
      });
    }

    if (cart.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cart is locked and cannot be modified'
      });
    }

    cart.addActivity('item_removed', req.user.id, `Removed "${item.name}" from cart`);
    cart.items.pull(req.params.itemId);
    
    await cart.save();

    res.json({
      success: true,
      message: 'Item removed successfully'
    });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item'
    });
  }
});

// Add member to cart
router.post('/:cartId/members', authenticateToken, async (req, res) => {
  try {
    const { userEmail, role = 'member' } = req.body;
    
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can add members'
      });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = cart.members.find(member => member.user.toString() === user._id.toString());
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this cart'
      });
    }

    cart.members.push({
      user: user._id,
      role
    });

    cart.addActivity('member_added', req.user.id, `Added ${user.name} as ${role}`);
    
    await cart.save();
    await cart.populate('members.user', 'name email role');

    res.json({
      success: true,
      data: cart.members[cart.members.length - 1]
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member'
    });
  }
});

// Lock/unlock cart
router.patch('/:cartId/lock', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can lock/unlock carts'
      });
    }

    cart.isLocked = !cart.isLocked;
    cart.lockedAt = cart.isLocked ? new Date() : null;
    cart.lockedBy = cart.isLocked ? req.user.id : null;

    cart.addActivity(
      cart.isLocked ? 'cart_locked' : 'cart_unlocked', 
      req.user.id, 
      `Cart ${cart.isLocked ? 'locked' : 'unlocked'}`
    );
    
    await cart.save();

    res.json({
      success: true,
      data: {
        isLocked: cart.isLocked,
        lockedAt: cart.lockedAt,
        lockedBy: cart.lockedBy
      }
    });
  } catch (error) {
    console.error('Lock cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock/unlock cart'
    });
  }
});

// Update cart settings
router.patch('/:cartId/settings', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can update cart settings'
      });
    }

    const { requireApproval, allowMemberRemoval, requireVoting, minimumVotes } = req.body;
    
    if (requireApproval !== undefined) cart.settings.requireApproval = requireApproval;
    if (allowMemberRemoval !== undefined) cart.settings.allowMemberRemoval = allowMemberRemoval;
    if (requireVoting !== undefined) cart.settings.requireVoting = requireVoting;
    if (minimumVotes !== undefined) cart.settings.minimumVotes = minimumVotes;

    await cart.save();

    res.json({
      success: true,
      data: cart.settings
    });
  } catch (error) {
    console.error('Update cart settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart settings'
    });
  }
});

// Place order for collaborative cart
router.post('/:cartId/place-order', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId)
      .populate('creator manager members.user', 'name email role');
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can place orders'
      });
    }

    if (!cart.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cart must be locked before placing order'
      });
    }

    if (cart.status === 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Order has already been placed for this cart. The cart has been automatically removed from your active carts.',
        errorCode: 'ORDER_ALREADY_PLACED',
        data: {
          cartId: cart._id,
          cartName: cart.name,
          cartStatus: cart.status,
          finalizedAt: cart.finalizedAt,
          suggestion: 'This cart will no longer appear in your collaborative carts list since the order has been completed.'
        }
      });
    }

    // Get only approved items
    const approvedItems = cart.items.filter(item => item.status === 'approved');
    
    if (approvedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No approved items to order'
      });
    }

    // Group items by restaurant
    const ordersByRestaurant = {};
    approvedItems.forEach(item => {
      const restaurantId = item.restaurantId.toString();
      if (!ordersByRestaurant[restaurantId]) {
        ordersByRestaurant[restaurantId] = {
          restaurantId,
          restaurantName: item.restaurantName,
          items: [],
          totalAmount: 0
        };
      }
      ordersByRestaurant[restaurantId].items.push({
        menuItem: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions
      });
      ordersByRestaurant[restaurantId].totalAmount += item.price * item.quantity;
    });

    // Create orders for each restaurant
    const Order = require('../models/Order');
    const createdOrders = [];

    for (const restaurantOrder of Object.values(ordersByRestaurant)) {
      const order = new Order({
        user: req.user.id,
        restaurant: restaurantOrder.restaurantId,
        items: restaurantOrder.items,
        totalAmount: restaurantOrder.totalAmount,
        deliveryAddress: req.body.deliveryAddress || {
          street: '123 Main St',
          city: 'Default City',
          state: 'Default State',
          zipCode: '12345',
          country: cart.country
        },
        customerPhone: req.body.phone || '1234567890',
        paymentMethod: req.body.paymentMethod || 'cash',
        status: 'confirmed',
        cartType: 'collaborative',
        collaborativeCartId: cart._id,
        notes: `Collaborative cart order - Cart: ${cart.name}`
      });

      await order.save();
      createdOrders.push(order);
    }

    // Update cart status
    cart.status = 'completed';
    cart.finalizedAt = new Date();
    
    // Get restaurant names for the success message
    const restaurantNames = Object.values(ordersByRestaurant).map(order => order.restaurantName);
    const restaurantCount = Object.keys(ordersByRestaurant).length;
    
    cart.addActivity('order_placed', req.user.id, 
      `Order placed for ${approvedItems.length} items across ${restaurantCount} restaurant(s): ${restaurantNames.join(', ')}`
    );
    
    await cart.save();

    res.json({
      success: true,
      message: restaurantCount > 1 
        ? `Successfully placed ${createdOrders.length} order(s) across ${restaurantCount} restaurants: ${restaurantNames.join(', ')}`
        : `Successfully placed order for ${restaurantNames[0]}`,
      data: {
        cart,
        orders: createdOrders,
        restaurantCount,
        restaurantNames
      }
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order'
    });
  }
});

// Delete collaborative cart (Manager only)
router.delete('/:cartId', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Only managers can delete the cart
    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can delete the cart'
      });
    }

    // Don't allow deletion if there are orders placed (unless forced)
    if (cart.status === 'completed' && !req.query.force) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cart with completed orders. Use force=true to discard.',
        canForceDelete: true
      });
    }

    // Delete the cart
    await CollaborativeCart.findByIdAndDelete(req.params.cartId);

    res.json({
      success: true,
      message: cart.status === 'completed' ? 'Cart discarded successfully' : 'Cart deleted successfully'
    });
  } catch (error) {
    console.error('Delete cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cart'
    });
  }
});

// Discard completed cart (Manager only)
router.post('/:cartId/discard', authenticateToken, async (req, res) => {
  try {
    const cart = await CollaborativeCart.findById(req.params.cartId);
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Only managers can discard the cart
    if (!cart.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can discard the cart'
      });
    }

    // Only allow discarding completed carts
    if (cart.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed carts can be discarded'
      });
    }

    // Add activity log
    cart.addActivity('cart_discarded', req.user.id, 'Cart discarded after order completion');
    
    // Delete the cart
    await CollaborativeCart.findByIdAndDelete(req.params.cartId);

    res.json({
      success: true,
      message: 'Cart discarded successfully'
    });
  } catch (error) {
    console.error('Discard cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to discard cart'
    });
  }
});

module.exports = router;
