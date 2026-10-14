#include "../include/sort.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <time.h>

#define INITIAL_CAPACITY 10000
#define MAX_FIELD_LENGTH 100

typedef struct {
    int id;
    char field1[MAX_FIELD_LENGTH];  // string
    int field2;                     // interger
    float field3;                   // float
    
} Record, *RecordPtr;

/** 
 * @brief Compares two strings
 * **/
int compareString(const void *a, const void *b) {
    const Record *recA = (const Record *)a;
    const Record *recB = (const Record *)b;
    return strcmp(recA->field1, recB->field1);
}

/** 
 * @brief Compares two integers
 * **/
int compareInt(const void *a, const void *b) {
    const Record *recA = (const Record *)a;
    const Record *recB = (const Record *)b;
    return (recA->field2 > recB->field2) - (recA->field2 < recB->field2);
}

/** 
 * @brief Compares two floating point numbers
 * **/
int compareFloat(const void *a, const void *b) {
    const Record *recA = (const Record *)a;
    const Record *recB = (const Record *)b;
    return (recA->field3 > recB->field3) - (recA->field3 < recB->field3);
}

/** 
 * @brief Handles allocation error
 * **/
void handleAllocationError(Record *ptr) {
    if (ptr == NULL) {
        fprintf(stderr, "Errore di allocazione memoria: %s\n", strerror(errno));
        exit(EXIT_FAILURE);
    }
}

/** 
 * @brief reads the records in a file
 * **/
size_t read_records(FILE *infile, Record **records) {
    size_t capacity = INITIAL_CAPACITY;
    size_t count = 0;
    
    *records = malloc(capacity * sizeof(Record));
    handleAllocationError(*records);
    
    char line[MAX_FIELD_LENGTH * 4];  
    
    while (fgets(line, sizeof(line), infile)) {
        if (count >= capacity) {
            capacity *= 2;
            Record *temp = realloc(*records, capacity * sizeof(Record));
            handleAllocationError(temp);
            *records = temp;
        }
        
        if (sscanf(line, "%d,%99[^,],%d,%f\n", 
                   &(*records)[count].id,
                   (*records)[count].field1,
                   &(*records)[count].field2,
                   &(*records)[count].field3) != 4) {
            fprintf(stderr, "Errore nel formato della riga %zu\n", count + 1);
            continue;
        }
        count++;
    }
    
    return count;
}

/** 
 * @brief Writes the record in a file
 * **/
void write_records(FILE *outfile, const Record *records, size_t count, int field_type) {
    const char *field_name;
    switch(field_type) {
        case 1:
            field_name = "stringa (field1)";
            break;
        case 2:
            field_name = "intero (field2)";
            break;
        case 3:
            field_name = "float (field3)";
            break;
        default:
            fprintf(stderr, "Errore nel selezionamento del campo\n");
            return;
    }
    
    for (size_t i = 0; i < count; i++) {
        if (fprintf(outfile, "%d,%s,%d,%.2f\n",
                   records[i].id,
                   records[i].field1,
                   records[i].field2,
                   records[i].field3) < 0) {
            fprintf(stderr, "Errore durante la scrittura del record %zu: %s\n",
                    i, strerror(errno));
        }
    }
}

/** 
 * @brief Sort the records in a file
 * 
 * This function takes the records from an input file and sort them by a field.
 * 
 * @param[out] outfile The new file with the records sorted
 * @param[in] infile The file we want the records to be sorted by
 * @param[in] field The field by which the records are sorted
 * @param[in] algo What sort algorithm we want to use between merge or quick
 * **/
void sort_records(FILE *infile, FILE *outfile, size_t field, size_t algo) {
    printf("Inizio lettura records...\n");
    Record *records;
    size_t count = read_records(infile, &records);
    printf("Letti %zu records\n", count);
    
    int (*compar)(const void *, const void *);
    const char *field_name;
    
    
    switch (field) {
        case 1:
            compar = compareString;
            field_name = "stringa";
            break;
        case 2:
            compar = compareInt;
            field_name = "intero";
            break;
        case 3:
            compar = compareFloat;
            field_name = "float";
            break;
        default:
            fprintf(stderr, "Campo non valido: %zu\n", field);
            free(records);
            return;
    }
    
    printf("Inizio ordinamento per campo %s...\n", field_name);
    switch(algo) {
        case 1:
            merge_sort(records, count, sizeof(Record), compar);
            printf("Merge sort completato\n");
            break;
        case 2:
            quick_sort(records, count, sizeof(Record), compar);
            printf("Quick sort completato\n");
            break;
        default:
            fprintf(stderr, "Algoritmo non valido: %zu\n", algo);
            free(records);
            return;
    }
    
    printf("Scrittura records ordinati...\n");
    write_records(outfile, records, count, field);
    printf("Operazione completata con successo\n");
    
    free(records);
}

int main(int argc, char *argv[]) {
    if (argc != 5) {
        fprintf(stderr, "Uso: %s <input_file> <output_file> <campo_ordinamento> <algoritmo>\n"
                "campo_ordinamento: 1=stringa, 2=intero, 3=float\n"
                "algoritmo: 1=merge_sort, 2=quick_sort\n", argv[0]);
        return EXIT_FAILURE;
    }
    
    const char *input = argv[1];
    const char *output = argv[2];
    int type = atoi(argv[3]);
    int algo = atoi(argv[4]);
    
    FILE *infile = fopen(input, "r");
    if (infile == NULL) {
        fprintf(stderr, "Errore apertura file input '%s': %s\n",
                input, strerror(errno));
        return EXIT_FAILURE;
    }
    
    FILE *outfile = fopen(output, "w");
    if (outfile == NULL) {
        fprintf(stderr, "Errore apertura file output '%s': %s\n",
                output, strerror(errno));
        fclose(infile);
        return EXIT_FAILURE;
    }
    
    sort_records(infile, outfile, type, algo);
    
    fclose(infile);
    fclose(outfile);
    return EXIT_SUCCESS;
}
