package com.example.films;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point for the film data service.
 */
@SpringBootApplication
public class FilmsApplication {

    /**
     * Boots the Spring application.
     *
     * @param args command-line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(FilmsApplication.class, args);
    }
}