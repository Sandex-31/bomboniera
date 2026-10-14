package com.example.films.model;

import jakarta.persistence.*;

/**
 * JPA entity mapped to the posters table.
 */
@Entity
@Table(name = "posters")
public class Poster {
    @Id
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "link", nullable = false)
    private String link;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
}