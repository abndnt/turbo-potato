const logger = require('../utils/logger');

// Category mapping for Facebook Marketplace
const CATEGORY_MAPPING = {
  // Electronics
  'electronics': 'Electronics',
  'phone': 'Electronics',
  'iphone': 'Electronics',
  'android': 'Electronics',
  'laptop': 'Electronics',
  'computer': 'Electronics',
  'tablet': 'Electronics',
  'gaming': 'Electronics',
  'headphones': 'Electronics',
  'camera': 'Electronics',
  'tv': 'Electronics',
  'television': 'Electronics',
  
  // Vehicles
  'car': 'Vehicles',
  'truck': 'Vehicles',
  'motorcycle': 'Vehicles',
  'bike': 'Vehicles',
  'bicycle': 'Vehicles',
  'auto': 'Vehicles',
  'vehicle': 'Vehicles',
  
  // Home & Garden
  'furniture': 'Home & Garden',
  'chair': 'Home & Garden',
  'table': 'Home & Garden',
  'sofa': 'Home & Garden',
  'bed': 'Home & Garden',
  'appliance': 'Home & Garden',
  'kitchen': 'Home & Garden',
  'garden': 'Home & Garden',
  'tools': 'Home & Garden',
  'home': 'Home & Garden',
  
  // Clothing & Accessories
  'clothing': 'Clothing & Accessories',
  'clothes': 'Clothing & Accessories',
  'shirt': 'Clothing & Accessories',
  'dress': 'Clothing & Accessories',
  'shoes': 'Clothing & Accessories',
  'jewelry': 'Clothing & Accessories',
  'watch': 'Clothing & Accessories',
  'bag': 'Clothing & Accessories',
  'purse': 'Clothing & Accessories',
  
  // Sports & Outdoors
  'sports': 'Sports & Outdoors',
  'fitness': 'Sports & Outdoors',
  'exercise': 'Sports & Outdoors',
  'outdoor': 'Sports & Outdoors',
  'camping': 'Sports & Outdoors',
  'fishing': 'Sports & Outdoors',
  'hunting': 'Sports & Outdoors',
  
  // Books, Movies & Music
  'book': 'Books, Movies & Music',
  'books': 'Books, Movies & Music',
  'movie': 'Books, Movies & Music',
  'dvd': 'Books, Movies & Music',
  'cd': 'Books, Movies & Music',
  'music': 'Books, Movies & Music',
  'vinyl': 'Books, Movies & Music',
  
  // Toys & Games
  'toy': 'Toys & Games',
  'toys': 'Toys & Games',
  'game': 'Toys & Games',
  'games': 'Toys & Games',
  'puzzle': 'Toys & Games',
  'board game': 'Toys & Games',
  
  // Baby & Kids
  'baby': 'Baby & Kids',
  'kids': 'Baby & Kids',
  'children': 'Baby & Kids',
  'stroller': 'Baby & Kids',
  'crib': 'Baby & Kids',
  'car seat': 'Baby & Kids',
  
  // Pet Supplies
  'pet': 'Pet Supplies',
  'dog': 'Pet Supplies',
  'cat': 'Pet Supplies',
  'animal': 'Pet Supplies',
  
  // Other
  'antique': 'Antiques',
  'collectible': 'Collectibles',
  'art': 'Arts & Crafts',
  'craft': 'Arts & Crafts'
};

// Common description templates
const DESCRIPTION_TEMPLATES = {
  electronics: [
    "Excellent condition {itemName} for sale. {condition} and works perfectly.",
    "Selling my {itemName} in {condition} condition. Great performance and reliability.",
    "{itemName} available - {condition}. Perfect for anyone looking for quality electronics."
  ],
  
  furniture: [
    "Beautiful {itemName} in {condition} condition. Perfect for any home.",
    "Selling {itemName} - {condition}. Great addition to your living space.",
    "{itemName} for sale in {condition} condition. Comfortable and stylish."
  ],
  
  clothing: [
    "Stylish {itemName} in {condition} condition. Great fit and quality.",
    "{itemName} for sale - {condition}. Perfect addition to your wardrobe.",
    "Quality {itemName} available in {condition} condition."
  ],
  
  default: [
    "{itemName} for sale in {condition} condition.",
    "Selling {itemName} - {condition}. Great value!",
    "{itemName} available - {condition}. Don't miss out!"
  ]
};

// Safety and quality keywords
const POSITIVE_KEYWORDS = [
  'excellent', 'great', 'perfect', 'quality', 'reliable', 'durable',
  'beautiful', 'stylish', 'comfortable', 'convenient', 'efficient',
  'professional', 'premium', 'authentic', 'genuine', 'original'
];

class ContentProcessor {
  constructor() {
    this.categoryCache = new Map();
  }

  mapCategory(category) {
    try {
      if (!category) {
        return 'Other';
      }

      // Check cache first
      const cacheKey = category.toLowerCase();
      if (this.categoryCache.has(cacheKey)) {
        return this.categoryCache.get(cacheKey);
      }

      const lowerCategory = category.toLowerCase();
      let mappedCategory = 'Other';

      // Direct match
      if (CATEGORY_MAPPING[lowerCategory]) {
        mappedCategory = CATEGORY_MAPPING[lowerCategory];
      } else {
        // Partial match
        for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
          if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
            mappedCategory = value;
            break;
          }
        }
      }

      // Cache the result
      this.categoryCache.set(cacheKey, mappedCategory);
      
      logger.info(`Mapped category: ${category} -> ${mappedCategory}`);
      return mappedCategory;
    } catch (error) {
      logger.error('Error mapping category:', error);
      return 'Other';
    }
  }

  generateDescription(listingData) {
    try {
      const { itemName, description, condition, price, category } = listingData;
      
      // If description is already provided and substantial, use it
      if (description && description.length > 50) {
        return this.enhanceDescription(description, listingData);
      }

      // Generate description based on category
      const categoryType = this.getCategoryType(category);
      const templates = DESCRIPTION_TEMPLATES[categoryType] || DESCRIPTION_TEMPLATES.default;
      
      // Select random template
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Replace placeholders
      let generatedDescription = template
        .replace(/{itemName}/g, itemName)
        .replace(/{condition}/g, condition || 'good')
        .replace(/{price}/g, price);

      // Add additional details
      generatedDescription += this.addAdditionalDetails(listingData);
      
      // Add call to action
      generatedDescription += '\n\nSerious inquiries only. Cash or verified payment methods accepted.';
      
      logger.info('Generated description for listing', { 
        itemName,
        descriptionLength: generatedDescription.length 
      });
      
      return generatedDescription;
    } catch (error) {
      logger.error('Error generating description:', error);
      return `${listingData.itemName} for sale in ${listingData.condition || 'good'} condition. Price: $${listingData.price}`;
    }
  }

  enhanceDescription(originalDescription, listingData) {
    try {
      let enhanced = originalDescription;
      
      // Add price if not mentioned
      if (!enhanced.toLowerCase().includes('price') && !enhanced.includes('$')) {
        enhanced += `\n\nPrice: $${listingData.price}`;
      }
      
      // Add condition if not mentioned
      if (!enhanced.toLowerCase().includes('condition') && listingData.condition) {
        enhanced += `\nCondition: ${listingData.condition}`;
      }
      
      // Add location if provided
      if (listingData.location && !enhanced.toLowerCase().includes('location')) {
        enhanced += `\nLocation: ${listingData.location}`;
      }
      
      // Add professional closing
      if (!enhanced.toLowerCase().includes('serious inquiries')) {
        enhanced += '\n\nSerious inquiries only. Thank you!';
      }
      
      return enhanced;
    } catch (error) {
      logger.error('Error enhancing description:', error);
      return originalDescription;
    }
  }

  getCategoryType(category) {
    if (!category) return 'default';
    
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('electronic') || lowerCategory.includes('phone') || 
        lowerCategory.includes('computer') || lowerCategory.includes('gaming')) {
      return 'electronics';
    }
    
    if (lowerCategory.includes('furniture') || lowerCategory.includes('chair') || 
        lowerCategory.includes('table') || lowerCategory.includes('home')) {
      return 'furniture';
    }
    
    if (lowerCategory.includes('clothing') || lowerCategory.includes('shirt') || 
        lowerCategory.includes('dress') || lowerCategory.includes('shoes')) {
      return 'clothing';
    }
    
    return 'default';
  }

  addAdditionalDetails(listingData) {
    let details = '';
    
    // Add positive keywords based on condition
    if (listingData.condition) {
      const condition = listingData.condition.toLowerCase();
      if (condition.includes('new') || condition.includes('excellent')) {
        const keyword = POSITIVE_KEYWORDS[Math.floor(Math.random() * POSITIVE_KEYWORDS.length)];
        details += ` This ${keyword} item is perfect for anyone looking for quality.`;
      }
    }
    
    // Add pickup/delivery info
    details += '\n\nPickup preferred. May consider delivery for additional fee within reasonable distance.';
    
    return details;
  }

  validateListingData(listingData) {
    const errors = [];
    
    // Required fields
    if (!listingData.itemName || listingData.itemName.trim().length < 3) {
      errors.push('Item name must be at least 3 characters long');
    }
    
    if (!listingData.price || isNaN(parseFloat(listingData.price)) || parseFloat(listingData.price) <= 0) {
      errors.push('Price must be a valid positive number');
    }
    
    // Optional but recommended fields
    if (!listingData.category) {
      errors.push('Category is recommended for better visibility');
    }
    
    if (!listingData.condition) {
      errors.push('Condition helps buyers make informed decisions');
    }
    
    // Description length check
    if (listingData.description && listingData.description.length > 8000) {
      errors.push('Description is too long (max 8000 characters)');
    }
    
    // Photos check
    if (!listingData.photos || listingData.photos.length === 0) {
      errors.push('At least one photo is highly recommended');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  sanitizeText(text) {
    if (!text) return '';
    
    // Remove potentially problematic characters
    return text
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/[^\w\s\-.,!?()$]/g, '') // Keep only safe characters
      .trim();
  }

  formatPrice(price) {
    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) return price;
      
      return numPrice.toFixed(2);
    } catch (error) {
      return price;
    }
  }
}

// Singleton instance
const contentProcessor = new ContentProcessor();

// Export functions
function mapCategory(category) {
  return contentProcessor.mapCategory(category);
}

function generateDescription(listingData) {
  return contentProcessor.generateDescription(listingData);
}

function validateListingData(listingData) {
  return contentProcessor.validateListingData(listingData);
}

function sanitizeText(text) {
  return contentProcessor.sanitizeText(text);
}

function formatPrice(price) {
  return contentProcessor.formatPrice(price);
}

module.exports = {
  ContentProcessor,
  mapCategory,
  generateDescription,
  validateListingData,
  sanitizeText,
  formatPrice,
  CATEGORY_MAPPING
};