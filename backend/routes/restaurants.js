const express = require('express');
const Restaurant = require('../models/Restaurant');
const { 
  authenticateToken, 
  requireRole, 
  requireCountryAccess 
} = require('../middleware/auth');

const router = express.Router();

// Get all restaurants (with country filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = { isActive: true };

    // Apply country filtering for non-admin users
    if (req.user.role !== 'admin') {
      query['address.country'] = req.user.country;
    }

    // Apply filters from query params
    if (req.query.country && req.user.role === 'admin') {
      query['address.country'] = req.query.country;
    }
    
    if (req.query.cuisine) {
      query.cuisine = req.query.cuisine;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { cuisine: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const restaurants = await Restaurant.find(query)
      .sort({ rating: -1, createdAt: -1 });

    res.json({ restaurants });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ message: 'Failed to fetch restaurants', error: error.message });
  }
});

// Get restaurant by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Check country access for non-admin users
    if (req.user.role !== 'admin' && restaurant.address.country !== req.user.country) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view restaurants from your assigned country.' 
      });
    }

    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ message: 'Failed to fetch restaurant', error: error.message });
  }
});

// Create restaurant (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const restaurantData = req.body;
    
    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ message: 'Failed to create restaurant', error: error.message });
  }
});

// Update restaurant (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedRestaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ message: 'Failed to update restaurant', error: error.message });
  }
});

// Delete restaurant (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant deactivated successfully' });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ message: 'Failed to deactivate restaurant', error: error.message });
  }
});

// Get restaurant menu
router.get('/:id/menu', authenticateToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Check country access for non-admin users
    if (req.user.role !== 'admin' && restaurant.address.country !== req.user.country) {
      return res.status(403).json({ 
        message: 'Access denied. You can only view menus from restaurants in your assigned country.' 
      });
    }

    // Filter available menu items
    const menu = restaurant.menu.filter(item => item.isAvailable);

    // Apply category filter if provided
    let filteredMenu = menu;
    if (req.query.category) {
      filteredMenu = menu.filter(item => item.category === req.query.category);
    }

    res.json({ menu: filteredMenu });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ message: 'Failed to fetch menu', error: error.message });
  }
});

// Add menu item (Admin only)
router.post('/:id/menu', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    restaurant.menu.push(req.body);
    await restaurant.save();

    res.status(201).json({
      message: 'Menu item added successfully',
      menu: restaurant.menu
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ message: 'Failed to add menu item', error: error.message });
  }
});

// Update menu item (Admin only)
router.put('/:id/menu/:itemId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const menuItem = restaurant.menu.id(req.params.itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    Object.assign(menuItem, req.body);
    await restaurant.save();

    res.json({
      message: 'Menu item updated successfully',
      menuItem
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Failed to update menu item', error: error.message });
  }
});

// Delete menu item (Admin only)
router.delete('/:id/menu/:itemId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    restaurant.menu.id(req.params.itemId).remove();
    await restaurant.save();

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ message: 'Failed to delete menu item', error: error.message });
  }
});

module.exports = router;
