#include "../include/distance.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

int min(int a, int b){
  if(a < b){
    return a;
  }
  return b;
}


int edit_distance(const char *s1, const char* s2){

  if(strlen(s1) == 0){
    return strlen(s2);
  }else if(strlen(s2) == 0){
    return strlen(s1);
  }

  int no_op = INT_MAX;

  if(*s1 == *s2)
    no_op = edit_distance(s1 + 1, s2 + 1);

  int canc = 1 + edit_distance(s1, s2+1);
  int ins = 1 + edit_distance(s1+1, s2);

  return min(no_op, min(canc, ins));
}


// VERSIONE VECCHIA DELLA EDIT_DISTANCE_DYN_REC DA COMMENTARE NELLA RELAZIONE PER SPIEGARE I CAMBIAMENTI FATTI NELLA NUOVA VERSIONE
/*
int edit_distance_dyn_rec(const char* s1, const char* s2, int* mat[], int i, int j, int m, int n){

    if(mat[m][n] != -1){
        return mat[m][n];
    }
    // Base case: If we have reached the end of one of the strings
    if (i == m) {
        mat[i][j] = n - j;  // Remaining insertions
        return mat[i][j];
    } else if (j == n) {
        mat[i][j] = m - i;  // Remaining deletions
        return mat[i][j];
    }

    int no_op = INT_MAX;

    if(s1[i] == s2[j])
            no_op = edit_distance_dyn_rec(s1, s2, mat, i+1, j+1, m, n);

    int canc = 1 + edit_distance_dyn_rec(s1, s2, mat, i, j+1, m, n);
    int ins = 1 + edit_distance_dyn_rec(s1, s2, mat, i+1, j, m, n);

    mat[i][j] = min(no_op, min(canc, ins));

}

int edit_distance_dyn(const char *s1, const char* s2){
    int m = strlen(s1);
    int n = strlen(s2);

    int** mat = malloc((m+1) * sizeof(int*));
    for(int i = 0; i <= m; i++){
        mat[i] = calloc(n+1, sizeof(int));
    }

    for(int i = 0; i <= m; i++){
        mat[i][0] = i;
    }
    for(int j = 0; j <= n; j++){
        mat[0][j] = j;
    }

    for(int i = 1; i <= m; i++){
        for(int j = 1; j <= n; j++){
            mat[i][j] = -1;
        }
    }

    return edit_distance_dyn_rec(s1, s2, mat, 0 , 0, m, n);
}
*/

int edit_distance_dyn(const char *s1, const char* s2){
    int m = strlen(s1);
    int n = strlen(s2);

    int** mat = malloc((m+1) * sizeof(int*));
    for(int i = 0; i <= m; i++){
        mat[i] = malloc((n+1) * sizeof(int));
    }

    for(int i = 0; i <= m; i++){
        for(int j = 0; j <= n; j++){
            if(i == 0){
                mat[i][j] = j;
            }else if(j == 0){
                mat[i][j] = i;
            }else if(s1[i-1] == s2[j-1]){
                mat[i][j] = mat[i-1][j-1];
            }else{
                //take the min
                mat[i][j] = 1 + (mat[i-1][j] < mat[i][j-1] ? mat[i-1][j] : mat[i][j-1]);
            }
        }
    }

    return mat[m][n];
}