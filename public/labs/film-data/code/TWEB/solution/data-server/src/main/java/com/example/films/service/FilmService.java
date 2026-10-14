package com.example.films.service;

import com.example.films.model.Film;
import com.example.films.model.Poster;
import com.example.films.repository.FilmRepository;
import com.example.films.repository.PosterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class FilmService {

    private final FilmRepository repository;
    private final PosterRepository posterRepository;

    public FilmService(FilmRepository repository, PosterRepository posterRepository) {
        this.repository = repository;
        this.posterRepository = posterRepository;
    }

    public List<Film> getAllFilms() {
        return repository.findAll();
    }

    public Film getFilmById(Integer id) {
        return repository.findById(id).orElse(null);
    }

    public List<Film> getTop10Films() { return repository.findTop10ByRating(); }
    
    public List<Film> searchFilmsByTitle(String searchTerm) {
        return repository.findByTitleContainingIgnoreCase(searchTerm);
    }
    
    public Map<Integer, String> getAllPosters() {
        List<Poster> posters = posterRepository.findAll();
        return posters.stream()
            .filter(poster -> poster.getId() != null && poster.getLink() != null)
            .collect(Collectors.toMap(Poster::getId, Poster::getLink));
    }
}
