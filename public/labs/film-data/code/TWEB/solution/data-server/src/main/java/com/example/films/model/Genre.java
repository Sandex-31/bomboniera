package com.example.films.model;

import jakarta.persistence.*;

/**
 * JPA entity mapped to the genres table.
 */
@Entity
@Table(name = "genres")
public class Genre {
    @Id
    @Column(name = "ID", nullable = false)
    private Integer id;

    @Column(name = "genre", nullable = false)
    private String genre;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
}
