const User = require('../model/userModel');

// Get all addresses for a user
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching addresses'
    });
  }
};

// Add or update an address
exports.addOrUpdateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { id, street, city, state, zipCode, country, phoneNumber, label, isDefault } = req.body;

    // Validate required fields
    if (!street || !city || !state || !zipCode || !country || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // If isDefault is true, set all other addresses to non-default
    if (isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    if (id) {
      // Update existing address
      const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id);
      if (addressIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      user.addresses[addressIndex] = {
        ...user.addresses[addressIndex],
        street,
        city,
        state,
        zipCode,
        country,
        phoneNumber,
        label: label || 'Home',
        isDefault: isDefault || false
      };
    } else {
      // Add new address
      // If this is the first address, make it default
      const isFirstAddress = user.addresses.length === 0;
      
      user.addresses.push({
        street,
        city,
        state,
        zipCode,
        country,
        phoneNumber,
        label: label || 'Home',
        isDefault: isDefault || isFirstAddress
      });
    }

    // Save only the addresses array, not the entire user document
    await user.updateOne({ $set: { addresses: user.addresses } });

    res.status(200).json({
      success: true,
      message: id ? 'Address updated successfully' : 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Error saving address:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving address'
    });
  }
};

// Delete an address
exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressId = req.params.id;
    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Don't allow deletion of default address if it's the only address
    if (user.addresses[addressIndex].isDefault && user.addresses.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only address. Please add another address first.'
      });
    }

    // If deleting default address, make the first remaining address default
    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    // Use updateOne to only update the addresses array
    await user.updateOne({ $set: { addresses: user.addresses } });

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting address'
    });
  }
};

// Set an address as default
exports.setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressId = req.params.id;
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Set all addresses to non-default
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });

    // Set the selected address as default
    address.isDefault = true;

    // Use updateOne instead of save to avoid triggering full model validation
    await user.updateOne({ $set: { addresses: user.addresses } });

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting default address'
    });
  }
}; 