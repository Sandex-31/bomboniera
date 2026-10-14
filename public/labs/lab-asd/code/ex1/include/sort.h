#include <stdio.h>

/** 
 * @brief Implementation of the merge sort algorithm
 *
 * The merge sort is a sorting alghoritm that follows the divide and conquer  approch. 
 * It works dividing the input array into smaller subaarays and sorting those, then merging them back together.
 *
 * @param[out] base The pointer to the base of the array we want to sort
 * @param[in] nitems Number of items in the array
 * @param[in] size Size occupied by a single element in memory
 * @param[in] compar Parametric function to compare two element in the array
 *
 *  **/
void merge_sort(void *base, size_t nitems, size_t size, int (*compar)(const void*, const void*));

/** 
 * @brief Implementation of the quick sort algorithm  
 * 
 * The quick sort algorithm is a sorting algorithm based on the divide and conquer approch.
 * It picks a pivot and partition the array by placing the pivot in the correct place in the sorted array.
 *
 * @param[out] base The pointer to the base of the array we want to sort
 * @param[in] nitems Number of items in the array
 * @param[in] size Size occupied by a single element in memory
 * @param[in] compar Parametric function to compare two element in the array
 *
 *  **/
void quick_sort(void *base, size_t nitems, size_t size, int (*compar)(const void*, const void*));

