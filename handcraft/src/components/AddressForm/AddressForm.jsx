import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaMapMarkerAlt, FaPhone, FaHome, FaBriefcase, FaMapMarked } from 'react-icons/fa';
import axiosInstance from '../../axiosInstance';

const AddressForm = ({ addresses = [], onAddressUpdate, showCancel = true, redirectUrl }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Debug log for addresses prop
  console.log("AddressForm received addresses:", addresses);
  
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phoneNumber: '',
    label: 'Home',
    isDefault: false
  });
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const resetForm = () => {
    setFormData({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phoneNumber: '',
      label: 'Home',
      isDefault: false
    });
    setEditingAddress(null);
    setShowForm(false);
    setError(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate required fields
    if (!formData.street || !formData.city || !formData.state || !formData.zipCode || !formData.country || !formData.phoneNumber) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Format phone number (remove any non-digit characters)
    const formattedPhone = formData.phoneNumber.replace(/\D/g, '');
    if (formattedPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    try {
      const requestData = {
        ...formData,
        phoneNumber: formattedPhone,
        id: editingAddress?._id
      };
      console.log('Sending address data:', requestData);
      const response = await axiosInstance.post('/api/auth/address', requestData);
      
      if (response.data.success) {
        onAddressUpdate(response.data.addresses);
        resetForm();
        
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      } else {
        setError(response.data.message || 'Failed to save address');
      }
    } catch (err) {
      console.error('Error saving address:', err);
      setError(err.response?.data?.message || 'An error occurred while saving the address');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (address) => {
    setFormData({
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      label: address.label,
      isDefault: address.isDefault
    });
    setEditingAddress(address);
    setShowForm(true);
  };
  
  const handleDelete = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    setLoading(true);
    try {
      const response = await axiosInstance.delete(`/api/auth/address/${addressId}`);
      if (response.data.success) {
        onAddressUpdate(response.data.addresses);
      } else {
        setError(response.data.message || 'Failed to delete address');
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      setError(err.response?.data?.message || 'An error occurred while deleting the address');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSetDefault = async (addressId) => {
    setLoading(true);
    try {
      const response = await axiosInstance.put(`/api/auth/address/${addressId}/default`);
      if (response.data.success) {
        onAddressUpdate(response.data.addresses);
      } else {
        setError(response.data.message || 'Failed to set default address');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while setting default address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Address List */}
      {Array.isArray(addresses) && addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div 
              key={address._id} 
              className={`p-4 border rounded-lg ${address.isDefault ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {address.label}
                  </span>
                  {address.isDefault && (
                    <span className="ml-2 text-sm text-primary">Default</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(address)}
                    className="text-gray-500 hover:text-primary"
                  >
                    <FaEdit size={16} />
                  </button>
                  {!address.isDefault && (
                    <>
                      <button 
                        onClick={() => handleSetDefault(address._id)}
                        className="text-gray-500 hover:text-primary"
                      >
                        <FaCheck size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(address._id)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <FaTrash size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-400" />
                  {address.street}
                </p>
                <p className="ml-6">
                  {address.city}, {address.state} {address.zipCode}
                </p>
                <p className="ml-6">{address.country}</p>
                <p className="flex items-center gap-2">
                  <FaPhone className="text-gray-400" />
                  {address.phoneNumber}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-4">
          No addresses saved yet. Add your first address below.
        </div>
      )}

      {/* Add/Edit Form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-primary hover:text-primary-dark"
        >
          <FaPlus /> Add New Address
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <select
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Set as default address</span>
            </label>
          </div>
          
          {error && (
            <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="mt-4 flex justify-end gap-2">
            {showCancel && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                <FaTimes className="inline mr-1" /> Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FaCheck /> {editingAddress ? 'Update' : 'Save'} Address
                </span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddressForm; 