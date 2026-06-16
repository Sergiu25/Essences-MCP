# SPARQL Queries corresponding to our operations

## getProductsWithMinRating
```sparql
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
  FILTER (?rating >= 4.5)
}
```

## addReviewInRdf (Equivalent INSERT based on string match)
```sparql
PREFIX schema: <http://schema.org/>
PREFIX ex: <http://example.org/perfume/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT {
  ?product schema:review ?newReviewURI .

  ?newReviewURI a schema:Review ;
                schema:author _:authorNode ;
                schema:reviewRating _:ratingNode ;
                schema:reviewBody "Amazing scent!" ;
                schema:datePublished "2024-04-15"^^xsd:date .

  _:authorNode a schema:Person ;
               schema:name "New User" .

  _:ratingNode a schema:Rating ;
               schema:ratingValue "5.0"^^xsd:decimal .
}
WHERE {
  ?product a schema:Product;
           schema:name "Aventus" .
  
  BIND(URI(CONCAT("http://example.org/perfume/review_", STR(UUID()))) AS ?newReviewURI)
}
```
