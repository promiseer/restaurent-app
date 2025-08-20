// API Response Messages
const MESSAGES = {
  // General
  SUCCESS: 'Success',
  INTERNAL_ERROR: 'Internal server error',
  
  // Authentication & Authorization
  ACCESS_DENIED: 'Access denied',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  
  // Cart Messages
  CART_NOT_FOUND: 'Cart not found',
  CART_CREATE_SUCCESS: 'Collaborative cart created successfully',
  CART_CREATE_FAILED: 'Failed to create collaborative cart',
  CART_FETCH_FAILED: 'Failed to fetch carts',
  CART_DETAILS_FAILED: 'Failed to fetch cart details',
  CART_LOCKED: 'Cart is locked and cannot be modified',
  CART_LOCK_SUCCESS: 'Cart lock status updated successfully',
  CART_LOCK_FAILED: 'Failed to lock/unlock cart',
  CART_SETTINGS_UPDATE_SUCCESS: 'Cart settings updated successfully',
  CART_SETTINGS_UPDATE_FAILED: 'Failed to update cart settings',
  
  // Item Messages
  ITEM_NOT_FOUND: 'Item not found',
  ITEM_ADD_SUCCESS: 'Item added to cart successfully',
  ITEM_ADD_FAILED: 'Failed to add item to cart',
  ITEM_STATUS_UPDATE_SUCCESS: 'Item status updated successfully',
  ITEM_STATUS_UPDATE_FAILED: 'Failed to update item status',
  ITEM_REMOVE_SUCCESS: 'Item removed successfully',
  ITEM_REMOVE_FAILED: 'Failed to remove item',
  ITEM_VOTE_SUCCESS: 'Vote cast successfully',
  ITEM_VOTE_FAILED: 'Failed to vote on item',
  
  // Permission Messages
  MANAGER_ONLY: 'Only managers can perform this action',
  MANAGER_ONLY_APPROVE: 'Only managers can approve/reject items',
  REMOVE_OWN_ITEMS: 'You can only remove items you added or be a manager',
  
  // Member Messages
  MEMBER_ADD_SUCCESS: 'Member added successfully',
  MEMBER_ADD_FAILED: 'Failed to add member',
  MEMBER_ALREADY_EXISTS: 'User is already a member of this cart',
  
  // Note Messages
  NOTE_ADD_SUCCESS: 'Note added successfully',
  NOTE_ADD_FAILED: 'Failed to add note',
  
  // User Messages
  USER_NOT_FOUND: 'User not found',
  
  // Validation Messages
  REQUIRED_FIELDS: 'Required fields are missing',
  INVALID_DATA: 'Invalid data provided'
};

// HTTP Status Codes
const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

// Default Values
const DEFAULTS = {
  MEMBER_ROLE: 'member',
  MANAGER_ROLE: 'manager',
  ITEM_STATUS_SUGGESTED: 'suggested',
  ITEM_STATUS_APPROVED: 'approved',
  ITEM_STATUS_REJECTED: 'rejected',
  CART_STATUS_ACTIVE: 'active',
  VOTE_TYPE_APPROVE: 'approve',
  VOTE_TYPE_REJECT: 'reject',
  MINIMUM_VOTES: 1
};

// Activity Types
const ACTIVITY_TYPES = {
  CART_CREATED: 'cart_created',
  ITEM_ADDED: 'item_added',
  ITEM_REMOVED: 'item_removed',
  ITEM_APPROVED: 'item_approved',
  ITEM_REJECTED: 'item_rejected',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  CART_LOCKED: 'cart_locked',
  CART_UNLOCKED: 'cart_unlocked',
  NOTE_ADDED: 'note_added',
  VOTE_CAST: 'vote_cast'
};

// Response Helper Functions
const createSuccessResponse = (data = null, message = MESSAGES.SUCCESS) => ({
  success: true,
  message,
  data
});

const createErrorResponse = (message, statusCode = STATUS_CODES.INTERNAL_ERROR) => ({
  success: false,
  message,
  statusCode
});

module.exports = {
  MESSAGES,
  STATUS_CODES,
  DEFAULTS,
  ACTIVITY_TYPES,
  createSuccessResponse,
  createErrorResponse
};
