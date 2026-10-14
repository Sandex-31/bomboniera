# Film Data Web Application

A comprehensive film discovery platform combining data analytics, web technologies, and real-time communication. Built for the IUM-TWEB course at Università di Torino (2024-2025).

## 🎬 Project Overview

This project provides a complete system for accessing and analyzing film data across multiple microservices:
- **Central API Gateway** - Orchestrates requests to backend services
- **Film Data Service** - PostgreSQL-backed REST API for static film catalog
- **Review Service** - MongoDB-backed REST API with Socket.io chat
- **Web Frontend** - Interactive Express.js + Handlebars interface
- **Data Analytics** - Jupyter Notebooks for exploratory data analysis

Designed to handle 940,000+ films with 5.7M+ actor records and process dynamic reviews using modern web technologies.

## 🏗️ Architecture

```
┌─────────────────┐
│  Web Browser    │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/WebSocket
┌────────▼──────────────────┐
│  Central Server (3000)    │ Express.js API Gateway
└────────┬──────────────────┘
         │
      ┌──┴──┐
      │     │
┌─────▼──┐ ┌▼──────────┐
│ Data   │ │  Review   │
│Service │ │  Service  │
│(8081)  │ │  (3002)   │
└─────┬──┘ └────┬──────┘
      │         │
┌─────▼──────┐ ┌▼───────────┐
│ PostgreSQL │ │ MongoDB    │
│ (Films)    │ │ (Reviews)  │
└────────────┘ └────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+, npm
- Java 17+, Maven
- PostgreSQL 12+
- MongoDB 4.4+

### Installation & Running

1. **Install dependencies** for all services:
```bash
# Central Server
cd TWEB/solution/central-server && npm install

# Review Server  
cd ../review-server && npm install

# Frontend
cd ../Website && npm install

# Python Analytics (optional)
cd ../../../IUM/Pulizia\ CSV && pip install -r requirements.txt
```

2. **Start PostgreSQL & MongoDB**:
```bash
# Windows: Run MongoDB and PostgreSQL services
# macOS: brew services start postgresql-14 && brew services start mongodb-community
# Linux: sudo systemctl start postgresql && sudo systemctl start mongod
```

3. **Start the servers** (in separate terminals):
```bash
# Data Service (Java Spring Boot)
cd TWEB/solution/data-server && mvn spring-boot:run

# Review Service (Node.js)
cd TWEB/solution/review-server && npm start

# Central Server (Node.js Gateway)
cd TWEB/solution/central-server && npm start

# Frontend (Node.js Express)
cd TWEB/solution/Website && npm start
```

4. **Access the application**:
- Web UI: http://localhost:3000
- API Docs: http://localhost:3000/api-docs
- Review API Docs: http://localhost:3002/api-docs

## 📁 Project Structure

```
Project_IUM_TWEB/
├── TWEB/solution/                          # Web Application
│   ├── central-server/                     # API Gateway (Express.js)
│   │   ├── routes/                         # API endpoints
│   │   ├── services/                       # HTTP client to backends
│   │   └── README.md                       # Detailed documentation
│   ├── data-server/                        # Film Data API (Spring Boot)
│   │   ├── src/main/java/                  # JPA entities, controllers, services
│   │   └── README.md                       # Database & schema docs
│   ├── review-server/                      # Reviews & Chat API (Node.js)
│   │   ├── services/                       # MongoDB operations
│   │   └── README.md                       # Socket.io & data models
│   └── Website/                            # Frontend (Express.js)
│       ├── routes/                         # Page routes
│       ├── views/                          # Handlebars templates
│       ├── public/                         # CSS, JS, images
│       └── README.md                       # UI documentation
│
├── IUM/                                    # Data Analytics
│   ├── JupiterNotebooks/                   # Jupyter analysis notebooks
│   │   └── CinemaInsights_StoryDrivenAnalysis.ipynb  # World cinema analysis
│   └── Pulizia\ CSV/                       # Data cleaning scripts
│       ├── Pulizia_*.ipynb                 # CSV cleaning notebooks
│       └── requirements.txt                # Python dependencies
│
├── Report/                                 # Project documentation
│   └── IUM-TWEB Report.md                  # Technical report
├── Self Assessment/                        # Self-assessment form
└── TWEB/QueryScreenshot/                   # API response screenshots
```

## 🔧 Technologies

| Component | Stack |
|-----------|-------|
| **Frontend** | Express.js, Handlebars, Bootstrap 5, Axios |
| **API Gateway** | Express.js, Swagger/OpenAPI, CORS |
| **Film Data** | Spring Boot, JPA/Hibernate, PostgreSQL |
| **Reviews & Chat** | Node.js, Mongoose, MongoDB, Socket.io |
| **Analytics** | Jupyter, Pandas, Plotly, GeoPandas |
| **Database** | PostgreSQL (static data), MongoDB (dynamic data) |

## 📊 Data

The application processes:
- **940,000+** films with metadata (title, year, rating, description)
- **5.7M+** actor-film relationships
- **4.7M+** crew records (directors, writers, producers)
- **13M+** release information by country
- **1.1M+** Rotten Tomatoes reviews
- **10K+** Oscar award records

## ✨ Features

### For Fans & Journalists
- 🔍 **Search** films by title, genre, year, rating
- ⭐ **Discover** top-rated films and trending genres
- 💬 **Real-time Chat** in film-specific discussion rooms
- 📝 **Reviews** from professional critics and users
- 🎬 **Film Details** with more details about the Film

### Analytics
- 📈 **Interactive Dashboards** using Plotly visualizations
- 🌍 **Geographic Analysis** with GeoPandas mapping
- 📊 **Statistical Analysis** of film trends by country, genre, studio
- 🎭 **Theme & Actor Analysis** with network visualizations

## 🗂️ Detailed Documentation

- **[Central Server](TWEB/solution/central-server/README.md)** - API Gateway architecture and endpoints
- **[Data Server](TWEB/solution/data-server/README.md)** - PostgreSQL schema and JPA models
- **[Review Server](TWEB/solution/review-server/README.md)** - MongoDB models and Socket.io chat
- **[Frontend](TWEB/solution/Website/README.md)** - Templates, routes, and client code
- **[Project Report](Report/IUM-TWEB%20Report.md)** - Technical implementation details

## 🚦 API Endpoints

### Films
- `GET /api/films` - List all films
- `GET /api/films/{id}` - Film details
- `GET /api/films/top10` - Top rated films
- `GET /api/films/genre/{genre}` - Films by genre
- `GET /api/films/search?search={query}` - Search films

### Reviews & Users
- `GET /api/reviews/{movieTitle}` - Film reviews (by title)
- `POST /api/users` - Create user
- `GET /api/users` - List users
- `GET /api/users/{id}` - Get user by ID

### Real-Time Chat
- Socket.io connection to `localhost:3002`
- `join-film-chat` - Join film discussion room
- `send-message` - Send chat message
- `chat-message` - Receive new messages

## 👥 Team

This project was developed as a group assignment. See [Division of Work](Report/IUM-TWEB%20Report.md#division-of-work) in the report.

## 📋 Assignment Requirements

This project fulfills the IUM-TWEB assignment (2024-2025) requirements:
- ✅ Multi-server microservices architecture
- ✅ Dual database approach (PostgreSQL + MongoDB)
- ✅ REST API with comprehensive documentation
- ✅ Real-time chat using Socket.io
- ✅ Interactive data analytics with Jupyter
- ✅ Web UI with search and discovery
- ✅ Well-documented code and README files

## 📝 Notes

- All configuration is environment-based (see `.env` files in each service)
- Data migration scripts needed to load CSVs into PostgreSQL
- MongoDB should be pre-populated with review data
- Frontend serves from Central Server for CORS handling
- Socket.io chat requires WebSocket support

## 📄 License

Academic project for Università di Torino.

## 🔗 References

- [Express.js Documentation](https://expressjs.com/)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Jupyter Documentation](https://jupyter.org/)
