# Essences - Platformă de Recenzii pentru Parfumuri (Arhitectură MCP)

Acest proiect reprezintă o aplicație web inovatoare pentru gestionarea și interogarea unui catalog de parfumuri și a recenziilor asociate. Ceea ce face acest proiect special este **Arhitectura Bazată pe Agenți (AI)** și protocolul **MCP (Model Context Protocol)**. Pe scurt, în loc să dai click pe zeci de butoane pentru a filtra parfumuri, tu pur și simplu "vorbești" cu aplicația, iar Inteligența Artificială își dă seama singură de unde și cum să scoată datele.

Proiectul folosește simultan 3 tipuri diferite de baze de date pentru a demonstra interoperabilitatea sistemelor eterogene:
1. **REST API (JSON Server)** - o bază de date clasică.
2. **GraphQL Server** - o bază de date cu interogări structurate (graf).
3. **SPARQL / RDF4J Server** - o bază de date semantică.

---

## 🧠 Cum funcționează? (Flow-ul explicat pas cu pas)

Să luăm un exemplu simplu. Ești pe site și scrii în chat: *"Vreau să văd recenziile pentru parfumul Dior Sauvage."*
Iată traseul exact al acestui mesaj prin sistemul nostru, de la tine până la baza de date și înapoi:

### Pasul 1: Frontend-ul (Interfața)
Tu scrii mesajul în browser (aplicația vizuală). Când apeși pe butonul de trimitere, frontend-ul ia textul tău și îl trimite mai departe, via HTTP POST, către "Creierul" aplicației (MCP Client).

### Pasul 2: MCP Client (Creierul AI)
Mesajul tău ajunge la **MCP Client** (care ascultă pe portul 5001).
1. MCP Client-ul primește mesajul.
2. Întreabă imediat MCP Server-ul (Serverul de unelte): *"Hei, ce unelte (funcții de baze de date) am la dispoziție ca să rezolv ce vrea utilizatorul?"*
3. MCP Server-ul îi răspunde cu o listă completă de unelte: *"Uite, am funcția `getReviewsByProductName`, am `getProductsWithMinRating`, etc."*
4. Clientul MCP trimite apoi toată această listă de funcții împreună cu mesajul tău către un **Model de Inteligență Artificială (LLM - ex: Groq, Llama, ChatGPT)**.
5. AI-ul gândește: *"Aha, userul vrea recenzii pentru Dior Sauvage. Funcția perfectă pentru asta este `getReviewsByProductName`, iar parametrul pe care trebuie să i-l dau este 'Dior Sauvage'."*

### Pasul 3: MCP Server (Muncitorul)
AI-ul îi spune Clientului MCP ce decizie a luat. Clientul MCP împachetează această decizie și o trimite către **MCP Server** (care ascultă pe portul 5000).
1. MCP Server primește comanda precisă: *Te rog, execută funcția `getReviewsByProductName` cu numele 'Dior Sauvage'*.
2. MCP Server știe (conform logicii din codul `dataClients.js`) că această funcție specifică trebuie să interogheze **Serverul GraphQL**. Dacă ar fi fost altă funcție, poate interoga Serverul JSON sau RDF.
3. Trimite cererea către baza de date GraphQL.
4. Baza de date returnează informațiile efective (recenziile găsite).

### Pasul 4: Formularea Răspunsului Final
Datele brute, fix așa cum vin din baza de date (niște JSON-uri cu paranteze), ajung înapoi la **MCP Client**.
1. MCP Client-ul nu îți va afișa pe ecran acele coduri urâte, așa că mai dă o ultimă sarcină către AI: *"Uite ce date am primit din baza de date. Formulează un răspuns conversațional, natural și politicos (cu formatare HTML, gen text îngroșat sau rând nou) pentru utilizator, bazat STRICT pe aceste date."*
2. AI-ul citește datele și formulează mesajul final: *"Sigur! Pentru Dior Sauvage am găsit următoarea recenzie: 4.5 stele din partea lui Ion Popescu..."*
3. Acest mesaj umanizat este trimis către Frontend și afișat frumos pe ecranul tău, completând astfel bucla cererii!

---

## 🏛 Structura Tehnică a Proiectului

Aplicația este decuplată (ruptă) în mai multe microservicii complet independente:
1. **`/frontend`**: Interfața cu utilizatorul scrisă în HTML/CSS/JS (Port: 8081).
2. **`/mcp-client`**: Orchestratorul AI. Discută cu API-urile de Inteligență Artificială și ia decizii. El este singurul care reține istoricul conversației. (Port: 5001).
3. **`/mcp-server`**: Serverul ce expune protocolul JSON-RPC. Aici stau declarate toate funcțiile de acțiune (`tools`). El preia comenzi ferme de la client și trage efectiv datele din DB-uri. (Port: 5000).
4. **`/graphql-server`**: Server de tip GraphQL (Port: 3000).
5. **`/json-server`**: Server de tip REST API bazat pe un fișier local `db.json` (Port: 4000).
6. **RDF4J Server**: O bază de date separată bazată pe Semantic Web (SPARQL), care e ținută în viață de un server web Apache Tomcat (Port 8080).

---

## 💻 Explicații Tehnice (Pentru prezentarea codului sursă)

Dacă vei primi întrebări tehnice despre "Cum se întâmplă X în cod?", iată punctele cheie ale implementării:

### 1. Extragerea intenției prin LLM (`mcp-client/llmService.js`)
Acesta este nucleul aplicației. Când utilizatorul trimite un mesaj, funcția `handleUserQuery`:
- **Preluarea uneltelor:** Face un request către MCP Server pentru a afla ce funcții există (`getAvailableTools`).
- **Prompt Engineering (Partea 1):** Îi oferă LLM-ului structura bazelor de date, istoricul conversației și lista de unelte. Îi impune (printr-un prompt strict) să răspundă **DOAR** cu un format JSON de tipul: `{"selectedTool": "nume_functie", "parameters": {"param1": "valoare"}}`.
- **Apelul JSON-RPC:** După ce JSON-ul este parsat în cod (linia `JSON.parse(responseText)`), Clientul construiește un obiect de tip **JSON-RPC 2.0** (standard de comunicare) și face un request HTTP `POST` către MCP Server (pe portul 5000) ca să execute acea funcție cu parametrii aleși de AI.
- **Prompt Engineering (Partea 2):** După ce MCP Server întoarce rezultatele din baza de date, Clientul îi dă LLM-ului datele brute și îi cere să le "traducă" într-un mesaj prietenos cu formatare HTML nativă, fără a halucina link-uri. Tot aici se actualizează manual istoricul conversației (`conversationHistory.push()`).

### 2. Dispeceratul (Rutarea) în `mcp-server/index.js` și `tools.js`
Aici se întâmplă legătura dintre decizia AI-ului și executarea codului propriu-zis.
- Serverul Express ascultă pe ruta `/rpc`.
- Când primește un payload, verifică valoarea câmpului `method`. 
- Dacă `method === "executeTool"`, extrage `toolName` și `parameters` și apelează funcția `executeTool` din `tools.js`.
- În `tools.js` există un `switch` uriaș. Dacă AI-ul a zis `getProductsWithMinRating`, `switch`-ul va apela automat funcția `clients.rdfGetProductsWithMinRating` din fișierul `dataClients.js`.

### 3. Clienții de Baze de Date (`mcp-server/dataClients.js`)
Aici se află integrarea cu cele 3 paradigme diferite de stocare, toate apelate folosind biblioteca `axios`:
- **JSON Server:** Folosește request-uri HTTP REST standard (`axios.get` sau `axios.post` către URL-ul resursei `/products` sau `/reviews`).
- **GraphQL:** Face un `axios.post` către endpoint-ul de GraphQL trimițând un body specific ce conține query-ul GraphQL: `{ query: "...queryul aici...", variables: {...} }`. Datele se află în interiorul câmpului `data` al răspunsului.
- **RDF4J (SPARQL):** Face cereri `axios.get` pentru citire trimițând interogări **SPARQL**. Interogările folosesc ontologii și prefixe standard precum `schema:Product` sau `schema:Review`. De exemplu, funcția `rdfGetProductsWithMinRating` filtrează rating-urile folosind direct `FILTER (?rating >= ${minRating})` în limbaj SPARQL, returnând doar datele care se potrivesc tiparelor din graful de cunoștințe. Atunci când se adaugă un review, se folosește un query de tip `INSERT` cu un update SPARQL.

---

## 🚀 Cum să instalezi și să pornești proiectul

### Pre-rechizite (Ce îți trebuie instalat în prealabil)
1. **Node.js** (recomandat v18 sau mai nou) instalat pe calculator.
2. Serverul **Apache Tomcat** având aplicația **RDF4J Server** funcțională pe portul `8080` (și un repository/bază de date creat în RDF4J cu numele exact `grafexamen`).
3. O cheie API valabilă de la Groq (sau OpenAI) pentru a folosi Inteligența Artificială.

### Instalare
Deschide un terminal în **folderul principal al proiectului** (`proiectweb`) și rulează comanda pentru a instala dependențele globale (pachetul care ne ajută să pornim totul dintr-un singur buton):
```bash
npm install
```

Apoi, asigură-te că instalezi dependențele din interiorul fiecărui sub-proiect:
```bash
cd json-server && npm install
cd ../graphql-server && npm install
cd ../mcp-server && npm install
cd ../mcp-client && npm install
```

### Configurare Cheie API
Du-te în folderul `mcp-client` și creează un fișier de configurare numit exact `.env`. Pune cheia ta API în interiorul lui:
```env
# mcp-client/.env
GROQ_API_KEY=cheia_ta_aici_fara_spatii
# Daca folosesti OpenAI, adauga variabila BASE_URL si inlocuieste cheia
```

### Pornirea aplicației (Magic Button)
Mai întâi, asigură-te că **Tomcat (RDF4J)** este pornit manual în fundal.

Apoi, deschide un terminal în **folderul rădăcină (principal)** al proiectului și scrie pur și simplu comanda magică:
```bash
npm start
```
*(Notă: Dacă ești pe Windows și folosești PowerShell iar comanda de mai sus îți dă vreo eroare de permisiuni, scrie: `cmd /c npm start`)*

**Ce se întâmplă acum?** 
Această comandă va apela pachetul `concurrently` și va lansa automat și simultan toate cele 5 servicii de Node.js (Frontend, Json Server, Graphql, MCP Client, MCP Server). Astfel, nu mai trebuie să te chinui să deschizi 5 ferestre negre de terminal una câte una!

Dacă totul s-a pornit cu succes, va apărea un link în consolă. Deschide browserul la adresa: `http://localhost:8081` și interacționează cu aplicația ta!

---

## 🧪 Prompturi pentru Prezentare (Testare Multi-Backend)

Pentru a demonstra profesorilor funcționalitatea completă a sistemului de rutare inteligentă, mai jos sunt pregătite 6 prompturi. Pentru fiecare din cele 3 baze de date (JSON Server, GraphQL, RDF4J) există un prompt de **Selectare** (pentru a interoga date despre parfumuri) și un prompt de **Adăugare** (pentru a adăuga o recenzie nouă). Copiază aceste prompturi direct în interfața de chat.

### 1. JSON Server (REST API)
- **Prompt Selectare:** `Arată-mi te rog toate parfumurile de la brandul Dior.` *(Acest prompt va declanșa `getProductsByBrand` pe JSON Server)*
- **Prompt Adăugare:** `Adaugă o recenzie pentru produsul cu ID-ul "1" (Sauvage). Autorul este Mihai, nota este 5, iar comentariul: "Un parfum extraordinar și foarte persistent!", data "2026-05-15T10:00:00Z".` *(Acest prompt va declanșa automat `addReviewToProduct` fără a specifica serverul)*

### 2. GraphQL Server
- **Prompt Selectare:** `Vreau să văd ce recenzii există pentru parfumul Baccarat Rouge 540.` *(Acest prompt va declanșa `getReviewsByProductName` pe GraphQL)*
- **Prompt Adăugare:** `Adaugă o recenzie pentru parfumul Santal 33. Autorul este Ioana, cu nota 4.8, comentariul "Este unic și seducător", publicată la data "2026-05-15T12:00:00Z".` *(Acest prompt va declanșa automat `addReviewInGql`)*

### 3. RDF4J Server (SPARQL Semantic Web)
- **Prompt Selectare:** `Arată-mi parfumurile care au un rating mai mare sau egal cu 4.5.` *(Acest prompt va declanșa `getProductsWithMinRating` pe serverul RDF4J)*
- **Prompt Adăugare:** `Adaugă o recenzie pentru parfumul Tobacco Vanille. Autorul recenziei este Andrei, nota oferită este 4.9, textul recenziei este "Un clasic elegant și cald", data "2026-05-15T14:30:00Z".` *(Acest prompt va declanșa automat `addReviewInRdf`)*
