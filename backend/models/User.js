const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'member'],
    default: 'member'
  },
  country: {
    type: String,
    enum: ['India', 'America'],
    required: true
  },
  paymentMethods: [{
    type: {
      type: String,
      enum: ['card', 'upi', 'wallet'],
      required: true
    },
    details: {
      cardNumber: String,
      expiryDate: String,
      cvv: String,
      upiId: String,
      walletId: String
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user can access country-specific data
userSchema.methods.canAccessCountry = function(targetCountry) {
  if (this.role === 'admin') return true;
  return this.country === targetCountry;
};

module.exports = mongoose.model('User', userSchema);
