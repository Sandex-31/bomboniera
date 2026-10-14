# Website - Frontend Templates & Static Assets

## Overview

The **Website** folder contains all frontend HTML templates (rendered with Handlebars), CSS, JavaScript, and image assets for the Film Data Web application. The templates are rendered by the central server, but all resources are organized here.

## Architecture

- **Served by**: Central Server (port 3000)
- **Static assets**: CSS, JavaScript, images (from `public/`)
- **Handlebars templates**: HTML pages (from `views/`)
- **Template rendering**: Central server renders these templates and sends HTML to clients

## Structure

```
Website/
├── public/
│   ├── images/              # Images and static assets
│   ├── javascripts/         # Client-side JavaScript
│   └── stylesheets/         # CSS stylesheets
├── views/                   # Handlebars HTML templates
│   ├── index.hbs           # Home page
│   ├── search.hbs          # Search results page
│   └── film-detail-v2.hbs  # Film detail page
├── package.json            # Project metadata (no dependencies)
└── README.md               # This file
```

## How It Works

1. **Central Server** (port 3000) is configured to use `Website/views` for Handlebars templates
2. When a page is requested (/, /search, /film-detail-v2), the server renders the corresponding `.hbs` template
3. Static assets (CSS, JS, images) are served from `Website/public` via Express static middleware
4. Client-side JavaScript makes API calls to `/api/*` endpoints

## Page Templates

### `views/index.hbs`
Home page with carousel and movie sliders

### `views/search.hbs`
Search results page with Handlebars conditionals for dynamic content:
- `{{searchQuery}}` - Current search term
- `{{#each movies}}...{{/each}}` - Loop through results
- `{{#if hasResults}}...{{/if}}` - Conditional rendering

### `views/film-detail-v2.hbs`
Film detail page with reviews and live chat interface

## Notes

- No `npm install` or `npm start` needed in this folder
- All page rendering is handled by the central server
- The central server is the only service that needs to be running (port 3000)
- Website folder is purely for organizing frontend code

