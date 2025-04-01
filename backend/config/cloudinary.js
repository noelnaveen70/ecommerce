const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Load environment variables to ensure they're available
dotenv.config();

// Check if required env variables are present
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Cloudinary configuration error:');
  if (!cloudName) console.error('- CLOUDINARY_CLOUD_NAME is missing');
  if (!apiKey) console.error('- CLOUDINARY_API_KEY is missing');
  if (!apiSecret) console.error('- CLOUDINARY_API_SECRET is missing');
  console.error('Please check your .env file');
}

// Configure Cloudinary with explicit values rather than process.env references
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

console.log('Cloudinary configuration loaded:', {
  cloud_name: cloudName ? 'Present' : 'Missing',
  api_key: apiKey ? 'Present' : 'Missing',
  api_secret: apiSecret ? 'Present' : 'Missing'
});

module.exports = cloudinary; 