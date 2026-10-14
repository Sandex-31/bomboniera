#ifndef DISTANCE_H
#define DISTANCE_H
/** 
 * @brief Function that return the minimun operations to transform the second string s2 into the first string s1  
 * 
 * This function calculate the minimun number of operations to tranform a string into another
 * 
 * @param[in] s1 First string
 * @param[in] s2 Second string
 * @return Number of operations to transform the second string
 *
 *  **/
int edit_distance(const char *s1, const char* s2);

/** 
 * @brief Version of the edit_distance function but with dynamic programming in minnd while writing it  
 *  
 * This function calculate the minimun number of operations to tranform a string into another
 *
 * @param[in] s1 First string
 * @param[in] s2 Second string
 * @return Number of operations to transform the second string
 *
 *  **/
int edit_distance_dyn(const char *s1, const char* s2);
#endif //DISTANCE_H
