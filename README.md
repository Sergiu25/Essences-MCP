# Essences-MCP

Essences-MCP is a university Semantic Web project that combines AI agents, Model Context Protocol style orchestration, REST, GraphQL, and RDF/SPARQL into a conversational perfume review platform.

The application lets a user ask natural language questions such as "show me Dior perfumes", "what reviews does Baccarat Rouge 540 have?", or "show perfumes rated above 4.5". The AI layer decides which backend should answer the request, calls the correct tool through a JSON-RPC MCP server, then formats the result into a friendly response for the web interface.

## Why This Project Is Interesting

This is not a simple CRUD application. The main goal is to demonstrate how multiple data paradigms can work together behind a single conversational interface:

- REST API with JSON Server for classic resource-based data access.
- GraphQL server for structured product and review queries.
- RDF4J/SPARQL semantic database for RDF triples and rating-based semantic queries.
- MCP-style tool registry and JSON-RPC execution layer.
- LLM-based routing that chooses the correct operation from the user's natural language request.
- Frontend chat interface that hides the backend complexity from the user.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend runtime: Node.js
- MCP Client: Express, Groq/OpenAI-compatible chat completions, Axios
- MCP Server: Express, JSON-RPC 2.0 style requests, tool registry
- REST data source: JSON Server
- GraphQL data source: Apollo Server
- Semantic data source: RDF4J Server with SPARQL queries and RDF/Turtle data
- Data vocabulary: schema.org concepts such as `schema:Product`, `schema:Review`, `schema:Rating`, and `schema:Person`

## Project Structure

```text
Essences-MCP/
|-- frontend/
|   |-- index.html
|   |-- style.css
|   `-- app.js
|
|-- mcp-client/
|   |-- index.js
|   |-- llmService.js
|   |-- package.json
|   `-- .env
|
|-- mcp-server/
|   |-- index.js
|   |-- tools.js
|   |-- dataClients.js
|   `-- package.json
|
|-- json-server/
|   |-- db.json
|   `-- package.json
|
|-- graphql-server/
|   |-- index.js
|   |-- schema.js
|   |-- resolvers.js
|   `-- package.json
|
|-- rdf-data/
|   |-- data.ttl
|   `-- queries.md
|
|-- package.json
|-- package-lock.json
|-- .gitignore
`-- README.md
```

## Architecture Overview

The project is split into independent services. Each service has one responsibility and communicates with the others through HTTP.

| Component | Port | Role |
| --- | ---: | --- |
| Frontend | 8081 | Chat interface used by the user |
| MCP Client | 5001 | Receives chat messages, asks the LLM what tool to use, calls the MCP Server |
| MCP Server | 5000 | Exposes available tools and executes them through JSON-RPC |
| JSON Server | 4000 | REST backend for products and reviews |
| GraphQL Server | 3000 | Apollo GraphQL backend for products and reviews |
| RDF4J Server | 8080 | Semantic RDF/SPARQL backend |

## Full Request Flow

1. The user types a message in the frontend chat.

   Example:

   ```text
   Arata-mi parfumurile care au un rating mai mare sau egal cu 4.5.
   ```

2. The frontend sends the message to the MCP Client:

   ```http
   POST http://localhost:5001/api/chat
   ```

3. The MCP Client asks the MCP Server what tools are available:

   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "getTools",
     "params": {}
   }
   ```

4. The MCP Server returns the tool registry.

   Current tools:

   | Tool | Backend | Purpose |
   | --- | --- | --- |
   | `getProductsByBrand` | JSON Server | Find products by brand |
   | `addReviewToProduct` | JSON Server | Add a review by product ID |
   | `getReviewsByProductName` | GraphQL | Get reviews for a specific perfume |
   | `addReviewInGql` | GraphQL | Add a review by product name |
   | `getProductsWithMinRating` | RDF4J/SPARQL | Find products with rating above a threshold |
   | `addReviewInRdf` | RDF4J/SPARQL | Add a semantic RDF review |

5. The MCP Client sends the user's question, the available tools, database context, and conversation history to the LLM.

6. The LLM returns a strict JSON decision.

   Example:

   ```json
   {
     "selectedTool": "getProductsWithMinRating",
     "parameters": {
       "minRating": 4.5
     }
   }
   ```

7. The MCP Client calls the MCP Server again, this time asking it to execute the selected tool:

   ```json
   {
     "jsonrpc": "2.0",
     "id": 123456,
     "method": "executeTool",
     "params": {
       "toolName": "getProductsWithMinRating",
       "parameters": {
         "minRating": 4.5
       }
     }
   }
   ```

8. The MCP Server routes the request to the correct data client:

   - JSON operations go to `http://localhost:4000`
   - GraphQL operations go to `http://localhost:3000`
   - RDF/SPARQL operations go to `http://localhost:8080/rdf4j-server/repositories/grafexamen`

9. The selected backend returns raw data.

10. The MCP Client sends the raw result back to the LLM and asks it to produce a clean user-facing response.

11. The frontend displays the final answer, together with the tool that was used.

## Data Sources

### REST / JSON Server

The JSON backend stores classic product and review resources in `json-server/db.json`.

Example product:

```json
{
  "id": "1",
  "name": "Sauvage",
  "brand": "Dior",
  "category": "Men",
  "price": 120.5,
  "description": "A radically fresh composition, dictated by a name that has the ring of a manifesto."
}
```

Used for:

- Brand-based product search.
- Adding reviews to products by ID.

### GraphQL Server

The GraphQL backend defines `Product` and `Review` types in `graphql-server/schema.js`, with queries and mutations for structured access.

Main operations:

```graphql
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
```

Used for:

- Getting reviews by perfume name.
- Adding reviews by perfume name.

### RDF4J / SPARQL

The semantic backend uses RDF/Turtle data from `rdf-data/data.ttl`. The data models perfumes and reviews using schema.org vocabulary.

Example RDF product:

```turtle
ex:p1 a schema:Product ;
    schema:name "Aventus" ;
    schema:brand "Creed" ;
    schema:category "Men" ;
    schema:description "A fruity and rich fragrance." ;
    schema:review ex:r1 .
```

Example SPARQL query:

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

Used for:

- Semantic queries over ratings.
- Adding reviews as RDF triples through SPARQL `INSERT`.

## Setup

### Requirements

Install these before running the project:

- Node.js 18 or newer
- npm
- Apache Tomcat with RDF4J Server deployed
- RDF4J repository named `grafexamen`
- Groq API key, or an OpenAI-compatible API configuration

### Install Dependencies

From the project root:

```bash
npm install
```

Then install dependencies for each Node service:

```bash
cd json-server
npm install

cd ../graphql-server
npm install

cd ../mcp-server
npm install

cd ../mcp-client
npm install
```

Return to the root folder:

```bash
cd ..
```

## Environment Variables

Create a `.env` file inside `mcp-client/`.

```env
GROQ_API_KEY=your_api_key_here
MODEL=llama-3.3-70b-versatile
TEMPERATURE=0
MCP_SERVER_URL=http://localhost:5000/rpc
```

Optional OpenAI-compatible configuration:

```env
GROQ_API_KEY=your_api_key_here
BASE_URL=https://api.example.com/openai/v1
MODEL=your-model-name
```

The `.env` file is ignored by Git and should not be committed.

## RDF4J Setup

1. Start Apache Tomcat.
2. Open RDF4J Server in the browser:

   ```text
   http://localhost:8080/rdf4j-server
   ```

3. Create a repository named:

   ```text
   grafexamen
   ```

4. Import the Turtle file:

   ```text
   rdf-data/data.ttl
   ```

5. Make sure the SPARQL endpoint is available at:

   ```text
   http://localhost:8080/rdf4j-server/repositories/grafexamen
   ```

## Running The Project

First, make sure RDF4J/Tomcat is already running.

Then start all Node services from the project root:

```bash
npm start
```

This command starts:

- JSON Server on `http://localhost:4000`
- GraphQL Server on `http://localhost:3000`
- MCP Server on `http://localhost:5000`
- MCP Client on `http://localhost:5001`
- Frontend on `http://localhost:8081`

Open the application:

```text
http://localhost:8081
```

If PowerShell blocks the script, run:

```bash
cmd /c npm start
```

## Useful Individual Commands

Run only the JSON Server:

```bash
npm run start:json
```

Run only the GraphQL Server:

```bash
npm run start:graphql
```

Run only the MCP Server:

```bash
npm run start:mcp-server
```

Run only the MCP Client:

```bash
npm run start:mcp-client
```

Run only the frontend:

```bash
npm run start:frontend
```

## Demo Prompts

Use these prompts in the frontend chat to demonstrate the multi-backend routing.

### JSON Server

Find products by brand:

```text
Arata-mi toate parfumurile de la brandul Dior.
```

Add a review through REST:

```text
Adauga o recenzie pentru produsul cu ID-ul "1" (Sauvage). Autorul este Mihai, nota este 5, iar comentariul este "Un parfum extraordinar si foarte persistent!", data "2026-05-15T10:00:00Z".
```

### GraphQL

Get reviews by product name:

```text
Vreau sa vad ce recenzii exista pentru parfumul Baccarat Rouge 540.
```

Add a review through GraphQL:

```text
Adauga o recenzie pentru parfumul Santal 33. Autorul este Ioana, cu nota 4.8, comentariul "Este unic si seducator", publicata la data "2026-05-15T12:00:00Z".
```

### RDF4J / SPARQL

Find products by minimum rating:

```text
Arata-mi parfumurile care au un rating mai mare sau egal cu 4.5.
```

Add a semantic RDF review:

```text
Adauga o recenzie pentru parfumul Tobacco Vanille. Autorul recenziei este Andrei, nota oferita este 4.9, textul recenziei este "Un clasic elegant si cald", data "2026-05-15T14:30:00Z".
```

## API Reference

### Frontend to MCP Client

Endpoint:

```http
POST /api/chat
```

URL:

```text
http://localhost:5001/api/chat
```

Body:

```json
{
  "message": "Arata-mi parfumurile de la Dior"
}
```

Response:

```json
{
  "answer": "<strong>...</strong>",
  "action": "getProductsByBrand"
}
```

### MCP Client to MCP Server

Get available tools:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTools",
  "params": {}
}
```

Execute a tool:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "executeTool",
  "params": {
    "toolName": "getProductsByBrand",
    "parameters": {
      "brand": "Dior"
    }
  }
}
```

## Implementation Notes

- The MCP Client keeps a short conversation history and includes it in the LLM prompt.
- The LLM is instructed to return only valid JSON when choosing a tool.
- Tool execution is separated from tool selection. The LLM decides what should be called, but the MCP Server executes the actual code.
- The final natural language response is also generated by the LLM, using only the raw data returned by the selected backend.
- RDF operations use schema.org vocabulary and SPARQL queries against the `grafexamen` RDF4J repository.
- The architecture is intentionally split into several services to demonstrate interoperability between heterogeneous systems.

## Security Notes

- Do not commit `mcp-client/.env`.
- Do not commit API keys.
- `node_modules/` folders are ignored by `.gitignore`.
- The project is intended for local academic/demo use, not production deployment.

## Repository Description

A university Semantic Web project blending AI agents, MCP, REST, GraphQL, and RDF/SPARQL into a conversational perfume review platform.
