import { CategoryType } from '../types/expense';

export const ALL_CATEGORIES: CategoryType[] = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health & Wellness',
  'Bills & Utilities',
  'Other'
];

interface KeywordMap {
  category: CategoryType;
  keywords: string[];
}

const KEYWORD_RULES: KeywordMap[] = [
  {
    category: 'Food & Dining',
    keywords: [
      'lunch', 'dinner', 'breakfast', 'coffee', 'tea', 'chai', 'snack', 'snacks',
      'meal', 'meals', 'pizza', 'burger', 'cafe', 'restaurant', 'swiggy', 'zomato',
      'bar', 'drinks', 'beer', 'wine', 'food', 'groceries', 'grocery', 'bread',
      'milk', 'fruits', 'vegetables', 'dessert', 'ice cream', 'subway', 'starbucks',
      'mcdonald', 'kfc', 'biryani', 'dosa', 'samosa'
    ]
  },
  {
    category: 'Transport',
    keywords: [
      'uber', 'ola', 'metro', 'auto', 'rickshaw', 'cab', 'taxi', 'train',
      'bus', 'petrol', 'diesel', 'fuel', 'gasoline', 'flight', 'parking',
      'toll', 'fastag', 'rapido', 'subway transit', 'fare', 'commute'
    ]
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'clothes', 'clothing', 'shirt', 'shoes',
      'pants', 'dress', 'mall', 'book', 'books', 'electronics', 'gadget',
      'headphones', 'laptop', 'phone', 'zara', 'h&m', 'uniqlo', 'shopping'
    ]
  },
  {
    category: 'Entertainment',
    keywords: [
      'movie', 'movies', 'cinema', 'theatre', 'netflix', 'spotify', 'prime video',
      'hotstar', 'game', 'gaming', 'playstation', 'steam', 'concert', 'show',
      'event', 'ticket', 'tickets', 'youtube', 'disney'
    ]
  },
  {
    category: 'Health & Wellness',
    keywords: [
      'pharmacy', 'medicine', 'medicines', 'doctor', 'hospital', 'clinic',
      'dentist', 'gym', 'workout', 'fitness', 'protein', 'vitamins', 'medical',
      'apollo', '1mg', 'pharmeasy'
    ]
  },
  {
    category: 'Bills & Utilities',
    keywords: [
      'rent', 'electricity', 'power', 'water', 'gas cylinder', 'wifi', 'internet',
      'broadband', 'recharge', 'mobile bill', 'phone bill', 'maintenance',
      'utility', 'utilities', 'dth'
    ]
  }
];

/**
 * Deterministically classify an expense description into a category using keywords.
 * If no keywords match, returns 'Other' without interrupting the user.
 */
export function classifyCategory(description: string): CategoryType {
  const normalized = description.toLowerCase().trim();
  if (!normalized) return 'Other';

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      // Word-boundary match or substring match for phrases
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${keyword}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(normalized) || normalized.includes(keyword)) {
        return rule.category;
      }
    }
  }

  return 'Other';
}
