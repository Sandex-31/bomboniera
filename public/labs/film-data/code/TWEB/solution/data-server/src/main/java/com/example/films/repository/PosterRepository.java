package com.example.films.repository;

import com.example.films.model.Poster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for poster entities.
 */
@Repository
public interface PosterRepository extends JpaRepository<Poster, Integer> {
}