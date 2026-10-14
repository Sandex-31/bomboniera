#include "../include/sort.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/**
 * @brief Auxiliary function for the merge sort algorithm that merges two subarrays together 
 * **/
void merge(void *base, size_t size, size_t left, size_t mid, size_t right, int (*compar)(const void*, const void*)) {
    
    size_t n1 = mid - left + 1;
    size_t n2 = right - mid;

    void *L = malloc(n1 * size);
    void *R = malloc(n2 * size);

    if (L == NULL || R == NULL) {
        fprintf(stderr, "Errore di allocazione della memoria\n");
        exit(EXIT_FAILURE);
    }

    memcpy(L, (char*)base + left * size, n1 * size);
    memcpy(R, (char*)base + (mid + 1) * size, n2 * size);

    size_t i = 0; 
    size_t j = 0; 
    size_t k = left;

    while (i < n1 && j < n2) {
        if (compar((char*)L + i * size, (char*)R + j * size) <= 0) {
            memcpy((char*)base + k * size, (char*)L + i * size, size);
            i++;
        } else {
            memcpy((char*)base + k * size, (char*)R + j * size, size);
            j++;
        }
        k++;
    }

    while (i < n1) {
        memcpy((char*)base + k * size, (char*)L + i * size, size);
        i++;
        k++;
    }

    while (j < n2) {
        memcpy((char*)base + k * size, (char*)R + j * size, size);
        j++;
        k++;
    }

    free(L);
    free(R);
    
}


/** 
 * @brief Auxiliary function that divide the array to sort by the merge sort algorithm recursively and sort them together
 * **/
void merge_sort_rec(void *base, size_t size, size_t left, size_t right, int (*compar)(const void*, const void*)) {
    if (left < right) {
        size_t mid = left + (right - left) / 2;
        merge_sort_rec(base, size, left, mid, compar);
        merge_sort_rec(base, size, mid + 1, right, compar);
        merge(base, size, left, mid, right, compar);
    }
    return;
}

void merge_sort(void *base, size_t nitems, size_t size, int (*compar)(const void*, const void*)) {
    if (nitems > 1) {
        merge_sort_rec(base, size, 0, nitems - 1, compar);     
    }
    return;
}

/** 
 * @brief Auxiliary function that swaps two elements of an unknown type
 * **/
void swap(void *a, void *b, size_t size) {
    void* temp = malloc(size);
    if (temp==NULL){
        return;
    }   
    memcpy(temp, a, size);
    memcpy(a, b, size);
    memcpy(b, temp, size);
    free(temp);
}



/** 
 * @brief Auxiliary function that partition the quick sort in three partitions
 * **/
void partition_three_way(void *base, size_t low, size_t high, size_t size, int (*compar)(const void*, const void*), size_t *lt, size_t *gt) {
    
    size_t pivot_index = low + rand() % (high - low + 1);
    void* pivot = malloc(size);
    if (!pivot) return;
    memcpy(pivot, (char*)base + pivot_index * size, size);

    *lt = low;
    size_t i = low;
    *gt = high;

    while (i <= *gt) {
        int cmp = compar((char*)base + i * size, pivot);
        
        if (cmp < 0) {
            swap((char*)base + i * size, (char*)base + (*lt) * size, size);
            (*lt)++;
            i++;
        }
        else if (cmp > 0) {
            swap((char*)base + i * size, (char*)base + (*gt) * size, size);
            (*gt)--;
        }
        else {
            i++;
        }
    }

    free(pivot);
}

/** 
 * @brief Auxiliary function for the quick sort that recursively divides the array in three partitions until the array is sorted
 * **/
void quick_sort_recursive(void *base, size_t low, size_t high, size_t size,
                         int (*compar)(const void*, const void*)) {
    if (low >= high){
        return;
    } 

    size_t lt, gt;
    partition_three_way(base, low, high, size, compar, &lt, &gt);

    if (lt > low && lt > 0) {
        quick_sort_recursive(base, low, lt - 1, size, compar);
    }
    if (gt < high) {
        quick_sort_recursive(base, gt + 1, high, size, compar);
    }
}

void quick_sort(void *base, size_t nitems, size_t size, int (*compar)(const void*, const void*)) {
    if (!base || !compar || nitems < 2){
        return;
    }
    quick_sort_recursive(base, 0, nitems - 1, size, compar);

}

