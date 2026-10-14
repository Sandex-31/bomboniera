package com.example.films.repository;

import com.example.films.model.Genre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for genre entities and lookup queries.
 */
@Repository
public interface GenreRepository extends JpaRepository<Genre, Integer> {
    
    /**
     * Finds up to 10 genre rows whose name matches the provided pattern.
     *
     * @param genreName pattern to match (use % for wildcards)
     * @return matching genre rows
     */
    @Query(value = "SELECT * FROM genres WHERE ID IS NOT NULL AND genre ILIKE :genreName LIMIT 10", nativeQuery = true)
    List<Genre> findByGenreName(@Param("genreName") String genreName);
    
    /**
     * Finds all genres for a specific film id.
     *
     * @param id film identifier
     * @return list of genre rows
     */
    @Query(value = "SELECT * FROM genres WHERE ID = :id", nativeQuery = true)
    List<Genre> findByFilmId(@Param("id") Integer id);
}
