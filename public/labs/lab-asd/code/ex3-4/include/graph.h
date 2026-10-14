typedef struct graph *Graph;

typedef struct edge {
   void* source; 
   void* dest; 
   void* label;
}Edge;

Graph graph_create(int labelled, int directed,
                     int (*compare)(const void*, const void*),
                     unsigned long (*hash)(const void*));


/** 
 * @brief Tells if the the graph is directed
 *
 * This function will return true if the graph is directed or false if it isn't
 *
 * @param[in] gr The graph we want to know if it's directed
 * @return A boolean that tells us if the graph is directed
 *
 *  **/
int graph_is_directed(const Graph gr);

/** 
 * @brief  Tells if the the graph is labelled
 *
 * This function will return true if the graph is labelled or false if it isn't 
 *
 * @param[in] gr The graph we want to know if it's labelled
 * @return A boolean that tells us if the graph is labelled
 *
 *  **/
int graph_is_labelled(const Graph gr);

/** 
 * @brief Adds a new node in the graph
 *
 * This function will add a new node to put inside the graph
 *
 * @param[in] gr Graph we want to populate
 * @param[in] node The new node we want inside the graph
 * @return A boolean that tells if the operation was successfull
 *
 *  **/
int graph_add_node(Graph gr, const void* node);

/** 
 * @brief Adds an edge in the graph
 *
 * This function will add a new edge in the graph.
 * The edge will follow the setting of the graph, so if it's directed or labelled
 *
 * @param[in] gr The graph we want to add an edge into
 * @return A boolean that tells if the operation was successfull
 *
 *  **/
int graph_add_edge(Graph gr, const void* node1, const void* node2, const void* label);          

/** 
 * @brief Tells us if the function contains a given node
 *
 * This function tells us if the graph contains a node we give to it
 *
 * @param[in] gr The graph we want to check if contains a given node
 * @param[in] node The node we want to know if it's in the graph
 * @return A boolean that tells if the graph contains the node or not
 *  **/
int graph_contains_node(const Graph gr, const void* node);                                     

/** 
 * @brief Tells us if the function contains a given edge
 *
 * This function tells us if the graph contains an edge that connects the two nodes we pass as argument
 *
 * @param[in] gr The graph we want to check if contains a given node
 * @param[in] node1 The node that will make the source of the edge
 * @param[in] node2 The node that will make the destination of the edge
 * @return A boolean that tells if the graph contains the edge or not
 *  **/
int graph_contains_edge(const Graph gr, const void* node1, const void* node2);                

/** 
 * @brief Removes a node from the graph
 *
 * This function removes a node from the graph freeing the memory it occupied
 *
 * @param[in] gr The graph we want to remove the node from
 * @param[in] node The node we want to remove from the graph
 * @return A boolean that tells if the operation was successfull
 *
 *  **/
int graph_remove_node(Graph gr, const void* node);                                           

/** 
 * @brief Removes an edge from the graph
 *
 * This function removes an edge from the graph 
 *
 * @param[in] gr The graph we want to remove the edge from
 * @param[in] node1 The node that is the source of the edge we want to remove, also the destination if the graph is not directed
 * @param[in] node2 The node that is the destination of the edge we want to remove, also the source if the graph is not directed
 * @return A boolean that tells if the operation was successfull
 *
 *  **/
int graph_remove_edge(Graph gr, const void* node1, const void* node2);                      

/** 
 * @brief Returns the number of nodes present in the graph
 *
 * @param[in] gr the graph we want to know how many nodes it has
 * @return An array of all the keys that populate the hash_table
 *
 *  **/
int graph_num_nodes(const Graph gr);                                                       

/** 
 * @brief Returns the number of edges present in the graph
 *
 *
 * @param[in] gr the graph we want to know how many edges it has
 * @return A boolean that tells if the operation was successfull
 *
 *  **/
int graph_num_edges(const Graph gr);                                                      

/** 
 * @brief Return all of the nodes in the graph
 *
 * This function will retrieve every node inside the graph and gives it
 *
 * @param[in] gr The graph we want the nodes of
 * @return An array with all the nodes of the graph
 *
 *  **/
void** graph_get_nodes(const Graph gr);                                                  

/** 
 * @brief Returns all edges in the graph
 *
 * This function will retrieve every edge in the graph 
 *
 * @param[in] gr The graph we want the edges of
 * @return An array of all the edges in the graph
 *
 *  **/
Edge** graph_get_edges(const Graph gr);                                                 

/** 
 * @brief Return the nodes connected to another node
 *
 * This function will retrieve the node in the list of adiacences, put them in an array and return it
 *
 * @param[in] gr The graph we will work on
 * @param[in] node The node we want to know the neighbours of
 * @return An array of nodes that are neighbours of the one passed as argument
 *
 *  **/
void** graph_get_neighbours(const Graph gr, const void* node);                         

/** 
 * @brief Return the number of neighbours
 *
 *
 * @param[in] gr The graph the node is from
 * @param[in] node The node we want to know the number of neighbours of
 * @return The number of neighbours
 *
 *  **/
int graph_num_neighbours(const Graph gr, const void* node);                           

/** 
 * @brief Returns the label 
 *
 * @param[in] gr The graph where the edge with the label is
 * @param[in] node1 The node that is the source of the edge we want the label of
 * @param[in] node2 The node that is the destination of the edge we want the label of
 * @return The label of the edge
 *  **/
void* graph_get_label(const Graph gr, const void* node1, const void* node2);         

/** 
 * @brief Delete the graph from memory
 *
 * This function will free the memory previously allocated for the graph to use
 *
 * @param[in] gr The graph we want to delete
 *  **/
void graph_free(Graph gr);
