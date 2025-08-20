const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['card', 'upi', 'wallet', 'bank_transfer', 'cash'],
    required: true
  },
  country: {
    type: String,
    enum: ['India', 'America', 'Global'],
    required: true
  },
  details: {
    // For card payments
    cardNumber: String,
    expiryDate: String,
    cvv: String,
    
    // For UPI payments
    upiId: String,
    
    // For wallet payments
    walletId: String,
    
    // For bank transfers
    accountNumber: String,
    routingNumber: String,
    bankName: String,
    
    // Additional details
    description: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one default payment method per country
paymentMethodSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('PaymentMethod').updateMany(
      { country: this.country, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
