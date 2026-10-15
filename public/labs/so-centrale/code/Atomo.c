#include "SemOptions.h"
#include <unistd.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <sys/shm.h>
#include <signal.h>
#include <sys/mman.h>
#include <time.h>
#include <string.h>
#define N_MAX_ATOM 80
#define N_MIN_ATOM 2

pid_t p;

void Energy(int n1, int n2){
	struct shared_data * data;
	int fd = shmget(SHM_KEY,sizeof(*data),0666);
	int sem = semget(SEM_KEY,1,0666);
	if(fd < 0){
		perror("error in shmget Energy");
	}
	data = (struct shared_data *) shmat(fd,NULL,0);
	if(data->Inibitore){
		if(n1>n2){
			sem_reserve(sem,0);
			data->energyRubata = data->energyRubata + ((data->energy + ((n1*n2)-n1)) / 1.7);
			data->energy = (data->energy + ((n1*n2)-n1)) - ((data->energy + ((n1*n2)-n1)) / 1.7);
			sem_release(sem,0);
		}else{
			sem_reserve(sem,0);
			data->energyRubata = data->energyRubata +((data->energy + ((n1*n2)-n2)) / 1.7);
			data->energy = (data->energy + ((n1*n2)-n2)) - ((data->energy + ((n1*n2)-n2)) / 1.7);
			sem_release(sem,0);
		}
	}else{
		if(n1>n2){
			sem_reserve(sem,0);
			data->energy = data->energy + ((n1*n2)-n1);
			sem_release(sem,0);
		}else{
			sem_reserve(sem,0);
			data->energy = data->energy + ((n1*n2)-n2);
			sem_release(sem,0);
		}
	}
}

int main(int argc, char * argv[]){
	struct shared_data * data;
	int sem = semget(SEM_KEY,1,0666);
	int temp = atoi(argv[1]);
	int fd = shmget(SHM_KEY,sizeof(struct shared_data),0666);
	if(fd < 0){
		perror("error in shmget atomo");
	}
	data = shmat(fd,NULL,0);
	srand(time(NULL));
	int n = rand() % temp + 1;
	Energy(temp,temp-n);
	if(n <= N_MIN_ATOM){
		sem_reserve(sem,0);
		data->Scorie++;
		sem_release(sem,0);
		exit(0);
	}else{
		while(data->attivatore);
		p = fork();
		if(p<0){
			printf("MELTDOWN\n");
			shmctl(fd,IPC_RMID,NULL);
			semctl(sem,0,IPC_RMID);
			kill(0,SIGTERM);
		}else if(p == 0){
			sem_reserve(sem,0);
			data->scissioni++;
			data->index++;
			sem_release(sem,0);
			char aux[4];
			char * myargv[3] = {"Atomo", NULL, NULL};
			myargv[1] = malloc(4*sizeof(char));
			if (myargv[1] == NULL) {
				perror("malloc");
				exit(EXIT_FAILURE);
			}
			sprintf(aux, "%d", (temp-n));
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
