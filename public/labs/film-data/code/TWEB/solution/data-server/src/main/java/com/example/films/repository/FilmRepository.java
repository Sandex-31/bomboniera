package com.example.films.repository;

import com.example.films.model.Film;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for film entities and custom film queries.
 */
@Repository
public interface FilmRepository extends JpaRepository<Film, Integer> {

    /**
     * Returns the top 10 films ordered by rating (NULLS LAST).
     *
     * @return top 10 films
     */
    @Query(value = "SELECT * FROM movies ORDER BY rating DESC NULLS LAST LIMIT 10", nativeQuery = true)
    List<Film> findTop10ByRating();

    /**
     * Finds films whose title contains the provided text, case-insensitive.
     *
     * @param title partial title
     * @return matching films
     */
    List<Film> findByTitleContainingIgnoreCase(String title);
}