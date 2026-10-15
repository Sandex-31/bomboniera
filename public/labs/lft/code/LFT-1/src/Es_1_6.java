public class Es_1_6 {
    public static void main(String arg[]){
        String[] array = {"aaa/****/aa", "aa/*a*a*/", "aaaa", "/****/", "/*aa*/",
            "*/a", "a/**/***a", "a/**/***/a", "a/**/aa/***/a", "aaa/*/aa", "a/**//***a", "aa/*aa"};
        for(int j = 0; j < array.length; j++){
            String str = array[j];
            int state = 0;
            int i = 0;
            while(state>=0 && i<str.length()){
                final char ch = str.charAt(i++);
                switch(state){
                    case 0:
                        if(ch == 'a' || ch == '*'){
                            state = 1;
                        }else if(ch == '/'){
                            state = 2;
                        }else{
                            state = -1;
                        }
                    break;
                    case 1:
                        if(ch == 'a' || ch == '*'){
                            state = 1;
                        }else if(ch == '/'){
                            state = 2;
                        }else{
                            state = -1;
                        }
                    break;
                    case 2:
                        if(ch == 'a'){
                            state = 1;
                        }else if(ch == '*'){
                            state = 3;
                        }else if(ch == '/'){
                            state = 2;
                        }else{
                            state = -1;
                        }
                    break;
                    case 3:
                        if(ch == 'a'){
                            state = 3;
                        }else if(ch == '*'){
                            state = 4;
                        }else if(ch == '/'){
                            state = 3;
                        }else{
                            state = -1;
                        }
                    break;
                    case 4:
                        if(ch == 'a'){
                            state = 3;
                        }else if(ch == '*'){
                            state = 4;
                        }else if(ch == '/'){
                            state = 5;
                        }else{
                            state = -1;
                        }
                    break;
                    case 5:
                        if(ch == 'a' || ch == '*'){
                            state = 1;
                        }else if(ch == '/'){
                            state = 2;
                        }else{
                            state = -1;
                        }
                    break;
                }
            }
            System.out.println("[" + array[j] + "] " + "-> " + (state == 1 || state == 2 || state == 5));
        }
    }
}
