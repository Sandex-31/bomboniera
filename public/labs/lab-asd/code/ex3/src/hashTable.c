#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/hashTable.h"



HashTable* hash_table_create(int (*f1)(const void*, const void*), unsigned long (*f2)(const void*)) {
    int capacity = 16; // Dimensione iniziale della tabella
    HashTable* table = (HashTable*)malloc(sizeof(HashTable));
    table->buckets = (HashNode**)calloc(capacity, sizeof(HashNode*));
    table->capacity = capacity;
    table->size = 0;
    table->compare_keys = f1;
    table->hash_function = f2;
    return table;
}

void resize_table(HashTable* table) {
    int new_capacity = table->capacity * 2;
    HashNode** new_buckets = (HashNode**)calloc(new_capacity, sizeof(HashNode*));

    // Re-hash and node transfering 
    for (int i = 0; i < table->capacity; i++) {
        HashNode* node = table->buckets[i];
        while (node) {
            HashNode* next_node = node->next; // Salva il puntatore al prossimo nodo
            unsigned long new_hash = table->hash_function(node->key) % new_capacity;

            node->next = new_buckets[new_hash];
            new_buckets[new_hash] = node;

            node = next_node;
        }
    }

    free(table->buckets); 
    table->buckets = new_buckets;
    table->capacity = new_capacity;
}

void hash_table_put(HashTable* table, const void* key, const void* value) {
    if ((float)table->size / table->capacity >= 0.75) {
        resize_table(table);
    }

    unsigned long hash = table->hash_function(key) % table->capacity;
    HashNode* node = table->buckets[hash];
    while (node) {
        if (table->compare_keys(node->key, key) == 1) {
            node->value = (void*)value; 
            return;
        }
        node = node->next;
    }

    HashNode* new_node = (HashNode*)malloc(sizeof(HashNode));
    new_node->key = (void*)key;
    new_node->value = (void*)value;
    new_node->next = table->buckets[hash];
    table->buckets[hash] = new_node;
    table->size++;
}

void* hash_table_get(const HashTable* table, const void* key) {
    unsigned long hash = table->hash_function(key) % table->capacity;
    HashNode* node = table->buckets[hash];
    while (node) {
        if (table->compare_keys(node->key, key) == 1) {
            return node->value;
        }
        node = node->next;
    }
    return NULL; // Chiave non trovata
}

int hash_table_contains_key(const HashTable* table, const void* key) {
    return hash_table_get(table, key) != NULL;
}

void hash_table_remove(HashTable* table, const void* key) {
    unsigned long hash = table->hash_function(key) % table->capacity;
    HashNode* node = table->buckets[hash];
    HashNode* prev = NULL;
    while (node) {
        if (table->compare_keys(node->key, key) == 1) {
            if (prev) {
                prev->next = node->next;
            } else {
                table->buckets[hash] = node->next;
            }
            free(node);
            table->size--;
            return;
        }
        prev = node;
        node = node->next;
    }
}

int hash_table_size(const HashTable* table) {
    return table->size;
}

void** hash_table_keyset(const HashTable* table) {
    void** keys = (void**)malloc(table->size * sizeof(void*));
    int index = 0;
    for (int i = 0; i < table->capacity; i++) {
        HashNode* node = table->buckets[i];
        while (node) {
            keys[index++] = node->key;
            node = node->next;
        }
    }
    return keys;
}

void hash_table_free(HashTable* table) {
    for (int i = 0; i < table->capacity; i++) {
        HashNode* node = table->buckets[i];
        while (node) {
            HashNode* temp = node;
            node = node->next;
            free(temp);
        }
    }
    free(table->buckets);
    free(table);
}
