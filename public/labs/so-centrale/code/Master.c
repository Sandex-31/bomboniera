#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/ipc.h>
#include <signal.h>
#include <sys/sem.h>
#include <sys/shm.h>
#include <sys/mman.h>
#include <time.h>
#include <string.h>
#include <errno.h>
#include "SemOptions.h"
#define N_MAX_ATOM 80
#define NATOM 500
#define SIM_DURATION 60
#define ENERGY_DEMAND 200000
#define ENERGY_EXPLODE_THRESHOLD 3000000

pid_t p;
int sem;
int fd;

void master(int nAtomi);

void Term(int sig){
	if(sig == SIGALRM){
		printf("Tempo scaduto\n");
		shmctl(fd,IPC_RMID,NULL);
		semctl(sem,0,IPC_RMID);
		kill(0,SIGTERM);
	}
}

int main(){
	master(NATOM);
}

void master(int nAtomi){
	signal(SIGALRM,Term);
	alarm(SIM_DURATION);
	struct shared_data * data;
	struct sembuf my_op;
	fd = shmget(SHM_KEY,sizeof(struct shared_data),IPC_CREAT | 0666);
	data = (struct shared_data *) shmat(fd,NULL,0);
	sem = semget(SEM_KEY,1,IPC_CREAT | IPC_EXCL | 0666);
	if(sem < 0){
		printf("errore in semget Master\n");
	}
	semctl(sem, 0, SETVAL, 1);
	data->energy = 0;
	data->index = 0;
	data->Scorie = 0;
	data->Inibitore = 0;
	data->attivatore = 1;
	printf("LOADING PROCESSES\n");
	fflush(stdout);
	p = fork();
	if(p < 0){
		printf("MELTDOWN\n");
		shmctl(fd,IPC_RMID,NULL);
		semctl(sem,0,IPC_RMID);
		kill(0,SIGTERM);
	}
	for(int i = 0; i < nAtomi; i++){
		if(p > 0)
			p = fork();
		else if(p < 0){
			printf("MELTDOWN\n");
			shmctl(fd,IPC_RMID,NULL);
			semctl(sem,0,IPC_RMID);
			kill(0,SIGTERM);
		}else{
			srand(time(NULL));
			int random = rand() % (N_MAX_ATOM -20 + 1) + 20;
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
	if(p > 0){
		if((p = fork()) == 0){
			sem_reserve(sem,0);
			data->index++;
			sem_release(sem,0);
			char * myargv[3] = {"Attivatore", NULL, NULL};
			if(execve("Attivatore",myargv,NULL) == -1){
				printf("comando invalido\n");
				fflush(stdout);
			}
			exit(0);
		}else if(p < 0){
			printf("MELTDOWN\n");
			shmctl(fd,IPC_RMID,NULL);
			semctl(sem,0,IPC_RMID);
			kill(0,SIGTERM);
			exit(-1);
		}else{
			if((p = fork()) == 0){
				sem_reserve(sem,0);
				data->index++;
				sem_release(sem,0);
				char * myargv[3] = {"Alimentazione", NULL, NULL};
				if(execve("Alimentazione",myargv,NULL) == -1){
					printf("comando invalido\n");
					fflush(stdout);
				}
				exit(0);
			}else if(p < 0){
				printf("MELTDOWN\n");
				shmctl(fd,IPC_RMID,NULL);
				semctl(sem,0,IPC_RMID);
				kill(0,SIGTERM);
				exit(-1);
			}
		}
		int energyTemp = 0;
		int scissioniTemp = 0;
		int scorieTemp = 0;
		int usoTot = ENERGY_DEMAND;
		sleep(1);
		printf("LOADING PROCESSES\n");
		fflush(stdout);
		while(1){ 
			sleep(1);
			printf("____________________________________________\n");
			printf("Energia tot-> %d\n",energyTemp);
			printf("Energia ultimo secondo-> %d\n",data->energy);
			printf("Energia richiesta tot->%d\n",usoTot);
			printf("Energia richiesta ultimo secondo->%d\n",ENERGY_DEMAND);
			printf("Numero di Atomi->%d \n",data->index);
			printf("Numero di Scissioni tot->%d \n",data->scissioni);
			printf("Numero di Scissioni ultimo secondo->%d \n",data->scissioni - scissioniTemp);
			printf("Numero di Atomi scorie totali->%d\n",data->Scorie);
			printf("Numero di Atomi scorie ultimo secondo->%d\n",data->Scorie - scorieTemp);
			printf("Attivazioni interrotte da Inibitore->%d\n",data->logInibitore);
			printf("Energia presa da Inibitore->%d\n",data->energyRubata);	
			printf("____________________________________________\n");
			sem_reserve(sem,0);
			energyTemp = data->energy + energyTemp;
			scissioniTemp = data->scissioni;
			scorieTemp = data->Scorie;
			usoTot = usoTot + ENERGY_DEMAND;
			sem_release(sem,0);
			if(data->energy > ENERGY_EXPLODE_THRESHOLD){
				printf("EXPLODE\n");
				shmctl(fd,IPC_RMID,NULL);
				semctl(sem,0,IPC_RMID);
				kill(0,SIGTERM);
			}
			sem_reserve(sem,0);
			data->energy = data->energy-ENERGY_DEMAND;
			sem_release(sem,0);
			if(data->energy < 0){
				printf("BLACKOUT\n");
				shmctl(fd,IPC_RMID,NULL);
				semctl(sem,0,IPC_RMID);
				kill(0,SIGTERM);
			}
			printf("\n");
			fflush(stdout);
		}
		shmctl(fd,IPC_RMID,NULL);
		semctl(sem,0,IPC_RMID);
	}
}




