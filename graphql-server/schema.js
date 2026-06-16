export const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    brand: String!
    category: String!
    price: Float!
    description: String!
  }

  type Review {
    id: ID!
    productId: ID!
    authorName: String!
    ratingValue: Float!
    reviewBody: String!
    datePublished: String!
  }

  type Query {
    getProductByName(name: String!): Product
    getProductById(id: ID!): Product
    getAllReviews: [Review]
    getReviewsByProductName(name: String!): [Review]
  }

  type Mutation {
    createProduct(name: String!, brand: String!, category: String!, price: Float!, description: String!): Product
    createReview(productName: String!, authorName: String!, ratingValue: Float!, reviewBody: String!, datePublished: String!): Review
  }
`;
