import axios from 'axios';

const JSON_SERVER = 'http://localhost:4000';
const GRAPHQL_SERVER = 'http://localhost:3000';
const RDF4J_SERVER = 'http://localhost:8080/rdf4j-server/repositories/grafexamen';

export const jsonGetProductsByBrand = async (brand) => {
    const res = await axios.get(`${JSON_SERVER}/products`, { params: { brand } });
    return res.data;
};

export const jsonAddReviewToProduct = async (productId, reviewInput) => {
    const newReview = { id: crypto.randomUUID(), productId, ...reviewInput };
    const res = await axios.post(`${JSON_SERVER}/reviews`, newReview);
    return res.data;
};

export const gqlGetReviewsByProductName = async (name) => {
    const query = `
        query getReviewsByProductName($name: String!) {
            getReviewsByProductName(name: $name) {
                id ratingValue reviewBody authorName datePublished
            }
        }
    `;
    const res = await axios.post(GRAPHQL_SERVER, { query, variables: { name } });
    return res.data.data.getReviewsByProductName;
};

export const gqlCreateReview = async (productName, authorName, ratingValue, reviewBody, datePublished) => {
    const mutation = `
        mutation($productName: String!, $authorName: String!, $ratingValue: Float!, $reviewBody: String!, $datePublished: String!) {
            createReview(productName: $productName, authorName: $authorName, ratingValue: $ratingValue, reviewBody: $reviewBody, datePublished: $datePublished) {
                id productId authorName ratingValue reviewBody datePublished
            }
        }
    `;
    const res = await axios.post(GRAPHQL_SERVER, { query: mutation, variables: { productName, authorName, ratingValue, reviewBody, datePublished } });
    if (res.data.errors) {
        throw new Error(res.data.errors[0].message);
    }
    return res.data.data.createReview;
};

export const rdfGetProductsWithMinRating = async (minRating) => {
    const query = `
        PREFIX schema: <http://schema.org/>
        SELECT ?productName ?brand ?rating
        WHERE {
          ?product a schema:Product ;
                   schema:name ?productName ;
                   schema:brand ?brand ;
                   schema:review ?review .
          ?review a schema:Review ;
                  schema:reviewRating ?reviewRating .
          ?reviewRating a schema:Rating ;
                        schema:ratingValue ?rating .
          FILTER (?rating >= ${minRating})
        }
    `;
    try {
        const res = await axios.get(RDF4J_SERVER, {
            params: { query },
            headers: { 'Accept': 'application/sparql-results+json' }
        });
        return res.data.results.bindings.map(b => ({
            name: b.productName.value,
            brand: b.brand.value,
            rating: parseFloat(b.rating.value)
        }));
    } catch(err) {
        console.error("RDF4J Read Error:", err.message);
        throw err;
    }
};

export const rdfAddReview = async (productName, authorName, ratingValue, reviewBody, datePublished) => {
    const query = `
        PREFIX schema: <http://schema.org/>
        PREFIX ex: <http://example.org/perfume/>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

        INSERT {
          ?product schema:review ?newReviewURI .

          ?newReviewURI a schema:Review ;
                        schema:author _:authorNode ;
                        schema:reviewRating _:ratingNode ;
                        schema:reviewBody "${reviewBody}" ;
                        schema:datePublished "${datePublished}"^^xsd:dateTime .

          _:authorNode a schema:Person ;
                       schema:name "${authorName}" .

          _:ratingNode a schema:Rating ;
                       schema:ratingValue "${ratingValue}"^^xsd:decimal .
        }
        WHERE {
          ?product a schema:Product;
                   schema:name "${productName}" .
          
          BIND(URI(CONCAT("http://example.org/perfume/review_", STR(UUID()))) AS ?newReviewURI)
        }
    `;
    try {
        await axios.post(`${RDF4J_SERVER}/statements`, query, {
            headers: { 'Content-Type': 'application/sparql-update' }
        });
        return { success: true, message: "Review appended in RDF4J" };
    } catch (err) {
        console.error("RDF4J Write Error:", err.message);
        throw err;
    }
};
