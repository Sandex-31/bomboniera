#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/ipc.h>
#include <signal.h>
#include <sys/shm.h>
#include <sys/mman.h>
#include <string.h>
#include <time.h>
#include "SemOptions.h"

int attiva = 0; 

void handler(int sig){
	if(sig == SIGUSR1){
		attiva = 1;
	}
}

void main(){
	struct shared_data * data;
	int sem = semget(SEM_KEY,1,0666);
	int fd = shmget(SHM_KEY,sizeof(struct shared_data),0666);
	if(fd < 0){
		perror("error in shmget attivatore");
	}
	data = shmat(fd,NULL,0);
	int n = 0;
	int basic = 0;
	pid_t p;
	struct timespec sleepTime;
    sleepTime.tv_sec = 1;
    sleepTime.tv_nsec = 5000000;
    if((p = fork())==0){
    	sem_reserve(sem,0);
		data->index++;
		sem_release(sem,0);
		char aux[4];
		char * myargv[3] = {"Inibitore", NULL, NULL};
		myargv[1] = malloc(4*sizeof(char));
		if (myargv[1] == NULL) {
			perror("malloc");
			exit(EXIT_FAILURE);
		}
		sprintf(aux, "%d", getpid());
		strcpy(myargv[1],aux);
		if(execve("Inibitore",myargv,NULL) == -1){
			printf("comando invalido\n");
			fflush(stdout);
		}
		free(myargv[1]);
		exit(0);
    }else if(p < 0){
    	printf("MELTDOWN\n");
		shmctl(fd,IPC_RMID,NULL);
		semctl(sem,0,IPC_RMID);
		kill(0,SIGTERM);
    }
    nanosleep(&sleepTime,NULL);
    signal(SIGUSR1,handler);
	while(1){
		srand(time(NULL));
		while(attiva){
			data->logInibitore++;
    		nanosleep(&sleepTime,NULL);
			int casualEntry = rand() % 1000 + 1;
			if(casualEntry <= 50)
				attiva = 0;
		}
		printf("____________________________________________Attivatore ha attivato la scissione\n");
		data->attivatore = 0;
		sleep(2);
		data->attivatore = 1;
	}
}
