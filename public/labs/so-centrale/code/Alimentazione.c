#include "SemOptions.h"
#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/ipc.h>
#include <signal.h>
#include <semaphore.h>
#include <sys/shm.h>
#include <sys/mman.h>
#include <time.h>
#include <string.h>
#define N_MAX_ATOM 80
#define STEP 500000
#define N_NUOVI_ATOMI 100

pid_t p;

void main(){
	struct timespec sleepTime;
    sleepTime.tv_sec = 0;
    sleepTime.tv_nsec = STEP;
    nanosleep(&sleepTime,NULL);
	struct shared_data * data;
	int sem = semget(SEM_KEY,1,0666);
	int fd = shmget(SHM_KEY,sizeof(struct shared_data),0666);
	if(fd < 0){
		perror("error in shmget alimentazione");
	}
	data = shmat(fd,NULL,0);
	while(1){
		nanosleep(&sleepTime,NULL);
		for(int i = 0; i < N_NUOVI_ATOMI; i++){
			p = fork();
			if(p < 0){
				printf("MELTDOWN\n");
				shmctl(fd,IPC_RMID,NULL);
				semctl(sem,0,IPC_RMID);
				kill(0,SIGTERM);
			}else if(p == 0){
				srand(time(NULL));
				int random = rand() % (N_MAX_ATOM + 1);
				sem_reserve(sem,0);
				data->index++;
				sem_release(sem,0);
				char aux[4];
				char * myargv[3] = {"Atomo", NULL, NULL};
				myargv[1] = malloc(4*sizeof(char));
				if (myargv[1] == NULL) {
					perror("malloc");
					exit(EXIT_FAILURE);
				}
				sprintf(aux, "%d", random);
				strcpy(myargv[1],aux);
				if(execve("Atomo",myargv,NULL) == -1){
					printf("comando invalido\n");
					fflush(stdout);
				}
				free(myargv[1]);
				exit(0);
			}
		}
	}
}
