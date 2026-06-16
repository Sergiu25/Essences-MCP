import { randomUUID } from 'crypto';
import axios from 'axios';

let products = [
  {
    id: "g1",
    name: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    category: "Unisex",
    price: 300.00,
    description: "Luminous and sophisticated, Baccarat Rouge 540 lays on the skin like an amber, floral, and woody breeze."
  },
  {
    id: "g2",
    name: "La Nuit de L'Homme",
    brand: "Yves Saint Laurent",
    category: "Men",
    price: 85.00,
    description: "A story of seduction, intensity and bold sensuality. A woody, oriental spicy fragrance."
  },
  {
    id: "g3",
    name: "Black Orchid",
    brand: "Tom Ford",
    category: "Women",
    price: 150.00,
    description: "A luxurious and sensual fragrance of rich, dark accords and an alluring potion of black orchids and spice."
  },
  {
    id: "g4",
    name: "Santal 33",
    brand: "Le Labo",
    category: "Unisex",
    price: 215.00,
    description: "A perfume that touches the sensual universality of this icon... that would intoxicate a man as much as a woman."
  },
  {
    id: "g5",
    name: "Light Blue",
    brand: "Dolce & Gabbana",
    category: "Women",
    price: 75.00,
    description: "A stunning perfume, overwhelming and irresistible like the joy of living."
  },
  {
    id: "g6",
    name: "Tobacco Vanille",
    brand: "Tom Ford",
    category: "Unisex",
    price: 265.00,
    description: "An opulent, warm, and iconic blend of tobacco leaf and aromatic spices with creamy vanilla."
  }
];

let reviews = [
  {
    id: "r_g1",
    productId: "g1",
    authorName: "Alice Webb",
    ratingValue: 4.8,
    reviewBody: "A masterpiece of modern perfumery.",
    datePublished: "2023-11-05T08:00:00Z"
  },
  {
    id: "r_g2",
    productId: "g2",
    authorName: "Mark Stone",
    ratingValue: 4.5,
    reviewBody: "Perfect for date nights.",
    datePublished: "2024-02-14T20:30:00Z"
  }
];

const getProducts = async () => {
  return products;
};

const getProductByName = async (name) => {
  return products.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
};

const getProductById = async (id) => {
  return products.find(p => p.id === id) || null;
};

const getAllReviews = async () => {
  return reviews;
};

const getReviewsByProductName = async (name) => {
  const product = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!product) return [];
  return reviews.filter(r => r.productId === product.id);
};

const createProduct = async (args) => {
  const newProduct = {
    id: randomUUID(),
    ...args
  };
  products.push(newProduct);
  return newProduct;
};

const createReview = async (args) => {
  const product = products.find(p => p.name.toLowerCase() === args.productName.toLowerCase());
  if (!product) throw new Error("Product not found");
  const newReview = {
    id: "r_" + randomUUID(),
    productId: product.id,
    authorName: args.authorName,
    ratingValue: args.ratingValue,
    reviewBody: args.reviewBody,
    datePublished: args.datePublished
  };
  reviews.push(newReview);
  return newReview;
};

export const resolvers = {
  Query: {
    getProductByName: (_, { name }) => getProductByName(name),
    getProductById: (_, { id }) => getProductById(id),
    getAllReviews: getAllReviews,
    getReviewsByProductName: (_, { name }) => getReviewsByProductName(name)
  },
  Mutation: {
    createProduct: (_, args) => createProduct(args),
    createReview: (_, args) => createReview(args)
  }
};
