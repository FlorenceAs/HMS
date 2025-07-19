// utils/seedRoles.js
require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

const defaultRoles = [
  {
    name: 'admin',
    displayName: 'Hospital Administrator',
    description: 'Full access to all hospital management features',
    permissions: [
      { module: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'patients', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'appointments', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'billing', actions: ['create', 'read', 'update', 'delete', 'approve'] },
      { module: 'inventory', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'reports', actions: ['read', 'create'] },
      { module: 'settings', actions: ['read', 'update'] }
    ],
    dashboardConfig: {
      defaultRoute: '/admin/dashboard',
      widgets: ['user-stats', 'patient-stats', 'revenue-chart', 'appointments-today'],
      sidebarItems: ['dashboard', 'users', 'patients', 'appointments', 'billing', 'inventory', 'reports', 'settings'],
      color: '#dc2626'
    }
  },
  {
    name: 'doctor',
    displayName: 'Doctor',
    description: 'Medical staff with patient care responsibilities',
    permissions: [
      { module: 'patients', actions: ['create', 'read', 'update'] },
      { module: 'appointments', actions: ['read', 'update'] },
      { module: 'medical_records', actions: ['create', 'read', 'update'] },
      { module: 'prescriptions', actions: ['create', 'read', 'update'] },
      { module: 'lab_results', actions: ['read'] }
    ],
    dashboardConfig: {
      defaultRoute: '/doctor/dashboard',
      widgets: ['my-appointments', 'patient-queue', 'recent-patients'],
      sidebarItems: ['dashboard', 'appointments', 'patients', 'medical-records', 'prescriptions'],
      color: '#2563eb'
    }
  },
  {
    name: 'nurse',
    displayName: 'Nurse',
    description: 'Nursing staff with patient care and administrative duties',
    permissions: [
      { module: 'patients', actions: ['read', 'update'] },
      { module: 'appointments', actions: ['read', 'update'] },
      { module: 'medical_records', actions: ['read', 'update'] },
      { module: 'vital_signs', actions: ['create', 'read', 'update'] },
      { module: 'medications', actions: ['read', 'update'] }
    ],
    dashboardConfig: {
      defaultRoute: '/nurse/dashboard',
      widgets: ['patient-assignments', 'vital-signs-due', 'medication-schedule'],
      sidebarItems: ['dashboard', 'patients', 'vital-signs', 'medications', 'schedules'],
      color: '#059669'
    }
  },
  {
    name: 'receptionist',
    displayName: 'Receptionist',
    description: 'Front desk staff managing appointments and patient registration',
    permissions: [
      { module: 'patients', actions: ['create', 'read', 'update'] },
      { module: 'appointments', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'billing', actions: ['read'] },
      { module: 'insurance', actions: ['read', 'update'] }
    ],
    dashboardConfig: {
      defaultRoute: '/receptionist/dashboard',
      widgets: ['todays-appointments', 'patient-checkin', 'waiting-patients'],
      sidebarItems: ['dashboard', 'appointments', 'patients', 'check-in', 'billing'],
      color: '#7c3aed'
    }
  },
  {
    name: 'lab_technician',
    displayName: 'Lab Technician',
    description: 'Laboratory staff managing tests and results',
    permissions: [
      { module: 'lab_tests', actions: ['create', 'read', 'update'] },
      { module: 'lab_results', actions: ['create', 'read', 'update'] },
      { module: 'patients', actions: ['read'] },
      { module: 'inventory', actions: ['read', 'update'] }
    ],
    dashboardConfig: {
      defaultRoute: '/lab/dashboard',
      widgets: ['pending-tests', 'completed-tests', 'inventory-status'],
      sidebarItems: ['dashboard', 'tests', 'results', 'inventory', 'equipment'],
      color: '#ea580c'
    }
  },
  {
    name: 'pharmacist',
    displayName: 'Pharmacist',
    description: 'Pharmacy staff managing medications and prescriptions',
    permissions: [
      { module: 'prescriptions', actions: ['read', 'update'] },
      { module: 'medications', actions: ['create', 'read', 'update'] },
      { module: 'inventory', actions: ['read', 'update'] },
      { module: 'patients', actions: ['read'] }
    ],
    dashboardConfig: {
      defaultRoute: '/pharmacy/dashboard',
      widgets: ['pending-prescriptions', 'medication-inventory', 'expiring-drugs'],
      sidebarItems: ['dashboard', 'prescriptions', 'medications', 'inventory', 'reports'],
      color: '#0891b2'
    }
  },
  {
    name: 'accountant',
    displayName: 'Accountant',
    description: 'Financial staff managing billing and payments',
    permissions: [
      { module: 'billing', actions: ['create', 'read', 'update'] },
      { module: 'payments', actions: ['create', 'read', 'update'] },
      { module: 'insurance', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read', 'create'] },
      { module: 'patients', actions: ['read'] }
    ],
    dashboardConfig: {
      defaultRoute: '/accounting/dashboard',
      widgets: ['revenue-summary', 'pending-payments', 'insurance-claims'],
      sidebarItems: ['dashboard', 'billing', 'payments', 'insurance', 'reports'],
      color: '#be185d'
    }
  }
];

const seedRoles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing roles
    await Role.deleteMany({});
    console.log('Cleared existing roles');

    // Insert default roles
    const insertedRoles = await Role.insertMany(defaultRoles);
    console.log(`Seeded ${insertedRoles.length} roles successfully`);

    // Display seeded roles
    insertedRoles.forEach(role => {
      console.log(`- ${role.displayName} (${role.name})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedRoles();
}

module.exports = seedRoles;