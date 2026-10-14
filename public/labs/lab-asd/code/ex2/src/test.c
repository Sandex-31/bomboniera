#include <stdio.h>
#include <string.h>
#include <limits.h>
#include <stdlib.h>
#include <assert.h>
#include "../include/distance.h"

// Test per stringhe identiche
void test_identical_strings() {
    assert(edit_distance("hello", "hello") == 0);
    assert(edit_distance_dyn("hello", "hello") == 0);
    printf("test_identical_strings PASSED\n");
}

// Test per stringhe vuote
void test_empty_strings() {
    assert(edit_distance("", "") == 0);
    assert(edit_distance_dyn("", "") == 0);
    printf("test_empty_strings PASSED\n");
}

// Test per una stringa vuota
void test_one_empty_string() {
    assert(edit_distance("", "abc") == 3);
    assert(edit_distance_dyn("", "abc") == 3);
    assert(edit_distance("abc", "") == 3);
    assert(edit_distance_dyn("abc", "") == 3);
    printf("test_one_empty_string PASSED\n");
}

// Test per stringhe di lunghezza uguale ma diverse
void test_different_strings_same_length() {
    assert(edit_distance("abc", "def") == 6);
    assert(edit_distance_dyn("abc", "def") == 6);
    printf("test_different_strings_same_length PASSED\n");
}

// Test per caso di sottostringa
void test_substring_case() {
    assert(edit_distance("abc", "abcd") == 1);
    assert(edit_distance_dyn("abc", "abcd") == 1);
    printf("test_substring_case PASSED\n");
}

// Test per stringhe con caratteri speciali
void test_special_characters() {
    assert(edit_distance("a@b#c", "a@c") == 2);
    assert(edit_distance_dyn("a@b#c", "a@c") == 2);
    printf("test_special_characters PASSED\n");
}

// Test per stringhe con spazi vuoti
void test_whitespace_strings() {
    assert(edit_distance("hello world", "helloworld") == 1);
    assert(edit_distance_dyn("hello world", "helloworld") == 1);
    printf("test_whitespace_strings PASSED\n");
}


// Test per stringhe completamente diverse
void test_completely_different_strings() {
    assert(edit_distance("abcd", "wxyz") == 8);
    assert(edit_distance_dyn("abcd", "wxyz") == 8);
    printf("test_completely_different_strings PASSED\n");
}

// Funzione principale dei test
int main() {
    test_identical_strings();
    test_empty_strings();
    test_one_empty_string();
    test_different_strings_same_length();
    test_substring_case();
    test_special_characters();
    test_whitespace_strings();
    test_completely_different_strings();

    printf("Tutti i test completati con successo!\n");
    return 0;
}
