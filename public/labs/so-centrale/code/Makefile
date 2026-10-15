CFLAGS = -Wvla -Wextra -Werror -D_GNU_SOURCE

all: Atomo Inibitore Attivatore Alimentazione Master

Master: Master.c SemOptions.h Makefile
	gcc $(CFLAGS) Master.c SemOptions.c -o Master
	
Atomo: Atomo.c SemOptions.h Makefile
	gcc Atomo.c SemOptions.c -o Atomo
	
Attivatore: Attivatore.c SemOptions.h Makefile
	gcc Attivatore.c SemOptions.c -o Attivatore
	
Alimentazione: Alimentazione.c SemOptions.h Makefile
	gcc Alimentazione.c SemOptions.c -o Alimentazione
	
Inibitore: Inibitore.c SemOptions.h Makefile
	gcc Inibitore.c SemOptions.c -o Inibitore
	
remove:
	rm -f *.o test-shm-parent test-shm-child *~
