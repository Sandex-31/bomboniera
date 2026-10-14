#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "../include/hashTable.h"

// Funzione hash di esempio
unsigned long simple_hash_function(const void* key) {
    const char* str = (const char*)key;
    unsigned long hash = 5381;
    int c;
    while ((c = *str++)) {
        hash = ((hash << 5) + hash) + c; // hash * 33 + c
    }
    return hash;
}

// Funzione di confronto delle chiavi
int string_compare(const void* a, const void* b) {
    return strcmp((const char*)a, (const char*)b) == 0;
}

// Test 1: Inserimento e recupero
void test_put_and_get() {
    HashTable* table = hash_table_create(string_compare, simple_hash_function);

    hash_table_put(table, "key1", "value1");
    assert(strcmp((char*)hash_table_get(table, "key1"), "value1") == 0);

    hash_table_put(table, "key2", "value2");
    assert(strcmp((char*)hash_table_get(table, "key2"), "value2") == 0);

    hash_table_free(table);
    printf("test_put_and_get PASSED\n");
}

// Test 2: Aggiornamento dei valori
void test_update_value() {
    HashTable* table = hash_table_create(string_compare, simple_hash_function);

    hash_table_put(table, "key1", "value1");
    hash_table_put(table, "key1", "value_updated");
    assert(strcmp((char*)hash_table_get(table, "key1"), "value_updated") == 0);

    hash_table_free(table);
    printf("test_update_value PASSED\n");
}

// Test 3: Rimozione
void test_remove_key() {
    HashTable* table = hash_table_create(string_compare, simple_hash_function);

    hash_table_put(table, "key1", "value1");
    hash_table_remove(table, "key1");
    assert(hash_table_get(table, "key1") == NULL);

    hash_table_free(table);
    printf("test_remove_key PASSED\n");
}

// Test 4: Gestione delle collisioni
void test_handle_collisions() {
    HashTable* table = hash_table_create(string_compare, simple_hash_function);

    hash_table_put(table, "key1", "value1");
    hash_table_put(table, "kye1", "value_collision"); // Potenziale collisione
    assert(strcmp((char*)hash_table_get(table, "key1"), "value1") == 0);
    assert(strcmp((char*)hash_table_get(table, "kye1"), "value_collision") == 0);

    hash_table_free(table);
    printf("test_handle_collisions PASSED\n");
}

// Test 5: Dimensione della tabella
void test_table_size() {
    HashTable* table = hash_table_create(string_compare, simple_hash_function);

    assert(hash_table_size(table) == 0);
    hash_table_put(table, "key1", "value1");
    assert(hash_table_size(table) == 1);
    hash_table_put(table, "key2", "value2");
    assert(hash_table_size(table) == 2);
    hash_table_remove(table, "key1");
    assert(hash_table_size(table) == 1);

    hash_table_free(table);
    printf("test_table_size PASSED\n");
}

// Test 6: Recupero di tutte le chiavi
void test_keyset() {
    HashTable* table = hash_table_create(string_compare, simple_hash_function);

    hash_table_put(table, "key1", "value1");
    hash_table_put(table, "key2", "value2");
    hash_table_put(table, "key3", "value3");

    void** keys = hash_table_keyset(table);
    assert(keys != NULL);
    assert(hash_table_size(table) == 3);

    free(keys);
    hash_table_free(table);
    printf("test_keyset PASSED\n");
}

// Funzione principale per eseguire i test
int main() {
    test_put_and_get();
    test_update_value();
    test_remove_key();
    test_handle_collisions();
    test_table_size();
    test_keyset();

    printf("All tests PASSED\n");
    return 0;
}
