# Film Data Web Application - Technical Report

## Introduction

This project is a comprehensive film discovery and analysis system combining microservices web architecture (IUM-TWEB: 6 credits) with large-scale data analytics (IUM: 3 credits). The system processes 940,000+ films with 5.7 million actor records and provides both a web interface and analytical notebooks for exploring film data across multiple dimensions.

The project demonstrates integration of modern web technologies (Express.js, Spring Boot, MongoDB, PostgreSQL) with Python data science tools (Pandas, Plotly, GeoPandas) to create a scalable, multi-layered data platform.

---

## TWEB Component: Microservices Web Architecture

### 1. Central API Gateway (Express.js)

**Design & Motivation**: Acts as a single entry point for all client requests, routing to specialized backend services. This gateway pattern isolates the frontend from backend complexity while enabling fast, lightweight coordination.

**Implementation**: Node.js Express server proxying requests to Film Data Service (port 8081) and Review Service (port 3002), serving frontend assets, and providing Swagger documentation.

**Issues Resolved**: 
- CORS handling between multiple services
- Request routing and error propagation
- Frontend asset serving strategy

**Requirements Met**:
- ✓ Fast, non-heavy processing (delegates to services)
- ✓ Serves thousands of concurrent users
- ✓ OpenAPI documentation
- ✓ Proper error handling and logging

**Limitations**: Single gateway is a potential bottleneck; future versions could use load balancing.

---

### 2. Film Data Service (Spring Boot + PostgreSQL)

**Design & Motivation**: Dedicated REST API for static film catalog data. Spring Boot provides robust JPA/Hibernate ORM, PostgreSQL ensures ACID compliance for reference data.

**Implementation**: 
- JPA entities for Film, Genre, Poster, Actor, Crew
- Repository pattern for data access
- Service layer for business logic
- Swagger/OpenAPI documentation
- Read-only endpoints (data integrity)

**Issues Resolved**: 
- Efficient queries for large datasets (940K+ films)
- N+1 query problems through lazy loading strategy
- Relationship management (one film → many genres/actors)

**Requirements Met**:
- ✓ Static data stored in PostgreSQL
- ✓ RESTful endpoints with proper DTOs
- ✓ Comprehensive Swagger documentation
- ✓ Efficient pagination for large result sets

**Limitations**: No full-text search; genre filtering is basic partial matching. Schema assumes denormalized data from CSV import.

---

### 3. Review Service (Node.js + MongoDB + Socket.io)

**Design & Motivation**: Dedicated service for dynamic data (reviews, users, chat). MongoDB provides schema flexibility for evolving review data. Socket.io enables real-time bidirectional communication for chat.

**Implementation**:
- Mongoose schemas for User, Review, ChatMessage
- REST API for CRUD operations
- Socket.io namespaces per film for chat rooms
- Event-driven messaging architecture

**Issues Resolved**:
- Real-time synchronization of chat messages across clients
- Handling disconnects and reconnection
- Broadcasting messages to specific rooms (film-based)
- User session management without authentication

**Requirements Met**:
- ✓ Dynamic data stored in MongoDB
- ✓ Socket.io chat system implementation
- ✓ Film-specific discussion rooms
- ✓ User management (nickname, email)
- ✓ Rotten Tomatoes review storage

**Limitations**: No authentication/authorization; passwords stored in plain text (development only); message persistence needs optimization for large volumes.

---

### 4. Frontend (Express.js + Handlebars)

**Design & Motivation**: Server-rendered Handlebars templates with Bootstrap responsive design. Express routes handle page rendering and API coordination.

**Implementation**:
- Route: `/` - Home page with carousels and sliders
- Route: `/search` - Search results with filtering
- Route: `/film-detail` - Film details, reviews, and chat interface
- Client-side Axios for dynamic API calls
- Socket.io client for chat connections

**Issues Resolved**:
- Responsive carousel implementation
- Server-side search with API integration and sorting
- Chat room initialization and message rendering
- Cross-origin requests handled through Central Server

**Requirements Met**:
- ✓ HTML + CSS + JavaScript + Handlebars page
- ✓ Queries sent to central server
- ✓ Chat system using Socket.io
- ✓ Film and actor browsing interface
- ✓ Responsive Bootstrap design

**Limitations**: Limited to server-side rendering; no progressive web app features; image optimization needed for performance.

---

## IUM Component: Data Analytics

### Data Cleaning Notebooks

**Design & Motivation**: Jupyter notebooks systematically clean and validate CSV data before database import. Multi-stage cleaning ensures data quality.

**Cleaning Steps**:
1. Load CSVs with Pandas
2. Handle missing values and duplicates
3. Remove special characters and BOM markers
4. Normalize country/genre names (USA → United States, UK → United Kingdom)
5. Merge datasets on film ID
6. Export cleaned CSVs for database import

**Issues Resolved**:
- Character encoding issues (ZWNBSP removal in actor names)
- Inconsistent country naming across datasets
- Column renaming after merges to maintain readability
- Handling 5.7M+ actor records and 13M+ release entries

---

### Analysis Notebook (CinemaInsights_StoryDrivenAnalysis)

**Design & Motivation**: A single story-driven notebook that guides the reader through world cinema data, answering questions like "which countries make the best films?" and "how has quality evolved over 150 years?". Uses Plotly and GeoPandas for interactive and geographic visualizations.

**Structure**:
1. Data loading from cleaned CSVs
2. Data preparation (year extraction, numeric conversion)
3. Basic distribution statistics
4. Pattern discovery (genre quality vs volume, geographic excellence)
5. Interactive visualizations (5 main charts + animated maps)
6. Genre × country specialization heatmap

**Visualizations**:
- Geographic excellence bar chart (top 15 countries by average rating)
- Genre quality vs volume scatter plot (log scale)
- Quality stability over time (rating trend + production volume)
- Animated maps of quality by genre and by year (Action genre deep-dive)
- Genre × country specialization heatmap (top 20 countries × 6 genres)

**Libraries Used**:
- **Plotly**: Interactive charts and animated maps
- **GeoPandas**: Geographic data analysis
- **Pandas / NumPy**: Data manipulation and statistics
- **country_converter**: Country name normalization

**Issues Resolved**:
- Country name normalization across different datasets using `country_converter`
- Axis scale handling for wide production volume ranges (log scale)
- Animated map frame alignment across genres and years
- Filtering low-sample countries to avoid misleading averages

**Requirements Met**:
- ✓ Jupyter notebook in executed format with all graphs visible
- ✓ Wide variety of visualizations (geographic, statistical, interactive, animated)
- ✓ Queries on dataset subsets for focused analysis
- ✓ Statistical analysis of film trends by country, genre, and decade

---

## Requirements Compliance

The solution meets all assignment requirements:

| Requirement | Implementation |
|---|---|
| Express + Java servers | Central Server (Express) + Data Server (Spring Boot) ✓ |
| MongoDB + PostgreSQL | Review Service (MongoDB), Data Service (PostgreSQL) ✓ |
| Socket.io chat | Review Service with film-specific rooms ✓ |
| Jupyter analytics | GenresAnalysis + ThemeStudiosAnalysis notebooks ✓ |
| REST APIs | 20+ endpoints across 3 services ✓ |
| API documentation | Swagger/OpenAPI on all services ✓ |
| Web interface | Website with search, details, chat ✓ |
| Dependencies declared | requirements.txt (Python) + package.json (Node.js) + pom.xml (Java) ✓ |
| Comprehensive documentation | README files in each server directory ✓ |

---

## Limitations & Future Improvements

**Current Limitations**:
- No user authentication/authorization
- Single-instance deployment (no load balancing)
- Limited search capabilities (no full-text indexing)
- Synchronous API calls in frontend
- Chat messages not persisted beyond session

**Extensibility**:
- Database schemas can adapt to additional film metadata
- Modular service architecture allows adding film recommendation engine
- Notebooks can analyze additional datasets with equivalent structure
- Chat can be extended to actor/director/studio discussion threads

---

## Conclusions

This project successfully integrates modern microservices architecture with data science tools. Key learning outcomes:

- **Web Architecture**: Understanding of API gateway patterns, microservices decoupling, and database selection based on data characteristics
- **Real-Time Systems**: Implementation of WebSocket-based communication with room management
- **Data Science**: Processing 940K+ records with Pandas, creating geographic visualizations, statistical analysis
- **DevOps**: Docker-compatible structure, environment configuration, dependency management
- **Software Engineering**: Code documentation, API design, error handling, version control

The dual-platform approach (web + analytics) demonstrates how modern applications combine user-facing interfaces with backend data processing.

---

## Division of Work

**All team members contributed to both IUM and IUM-TWEB components.**

### Alessandro Senia

**TWEB**:
- Spring Boot Data Server: entity design, JPA repositories, REST controllers, Swagger documentation
- Frontend-backend integration: connecting the central server to the Spring Boot service
- Search page: backend endpoint and frontend rendering
- CSS/style fixes and rating display corrections

**IUM**:
- CSV data cleaning notebooks (`Pulizia_actors.ipynb`, `Pulizia_movies.ipynb`, `Pulizia_Crew.ipynb`, `Pulizia_releases.ipynb`, `Pulizia_studios.ipynb`, `Pulizia_Countries_Genres_Languages_Themes.ipynb`, `Pulizia_rottentomatoes_reviews.ipynb`)
- Second analysis notebook development

---

### Salvatore Pierri

**TWEB**:
- Review Server: Node.js + MongoDB + Socket.io setup, user and review REST API, real-time chat rooms
- Film detail pages: frontend UI, review display, chat integration
- Handlebars templating: conversion from static HTML to `.hbs` templates
- Website refactoring: project structure reorganization, carousel and navbar UI
- Project documentation

**IUM**:
- Analysis notebook (`CinemaInsights_StoryDrivenAnalysis.ipynb`): interactive visualizations, animated geographic maps, genre × country heatmap
- Geographical plot development

---

## Extra Information

**Setup & Execution**:
- All servers run independently on different ports (3000, 3001, 3002, 8081)
- PostgreSQL and MongoDB must be pre-configured
- CSV data must be imported to PostgreSQL before running
- Environment variables in `.env` files configure service URLs
- Jupyter notebooks can run independently of web services

**Deployment Considerations**:
- Frontend proxies through Central Server (CORS)
- Data migrations needed for production
- MongoDB should be replica set for redundancy
- PostgreSQL requires backup strategy
- Consider API rate limiting in production

**Git History**:
- Regular commits showing incremental progress
- Branch structure: features per service
- First commit: 11 January 2025
- Focus on IUM completed before full TWEB integration

---

## Bibliography

[1] Express.js Documentation: https://expressjs.com/
[2] Spring Boot Documentation: https://spring.io/projects/spring-boot
[3] MongoDB Documentation: https://docs.mongodb.com/
[4] PostgreSQL Documentation: https://www.postgresql.org/docs/
[5] Plotly Python Documentation: https://plotly.com/python/
[6] Pandas Documentation: https://pandas.pydata.org/docs/
[7] GeoPandas Documentation: https://geopandas.org/
[8] Folium Documentation: https://python-visualization.github.io/folium/
[9] Socket.io Documentation: https://socket.io/docs/
[10] Bootstrap Documentation: https://getbootstrap.com/

**Tools Used**: Generative AI assisted with code generation and documentation when needed. All implementations verified and customized for project requirements.