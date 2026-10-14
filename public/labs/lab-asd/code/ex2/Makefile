CC = gcc
CFLAGS = -std=c11
INCLUDES = -I./include
SRC_DIR = src
BIN_DIR = bin
TEST_DIR = test

.PHONY: all clean

all: $(BIN_DIR)/main_ex2 $(BIN_DIR)/test_ex2

$(BIN_DIR)/main_ex2: $(SRC_DIR)/main.c $(SRC_DIR)/distance.c
	mkdir -p $(BIN_DIR)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $^

$(BIN_DIR)/test_ex2: $(SRC_DIR)/test.c $(SRC_DIR)/distance.c
	mkdir -p $(BIN_DIR)
	$(CC) $(CFLAGS) $(INCLUDES) -o $@ $^

clean:
	rm -rf $(BIN_DIR)/*
	rmdir $(BIN_DIR)/
