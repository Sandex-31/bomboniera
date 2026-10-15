public class Es_1_4 {
    public static void main(String arg[]){
        String[] array = {"123", "123.5", ".567", "+7.5", "-.7", "67e10", "1e-2","-.7e2", "1e2.3", ".", "e3", "123.", "+e6", "1.2.3", "4e5e6", "++3"};
        for(int j = 0; j < array.length; j++){
            String str = array[j];
            int state = 0;
            int i = 0;
            while(state>=0 && i<str.length()){
                final char ch = str.charAt(i++);
                switch(state){
                    case 0:
                        if(ch == '.'){
                            state = 1;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 2;
                        }else if(ch == '+' || ch == '-'){
                            state = 4;
                        }else if(ch == 'e'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break; 
                    case 1:
                        if(ch == '+' || ch == '-'){
                            state = 6;
                        }else if(ch == '.'){
                            state = 6;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 3;
                        }else if(ch == 'e'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 2:
                        if(ch == '+' || ch == '-'){
                            state = 6;
                        }else if(ch == '.'){
                            state = 1;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 2;
                        }else if(ch == 'e'){
                            state = 5;
                        }else{
                            state = -1;
                        }
                    break;
                    case 3:
                        if(ch == '+' || ch == '-'){
                            state = 6;
                        }else if(ch == '.'){
                            state = 6;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 3;
                        }else if(ch == 'e'){
                            state = 8;
                        }else{
                            state = -1;
                        }
                    break;
                    case 4:
                        if(ch == '+' || ch == '-'){
                            state = 6;
                        }else if(ch == '.'){
                            state = 1;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 2;
                        }else if(ch == 'e'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 5:
                        if(ch == '+' || ch == '-'){
                            state = 7;
                        }else if(ch == '.'){
                            state = 7;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 5;
                        }else if(ch == 'e'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 6:
                        state = -1;
                    break;
                    case 7:
                        if(ch == '+' || ch == '-'){
                            state = 6;
                        }else if(ch == '.'){
                            state = 6;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 7;
                        }else if(ch == 'e'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 8:
                        if(ch == '+' || ch == '-'){
                            state = 6;
                        }else if(ch == '.'){
                            state = 6;
                        }else if(ch >= '0' && ch <= '9'){
                            state = 8;
                        }else if(ch == 'e'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                }
            }
            System.out.println("[" + array[j] + "] " + "-> " + (state == 2 || state == 3 || state == 8 || state == 7 || state == 8 || state == 5));
        }
    }
}
