# Data Server - Film Catalog Service

## Overview

The Data Server is a **Spring Boot REST API** that manages static film catalog data. It provides read-only access to comprehensive film information including movies, actors, crew, genres, and poster links. All data is persisted in a PostgreSQL database for reliable, queryable access.

## Purpose

- **Film Catalog Management**: Serves film metadata (title, year, rating, description, etc.)
- **Genre & Cast Data**: Provides genre classifications and actor/crew information
- **Poster Management**: Stores and retrieves poster image links
- **Search & Discovery**: Enables film discovery through top films, genre filtering, and search
- **Static Data Access**: Efficiently queries PostgreSQL for stable, reference data
- **API Endpoints**: RESTful API for the central gateway to consume

## Architecture

```
Central Server (Port 3000)
    ↓ (HTTP REST)
Data Server (Port 8081)
    ↓
PostgreSQL Database
    ├─ movies table (films metadata)
    ├─ genres table (genre classifications)
    ├─ actors table (cast information)
    ├─ crew table (director, writer, producer, etc.)
    ├─ posters table (poster image links)
    └─ releases table (release information by country)
```

## Running the Server

### Prerequisites
- Java 17+
- Maven 3.6+
- PostgreSQL running on `localhost:5432`
- Database `SQLDB` created with user credentials

### Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE SQLDB;
```

2. Create a user (if not exists):
```sql
CREATE USER postgres WITH PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE SQLDB TO postgres;
```

3. Load CSV data into database tables (see data migration section below)

### Installation & Build

```bash
# Build the project
mvn clean install

# Or run directly with Maven
mvn spring-boot:run
```

### Configuration

Edit `src/main/resources/application.yml`:

```yaml
server:
  port: 8081

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/SQLDB
    username: postgres
    password: admin
  jpa:
    hibernate:
      ddl-auto: update  # Options: validate, update, create, create-drop
    show-sql: true     # Set to false in production
```

### Start the Server

```bash
mvn spring-boot:run
```

The server will start on `http://localhost:8081`

## REST API Endpoints

### Films
- `GET /films` - List all films (with pagination)
  - Query params: `page`, `size`
  - Returns: List of FilmDTO objects

- `GET /films/{id}` - Get film details by ID
  - Returns: Complete film information with cast, crew, genres

- `GET /films/top10` - Get top 10 films by rating
  - Returns: Top-rated films with poster and tagline

- `GET /films/genre/{genre}` - Find films by genre
  - Returns: Up to 10 films matching the genre

- `GET /films/search?title={title}` - Search films by title
  - Returns: Films matching the search query

### Genres
- `GET /genres` - List all genres
- `GET /genres/{genre}` - Get films in a specific genre

### Cast & Crew
- `GET /films/{id}/cast` - Get actors/cast for a film
- `GET /films/{id}/crew` - Get crew (director, writer, etc.) for a film

### Posters
- `GET /films/{id}/poster` - Get poster link for a film

## API Documentation

Interactive API documentation available at:
```
http://localhost:8081/swagger-ui.html
```

Or access OpenAPI spec at:
```
http://localhost:8081/v3/api-docs
```

## Project Structure

```
data-server/
├── pom.xml                              # Maven dependencies
├── src/main/
│   ├── java/com/example/films/
│   │   ├── FilmsApplication.java       # Spring Boot main class
│   │   ├── controller/
│   │   │   └── FilmController.java     # REST endpoints
│   │   ├── service/
│   │   │   └── FilmService.java        # Business logic
│   │   ├── repository/
│   │   │   ├── FilmRepository.java     # Film data access
│   │   │   ├── GenreRepository.java    # Genre data access
│   │   │   └── PosterRepository.java   # Poster data access
│   │   ├── model/
│   │   │   ├── Film.java               # JPA entity for movies table
│   │   │   ├── Genre.java              # JPA entity for genres
│   │   │   └── Poster.java             # JPA entity for posters
│   │   └── dto/
│   │       └── FilmDTO.java            # Data transfer object
│   └── resources/
│       └── application.yml             # Configuration
└── README.md                            # This file
```

## Data Models

### Film Entity
Maps to `movies` table:
```java
{
  id: Integer,                // Film ID (primary key)
  title: String,              // Movie title
  year: Integer,              // Release year
  description: String,        // Plot description
  tagline: String,            // Movie tagline/slogan
  duration: Integer,          // Duration in minutes
  rating: Double              // IMDb or average rating
}
```

### Genre Entity
Maps to `genres` table:
```java
{
  id: Integer,
  filmId: Integer,            // Foreign key to movies
  genre: String               // Genre name (e.g., "Drama", "Action")
}
```

### Poster Entity
Maps to `posters` table:
```java
{
  id: Integer,
  filmId: Integer,            // Foreign key to movies
  link: String                // URL to poster image
}
```

### FilmDTO (Response Object)
```java
{
  id: Integer,
  title: String,
  year: Integer,
  rating: Double,
  description: String,
  tagline: String,
  duration: Integer,
  genres: List<String>,       // List of genre names
  posterUrl: String,          // Poster image URL
  cast: List<Actor>,          // Cast members
  crew: Map<String, String>   // Director, writer, etc.
}
```

## Data Migration (CSV to PostgreSQL)

To load data from CSV files to PostgreSQL:

1. **Using psql COPY command**:
```sql
COPY movies FROM '/path/to/movies.csv' WITH (FORMAT csv, HEADER true);
COPY genres FROM '/path/to/countries.csv' WITH (FORMAT csv, HEADER true);
COPY actors FROM '/path/to/actors.csv' WITH (FORMAT csv, HEADER true);
COPY posters FROM '/path/to/posters.csv' WITH (FORMAT csv, HEADER true);
```

2. **Using pgAdmin GUI**:
   - Import CSV files into respective tables through pgAdmin interface

3. **Using Spring Data JPA**:
   - Create a data loader service that reads CSVs and persists via repositories

## Key Features

1. **Read-Only API**: Film data is not modified via API (supports data integrity)
2. **Efficient Querying**: PostgreSQL indexes for fast lookups
3. **Data Transfer Objects**: Clean separation between entities and API responses
4. **Type Safety**: Strongly typed Java/Spring application
5. **API Documentation**: Auto-generated Swagger documentation
6. **Error Handling**: Proper HTTP status codes and error messages
7. **Pagination**: Support for paginated results in large datasets
8. **Relationship Loading**: Efficient loading of related genres, cast, crew

## Dependencies

- **spring-boot-starter-web**: REST API framework
- **spring-boot-starter-data-jpa**: ORM and database access
- **postgresql**: PostgreSQL JDBC driver
- **springdoc-openapi**: OpenAPI/Swagger documentation
- **lombok**: Reduces boilerplate code (optional)
- **h2**: In-memory database for testing

## Development

### Running Tests
```bash
mvn test
```

### Building JAR
```bash
mvn clean package
```

### Database Schema Auto-Generation
With `ddl-auto: update`, Hibernate will:
- Create tables if they don't exist
- Add new columns if entities change
- Keep existing data intact

For production, use `ddl-auto: validate` to prevent auto-modifications.

## Performance Considerations

1. **Database Indexes**: Ensure indexes on frequently queried columns (title, genre, rating)
2. **Pagination**: Large result sets should be paginated
3. **Connection Pooling**: HikariCP automatically manages database connections
4. **Lazy Loading**: Consider lazy vs eager loading of relationships
5. **Caching**: Can add Spring Cache for frequently accessed data

## Common Issues & Solutions

### PostgreSQL Connection Failed
```
Error: org.postgresql.util.PSQLException: Connection refused
```
**Solution**: Ensure PostgreSQL is running and credentials are correct in `application.yml`

### Table Not Found
```
Error: Relation "movies" does not exist
```
**Solution**: Load CSV data or set `ddl-auto: create` to auto-create tables

### Out of Memory
**Solution**: Increase JVM heap size:
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--server.tomcat.threads.max=200"
```

### Slow Queries
**Solution**: Add database indexes or enable query logging with `show-sql: true`

## Database Backup & Recovery

### Backup
```bash
pg_dump -U postgres SQLDB > backup.sql
```

### Restore
```bash
psql -U postgres SQLDB < backup.sql
```

## Security Notes

- **Default Credentials**: Change default `postgres` password in production
- **Read-Only API**: Current implementation is read-only, which is good for data integrity
- **SQL Injection**: JPA prevents SQL injection through parameterized queries
- **CORS**: Configure appropriately in application.yml for production

## Monitoring & Logging

Enable detailed logging by updating `application.yml`:
```yaml
logging:
  level:
    com.example.films: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
```

## Important Notes

- **Static Data**: This service handles static, reference data (not frequently changing)
- **No Authentication**: Current implementation has no authentication/authorization - add for production
- **Database Required**: Cannot function without PostgreSQL connection
- **Large Dataset**: With 940,000+ films, ensure proper pagination for API calls
- **Related Service**: Pair with Review Server for complete film data + reviews

## Support

For issues or questions, refer to:
- API Documentation: `http://localhost:8081/swagger-ui.html`
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Spring Boot Documentation: https://spring.io/projects/spring-boot
- Project Report: `../../Report/`
- Central Server Documentation: `../central-server/README.md`
