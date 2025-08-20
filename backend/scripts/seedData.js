const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// Sample users based on the requirements
const users = [
  {
    name: 'Nick Fury',
    email: 'nick.fury@admin.com',
    password: 'admin123',
    role: 'admin',
    country: 'America'
  },
  {
    name: 'Captain Marvel',
    email: 'captain.marvel@manager.com',
    password: 'manager123',
    role: 'manager',
    country: 'India'
  },
  {
    name: 'Captain America',
    email: 'captain.america@manager.com',
    password: 'manager123',
    role: 'manager',
    country: 'America'
  },
  {
    name: 'Thanos',
    email: 'thanos@member.com',
    password: 'member123',
    role: 'member',
    country: 'India'
  },
  {
    name: 'Thor',
    email: 'thor@member.com',
    password: 'member123',
    role: 'member',
    country: 'India'
  },
  {
    name: 'Travis',
    email: 'travis@member.com',
    password: 'member123',
    role: 'member',
    country: 'America'
  }
];

// Sample restaurants
const restaurants = [
  // Indian Restaurantsb
  {
    name: 'Spice Garden',
    description: 'Authentic Indian cuisine with traditional flavors',
    cuisine: 'Indian',
    address: {
      street: '123 Curry Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    phone: '+91-9876543210',
    email: 'contact@spicegarden.com',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    menu: [
      {
        name: 'Butter Chicken',
        description: 'Creamy tomato-based curry with tender chicken',
        price: 350,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300',
        isVegetarian: false,
        spiceLevel: 'medium',
        preparationTime: 25
      },
      {
        name: 'Dal Makhani',
        description: 'Rich black lentils cooked in butter and cream',
        price: 280,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 30
      },
      {
        name: 'Tandoori Naan',
        description: 'Fresh bread baked in tandoor oven',
        price: 60,
        category: 'appetizer',
        image: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 10
      },
      {
        name: 'Masala Chai',
        description: 'Traditional Indian spiced tea',
        price: 40,
        category: 'beverage',
        image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 5
      },
      {
        name: 'Gulab Jamun',
        description: 'Sweet dumplings in sugar syrup',
        price: 120,
        category: 'dessert',
        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 5
      }
    ],
    operatingHours: {
      monday: { open: '11:00', close: '23:00' },
      tuesday: { open: '11:00', close: '23:00' },
      wednesday: { open: '11:00', close: '23:00' },
      thursday: { open: '11:00', close: '23:00' },
      friday: { open: '11:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '11:00', close: '23:00' }
    },
    deliveryFee: 50,
    minimumOrder: 200
  },
  {
    name: 'Biryani Palace',
    description: 'Hyderabadi biryani and Mughlai cuisine',
    cuisine: 'Indian',
    address: {
      street: '456 Biryani Lane',
      city: 'Delhi',
      state: 'Delhi',
      zipCode: '110001',
      country: 'India'
    },
    phone: '+91-9876543211',
    email: 'orders@biryanipalace.com',
    rating: 4.7,
    image: 'https://as2.ftcdn.net/jpg/04/36/36/57/1000_F_436365754_z3i5Es0sFmZuLY6GZIzdiU01v9HqpGZe.jpg',
    menu: [
      {
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice with spiced chicken',
        price: 420,
        category: 'main_course',
        image: 'https://as2.ftcdn.net/jpg/04/36/36/57/1000_F_436365754_z3i5Es0sFmZuLY6GZIzdiU01v9HqpGZe.jpg',
        isVegetarian: false,
        spiceLevel: 'medium',
        preparationTime: 45
      },
      {
        name: 'Mutton Korma',
        description: 'Tender mutton in rich creamy gravy',
        price: 550,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300',
        isVegetarian: false,
        spiceLevel: 'hot',
        preparationTime: 50
      },
      {
        name: 'Vegetable Biryani',
        description: 'Fragrant rice with mixed vegetables',
        price: 320,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300',
        isVegetarian: true,
        spiceLevel: 'medium',
        preparationTime: 40
      }
    ],
    operatingHours: {
      monday: { open: '12:00', close: '22:00' },
      tuesday: { open: '12:00', close: '22:00' },
      wednesday: { open: '12:00', close: '22:00' },
      thursday: { open: '12:00', close: '22:00' },
      friday: { open: '12:00', close: '22:00' },
      saturday: { open: '12:00', close: '22:00' },
      sunday: { open: '12:00', close: '22:00' }
    },
    deliveryFee: 40,
    minimumOrder: 300
  },
  // American Restaurants
  {
    name: 'All American Diner',
    description: 'Classic American comfort food and burgers',
    cuisine: 'American',
    address: {
      street: '789 Liberty Street',
      city: 'New York',
      state: 'New York',
      zipCode: '10001',
      country: 'America'
    },
    phone: '+1-555-123-4567',
    email: 'info@allamericandiner.com',
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400',
    menu: [
      {
        name: 'Classic Burger',
        description: 'Beef patty with cheese, lettuce, tomato, and fries',
        price: 12.99,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
        isVegetarian: false,
        spiceLevel: 'mild',
        preparationTime: 15
      },
      {
        name: 'Buffalo Wings',
        description: 'Spicy chicken wings with blue cheese dip',
        price: 8.99,
        category: 'appetizer',
        image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=300',
        isVegetarian: false,
        spiceLevel: 'hot',
        preparationTime: 20
      },
      {
        name: 'Mac and Cheese',
        description: 'Creamy macaroni and cheese',
        price: 7.99,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 12
      },
      {
        name: 'Coca Cola',
        description: 'Classic Coke',
        price: 2.99,
        category: 'beverage',
        image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 2
      },
      {
        name: 'Apple Pie',
        description: 'Traditional American apple pie with vanilla ice cream',
        price: 6.99,
        category: 'dessert',
        image: 'https://images.unsplash.com/photo-1535920527002-b35e96722d64?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 5
      }
    ],
    operatingHours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '24:00' },
      saturday: { open: '08:00', close: '24:00' },
      sunday: { open: '09:00', close: '21:00' }
    },
    deliveryFee: 3.99,
    minimumOrder: 15
  },
  {
    name: 'Pizza Corner',
    description: 'Fresh Italian-style pizzas and pasta',
    cuisine: 'Italian',
    address: {
      street: '321 Pizza Boulevard',
      city: 'Chicago',
      state: 'Illinois',
      zipCode: '60601',
      country: 'America'
    },
    phone: '+1-555-987-6543',
    email: 'orders@pizzacorner.com',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    menu: [
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        price: 14.99,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 20
      },
      {
        name: 'Pepperoni Pizza',
        description: 'Pizza with pepperoni and cheese',
        price: 16.99,
        category: 'main_course',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300',
        isVegetarian: false,
        spiceLevel: 'mild',
        preparationTime: 20
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing',
        price: 9.99,
        category: 'salad',
        image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=300',
        isVegetarian: true,
        spiceLevel: 'mild',
        preparationTime: 10
      }
    ],
    operatingHours: {
      monday: { open: '11:00', close: '23:00' },
      tuesday: { open: '11:00', close: '23:00' },
      wednesday: { open: '11:00', close: '23:00' },
      thursday: { open: '11:00', close: '23:00' },
      friday: { open: '11:00', close: '24:00' },
      saturday: { open: '11:00', close: '24:00' },
      sunday: { open: '12:00', close: '22:00' }
    },
    deliveryFee: 2.99,
    minimumOrder: 20
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI||"mongodb://localhost:27017/restaurantApp");
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.name} (${user.role})`);
    }

    // Add payment methods to users
    const nickFury = createdUsers.find(u => u.email === 'nick.fury@admin.com');
    if (nickFury) {
      nickFury.paymentMethods.push({
        type: 'card',
        details: {
          cardNumber: '**** **** **** 1234',
          expiryDate: '12/25',
          cvv: '***'
        },
        isDefault: true
      });
      await nickFury.save();
    }

    // Create restaurants
    for (const restaurantData of restaurants) {
      const restaurant = new Restaurant(restaurantData);
      await restaurant.save();
      console.log(`Created restaurant: ${restaurant.name} in ${restaurant.address.country}`);
    }

    console.log('\\n=== Database seeded successfully! ===');
    console.log('\\nTest Users:');
    console.log('Admin: nick.fury@admin.com / admin123');
    console.log('Manager (India): captain.marvel@manager.com / manager123');
    console.log('Manager (America): captain.america@manager.com / manager123');
    console.log('Member (India): thanos@member.com / member123');
    console.log('Member (India): thor@member.com / member123');
    console.log('Member (America): travis@member.com / member123');
    
    console.log('\\nRestaurants created:');
    console.log('- India: Spice Garden, Biryani Palace');
    console.log('- America: All American Diner, Pizza Corner');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\\nDisconnected from MongoDB');
  }
}

seedDatabase();
