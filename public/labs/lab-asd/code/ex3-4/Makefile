CC = gcc
CFLAGS = -Wall -Wextra -std=c11
INCLUDES = -I./include
SRC_DIR = src
BIN_DIR = bin
TEST_DIR = test

.PHONY: all clean

all: $(BIN_DIR)/main_ex3-4 $(BIN_DIR)/test_ex3-4

# Main executable for the graph traversal
$(BIN_DIR)/main_ex3-4: $(SRC_DIR)/main.c $(SRC_DIR)/graph.c $(SRC_DIR)/hashTable.c
	mkdir -p $(BIN_DIR)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $^

# Test executable
$(BIN_DIR)/test_ex3-4: $(SRC_DIR)/graphTest.c $(SRC_DIR)/graph.c $(SRC_DIR)/hashTable.c
	mkdir -p $(BIN_DIR)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $^

clean:
	rm -rf $(BIN_DIR)/*
	rmdir $(BIN_DIR)/
