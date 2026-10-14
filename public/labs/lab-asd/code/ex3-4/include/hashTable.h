typedef struct HashNode {
    void* key;
    void* value;
    struct HashNode* next;
} HashNode;

typedef struct HashTable {
    HashNode** buckets;
    int capacity;
    int size;
    int (*compare_keys)(const void*, const void*); 
    unsigned long (*hash_function)(const void*);  
} HashTable;

/** 
 * @brief Creates a new Hash Table
 *
 *
 * This function will create a space in memory for a new hash table to be used.
 * It will also make sure the new hash table is correctly initialized with the right hash and compare function
 *
 * @param[in] f1 Parametric function that compare two keys, it will be used to initialized the compare_keys element in the hash table
 * @param[in] f2 Parametric function that hash the key, it will be used to initialized the hash_function element in the hash table
 * @return A new empty and initialized hash table
 *
 *  **/
HashTable* hash_table_create(int (*f1)(const void*,const void*), unsigned long (*f2)(const void*));

/** 
 * @brief Put a new element in the hash table 
 *
 * This function will populate the hash table we want with a pair of key value.
 * If needed it will resize the hash table.
 * 
 *
 * @param[in] hash_table This is the Hash Table we want to populate.
 * @param[in] key The key we want to put in the Hash Table
 * @param[in] value The value we want to put in the Hash Table
 *
 *  **/
void hash_table_put(HashTable*, const void*, const void*);

/** 
 * @brief Given the key it returns the element inside the Hash Table associated with that key
 *
 * This function will retrieve an element associated with the key passed as argument.
 * 
 * @param[in] hash_table The HashTable we want to retrieve the element from.
 * @param[in] key The key associated with the element we want to retrieve
 * @return The element we wanted
 *
 *  **/
void* hash_table_get(const HashTable*, const void*);

/** 
 * @brief Tells us if the Hash Table contains a key
 *
 * This function will analyze the key we give to it, and tells us if it's already inside the Hash Table
 *
 * @param[in] hash_table The Hash Table we want to inspect
 * @param[in] key The key we want to know if it's in the Hash Table
 * @return A boolean number to know if the key is already in the Hash Table, or -1 if it gives an error
 *  **/
int hash_table_contains_key(const HashTable*, const void*);

/** 
 * @brief Removes a key from the Hash Table
 *
 * This function will remove the key we pass as argument from the Hash Table 
 * freeing the space allocated in memory for it.
 *
 * @param[in] hash_table The Hash Table we want to remove the key from
 * @param[in] key The key we want to remove from the Hash Table
 *
 *  **/
void hash_table_remove(HashTable*, const void*);

/** 
 * @brief Returns the size of the Hash Table
 *
 *
 * @param[in] hash_table The Hash Table we want to know the size of
 * @return The size of the hash table
 *  **/
int hash_table_size(const HashTable*);

/** 
 * @brief Returns all the keys in the table
 *
 * This function will allocate in memory the space to get all the keys inside of the Hash Table
 *
 * @param[in] hash_table The Hash Table we want to know the keyset of 
 * @return An array of all the keys that populate the hash_table
 *
 *  **/
void** hash_table_keyset(const HashTable*);

/** 
 * @brief Free the space occup  in memory by the Hash Table
 *
 * This function will free the space allocated earlier of the Hash Table and its nodes
 *
 * @param[in] hash_table The Hash Table we want to erase from memory
 *
 *  **/
void hash_table_free(HashTable*);

