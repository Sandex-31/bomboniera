#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/graph.h"
#include "../include/hashTable.h"

unsigned long hash_int(const void* key) {
       if (!key) return 0;
       return (unsigned long)(*(int*)key);
}

int compare_int(const void* a, const void* b) {
       if (!a || !b) return 0;
       return (*(int*)a == *(int*)b);
}

void print_graph(Graph gr) {
       if (!gr) {
              printf("Graph is NULL.\n");
              return;
       }

       void** nodes = graph_get_nodes(gr);
       int num_nodes = graph_num_nodes(gr);

       printf("Graph has %d nodes and %d edges.\n", num_nodes, graph_num_edges(gr));
       for (int i = 0; i < num_nodes; i++) {
              int* node = (int*)nodes[i];
              printf("Node: %d\n", *node);

              void** neighbors = graph_get_neighbours(gr, node);
              int num_neighbors = graph_num_neighbours(gr, node);

              printf("  Neighbors:");
              for (int j = 0; j < num_neighbors; j++) {
                     int* neighbor = (int*)neighbors[j];
                     if (neighbor) {
                            printf(" %d", *neighbor);
                            void* label = graph_get_label(gr, node, neighbor);
                            if (label) {
                                   printf("(%s)", (char*)label);
                            }
                     }
              }
              printf("\n");

              free(neighbors);
       }

       free(nodes);
}

int main() {
    printf("=== Testing Graph Creation ===\n");
    Graph gr = graph_create(1, 1, compare_int, hash_int);
    if (!gr) {
        printf("Failed to create graph.\n");
        return 1;
    }
    
    int* node1 = malloc(sizeof(int));
    int* node2 = malloc(sizeof(int));
    int* node3 = malloc(sizeof(int));
    int* node4 = malloc(sizeof(int));
    
    *node1 = 1;
    *node2 = 2;
    *node3 = 3;
    *node4 = 4;

    printf("\n=== Testing Node Addition ===\n");
    printf("Adding node 1: %s\n", graph_add_node(gr, node1) ? "success" : "failed");
    printf("Adding node 2: %s\n", graph_add_node(gr, node2) ? "success" : "failed");
    printf("Adding node 3: %s\n", graph_add_node(gr, node3) ? "success" : "failed");
    printf("Adding node 4: %s\n", graph_add_node(gr, node4) ? "success" : "failed");
    
    printf("Adding duplicate node 1: %s (should fail)\n", graph_add_node(gr, node1) ? "success" : "failed");

    printf("\n=== Testing Node Containment ===\n");
    printf("Contains node 1: %s\n", graph_contains_node(gr, node1) ? "yes" : "no");
    printf("Contains node 2: %s\n", graph_contains_node(gr, node2) ? "yes" : "no");
    
    int nonexistent = 5;
    printf("Contains nonexistent node 5: %s\n", 
           graph_contains_node(gr, &nonexistent) ? "yes" : "no");

    printf("\n=== Testing Edge Addition ===\n");
    char* label1 = "edge1";
    char* label2 = "edge2";
    char* label3 = "edge3";

    printf("Adding edge 1->2: %s\n", graph_add_edge(gr, node1, node2, label1) ? "success" : "failed");
    printf("Adding edge 2->3: %s\n", graph_add_edge(gr, node2, node3, label2) ? "success" : "failed");
    printf("Adding edge 3->4: %s\n", graph_add_edge(gr, node3, node4, label3) ? "success" : "failed");

    printf("Adding duplicate edge 1->2: %s (should fail)\n", 
           graph_add_edge(gr, node1, node2, label1) ? "success" : "failed");

    printf("\n=== Testing Edge Containment ===\n");
    printf("Contains edge 1->2: %s\n", 
           graph_contains_edge(gr, node1, node2) ? "yes" : "no");
    printf("Contains edge 2->3: %s\n", 
           graph_contains_edge(gr, node2, node3) ? "yes" : "no");
    printf("Contains nonexistent edge 1->4: %s\n", 
           graph_contains_edge(gr, node1, node4) ? "yes" : "no");

    printf("\n=== Testing Edge Labels ===\n");
    void* retrieved_label = graph_get_label(gr, node1, node2);
    printf("Label for edge 1->2: %s\n", retrieved_label ? (char*)retrieved_label : "null");

    printf("\n=== Testing Neighbor Operations ===\n");
    printf("Number of neighbors for node 1: %d\n", graph_num_neighbours(gr, node1));
    printf("Number of neighbors for node 2: %d\n", graph_num_neighbours(gr, node2));

    void** neighbors = graph_get_neighbours(gr, node2);
    if (neighbors) {
        int num_neighbors = graph_num_neighbours(gr, node2);
        printf("Neighbors of node 2:");
        for (int i = 0; i < num_neighbors; i++) {
            printf(" %d", *(int*)neighbors[i]);
        }
        printf("\n");
        free(neighbors);
    }

    printf("\n=== Testing Edge Removal ===\n");
    printf("Removing edge 1->2: %s\n", graph_remove_edge(gr, node1, node2) ? "success" : "failed");
    printf("Edge 1->2 exists after removal: %s\n", graph_contains_edge(gr, node1, node2) ? "yes" : "no");

    printf("\n=== Testing Node Removal ===\n");
    printf("Removing node 3: %s\n", graph_remove_node(gr, node3) ? "success" : "failed");
    printf("Node 3 exists after removal: %s\n", graph_contains_node(gr, node3) ? "yes" : "no");
    printf("Edge 2->3 exists after node removal: %s\n", graph_contains_edge(gr, node2, node3) ? "yes" : "no");

    printf("\n=== Cleanup ===\n");
    free(node1);
    free(node2);
    free(node3);
    free(node4);
    graph_free(gr);
    printf("Graph freed successfully\n");

    return 0;
}