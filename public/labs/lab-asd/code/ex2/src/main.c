#include "../include/distance.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>
#include <ctype.h> 

/** 
 * @brief Transform a string to lower case
 * **/
void to_lower_string(char* str){
    for(int i = 0; str[i] != '\0'; i++){
        str[i] = tolower(str[i]);
    }
}

/** 
 * @brief Split a given text into its respective words
 *
 * @param[in] text The text we want to splice into words
 * @return An array that contains the various words that were in the text
 * **/
char** split_into_words(const char *text, int *word_count) {
    char **words = NULL;
    char *copy = strdup(text);
    char *token = strtok(copy, " ,.!?;:\n");

    *word_count = 0;
    while (token != NULL) {
        words = realloc(words, (*word_count + 1) * sizeof(char*));
        words[*word_count] = strdup(token);
        (*word_count)++;
        token = strtok(NULL, " ,.!?;:\n");
    }

    free(copy);
    return words;
}

/** 
 * @brief Load the content of the file
 * **/
char* load_file_content(const char *filename) {
    FILE *file = fopen(filename, "r");
    if (file==NULL) {
        perror("Errore nell'apertura del file");
        exit(1);
    }

    fseek(file, 0, SEEK_END);
    long file_size = ftell(file); 
    rewind(file); 

    char *content = malloc(file_size + 1);
    if (content==NULL) {
        perror("Errore nell'allocazione della memoria");
        fclose(file);
        exit(1);
    }

    fread(content, 1, file_size, file);
    content[file_size] = '\0'; 

    fclose(file); 
    return content; 
}


/** 
* @brief Find the correction in a file 
* **/
void find_corrections(const char *dict_file, const char *input_file) {
    int dict_count, word_count;
    char **dictionary = split_into_words(load_file_content(dict_file), &dict_count);
    char **words = split_into_words(load_file_content(input_file), &word_count);

    for (int i = 0; i < word_count; i++) {
        char *word = words[i];
        to_lower_string(word);
        int min_distance = INT_MAX;
        char **closest_words = NULL;
        int closest_count = 0;
        int distance = 0;

        for (int j = 0; j < dict_count; j++) {
            distance = edit_distance_dyn(word, dictionary[j]);

            if (distance < min_distance) {
                min_distance = distance;
                for (int k = 0; k < closest_count; k++) {
                    free(closest_words[k]);
                }
                free(closest_words);

                closest_words = malloc(sizeof(char*));
                closest_words[0] = strdup(dictionary[j]);
                closest_count = 1;
            } else if (distance == min_distance) {
                closest_words = realloc(closest_words, (closest_count + 1) * sizeof(char*));
                closest_words[closest_count++] = strdup(dictionary[j]);
            }

        }
        if(min_distance == 0){ 
            continue;
        }else{
            printf("%s:", word);
            for (int k = 0; k < closest_count; k++) {
                printf(" %s", closest_words[k]);
                free(closest_words[k]);
            }
            printf("\n");
            free(closest_words);
        }
        
    }

    for (int i = 0; i < dict_count; i++) {
        free(dictionary[i]);
    }
    free(dictionary);

    for (int i = 0; i < word_count; i++) {
        free(words[i]);
    }
    free(words);
}

int main(int argc, char* argv[]) {
    if(argc != 3){
        perror("Numero insufficienti di parametri. RIeseguire il programma \n");
        return -1;
    }
    const char *dict_file = argv[1];
    const char *input_file = argv[2];

    find_corrections(dict_file, input_file);

    return 0;
}
