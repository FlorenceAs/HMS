// models/Role.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant']
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  permissions: [{
    module: {
      type: String,
      required: true
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve']
    }]
  }],
  dashboardConfig: {
    defaultRoute: String,
    widgets: [String], // Widget names to show on dashboard
    sidebarItems: [String], // Navigation items
    color: String // Theme color for role
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);