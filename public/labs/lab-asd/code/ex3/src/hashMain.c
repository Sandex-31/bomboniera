#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <string.h>
#include "../include/hashTable.h"

unsigned long string_hash(const void* key) {
    const char* str = (const char*)key;
    unsigned long hash = 5381;
    int c;
    while ((c = *str++)) {
        hash = ((hash << 5) + hash) + c;
    }
    return hash;
}

int string_compare(const void* key1, const void* key2) {
    return strcmp((const char*)key1, (const char*)key2) == 0;
}

void find_most_frequent_word(const char* filename, int min_length) {
    FILE* file = fopen(filename, "r");
    if (!file) {
        perror("Errore nell'apertura del file");
        return;
    }

    HashTable* table = hash_table_create(string_compare, string_hash);

    char word[256] = "";
    int index = 0;
    char ch;

    while ((ch = fgetc(file)) != EOF) {
        if (isalpha(ch)) {
            word[index++] = tolower(ch); // Costruisce la parola in minuscolo
        } else {
            if (index >= min_length) {
                word[index] = '\0'; // Termina la parola

                // Aggiorna la hash table
                int* count = (int*)hash_table_get(table, word);
                if (count) {
                    (*count)++;
                } else {
                    count = (int*)malloc(sizeof(int));
                    *count = 1;
                    char* word_copy = strdup(word);
                    hash_table_put(table, word_copy, count);
                }
            }
            index = 0; // Resetta l'indice per la prossima parola
        }
    }

    if (index >= min_length) {
        word[index] = '\0';
        int* count = (int*)hash_table_get(table, word);
        if (count) {
            (*count)++;
        } else {
            count = (int*)malloc(sizeof(int));
            *count = 1;
            char* word_copy = strdup(word);
            hash_table_put(table, word_copy, count);
        }
    }

    fclose(file);

    char* most_frequent_word = NULL;
    int max_count = 0;
    void** keys = hash_table_keyset(table);

    for (int i = 0; i < hash_table_size(table); i++) {
        int* count = (int*)hash_table_get(table, keys[i]);
        if (*count > max_count) {
            max_count = *count;
            most_frequent_word = (char*)keys[i];
        }
    }

    printf("La parola più frequente con lunghezza minima %d è: '%s' con %d occorrenze\n",
           min_length, most_frequent_word, max_count);

    for (int i = 0; i < hash_table_size(table); i++) {
        free(hash_table_get(table, keys[i]));
        free(keys[i]);
    }
    free(keys);
    hash_table_free(table);
}

int main(int argc, char* argv[]) {
    if (argc != 3) {
        fprintf(stderr, "Uso: %s <file> <lunghezza_minima>\n", argv[0]);
        return EXIT_FAILURE;
    }

    const char* filename = argv[1];
    int min_length = atoi(argv[2]);

    if (min_length <= 0) {
        fprintf(stderr, "La lunghezza minima deve essere un numero positivo.\n");
        return EXIT_FAILURE;
    }

    find_most_frequent_word(filename, min_length);
    return EXIT_SUCCESS;
}
