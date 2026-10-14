/**
 * Home page slider logic (top movies, genre sliders, carousel).
 */

/**
 * Creates a movie card with a poster image.
 * @param {Object} movie movie payload
 * @returns {HTMLDivElement} card element
 */
function createMovieCard(movie) {

    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card';
    movieCard.style.cursor = 'pointer';
    movieCard.innerHTML = `<img src="${movie.poster}" alt="Film poster" class="movie-poster" unselectable="on" style="user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;">`;
    
    // Aggiungi click per andare ai dettagli
    movieCard.addEventListener('click', () => {
        console.log('Click su film:', movie);
        console.log('Film ID:', movie.id);
        // Naviga alla pagina dettagli del film
        window.location.href = `film-detail-v2.html?id=${movie.id}`;
    });
    
    return movieCard;
}

/**
 * Loads top 10 movies and fills the slider.
 * @returns {Promise<void>}
 */
async function loadTopMovies() {
    try {
        console.log('Caricando top 10 film...');
        const response = await axios.get('http://localhost:3000/api/films/top10');
        const movies = response.data;
        console.log('Ricevuti top movies:', movies.length);
        
        const slider = document.getElementById('topMoviesSlider');
        slider.innerHTML = '';
        
        movies.forEach(movie => {
            if (movie.poster) {
                const card = createMovieCard(movie);
                slider.appendChild(card);
            }
        });
        
        setupSliderNavigation(slider);
    } catch (error) {
        console.error('Errore caricamento top movies:', error);
    }
}

/**
 * Loads movies for a genre and fills the specified slider.
 * @param {string} genre genre name
 * @param {string} sliderId target slider element id
 * @returns {Promise<void>}
 */
async function loadMoviesByGenre(genre, sliderId) {
    try {
        console.log(`Caricando film ${genre}...`);
        const response = await axios.get(`http://localhost:3000/api/films/genre/${genre}`);
        const movies = response.data;
        console.log(`Ricevuti film ${genre}:`, movies.length);
        
        const slider = document.getElementById(sliderId);
        slider.innerHTML = '';
        
        movies.forEach(movie => {
            if (movie.poster) {
                const card = createMovieCard(movie);
                slider.appendChild(card);
            }
        });
        
        setupSliderNavigation(slider);
    } catch (error) {
        console.error(`Errore caricamento film ${genre}:`, error);
    }
}

/**
 * Loads the main carousel with top 3 movies.
 * @returns {Promise<void>}
 */
async function loadMainCarousel() {
    try {
        console.log('Caricando carousel principale...');
        const response = await axios.get('http://localhost:3000/api/films/top10');
        const movies = response.data.slice(0, 3); // Prendi solo i primi 3
        console.log('Ricevuti film per carousel:', movies.length);
        
        const carouselInner = document.querySelector('.carousel-inner');
        carouselInner.innerHTML = '';
        
        movies.forEach((movie, index) => {
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            
            const button = document.createElement('button');
            button.className = 'custom-card-bg';
            button.style.backgroundImage = `url('${movie.poster}')`;
            button.setAttribute('unselectable', 'on');
            button.style.userSelect = 'none';
            button.style.webkitUserSelect = 'none';
            button.style.mozUserSelect = 'none';
            button.style.msUserSelect = 'none';
            button.addEventListener('click', () => {
                console.log('Click su film carousel ID:', movie.id);
                // Naviga alla pagina dettagli del film
                window.location.href = `film-detail-v2.html?id=${movie.id}`;
            });
            button.style.cursor = 'pointer';
            
            carouselItem.appendChild(button);
            const taglineDiv = document.createElement('div');
            taglineDiv.className = 'carousel-text';
            taglineDiv.textContent = movie.tagline || '';
            carouselItem.appendChild(taglineDiv);
            carouselInner.appendChild(carouselItem);
        });
    } catch (error) {
        console.error('Errore caricamento carousel principale:', error);
    }
}

/**
 * Sets up slider navigation controls for the given slider.
 * @param {HTMLElement} slider slider container
 */
function setupSliderNavigation(slider) {
    const container = slider.closest('.slider-container');
    const prevBtn = container.querySelector('.arrow.left');
    const nextBtn = container.querySelector('.arrow.right');
    const cards = slider.querySelectorAll('.movie-card');
    let currentPosition = 0;
    const cardWidth = 250;
    const gap = 15;
    const scrollAmount = cardWidth + gap;
    const totalWidth = (cards.length * cardWidth) + ((cards.length - 1) * gap);
    slider.style.width = `${totalWidth}px`;

    function updateArrows() {
        prevBtn.style.display = currentPosition === 0 ? 'none' : 'flex';
        const maxScroll = totalWidth - container.offsetWidth + 120;
        nextBtn.style.display = currentPosition <= -maxScroll ? 'none' : 'flex';
    }

    nextBtn.addEventListener('click', () => {
        const maxScroll = totalWidth - container.offsetWidth + 120;
        if (currentPosition > -maxScroll) {
            currentPosition -= scrollAmount;
            slider.style.transform = `translateX(${currentPosition}px)`;
            updateArrows();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentPosition < 0) {
            currentPosition += scrollAmount;
            if (currentPosition > 0) currentPosition = 0;
            slider.style.transform = `translateX(${currentPosition}px)`;
            updateArrows();
        }
    });

    updateArrows();
    window.addEventListener('resize', updateArrows);
}

/**
 * Initialize sliders when the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM caricato, inizio caricamento film...');
    
    // Carica carousel principale
    loadMainCarousel();
    
    // Carica slider top movies
    loadTopMovies();
    
    // Carica slider horror
    loadMoviesByGenre('horror', 'horrorMoviesSlider');
});