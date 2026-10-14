package com.example.films.controller;

import com.example.films.dto.FilmDTO;
import com.example.films.model.Film;
import com.example.films.service.FilmService;
import org.springframework.web.bind.annotation.*;
import com.example.films.model.Poster;
import com.example.films.model.Genre;
import com.example.films.repository.PosterRepository;
import com.example.films.repository.GenreRepository;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * REST controller that exposes read-only film catalog endpoints.
 * Provides listing, search and detail retrieval with lightweight poster/genre data.
 */
@Tag(name = "Films", description = "Film catalog read-only API")
@RestController
@RequestMapping("/films")
public class FilmController {

    private final FilmService service;
    private final PosterRepository posterRepository;
    private final GenreRepository genreRepository;

    /**
     * Creates the controller with required service and repositories.
     *
     * @param service film service layer
     * @param posterRepository repository for poster data
     * @param genreRepository repository for genre data
     */
    public FilmController(FilmService service, PosterRepository posterRepository, GenreRepository genreRepository) {
        this.service = service;
        this.posterRepository = posterRepository;
        this.genreRepository = genreRepository;
    }

    /**
     * Returns the complete list of films as DTOs.
     *
     * @return list of films
     */
    @Operation(summary = "List all films", description = "Returns all films as DTOs.")
    @GetMapping
    public List<FilmDTO> getFilms() {
        List<Film> films = service.getAllFilms();

        return films.stream()
                .map(FilmDTO::fromEntity)
                .toList();
    }

    /**
     * Returns the top 10 films with poster links.
     *
     * @return list of maps containing film id, rating, poster and tagline
     */
    @Operation(summary = "Top 10 films", description = "Returns top 10 films with posters and taglines.")
    @GetMapping("/top10")
    public List<Map<String, Object>> getTop10Films() {
        List<Film> films = service.getTop10Films();
        return filmsWithPosters(films);
    }

    /**
     * Returns up to 10 film ids and posters matching the given genre.
     *
     * @param genre genre name (partial match)
     * @return list of maps containing film id and poster
     */
    @Operation(summary = "Films by genre", description = "Returns up to 10 film ids and posters by genre.")
    @GetMapping("/genre/{genre}")
    public List<Map<String, Object>> getFilmsByGenre(@PathVariable String genre) {
        // 1. Prendo ID film da genres (già limitato a 10 dalla query)
        List<Genre> genreEntries = genreRepository.findByGenreName("%" + genre + "%");

        // 2. Estrai tutti gli ID
        List<Integer> filmIds = genreEntries.stream()
                .map(Genre::getId)
                .collect(Collectors.toList());

        // 3. Prendi tutti i poster in una sola query
        List<Poster> posters = posterRepository.findAllById(filmIds);
        Map<Integer, String> posterMap = posters.stream()
                .filter(poster -> poster != null && poster.getLink() != null) // Filtra nulli
                .collect(Collectors.toMap(Poster::getId, Poster::getLink));

        // 4. Combina i risultati
        return genreEntries.stream().map(genreEntry -> {
            Map<String, Object> result = new HashMap<>();
            result.put("id", genreEntry.getId());
            result.put("poster", posterMap.get(genreEntry.getId()));
            return result;
        }).collect(Collectors.toList());
    }

    /**
     * Returns full details for a film, including poster and genres.
     *
     * @param id film identifier
     * @return film detail map, or {@code null} if not found
     */
    @Operation(summary = "Film details", description = "Returns film details including genres and poster.")
    @GetMapping("/{id}")
    public Map<String, Object> getFilmById(@PathVariable Integer id) {
        Film film = service.getFilmById(id);
        if (film == null) {
            return null;
        }

        // Get poster
        Poster poster = posterRepository.findById(id).orElse(null);

        // Get genres
        List<Genre> genres = genreRepository.findByFilmId(id);
        List<String> genreNames = genres.stream()
                .map(Genre::getGenre)
                .distinct()
                .collect(Collectors.toList());

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("id", film.getId());
        response.put("title", film.getTitle());
        response.put("releaseYear", film.getYear());
        response.put("rating", film.getRating());
        response.put("poster", poster != null ? poster.getLink() : null);
        response.put("genres", genreNames);
        response.put("description", film.getDescription());
        response.put("tagline", film.getTagline());
        response.put("duration", film.getDuration());

        return response;
    }

    /**
     * Searches films by title (case-insensitive, partial match).
     *
     * @param search search term
     * @return list of maps with film summary and poster information
     */
    @Operation(summary = "Search films", description = "Search films by title with partial matching.")
    @GetMapping("/search")
    public List<Map<String, Object>> searchFilms(@RequestParam String search) {
        List<Film> films = service.searchFilmsByTitle(search);
        return filmsWithPosters(films);
    }

    /**
     * Enriches a list of films with poster links in a single batch query.
     *
     * @param films list of films
     * @return list of maps with id, rating, poster and tagline
     */
    private List<Map<String, Object>> filmsWithPosters(List<Film> films) {
        // 1. Estrai tutti gli ID
        List<Integer> filmIds = films.stream()
                .map(Film::getId)
                .collect(Collectors.toList());

        // 2. Prendi tutti i poster in una sola query
        List<Poster> posters = posterRepository.findAllById(filmIds);
        Map<Integer, String> posterMap = posters.stream()
                .filter(poster -> poster != null && poster.getLink() != null) // Filtra nulli
                .collect(Collectors.toMap(Poster::getId, Poster::getLink));

        // 3. Combina i risultati
        return films.stream().map(film -> {
            Map<String, Object> filmMap = new HashMap<>();
            filmMap.put("id", film.getId());
            filmMap.put("title", film.getTitle());
            filmMap.put("rating", film.getRating());
            filmMap.put("year", film.getYear());
            filmMap.put("poster", posterMap.get(film.getId()));
            filmMap.put("tagline", film.getTagline());
            return filmMap;
        }).collect(Collectors.toList());
    }
}