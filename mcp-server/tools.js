import * as clients from './dataClients.js';

export const toolDefinitions = [
    { name: "getProductsByBrand", requiredParams: ["brand"] },
    { name: "addReviewToProduct", requiredParams: ["productId", "review"] },
    { name: "getReviewsByProductName", requiredParams: ["name"] },
    { name: "addReviewInGql", requiredParams: ["productName", "authorName", "ratingValue", "reviewBody", "datePublished"] },
    { name: "getProductsWithMinRating", requiredParams: ["minRating"] },
    { name: "addReviewInRdf", requiredParams: ["productName", "authorName", "ratingValue", "reviewBody", "datePublished"] }
];

export const executeTool = async (name, params) => {
    switch (name) {
        case 'getProductsByBrand':
            return clients.jsonGetProductsByBrand(params.brand);
        case 'addReviewToProduct':
            return clients.jsonAddReviewToProduct(params.productId, params.review);
        case 'getReviewsByProductName':
            return clients.gqlGetReviewsByProductName(params.name);
        case 'addReviewInGql':
            return clients.gqlCreateReview(params.productName, params.authorName, params.ratingValue, params.reviewBody, params.datePublished);
        case 'getProductsWithMinRating':
            return clients.rdfGetProductsWithMinRating(params.minRating);
        case 'addReviewInRdf':
            return clients.rdfAddReview(params.productName, params.authorName, params.ratingValue, params.reviewBody, params.datePublished);
        default:
            throw new Error(`Tool not found: ${name}`);
    }
};
