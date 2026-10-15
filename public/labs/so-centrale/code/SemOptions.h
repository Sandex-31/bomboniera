#include <stdlib.h>
#include <stdio.h>
#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/sem.h>

#define SHM_KEY  ftok(".", 'x')
#define SEM_KEY  ftok(".", 'r')


union semun {
	int val;
	struct semid_ds *buf;
	unsigned short *array;
	struct seminfo *__buf;
};

struct shared_data{
	int energy;
	int index;
	int start;
	int Scorie;
	int attivatore;
	int attivazioni;
	int scissioni;
	int energyRubata;
	int logInibitore;
	int Inibitore;
};

int sem_reserve(int sem_id, int sem_num);

int sem_release(int sem_id, int sem_num);
