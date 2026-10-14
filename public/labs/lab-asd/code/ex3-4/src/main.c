#include "../include/graph.h"
#include "../include/hashTable.h"


#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_PLACE_NAME 100
#define BUFFER_SIZE 100

typedef struct queueNode {
  void *data;
  struct queueNode *next;
} QueueNode;

typedef struct queue {
  QueueNode *front;
  QueueNode *rear;
} Queue;

/**
 * @brief  Creates a new queue
 */
static Queue *queue_create(void){
  Queue *newQueue = malloc(sizeof(Queue));
  if (!newQueue) return NULL;
  newQueue->front = newQueue->rear = NULL;
  return newQueue;
}

/**
 * @brief Adds a new element int the queue
 * @param[in] q The queue we want to adds an element to
 * @param[in] data The element we want to add in the queue 
 */
static void queue_enqueue(Queue *q, void *data) {
  QueueNode *newNode = malloc(sizeof(QueueNode));
  if (!newNode) return;

  newNode->data = data;
  newNode->next = NULL;

  if (!q->rear) {
    q->front = q->rear = newNode;
    return;
  }

  q->rear->next = newNode;
  q->rear = newNode;
}

/**
 * @brief Removes an element from the queue
 * @param[in] q Pointer to the queue
 * @return The element we removed from the queue
 */
static void *queue_dequeue(Queue *q) {
  if (!q->front) return NULL;

  QueueNode *temp = q->front;
  void *data = temp->data;

  q->front = q->front->next;

  if (!q->front) q->rear = NULL;

  free(temp);
  return data;
}
/**
 * @brief Free the memory allocated for the queue
 * @param[in] q The queue we want to delete
 */
static void queue_free(Queue *q) {
  while (q->front) {
    QueueNode *temp = q->front;
    q->front = q->front->next;
    free(temp);
  }
  free(q);
}

/**
 * @brief Creates a new hash table to be used as a visited set
 * @param compare Function pointer for comparing elements
 * @param hash Function pointer for hashing elements
 * @return Pointer to the newly created hash table, or NULL on failure
 */
static HashTable *create_visited_set(int (*compare)(const void *, const void *), unsigned long (*hash)(const void *)) {
  return hash_table_create(compare, hash);
}

/**
 * @brief Visit the graph in a breadth first order
 *
 * @param[in] gr The graph we want to visit
 * @param[in] start The starting node
 * @param[in] compare Function that compares nodes
 * @param[in] hash The hash function we will use in the HashTable inside the graph
 * @return An array with the nodes visited in order
 */
void **breadth_first_visit(Graph gr, void *start, int (*compare)(const void *, const void *), unsigned long (*hash)(const void *)) {
  if (!gr || !start){
    fprintf(stderr, "Error: breadth_first_visit arguments cannot be NULL.\n");
    return NULL;
  }

  if (!graph_contains_node(gr, start)){
    fprintf(stderr, "Error: breadth_first_visit graph_contains_node failed.\n");
    return NULL;
  }

  HashTable *visited = create_visited_set(compare, hash);
  if (!visited){
    fprintf(stderr, "Error: breadth_first_visit create_visited_set failed.\n");
    return NULL;
  }

  Queue *newQueue = queue_create();
  if (!newQueue) {
    fprintf(stderr, "Error: breadth_first_visit queue_create failed.\n");
    hash_table_free(visited);
    return NULL;
  }

  int capacity = 32; 
  int index = 0;
  void **result = malloc(sizeof(void *) * capacity);
  if (!result) {
    fprintf(stderr, "Error: breadth_first_visit malloc failed.\n");
    hash_table_free(visited);
    queue_free(newQueue);
    return NULL;
  }

  queue_enqueue(newQueue, start);
  hash_table_put(visited, start, start);
  result[index++] = start;

  while (newQueue->front) {
    void *current = queue_dequeue(newQueue);
    void **neighbors = graph_get_neighbours(gr, current);
    int numNeighbors = graph_num_neighbours(gr, current);

    for (int i = 0; i < numNeighbors; i++) {
      if (!hash_table_contains_key(visited, neighbors[i])) {
        if (index >= capacity - 1) { 
          capacity *= 2;
          void **temp = realloc(result, sizeof(void *) * capacity);
          if (!temp) {
            fprintf(stderr, "Error: breadth_first_visit realloc failed.\n");
            free(result);
            free(neighbors);
            hash_table_free(visited);
            queue_free(newQueue);
            return NULL;
          }
          result = temp;
        }

        queue_enqueue(newQueue, neighbors[i]);
        hash_table_put(visited, neighbors[i], neighbors[i]);
        result[index++] = neighbors[i];
      }
    }
    free(neighbors);
  }

  result[index] = NULL;

  void **temp = realloc(result, sizeof(void *) * (index + 1));
  if (temp) result = temp;

  hash_table_free(visited);
  queue_free(newQueue);
  return result;
}
/**
 * @brief Hash function for the strings
 * @param[in] key The value we want to calculate the hash for
 * @return The hash value
 */
static unsigned long hash_string(const void *key) {
  const char *str = (const char *)key;
  unsigned long hash = 5381;
  int c;

  while ((c = *str++))
    hash = ((hash << 5) + hash) + c;

  return hash;
}
/**
 * @brief Compares two strings for equality
 *
 * @param[in] a First string
 * @param[in] b Second string
 * @return An integer that is 1 if equal 0 if they are not
 */
static int compare_strings(const void *a, const void *b) {
  return strcmp((const char *)a, (const char *)b) == 0;
}

/**
 * @brief Duplicates a string 
 *
 * @param[in] str String to be duplicated
 * @return The copied string
 */
static char *strdup_custom(const char *str) {
  size_t len = strlen(str) + 1;
  char *copy = malloc(len);
  if (!copy) {
    fprintf(stderr, "Error: strdup_custom malloc failed.\n");
    return NULL;
  }
  memcpy(copy, str, len);
  return copy;
}

/**
 * @brief Load the records inside the graph
 * @param[in] filePath The file that contains the records
 * @param[in] compare Function that compare two values
 * @param[in] hash Function that creates an hash
 * @return The Graph newly allocated in memory
 */
static Graph load_graph_from_file(const char *filePath, int (*compare)(const void *, const void *), unsigned long (*hash)(const void *)) {

  Graph newGraph = graph_create(1, 0, compare, hash);
  if (!newGraph) {
    fprintf(stderr, "Error: Failed to create graph.\n");
    return NULL;
  }

  FILE *file = fopen(filePath, "r");
  if (!file) {
    fprintf(stderr, "Error: fopen failed.\n");
    graph_free(newGraph);
    return NULL;
  }

  char buffer[BUFFER_SIZE];
  char place1[MAX_PLACE_NAME], place2[MAX_PLACE_NAME];
  float distance;

  if (!fgets(buffer, sizeof(buffer), file)) {
    fprintf(stderr, "Error: fgets failed.\n");
    fclose(file);
    graph_free(newGraph);
    return NULL;
  }

  while (fgets(buffer, sizeof(buffer), file)) {
    if (fscanf(file, "%[^,],%[^,],%f", place1, place2, &distance) == 3) {
      char *p1 = strdup_custom(place1);
      char *p2 = strdup_custom(place2);

      if (!p1 || !p2) {
        fprintf(stderr, "Error: strdup_custom failed.\n");
        free(p1);
        free(p2);
        fclose(file);
        graph_free(newGraph);
        return NULL;
      }

      if (!graph_contains_node(newGraph, p1)) graph_add_node(newGraph, p1);
      if (!graph_contains_node(newGraph, p2)) graph_add_node(newGraph, p2);

      float *dist = malloc(sizeof(float));
      if (!dist) {
        fprintf(stderr, "Error: malloc failed.\n");
        free(p1);
        free(p2);
        fclose(file);
        graph_free(newGraph);
        return NULL;
      }
      *dist = distance;

      graph_add_edge(newGraph, p1, p2, dist);
      graph_add_edge(newGraph, p2, p1, dist);
    }
  }

  fclose(file);
  return newGraph;
}

/**
 * @brief Output the BFS traversal in order
 *
 * @param[in] bfsResult Array of nodes in BFS order 
 * @param[in] startLocation Starting node of the traversal
 * @param[in] outputPath Path to the output file
 * @return EXIT_SUCCESS on success, EXIT_FAILURE on error
 */
static int output_result(void **bfsResult, const char *startLocation, const char *outputPath) {
  if (!bfsResult || !startLocation || !outputPath) {
    fprintf(stderr, "Error: write_bfs_result arguments cannot be NULL.\n");
    return EXIT_FAILURE;
  }

  FILE *outFile = fopen(outputPath, "w");
  if (!outFile) {
    fprintf(stderr, "Error: write_bfs_result fopen failed.\n");
    return EXIT_FAILURE;
  }

  fprintf(outFile, "### Nodes reachable from %s ###\n", startLocation);
  int count = 0;
  for (int i = 0; bfsResult[i]; i++)
    count++;

  fprintf(outFile, "### Number of reachable nodes: %d ###\n\n", count);

  for (int i = 0; bfsResult[i]; i++)
    fprintf(outFile, "(%d.) %s\n", i, (char *)bfsResult[i]);

  fclose(outFile);
  return EXIT_SUCCESS;
}



int main(int argc, char *argv[]) {
  if (argc != 4) {
    fprintf(stderr, "Usage: %s <graph_file_path> <startLocation> <output_file_path>\n", argv[0]);
    return EXIT_FAILURE;
  }

  const char *filePath = argv[1], *startLocation = argv[2], *outputPath = argv[3];

  Graph newGraph = load_graph_from_file(filePath, compare_strings, hash_string);
  if (!newGraph) {
    fprintf(stderr, "Error: load_graph_from_file failed.\n");
    return EXIT_FAILURE;
  }

  void **bfsResult = breadth_first_visit(newGraph, (void *)startLocation, compare_strings, hash_string);
  if (!bfsResult) {
    fprintf(stderr, "Error: breadth_first_visit failed.\n");
    graph_free(newGraph);
    return EXIT_FAILURE;
  }

  if (output_result(bfsResult, startLocation, outputPath) == EXIT_FAILURE) {
    fprintf(stderr, "Error: write_bfs_result failed.\n");
    free(bfsResult);
    graph_free(newGraph);
    return EXIT_FAILURE;
  }
  printf("\nBFS result written on output\n");

  free(bfsResult);
  graph_free(newGraph);
  return EXIT_SUCCESS;
}

