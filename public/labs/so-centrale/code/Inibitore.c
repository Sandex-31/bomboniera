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
#include <time.h>
#include "SemOptions.h"

int manda = 1;

void handler(int sig){
	if(sig == SIGUSR2){
		if(manda){
			printf("_____________________________________________Inibitore Attivato\n");
			fflush(stdout);
			manda = 0;
		}else{
			printf("_____________________________________________Inibitore Disattivato\n");
			fflush(stdout);
			manda = 1;
		}
	}
}

void main(int args, char * argv[]){
	signal(SIGUSR2,handler);
	printf("Pid Inibitore->%d\n",getpid());
	fflush(stdout);
	struct shared_data * data;
	int sem = semget(SEM_KEY,1,0666);
	int fd = shmget(SHM_KEY,sizeof(struct shared_data),0666);
	if(fd < 0){
		perror("error in shmget attivatore");
	}
	data = shmat(fd,NULL,0);
	int pidA = atoi(argv[1]);
	while(1){
		while(manda);
		data->Inibitore = 1;
		kill(pidA,SIGUSR1);
		sleep(1);
	}
}
