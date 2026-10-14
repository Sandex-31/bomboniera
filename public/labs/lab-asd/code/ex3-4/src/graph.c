#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../include/graph.h"
#include "../include/hashTable.h"


typedef struct adjacency_list {
    HashTable* neighbors;  
    int num_neighbors;
} AdjacencyList;

struct graph {
    HashTable* nodes;      
    int num_edges;
    int is_directed;
    int is_labelled;
    int (*compare)(const void*, const void*);
    unsigned long (*hash)(const void*);
};


static AdjacencyList* create_adjacency_list(Graph gr) {
    if (!gr){
        return NULL;
    } 

    AdjacencyList* adj_list = malloc(sizeof(AdjacencyList));
    if (!adj_list){
        return NULL;
    } 

    adj_list->neighbors = hash_table_create(gr->compare, gr->hash);
    if (!adj_list->neighbors) {
        free(adj_list);
        return NULL;
    }

    adj_list->num_neighbors = 0;
    return adj_list;
}

Graph graph_create(int labelled, int directed, int (*compare)(const void*, const void*), unsigned long (*hash)(const void*)) {
    if (!compare || !hash){
        return NULL;
    } 

    Graph gr = malloc(sizeof(struct graph));
    if (!gr){
        return NULL;
    } 

    gr->nodes = hash_table_create(compare, hash);
    if (!gr->nodes) {
        free(gr);
        return NULL;
    }

    gr->num_edges = 0;
    gr->is_directed = directed;
    gr->is_labelled = labelled;
    gr->compare = compare;
    gr->hash = hash;

    return gr;
}

int graph_is_directed(const Graph gr) {
    if (!gr){
        return 0;
    } 
    return gr->is_directed;
}

int graph_is_labelled(const Graph gr) {
    if (!gr){
        return 0;
    } 
    return gr->is_labelled;
}

int graph_add_node(Graph gr, const void* node) {
    if (!gr || !node){
        return 0;
    }

    if (graph_contains_node(gr, node)){
        return 0;
    }
    
    AdjacencyList* adj_list = create_adjacency_list(gr);
    if (!adj_list){
        return 0;
    }

    hash_table_put(gr->nodes, node, adj_list);
    return 1;
}

int graph_add_edge(Graph gr, const void* node1, const void* node2, const void* label) {
    if (!gr || !node1 || !node2){
        return 0;
    }

    if (!graph_contains_node(gr, node1) || !graph_contains_node(gr, node2)){
        return 0;
    }
        
    if (gr->is_labelled && !label){
        return 0;
    }
        
    if (!gr->is_labelled && label){
        return 0;
    }
        
    AdjacencyList* adj1 = (AdjacencyList*)hash_table_get(gr->nodes, node1);
    if (!adj1){
        return 0;
    }

    if (hash_table_contains_key(adj1->neighbors, node2)){
        return 0;
    }
        
    hash_table_put(adj1->neighbors, node2, (void*)label);
    adj1->num_neighbors++;
    gr->num_edges++;

    if (!gr->is_directed) {
        AdjacencyList* adj2 = (AdjacencyList*)hash_table_get(gr->nodes, node2);
        if (!adj2){
            return 0;
        } 

        hash_table_put(adj2->neighbors, node1, (void*)label);
        adj2->num_neighbors++;
    }

    return 1;
}

int graph_contains_node(const Graph gr, const void* node) {
    if (!gr || !node){
        return 0;
    }
    return hash_table_contains_key(gr->nodes, node);
}

int graph_contains_edge(const Graph gr, const void* node1, const void* node2) {
    if (!gr || !node1 || !node2){
        return 0;
    }

    if (!graph_contains_node(gr, node1) || !graph_contains_node(gr, node2)){
        return 0;
    }
        
    AdjacencyList* adj = (AdjacencyList*)hash_table_get(gr->nodes, node1);
    if (!adj){
        return 0;
    } 

    return hash_table_contains_key(adj->neighbors, node2);
}

int graph_remove_edge(Graph gr, const void* node1, const void* node2) {
    if (!gr || !node1 || !node2){
        return 0;
    } 

    if (!graph_contains_edge(gr, node1, node2)){
        return 0;
    }
       
    AdjacencyList* adj1 = (AdjacencyList*)hash_table_get(gr->nodes, node1);
    if (!adj1){
        return 0;
    } 

    hash_table_remove(adj1->neighbors, node2);
    adj1->num_neighbors--;
    gr->num_edges--;

    if (!gr->is_directed) {
        AdjacencyList* adj2 = (AdjacencyList*)hash_table_get(gr->nodes, node2);
        if (!adj2){
            return 0;
        }

        hash_table_remove(adj2->neighbors, node1);
        adj2->num_neighbors--;
    }

    return 1;
}

int graph_remove_node(Graph gr, const void* node) {
    if (!gr || !node){
        return 0;
    }

    if (!graph_contains_node(gr, node)){
        return 0;
    }
      

    AdjacencyList* adj_to_remove = (AdjacencyList*)hash_table_get(gr->nodes, node);
    if (!adj_to_remove){
        return 0;
    }

    void** nodes = graph_get_nodes(gr);
    if (!nodes){
        return 0;
    }

    int node_count = graph_num_nodes(gr);
    for (int i = 0; i < node_count; i++) {
        if (!nodes[i]) continue;

        if (gr->compare(nodes[i], node) != 1) {  
            AdjacencyList* adj = (AdjacencyList*)hash_table_get(gr->nodes, nodes[i]);
            if (!adj){
                continue;
            }

            if (hash_table_contains_key(adj->neighbors, node)) {
                hash_table_remove(adj->neighbors, node);
                adj->num_neighbors--;
                gr->num_edges--;
            }
        }
    }

    gr->num_edges -= adj_to_remove->num_neighbors;
    hash_table_free(adj_to_remove->neighbors);
    free(adj_to_remove);
    hash_table_remove(gr->nodes, node);
    free(nodes);
    return 1;
}

int graph_num_nodes(const Graph gr) {
    if (!gr){
        return 0;
    }
    return hash_table_size(gr->nodes);
}

int graph_num_edges(const Graph gr) {
    if (!gr){
        return 0;
    }
    return gr->num_edges;
}

void** graph_get_nodes(const Graph gr) {
    if (!gr){
        return NULL;
    }
    return hash_table_keyset(gr->nodes);
}

Edge** graph_get_edges(const Graph gr) {
    if (!gr){
        return NULL;
    }
    
    int node_count = graph_num_nodes(gr);
    if (node_count == 0){
        return NULL;
    }
    
    void** nodes = graph_get_nodes(gr);
    if (!nodes){
        return NULL;
    }
    
    int max_edges = gr->num_edges + 1; 
    Edge** edges = malloc(sizeof(Edge*) * max_edges);
    if (!edges) {
        free(nodes);
        return NULL;
    }
    
    int edge_count = 0;
    for (int i = 0; i < node_count && edge_count < gr->num_edges; i++) {
        void** neighbors = graph_get_neighbours(gr, nodes[i]);
        if (!neighbors){
            continue;
        }
        
        int num_neighbors = graph_num_neighbours(gr, nodes[i]);
        
        for (int j = 0; j < num_neighbors; j++) {
            
            if (!gr->is_directed && gr->compare(nodes[i], neighbors[j]) > 0){
                continue;
            }
               
            Edge* edge = malloc(sizeof(Edge));
            if (!edge){
                continue;
            }
            
            edge->source = nodes[i];
            edge->dest = neighbors[j];
            edge->label = graph_get_label(gr, nodes[i], neighbors[j]);
            
            edges[edge_count++] = edge;
        }
        
        free(neighbors);
    }
    
    edges[edge_count] = NULL;  
    free(nodes);
    return edges;
}

void** graph_get_neighbours(const Graph gr, const void* node) {
    if (!gr || !node){
        return NULL;
    }
    
    if (!graph_contains_node(gr, node)){
        return NULL;
    }
        
        
    AdjacencyList* adj = (AdjacencyList*)hash_table_get(gr->nodes, node);
    if (!adj){
        return NULL;
    }
    
    return hash_table_keyset(adj->neighbors);
}

int graph_num_neighbours(const Graph gr, const void* node) {
    if (!gr || !node){
        return 0;
    }
    
    if (!graph_contains_node(gr, node)){
        return 0;
    }
        
        
    AdjacencyList* adj = (AdjacencyList*)hash_table_get(gr->nodes, node);
    if (!adj){
        return 0;
    }
    
    return adj->num_neighbors;
}

void* graph_get_label(const Graph gr, const void* node1, const void* node2) {
    if (!gr || !node1 || !node2){
        return NULL;
    }
    
    if (!graph_contains_edge(gr, node1, node2)){
        return NULL;
    }
        
        
    AdjacencyList* adj = (AdjacencyList*)hash_table_get(gr->nodes, node1);
    if (!adj){
        return NULL;
    }
    
    return hash_table_get(adj->neighbors, node2);
}

void graph_free(Graph gr) {
    if (!gr){
        return;
    }
    
    void** nodes = graph_get_nodes(gr);
    if (nodes) {
        int node_count = graph_num_nodes(gr);
        for (int i = 0; i < node_count; i++) {
            if (!nodes[i]){
                continue;
            }
            AdjacencyList* adj = (AdjacencyList*)hash_table_get(gr->nodes, nodes[i]);
            if (adj) {
                if (adj->neighbors) hash_table_free(adj->neighbors);
                free(adj);
            }
        }
        free(nodes);
    }
    
    if (gr->nodes){
        hash_table_free(gr->nodes);
    } 
    free(gr);
}
