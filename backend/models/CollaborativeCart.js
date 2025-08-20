const mongoose = require('mongoose');

const collaborativeCartSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['manager', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    image: String,
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    restaurantName: String,
    specialInstructions: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['suggested', 'approved', 'rejected'],
      default: 'suggested'
    },
    notes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    votes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['approve', 'reject']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  status: {
    type: String,
    enum: ['active', 'locked', 'completed', 'cancelled'],
    default: 'active'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: Date,
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  country: {
    type: String,
    enum: ['India', 'America'],
    required: true
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  finalizedAt: Date,
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  settings: {
    requireApproval: {
      type: Boolean,
      default: true
    },
    allowMemberRemoval: {
      type: Boolean,
      default: false
    },
    requireVoting: {
      type: Boolean,
      default: false
    },
    minimumVotes: {
      type: Number,
      default: 1
    }
  },
  activity: [{
    type: {
      type: String,
      enum: ['cart_created', 'item_added', 'item_removed', 'item_approved', 'item_rejected', 'member_added', 'member_removed', 'cart_locked', 'cart_unlocked', 'note_added', 'vote_cast', 'order_placed'],
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Virtual for calculating total
collaborativeCartSchema.virtual('calculatedTotal').get(function() {
  return this.items.reduce((total, item) => {
    if (item.status === 'approved') {
      return total + (item.price * item.quantity);
    }
    return total;
  }, 0);
});

// Update total amount before saving
collaborativeCartSchema.pre('save', function(next) {
  this.totalAmount = this.calculatedTotal;
  next();
});

// Static method to find user's accessible carts (excluding completed carts)
collaborativeCartSchema.statics.findUserCarts = function(userId) {
  return this.find({
    $and: [
      {
        $or: [
          { creator: userId },
          { manager: userId },
          { 'members.user': userId }
        ]
      },
      { status: { $ne: 'completed' } } // Exclude completed carts
    ]
  }).populate('creator manager members.user', 'name email role');
};

// Instance method to check if user has access
collaborativeCartSchema.methods.hasAccess = function(userId) {
  console.log('hasAccess - checking userId:', userId);
  
  // Handle both populated and non-populated references
  const creatorId = this.creator._id ? this.creator._id.toString() : this.creator.toString();
  const managerId = this.manager._id ? this.manager._id.toString() : this.manager.toString();
  
  console.log('hasAccess - creatorId:', creatorId);
  console.log('hasAccess - managerId:', managerId);
  
  const isCreator = creatorId === userId.toString();
  const isManager = managerId === userId.toString();
  const isMember = this.members.some(member => {
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId.toString();
  });
  
  console.log('hasAccess - isCreator:', isCreator);
  console.log('hasAccess - isManager:', isManager);
  console.log('hasAccess - isMember:', isMember);
  
  return isCreator || isManager || isMember;
};

// Instance method to check if user is manager
collaborativeCartSchema.methods.isManager = function(userId) {
  // Handle both populated and non-populated references
  const managerId = this.manager._id ? this.manager._id.toString() : this.manager.toString();
  const isDirectManager = managerId === userId.toString();
  const isMemberManager = this.members.some(member => {
    const memberUserId = member.user._id ? member.user._id.toString() : member.user.toString();
    return memberUserId === userId.toString() && member.role === 'manager';
  });
  
  return isDirectManager || isMemberManager;
};

// Instance method to add activity
collaborativeCartSchema.methods.addActivity = function(type, user, description, metadata = {}) {
  this.activity.push({
    type,
    user,
    description,
    metadata
  });
};

module.exports = mongoose.model('CollaborativeCart', collaborativeCartSchema);
