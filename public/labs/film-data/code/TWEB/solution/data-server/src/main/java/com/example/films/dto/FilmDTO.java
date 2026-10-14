package com.example.films.dto;

import com.example.films.model.Film;

/**
 * Lightweight film transfer object used for API responses.
 *
 * @param id film identifier
 * @param title film title
 * @param year release year
 * @param description plot description
 * @param tagline marketing tagline
 * @param duration runtime in minutes
 * @param rating average rating
 */
public record FilmDTO(
        Integer id,
        String title,
        Integer year,
        String description,
        String tagline,
        Integer duration,
        Double rating
) {
    /**
     * Builds a DTO from a {@link Film} entity.
     *
     * @param film film entity
     * @return DTO instance or {@code null} if input is null
     */
    public static FilmDTO fromEntity(Film film) {
        if (film == null) {
            return null;
        }
        return new FilmDTO(
                film.getId(),
                film.getTitle(),
                film.getYear(),
                film.getDescription(),
                film.getTagline(),
                film.getDuration(),
                film.getRating()
        );
    }
}