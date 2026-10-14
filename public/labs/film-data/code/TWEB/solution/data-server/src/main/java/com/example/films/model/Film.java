package com.example.films.model;

import jakarta.persistence.*;

/**
 * JPA entity mapped to the movies table.
 */
@Entity
@Table(name = "movies")
public class Film {
    @Id
    @Column(name = "id", nullable = false)  // Con virgolette
    private Integer id;

    @Column(name = "name", nullable = true)
    private String title;

    @Column(name = "date", nullable = true)
    private Integer year;

    @Column(name = "description", nullable = true)
    private String description;

    @Column(name = "tagline", nullable = true)
    private String tagline;

    @Column(name = "minute", nullable = true)
    private Integer duration;

    @Column(name = "rating", nullable = true)
    private Double rating;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
}