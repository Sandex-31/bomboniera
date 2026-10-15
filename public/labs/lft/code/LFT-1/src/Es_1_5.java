public class Es_1_5 {
    public static void main(String arg[]){
        String[] array = {"/****/", "/*a*a*/", "/*a/**/", "/**a///a/a**/", "/**/",
            "/*/*/", "/*/", "/**/***/"};
        for(int j = 0; j < array.length; j++){
            String str = array[j];
            int state = 0;
            int i = 0;
            while(state>=0 && i<str.length()){
                final char ch = str.charAt(i++);
                switch(state){
                    case 0:
                        if(ch == '/'){
                            state = 1;
                        }else if(ch == '*' || ch == 'a'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 1:
                        if(ch == '*'){
                            state = 2;
                        }else if(ch == '/' || ch == 'a'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 2:
                        if(ch == '*'){
                            state = 3;
                        }else if(ch == '/' || ch == 'a'){
                            state = 2;
                        }else{
                            state = -1;
                        }
                    break;
                    case 3:
                        if(ch == '/'){
                            state = 4;
                        }else if(ch == '*'){
                            state = 3;
                        }else if(ch == 'a'){
                            state = 2;
                        }else{
                            state = -1;
                        }
                    break;
                    case 4:
                        if(ch == '*' || ch == 'a' || ch == '/'){
                            state = 6;
                        }else{
                            state = -1;
                        }
                    break;
                    case 6:
                        state = -1;
                    break;
                }
            }
            System.out.println("[" + array[j] + "] " + "-> " + (state == 4));
        }
    }
}
