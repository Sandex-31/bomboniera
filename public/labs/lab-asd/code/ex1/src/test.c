#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "../include/sort.h"

// Funzione di confronto per interi
int compare_int(const void *a, const void *b) {
    const int *int_a = (const int *)a;
    const int *int_b = (const int *)b;
    return (*int_a > *int_b) - (*int_a < *int_b);
}

// Funzione di confronto per float
int compare_float(const void *a, const void *b) {
    const float *float_a = (const float *)a;
    const float *float_b = (const float *)b;
    return (*float_a > *float_b) - (*float_a < *float_b);
}

// Funzione di confronto per stringhe
int compare_string(const void *a, const void *b) {
    const char **str_a = (const char **)a;
    const char **str_b = (const char **)b;
    return strcmp(*str_a, *str_b);
}

// Test per array vuoto
void test_sort_empty_array(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    int a[] = {};
    sort_func(a, 0, sizeof(int), compare_int);
    // Nessun assertion necessario per array vuoto
}

// Test per array con un singolo elemento
void test_sort_single_element(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    int a[] = {42};
    sort_func(a, 1, sizeof(int), compare_int);
    assert(a[0] == 42);
}

// Test per array già ordinato
void test_sort_sorted_array(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    int a[] = {1, 2, 3, 4, 5};
    sort_func(a, 5, sizeof(int), compare_int);
    for (int i = 0; i < 5; i++) {
        assert(a[i] == i + 1);
    }
}

// Test per array in ordine inverso
void test_sort_reverse_sorted_array(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    int a[] = {5, 4, 3, 2, 1};
    sort_func(a, 5, sizeof(int), compare_int);
    for (int i = 0; i < 5; i++) {
        assert(a[i] == i + 1);
    }
}

// Test per array con elementi duplicati
void test_sort_duplicates(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    int a[] = {4, 2, 2, 8, 4, 6, 6, 1};
    int expected[] = {1, 2, 2, 4, 4, 6, 6, 8};
    sort_func(a, 8, sizeof(int), compare_int);
    for (int i = 0; i < 8; i++) {
        assert(a[i] == expected[i]);
    }
}

// Test per array di float
void test_sort_floats(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    float a[] = {3.5, 2.1, 4.8, 1.2};
    float expected[] = {1.2, 2.1, 3.5, 4.8};
    sort_func(a, 4, sizeof(float), compare_float);
    for (int i = 0; i < 4; i++) {
        assert(fabs(a[i] - expected[i]) < 0.001);
    }
}

// Test per array di stringhe
void test_sort_strings(void (*sort_func)(void *, size_t, size_t, int (*)(const void *, const void *))) {
    const char *a[] = {"pear", "apple", "orange", "banana"};
    const char *expected[] = {"apple", "banana", "orange", "pear"};
    sort_func(a, 4, sizeof(char *), compare_string);
    for (int i = 0; i < 4; i++) {
        assert(strcmp(a[i], expected[i]) == 0);
    }
}


int main() {
    // Test per merge_sort
    test_sort_empty_array(merge_sort);
    printf("test_merge_sort_empty_array: FATTO\n");
    test_sort_single_element(merge_sort);
    printf("test_merge_sort_single_element: FATTO\n");
    test_sort_sorted_array(merge_sort);
    printf("test_merge_sort_sorted_array: FATTO\n");
    test_sort_reverse_sorted_array(merge_sort);
    printf("test_merge_sort_reverse_sorted_array: FATTO\n");
    test_sort_duplicates(merge_sort);
    printf("test_merge_sort_duplicates: FATTO\n");
    test_sort_floats(merge_sort);
    printf("test_merge_sort_floats: FATTO\n");
    test_sort_strings(merge_sort);
    printf("test_merge_sort_strings: FATTO\n");

    // Test per quick_sort
    test_sort_empty_array(quick_sort);
    printf("test_quick_sort_empty_array: FATTO\n");
    test_sort_single_element(quick_sort);
    printf("test_quick_sort_single_element: FATTO\n");
    test_sort_sorted_array(quick_sort);
    printf("test_quick_sort_sorted_array: FATTO\n");
    test_sort_reverse_sorted_array(quick_sort);
    printf("test_quick_sort_reverse_sorted_array: FATTO\n");
    test_sort_duplicates(quick_sort);
    printf("test_quick_sort_duplicates: FATTO\n");
    test_sort_floats(quick_sort);
    printf("test_quick_sort_floats: FATTO\n");
    test_sort_strings(quick_sort);

    printf("\n\nTutti i test sono stati completati con successo!\n\n");
    return 0;
}
