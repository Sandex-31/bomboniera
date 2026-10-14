CC = gcc
CFLAGS = -Wall -Wextra -std=c11
INCLUDES = -I./include
SRC_DIR = src
BIN_DIR = bin
TEST_DIR = test

.PHONY: all clean

all: $(BIN_DIR)/main_ex3 $(BIN_DIR)/test_ex3

# Main executable for the graph traversal
$(BIN_DIR)/main_ex3: $(SRC_DIR)/hashMain.c  $(SRC_DIR)/hashTable.c
	mkdir -p $(BIN_DIR)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $^

# Test executable
$(BIN_DIR)/test_ex3: $(SRC_DIR)/test_hashTable.c  $(SRC_DIR)/hashTable.c
	mkdir -p $(BIN_DIR)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $^

clean:
	rm -rf $(BIN_DIR)/*
	rmdir $(BIN_DIR)/
